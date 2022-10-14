/* eslint-disable no-console */
/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */
let mkdirp = require('mkdirp');
let fs = require('fs');
let fsPromises = require('fs').promises;
let path = require('path');
let _ = require('lodash');
let Promise = require('bluebird');
let chalk = require('chalk');

let helper = require('../util/fs');
let { addlogs } = require('../util/log');
let config = require('../../config/default');
let supress = require('../util/extensionsUidReplace');
let sdkInstance = require('../util/contentstack-management-sdk');
const { getInstalledExtensions } = require('../util/marketplace-app-helper')

let reqConcurrency = config.concurrency;
let requestLimit = config.rateLimit;
let contentTypeConfig = config.modules.content_types;
let globalFieldConfig = config.modules.globalfields;
let globalFieldsFolderPath;
let contentTypesFolderPath;
let mapperFolderPath;
let globalFieldMapperFolderPath;
let globalFieldUpdateFile;
let globalFieldPendingPath;
let skipFiles = ['__master.json', '__priority.json', 'schema.json', '.DS_Store'];
let fileNames;
let field_rules_ct = [];
let client;
let stack = {};

function importContentTypes() {
  this.contentTypes = [];
  this.schemaTemplate = require('../util/schemaTemplate');
  this.requestOptions = {
    json: {},
  };
  this.installedExtensions = []
}

