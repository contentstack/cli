/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');

const helper = require('../util/helper');
const { addlogs } = require('../util/log');
const { formatError } = require('../util');
let config = require('../../config/default');
const stack = require('../util/contentstack-management-sdk');

module.exports = class ExportGlobalFields {
  limit = 100;
  config = {};
  global_fields = [];
  master = {};
  globalfields = {};
  requestOptions = {};
  globalfieldsFolderPath;
  globalfieldsConfig = config.modules.globalfields;
  validKeys = config.modules.globalfields.validKeys;

  constructor(credentialConfig) {
    this.requestOptions = {
      qs: {
        skip: 0,
        limit: this.limit,
        asc: 'updated_at',
        include_count: true,
      },
    };
    this.config = { ...config, ...credentialConfig };
    this.globalfieldsFolderPath = path.resolve(
      this.config.data,
      this.config.branchName || '',
      this.globalfieldsConfig.dirName,
    );
  }

  start() {
    const self = this;
    // Create folder for Global Fields
    mkdirp.sync(self.globalfieldsFolderPath);
    addlogs(self.config, 'Starting Global Fields export', 'success');

    return new Promise(function (resolve, reject) {
      try {
        return self
          .getGlobalFields(0, self.config)
          .then(function (result) {
            if (!result) {
              return self.writeGlobalFields().then(resolve).catch(reject);
            }
            return resolve();
          })
          .catch(reject);
      } catch (error) {
        addlogs(self.config, error, 'error');
        return reject(error);
      }
    });
  }

  getGlobalFields(skip, globalFieldConfig) {
    const self = this;
    let client = stack.Client(globalFieldConfig);

    self.requestOptions.qs.skip = skip;

    return new Promise(function (resolve, reject) {
      client
        .stack({
          api_key: globalFieldConfig.source_stack,
          management_token: globalFieldConfig.management_token,
        })
        .globalField()
        .query(self.requestOptions.qs)
        .find()
        .then((globalFieldResponse) => {
          try {
            if (globalFieldResponse.items.length === 0) {
              addlogs(globalFieldConfig, 'No global fields found', 'success');
              return resolve('No Global Fields');
            }
            globalFieldResponse.items.forEach(function (globalField) {
              for (const key in globalField) {
                if (self.validKeys.indexOf(key) === -1) {
                  delete globalField[key];
                }
              }
              self.global_fields.push(globalField);
            });

            skip += self.limit;

            if (skip > globalFieldResponse.count) {
              return resolve();
            }

            return self.getGlobalFields(skip, globalFieldConfig).then(resolve).catch(reject);
          } catch (error) {
            addlogs(globalFieldConfig, chalk.red(`Failed to export global-fields ${formatError(error)}`), 'error');
            reject(error);
          }
        });
    });
  }

  writeGlobalFields() {
    const self = this;
    return new Promise(function (resolve, reject) {
      try {
        helper.writeFileSync(path.join(self.globalfieldsFolderPath, self.globalfieldsConfig.fileName), self.global_fields);
        addlogs(self.config, chalk.green('Global Fields export completed successfully'), 'success');

        resolve();
      } catch (error) {
        addlogs(self.config, error, 'error');
        reject(error);
      }
    });
  }
};
