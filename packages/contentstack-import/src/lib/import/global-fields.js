/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

let fs = require('fs');
let path = require('path');
let chalk = require('chalk');
let mkdirp = require('mkdirp');
let Promise = require('bluebird');
const { isEmpty } = require('lodash');

let helper = require('../util/fs');
let { addlogs } = require('../util/log');
const { formatError } = require('../util');
let config = require('../../config/default');
const stack = require('../util/contentstack-management-sdk');
let extension_supress = require('../util/extensionsUidReplace');
let removeReferenceFields = require('../util/removeReferenceFields');
const { getInstalledExtensions } = require('../util/marketplace-app-helper');

global._globalField_pending = [];

module.exports = class ImportGlobalFields {
  fails = [];
  success = [];
  snipUidMapper = {};
  installedExtensions = [];
  reqConcurrency = config.concurrency || config.fetchConcurrency || 1;

  constructor(credential) {
    this.config = credential;
  }

  async start() {
    addlogs(this.config, chalk.white('Migrating global-fields'), 'success');

    let self = this;
    let globalfieldsConfig = config.modules.globalfields;
    let globalfieldsFolderPath = path.resolve(this.config.data, globalfieldsConfig.dirName);
    let appMapperFolderPath = path.join(this.config.data, 'mapper', 'marketplace_apps');
    let globalfieldsMapperPath = path.resolve(this.config.data, 'mapper', 'global_fields');
    let globalfieldsUidMapperPath = path.resolve(this.config.data, 'mapper', 'global_fields', 'uid-mapping.json');
    let globalfieldsSuccessPath = path.resolve(this.config.data, 'mapper', 'global_fields', 'success.json');
    let globalFieldsPending = path.resolve(this.config.data, 'mapper', 'global_fields', 'pending_global_fields.js');
    let globalfieldsFailsPath = path.resolve(this.config.data, 'mapper', 'global_fields', 'fails.json');
    self.globalfields = helper.readFileSync(path.resolve(globalfieldsFolderPath, globalfieldsConfig.fileName));

    if (fs.existsSync(globalfieldsUidMapperPath)) {
      self.snipUidMapper = helper.readFileSync(globalfieldsUidMapperPath);
      self.snipUidMapper = self.snipUidMapper || {};
    }

    if (!fs.existsSync(globalfieldsMapperPath)) {
      mkdirp.sync(globalfieldsMapperPath);
    }

    if (fs.existsSync(path.join(appMapperFolderPath, 'marketplace-apps.json'))) {
      self.installedExtensions = helper.readFileSync(path.join(appMapperFolderPath, 'marketplace-apps.json')) || {};
    }

    if (isEmpty(self.installedExtensions)) {
      self.installedExtensions = await getInstalledExtensions(self.config);
    }

    const client = stack.Client(self.config);
    return new Promise(function (resolve, reject) {
      if (self.globalfields === undefined || isEmpty(self.globalfields)) {
        addlogs(self.config, chalk.white('No globalfields Found'), 'success');
        helper.writeFileSync(globalFieldsPending, _globalField_pending);
        return resolve({ empty: true });
      }
      let snipUids = Object.keys(self.globalfields);
      return Promise.map(
        snipUids,
        function (snipUid) {
          let flag = { supressed: false };
          let snip = self.globalfields[snipUid];
          extension_supress(snip.schema, self.config.preserveStackVersion, self.installedExtensions);
          removeReferenceFields(snip.schema, flag);

          if (flag.supressed) {
            // eslint-disable-next-line no-undef
            _globalField_pending.push(snip.uid);
          }

          if (!self.snipUidMapper.hasOwnProperty(snipUid)) {
            let requestOption = { global_field: snip };
            return client
              .stack({ api_key: self.config.target_stack, management_token: self.config.management_token })
              .globalField()
              .create(requestOption)
              .then((globalField) => {
                self.success.push(globalField.items);
                let global_field_uid = globalField.uid;
                self.snipUidMapper[snipUid] = globalField.items;
                helper.writeFileSync(globalfieldsUidMapperPath, self.snipUidMapper);
                addlogs(
                  self.config,
                  chalk.green('Global field ' + global_field_uid + ' created successfully'),
                  'success',
                );
              })
              .catch(function (err) {
                let error = JSON.parse(err.message);
                if (error.errors.title) {
                  // eslint-disable-next-line no-undef
                  addlogs(self.config, chalk.white(snip.uid + ' globalfield already exists'), 'error');
                } else {
                  addlogs(self.config, chalk.red(`Globalfield failed to import ${formatError(error)}`), 'error');
                }

                self.fails.push(snip);
              });
          } else {
            // globalfields has already been created
            addlogs(
              self.config,
              chalk.white('The globalfields already exists. Skipping it to avoid duplicates!'),
              'success',
            );
          }
          // import 2 globalfields at a time
        },
        { concurrency: self.reqConcurrency },
      )
        .then(function () {
          // globalfields have imported successfully
          helper.writeFileSync(globalfieldsSuccessPath, self.success);
          helper.writeFileSync(globalFieldsPending, _globalField_pending);
          addlogs(self.config, chalk.green('globalfields have been imported successfully!'), 'success');
          return resolve();
        })
        .catch(function (err) {
          let error = JSON.parse(err);
          // error while importing globalfields
          addlogs(self.config, err, 'error');
          helper.writeFileSync(globalfieldsFailsPath, self.fails);
          addlogs(self.config, chalk.red('globalfields import failed'), 'error');
          return reject(error);
        });
    });
  }
};