importContentTypes.prototype = {
  start: async function (credentialConfig) {
    addlogs(config, 'Migrating contenttypes', 'success');
    let self = this;
    config = credentialConfig;
    client = sdkInstance.Client(config);
    stack = client.stack({ api_key: config.target_stack, management_token: config.management_token });
    globalFieldsFolderPath = path.resolve(config.data, globalFieldConfig.dirName);
    contentTypesFolderPath = path.resolve(config.data, contentTypeConfig.dirName);
    mapperFolderPath = path.join(config.data, 'mapper', 'content_types');
    const appMapperFolderPath = path.join(config.data, 'mapper', 'marketplace_apps');
    globalFieldMapperFolderPath = helper.readFile(path.join(config.data, 'mapper', 'global_fields', 'success.json'));
    globalFieldPendingPath = helper.readFile(
      path.join(config.data, 'mapper', 'global_fields', 'pending_global_fields.js'),
    );
    globalFieldUpdateFile = path.join(config.data, 'mapper', 'global_fields', 'success.json');
    fileNames = fs.readdirSync(path.join(contentTypesFolderPath));
    self.globalfields = helper.readFile(path.resolve(globalFieldsFolderPath, globalFieldConfig.fileName));

    for (let index in fileNames) {
      if (skipFiles.indexOf(fileNames[index]) === -1) {
        self.contentTypes.push(helper.readFile(path.join(contentTypesFolderPath, fileNames[index])));
      }
    }

    self.contentTypeUids = _.map(self.contentTypes, 'uid').filter(val => val);
    self.createdContentTypeUids = [];
    if (!fs.existsSync(mapperFolderPath)) {
      mkdirp.sync(mapperFolderPath);
    }
    // avoid re-creating content types that already exists in the stack
    if (fs.existsSync(path.join(mapperFolderPath, 'success.json'))) {
      self.createdContentTypeUids = helper.readFile(path.join(mapperFolderPath, 'success.json')) || [];
    }

    if (fs.existsSync(path.join(appMapperFolderPath, 'marketplace-apps.json'))) {
      self.installedExtensions = helper.readFile(path.join(appMapperFolderPath, 'marketplace-apps.json')) || {};
    }

    if (_.isEmpty(self.installedExtensions)) {
      self.installedExtensions = await getInstalledExtensions(config)
    }

    self.contentTypeUids = _.difference(self.contentTypeUids, self.createdContentTypeUids);
    self.uidToTitleMap = self.mapUidToTitle(self.contentTypes);
    // remove content types, already created
    _.remove(this.contentTypes, function (contentType) {
      return self.contentTypeUids.indexOf(contentType.uid) === -1;
    });

    return new Promise(function (resolve, reject) {
      if (self.contentTypes === undefined || _.isEmpty(self.contentTypes)) {
        addlogs(config, chalk.yellow('No Content types found'), 'success');
        return resolve({ empty: true })
      }
      return Promise.map(
        self.contentTypeUids,
        function (contentTypeUid) {
          return self
            .seedContentTypes(contentTypeUid, self.uidToTitleMap[contentTypeUid])
            .catch(reject);
        },
        {
          // seed 3 content types at a time
          concurrency: reqConcurrency,
        },
      )
        .then(function () {
          let batches = [];
          let lenObj = self.contentTypes;
          for (let i = 0; i < lenObj.length; i += Math.round(requestLimit / 3)) {
            batches.push(lenObj.slice(i, i + Math.round(requestLimit / 3)));
          }

          return Promise.map(
            batches,
            async function (batch) {
              return Promise.map(
                batch,
                async function (contentType) {
                  await self.updateContentTypes(contentType)
                  addlogs(config, contentType.uid + ' was updated successfully!', 'success');
                },
                {
                  concurrency: reqConcurrency,
                },
              ).catch((e) => {
                console.log('Something went wrong while migrating content type batch', e);
              });
            },
            {
              concurrency: reqConcurrency
            }
          ).then(async function () {
            // eslint-disable-next-line quotes
            if (field_rules_ct.length > 0) {
              await fsPromises.writeFile(
                contentTypesFolderPath + '/field_rules_uid.json',
                JSON.stringify(field_rules_ct),
              );
            }

            if (globalFieldPendingPath && globalFieldPendingPath.length !== 0) {
              return self
                .updateGlobalfields()
                .then(function () {
                  addlogs(config, chalk.green('Content types have been imported successfully!'), 'success');
                  return resolve();
                })
                .catch((_error) => {
                  addlogs(config, chalk.green('Error in GlobalFields'), 'success');
                  return reject();
                });
            }
            addlogs(config, chalk.green('Content types have been imported successfully!'), 'success');
            return resolve();
          }).catch((error) => {
            return reject(error);
          });
        })
        .catch((error) => {
          return reject(error);
        });
    });
  },
  seedContentTypes: function (uid, title) {
    let self = this;
    return new Promise(function (resolve, reject) {
      let body = _.cloneDeep(self.schemaTemplate);
      body.content_type.uid = uid;
      body.content_type.title = title;
      let requestObject = _.cloneDeep(self.requestOptions);
      requestObject.json = body;

      return stack
        .contentType()
        .create(requestObject.json)
        .then(resolve)
        .catch(function (err) {
          let error = JSON.parse(err.message);
          if (error.error_code === 115 && (error.errors.uid || error.errors.title)) {
            // content type uid already exists
            return resolve();
          }
          return reject(error);
        });
    });
  },
  updateContentTypes: function (contentType) {
    let self = this;
    return new Promise(function (resolve, reject) {
      setTimeout(async function () {
        let requestObject = _.cloneDeep(self.requestOptions);
        if (contentType.field_rules) {
          field_rules_ct.push(contentType.uid);
          delete contentType.field_rules;
        }

        supress(contentType.schema, config.preserveStackVersion, self.installedExtensions);
        requestObject.json.content_type = contentType;
        let contentTypeResponse = stack.contentType(contentType.uid);
        Object.assign(contentTypeResponse, _.cloneDeep(contentType));
        contentTypeResponse
          .update()
          .then((_updatedcontentType) => {
            return resolve();
          })
          .catch((err) => {
            addlogs(config, err, 'error');
            return reject(err);
          });
      }, 1000);
    });
  },

  updateGlobalfields: function () {
    let self = this;
    return new Promise(function (resolve, reject) {
      // eslint-disable-next-line no-undef
      return Promise.map(globalFieldPendingPath, async function (globalfield) {
        let Obj = _.find(self.globalfields, { uid: globalfield });

        supress(Obj.schema, config.preserveStackVersion, self.installedExtensions);
        let globalFieldObj = stack.globalField(globalfield);
        Object.assign(globalFieldObj, _.cloneDeep(Obj));
        return globalFieldObj
          .update()
          .then((globalFieldResponse) => {
            let updateObjpos = _.findIndex(globalFieldMapperFolderPath, function (successobj) {
              let global_field_uid = globalFieldResponse.uid;
              return global_field_uid === successobj;
            });
            globalFieldMapperFolderPath.splice(updateObjpos, 1, Obj);
            helper.writeFile(globalFieldUpdateFile, globalFieldMapperFolderPath);

            resolve(globalFieldResponse)
          })
          .catch(function (err) {
            let error = JSON.parse(err.message);
            // eslint-disable-next-line no-console
            addlogs(config, chalk.red('Global Field failed to update ' + JSON.stringify(error.errors)), 'error');
          })
          .catch(function (error) {
            // failed to update modified schemas back to their original form
            return reject(error);
          });
      });
    });
  },

  mapUidToTitle: function (contentTypes) {
    let result = {};
    contentTypes.forEach((ct) => {
      result[ct.uid] = ct.title;
    });
    return result;
  }
};

module.exports = new importContentTypes();
