/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

let fs = require('fs');
let path = require('path');
let chalk = require('chalk');
let mkdirp = require('mkdirp');
let Promise = require('bluebird');
const { isEmpty, merge } = require('lodash');
let { default: config } = require('../../config');
const { fileHelper, log, formatError, lookupExtension, removeReferenceFields } = require('../../utils');

global._globalField_pending = [];

module.exports = class ImportGlobalFields {
  fails = [];
  success = [];
  snipUidMapper = {};
  installedExtensions = [];
  reqConcurrency = config.concurrency || config.fetchConcurrency || 1;

  constructor(importConfig, stackAPIClient) {
    this.config = merge(config, importConfig);
    this.stackAPIClient = stackAPIClient;
  }

  async start() {
    log(this.config, chalk.white('Migrating global-fields'), 'success');

    let self = this;
    let globalfieldsConfig = config.modules.globalfields;
    let globalfieldsFolderPath = path.resolve(this.config.data, globalfieldsConfig.dirName);
    let globalfieldsMapperPath = path.resolve(this.config.data, 'mapper', 'global_fields');
    let globalfieldsUidMapperPath = path.resolve(this.config.data, 'mapper', 'global_fields', 'uid-mapping.json');
    let globalfieldsSuccessPath = path.resolve(this.config.data, 'mapper', 'global_fields', 'success.json');
    let globalFieldsPending = path.resolve(this.config.data, 'mapper', 'global_fields', 'pending_global_fields.js');
    let globalfieldsFailsPath = path.resolve(this.config.data, 'mapper', 'global_fields', 'fails.json');
    self.globalfields = fileHelper.readFileSync(path.resolve(globalfieldsFolderPath, globalfieldsConfig.fileName));
    const appMapperPath = path.join(this.config.data, 'mapper', 'marketplace_apps', 'uid-mapping.json');
    this.installedExtensions = ((await fileHelper.readFileSync(appMapperPath)) || { extension_uid: {} }).extension_uid;
    if (fs.existsSync(globalfieldsUidMapperPath)) {
      self.snipUidMapper = fileHelper.readFileSync(globalfieldsUidMapperPath);
      self.snipUidMapper = self.snipUidMapper || {};
    }

    if (!fs.existsSync(globalfieldsMapperPath)) {
      mkdirp.sync(globalfieldsMapperPath);
    }

    return new Promise(function (resolve, reject) {
      if (self.globalfields === undefined || isEmpty(self.globalfields)) {
        log(self.config, chalk.white('No globalfields Found'), 'success');
        fileHelper.writeFileSync(globalFieldsPending, _globalField_pending);
        return resolve({ empty: true });
      }
      let snipUids = Object.keys(self.globalfields);
      return Promise.map(
        snipUids,
        async function (snipUid) {
          let flag = { supressed: false };
          let snip = self.globalfields[snipUid];
          lookupExtension(self.config, snip.schema, self.config.preserveStackVersion, self.installedExtensions);
          await removeReferenceFields(snip.schema, flag, self.stackAPIClient);

          if (flag.supressed) {
            // eslint-disable-next-line no-undef
            _globalField_pending.push(snip.uid);
          }

          if (!self.snipUidMapper.hasOwnProperty(snipUid)) {
            let requestOption = { global_field: snip };
            return self.stackAPIClient
              .globalField()
              .create(requestOption)
              .then((globalField) => {
                self.success.push(globalField.items);
                let global_field_uid = globalField.uid;
                self.snipUidMapper[snipUid] = globalField.items;
                fileHelper.writeFileSync(globalfieldsUidMapperPath, self.snipUidMapper);
                log(self.config, chalk.green('Global field ' + global_field_uid + ' created successfully'), 'success');
              })
              .catch(function (err) {
                let error = JSON.parse(err.message);
                if (error.errors.title) {
                  // eslint-disable-next-line no-undef
                  log(self.config, `Globalfield '${snip.uid} already exists'`, 'error');
                } else {
                  log(self.config, chalk.red(`Globalfield '${snip.title}' failed to import. ${formatError(error)}`), 'error');
                }

                self.fails.push(snip);
              });
          } else {
            // globalfields has already been created
            log(
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
          fileHelper.writeFileSync(globalfieldsSuccessPath, self.success);
          fileHelper.writeFileSync(globalFieldsPending, _globalField_pending);
          log(self.config, chalk.green('globalfields have been imported successfully!'), 'success');
          return resolve();
        })
        .catch(function (err) {
          let error = JSON.parse(err);
          fileHelper.writeFileSync(globalfieldsFailsPath, self.fails);
          log(self.config, `Globalfields import failed. ${formatError(err)}`, 'error');
          return reject(error);
        });
    });
  }
};
