/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp');
const path = require('path');
const chalk = require('chalk');

const helper = require('../util/helper');
const { addlogs } = require('../util/log');
let config = require('../../config/default');
let localeConfig = config.modules.locales;
const masterLocale = config.master_locale;
let requiredKeys = localeConfig.requiredKeys;
let stack = require('../util/contentstack-management-sdk');
let client;
function ExportLocales() {
  this.qs = {
    include_count: true,
    asc: 'updated_at',
    query: {
      code: {
        $nin: [masterLocale.code],
      },
    },
    only: {
      BASE: requiredKeys,
    },
  };
  this.locales = {};
}

ExportLocales.prototype.start = function (credentialConfig) {
  this.locales = {};
  addlogs(credentialConfig, 'Starting locale export', 'success');
  let self = this;
  config = credentialConfig;
  self.localesFolderPath = path.resolve(config.data, config.branchName || '', localeConfig.dirName);
  mkdirp.sync(self.localesFolderPath);
  client = stack.Client(config);
  const apiDetails = {
    limit: 100,
    skip: 0,
    include_count: true,
  };
  return self.getLocales(apiDetails);
};

ExportLocales.prototype.getLocales = function (apiDetails) {
  let self = this;

  return new Promise(function (resolve, reject) {
    client
      .stack({ api_key: config.source_stack, management_token: config.management_token })
      .locale()
      .query({ ...self.qs, ...apiDetails })
      .find()
      .then((localeResponse) => {
        if (localeResponse.items.length !== 0) {
          localeResponse.items.forEach(function (locale) {
            addlogs(config, locale.name + ' locale was exported successfully', 'success');
            for (const key in locale) {
              if (requiredKeys.indexOf(key) === -1) {
                delete locale[key];
              }
            }
            self.locales[locale.uid] = locale;
          });

          helper.writeFile(path.join(self.localesFolderPath, localeConfig.fileName), self.locales);

          apiDetails.skip += apiDetails.limit;

          if (apiDetails.skip > localeResponse.count) {
            addlogs(config, chalk.green('All the locales have been exported successfully'), 'success');
            return resolve();
          }

          return self
            .getLocales(apiDetails)
            .then(resolve)
            .catch((error) => {
              console.log('Get locales errror', error && error.message);
            });
        } else if (localeResponse.items.length === 0) {
          addlogs(config, 'No languages found except the master language', 'success');
          helper.writeFile(path.join(self.localesFolderPath, localeConfig.fileName), self.locales);
          return resolve();
        }
      })
      .catch((error) => {
        addlogs(config, error, 'error');
        return reject(error);
      });
  });
};

module.exports = ExportLocales;
