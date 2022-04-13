/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp');
const path = require('path');
const chalk = require('chalk');

const stack = require('../util/contentstack-management-sdk');
const helper = require('../util/helper');
const { addlogs } = require('../util/log');

let config = require('../../config/default');
const limit = 100;
const validKeys = config.modules.globalfields.validKeys;
let globalfieldsFolderPath;
const globalfieldsConfig = config.modules.globalfields;
function ExportGlobalFields() {
  this.global_fields = [];
  this.requestOptions = {
    qs: {
      include_count: true,
      asc: 'updated_at',
      limit: limit,
    },
  };
  this.master = {};
  this.globalfields = {};
}

ExportGlobalFields.prototype = {
  start: function (credentialConfig) {
    this.master = {};
    this.globalfields = {};
    config = { ...config, ...credentialConfig };
    globalfieldsFolderPath = path.resolve(config.data, config.branchName || '', globalfieldsConfig.dirName);
    // Create folder for Global Fields
    mkdirp.sync(globalfieldsFolderPath);
    const self = this;
    addlogs(config, 'Starting Global Fields export', 'success');
    return new Promise(function (resolve, reject) {
      try {
        return self
          .getGlobalFields(null, config)
          .then(function (result) {
            if (!result) {
              return self
                .writeGlobalFields()
                .then(() => {
                  return resolve();
                })
                .catch((error) => {
                  return reject(error);
                });
            }
            return resolve();
          })
          .catch((error) => {
            return reject(error);
          });
      } catch (error) {
        return reject(error);
      }
    });
  },
  getGlobalFields: function (skip, globalFieldConfig) {
    const self = this;
    if (typeof skip !== 'number') {
      skip = 0;
      self.requestOptions.qs.skip = skip;
    } else {
      self.requestOptions.qs.skip = skip;
    }

    let client = stack.Client(globalFieldConfig);
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
                if (validKeys.indexOf(key) === -1) {
                  delete globalField[key];
                }
              }
              self.global_fields.push(globalField);
            });

            skip += limit;

            if (skip > globalFieldResponse.count) {
              return resolve();
            }

            return self.getGlobalFields(skip, globalFieldConfig).then(resolve).catch(reject);
          } catch (error) {
            return reject(error);
          }
        });
    });
  },
  writeGlobalFields: function () {
    const self = this;
    return new Promise(function (resolve) {
      helper.writeFile(path.join(globalfieldsFolderPath, globalfieldsConfig.fileName), self.global_fields);
      addlogs(config, chalk.green('Global Fields export completed successfully'), 'success');
      return resolve();
    });
  },
};

module.exports = new ExportGlobalFields();
