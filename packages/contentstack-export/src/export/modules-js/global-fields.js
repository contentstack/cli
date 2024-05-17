/*!
 * Contentstack Export
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const { merge } = require('lodash');
const { formatError, log, fileHelper } = require('../../utils');
const { default: config } = require('../../config');
const { sanitizePath } = require('@contentstack/cli-utilities');

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

  constructor(exportConfig, stackAPIClient) {
    this.requestOptions = {
      qs: {
        skip: 0,
        limit: this.limit,
        asc: 'updated_at',
        include_count: true,
      },
    };
    this.config = merge(config, exportConfig);
    this.stackAPIClient = stackAPIClient;
    this.globalfieldsFolderPath = path.resolve(
      sanitizePath(this.config.data),
      sanitizePath(this.config.branchName || ''),
      sanitizePath(this.globalfieldsConfig.dirName),
    );
  }

  start() {
    const self = this;
    // Create folder for Global Fields
    mkdirp.sync(self.globalfieldsFolderPath);
    log(self.config, 'Starting Global Fields export', 'success');

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
        log(self.config, error, 'error');
        return reject(error);
      }
    });
  }

  getGlobalFields(skip, globalFieldConfig) {
    const self = this;
    self.requestOptions.qs.skip = skip;
    return new Promise(function (resolve, reject) {
      self.stackAPIClient
        .globalField()
        .query(self.requestOptions.qs)
        .find()
        .then((globalFieldResponse) => {
          try {
            if (globalFieldResponse.items.length === 0) {
              log(globalFieldConfig, 'No global fields found', 'success');
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
            if (skip >= globalFieldResponse.count) {
              return resolve();
            }
            return self.getGlobalFields(skip, globalFieldConfig).then(resolve).catch(reject);
          } catch (error) {
            log(globalFieldConfig, `Failed to export global-fields. ${formatError(error)}`, 'error');
            reject(error);
          }
        })
        .catch(reject);
    });
  }

  writeGlobalFields() {
    const self = this;
    return new Promise(function (resolve, reject) {
      try {
        fileHelper.writeFileSync(
          path.join(self.globalfieldsFolderPath, self.globalfieldsConfig.fileName),
          self.global_fields,
        );
        log(self.config, chalk.green('Global Fields export completed successfully'), 'success');

        resolve();
      } catch (error) {
        log(self.config, error, 'error');
        reject(error);
      }
    });
  }
};
