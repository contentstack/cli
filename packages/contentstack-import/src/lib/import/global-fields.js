/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

let mkdirp = require('mkdirp');
let fs = require('fs');
let path = require('path');
let Promise = require('bluebird');
let chalk = require('chalk');
const { isEmpty } = require('lodash');

let helper = require('../util/fs');
let { addlogs } = require('../util/log');
let extension_supress = require('../util/extensionsUidReplace');
let removeReferenceFields = require('../util/removeReferenceFields');
const stack = require('../util/contentstack-management-sdk');
const { getInstalledExtensions } = require('../util/marketplace-app-helper');

let config = require('../../config/default');
let reqConcurrency = config.concurrency;
let globalfieldsConfig = config.modules.globalfields;
let globalfieldsFolderPath;
let globalfieldsMapperPath;
let globalfieldsUidMapperPath;
let globalfieldsSuccessPath;
let globalfieldsFailsPath;
let client;
let globalFieldsPending;

global._globalField_pending = [];

function importGlobalFields() {
  this.fails = [];
  this.success = [];
  this.snipUidMapper = {};
  this.requestOptions = {
    uri: config.host + config.apis.globalfields,
    headers: config.headers,
    method: 'POST',
  };
  this.installedExtensions = [];
}

importGlobalFields.prototype = {
  start: async function (credential) {
    addlogs(config, chalk.white('Migrating global-fields'), 'success');
    let self = this;
    config = credential;
    globalfieldsFolderPath = path.resolve(config.data, globalfieldsConfig.dirName);
    globalfieldsMapperPath = path.resolve(config.data, 'mapper', 'global_fields');
    globalfieldsUidMapperPath = path.resolve(config.data, 'mapper', 'global_fields', 'uid-mapping.json');
    globalfieldsSuccessPath = path.resolve(config.data, 'mapper', 'global_fields', 'success.json');
    globalFieldsPending = path.resolve(config.data, 'mapper', 'global_fields', 'pending_global_fields.js');
    globalfieldsFailsPath = path.resolve(config.data, 'mapper', 'global_fields', 'fails.json');
    self.globalfields = helper.readFileSync(path.resolve(globalfieldsFolderPath, globalfieldsConfig.fileName));
    const appMapperFolderPath = path.join(config.data, 'mapper', 'marketplace_apps');

    if (fs.existsSync(globalfieldsUidMapperPath)) {
      self.snipUidMapper = helper.readFileSync(globalfieldsUidMapperPath);
      self.snipUidMapper = this.snipUidMapper || {};
    }

    if (!fs.existsSync(globalfieldsMapperPath)) {
      mkdirp.sync(globalfieldsMapperPath);
    }

    if (fs.existsSync(path.join(appMapperFolderPath, 'marketplace-apps.json'))) {
      self.installedExtensions = helper.readFileSync(path.join(appMapperFolderPath, 'marketplace-apps.json')) || {};
    }

    if (isEmpty(self.installedExtensions)) {
      self.installedExtensions = await getInstalledExtensions(config);
    }

    client = stack.Client(config);
    return new Promise(function (resolve, reject) {
      if (self.globalfields === undefined || isEmpty(self.globalfields)) {
        addlogs(config, chalk.white('No globalfields Found'), 'success');
        helper.writeFile(globalFieldsPending, _globalField_pending);
        return resolve({ empty: true });
      }
      let snipUids = Object.keys(self.globalfields);
      return Promise.map(
        snipUids,
        function (snipUid) {
          let flag = {
            supressed: false,
          };
          let snip = self.globalfields[snipUid];
          extension_supress(snip.schema, config.preserveStackVersion, self.installedExtensions);
          removeReferenceFields(snip.schema, flag);

          if (flag.supressed) {
            // eslint-disable-next-line no-undef
            _globalField_pending.push(snip.uid);
          }

          if (!self.snipUidMapper.hasOwnProperty(snipUid)) {
            let requestOption = {
              global_field: snip,
            };
            return client
              .stack({ api_key: config.target_stack, management_token: config.management_token })
              .globalField()
              .create(requestOption)
              .then((globalField) => {
                self.success.push(globalField.items);
                let global_field_uid = globalField.uid;
                self.snipUidMapper[snipUid] = globalField.items;
                helper.writeFile(globalfieldsUidMapperPath, self.snipUidMapper);
                addlogs(config, chalk.green('Global field ' + global_field_uid + ' created successfully'), 'success');
              })
              .catch(function (err) {
                let error = JSON.parse(err.message);
                if (error.errors.title) {
                  // eslint-disable-next-line no-undef
                  addlogs(config, chalk.white(snip.uid + ' globalfield already exists'), 'error');
                } else {
                  addlogs(config, chalk.red('Globalfield failed to import ' + JSON.stringify(error.errors)), 'error');
                }
                self.fails.push(snip);
              });
          } else {
            // globalfields has already been created
            addlogs(
              config,
              chalk.white('The globalfields already exists. Skipping it to avoid duplicates!'),
              'success',
            );
          }
          // import 2 globalfields at a time
        },
        {
          concurrency: reqConcurrency,
        },
      )
        .then(function () {
          // globalfields have imported successfully
          helper.writeFile(globalfieldsSuccessPath, self.success);
          helper.writeFile(globalFieldsPending, _globalField_pending);
          addlogs(config, chalk.green('globalfields have been imported successfully!'), 'success');
          return resolve();
        })
        .catch(function (err) {
          let error = JSON.parse(err);
          // error while importing globalfields
          helper.writeFile(globalfieldsFailsPath, self.fails);
          addlogs(config, chalk.red('globalfields import failed'), 'error');
          return reject(error);
        });
    });
  },
};

module.exports = new importGlobalFields();
