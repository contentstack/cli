/* eslint-disable no-prototype-builtins */
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
let { isEmpty, merge, cloneDeep } = require('lodash');

let helper = require('../util/fs');
const { formatError } = require('../util');
let { addlogs } = require('../util/log');
const { formatError } = require('../util');
let config = require('../../config/default');
let stack = require('../util/contentstack-management-sdk');

let masterLanguage = config.master_locale;
function LocalesImport() {
  this.fails = [];
  this.success = [];
  this.langUidMapper = {};
}

LocalesImport.prototype = {
  start: function (credentialConfig) {
    addlogs(config, 'Migrating languages', 'success');
    let self = this;
    config = credentialConfig;
    client = stack.Client(config);
    langFolderPath = path.resolve(config.data, langConfig.dirName);
    langMapperPath = path.resolve(config.data, 'mapper', 'languages');
    langUidMapperPath = path.resolve(config.data, 'mapper', 'languages', 'uid-mapper.json');
    langSuccessPath = path.resolve(config.data, 'mapper', 'languages', 'success.json');
    langFailsPath = path.resolve(config.data, 'mapper', 'languages', 'fails.json');

    mkdirp.sync(langMapperPath);

    if (fs.existsSync(langUidMapperPath)) {
      self.langUidMapper = helper.readFileSync(langUidMapperPath);
      self.langUidMapper = self.langUidMapper || {};
    }

    return new Promise(function (resolve, reject) {
      if (self.languages === undefined || isEmpty(self.languages)) {
        addlogs(self.config, chalk.white('No Languages Found'), 'success');
        return resolve({ empty: true });
      }
      let langUids = Object.keys(self.languages);
      return Promise.map(
        langUids,
        function (langUid) {
          let lang = self.languages[langUid];
          if (!self.langUidMapper.hasOwnProperty(langUid) && lang.code !== self.masterLanguage) {
            let requestOption = {
              locale: {
                code: lang.code,
                name: lang.name,
              },
            };

            return self.client
              .stack({ api_key: self.config.target_stack, management_token: self.config.management_token })
              .locale()
              .create(requestOption)
              .then((locale) => {
                self.success.push(locale.items);
                self.langUidMapper[langUid] = locale.uid;
                helper.writeFileSync(langUidMapperPath, self.langUidMapper);
              })
              .catch(function (err) {
                let error = JSON.parse(err.message);
                if (error.hasOwnProperty('errorCode') && error.errorCode === 247) {
                  addlogs(self.config, error.errors.code[0], 'success');
                  return err;
                }
                self.fails.push(lang);
                addlogs(config, `Language: ${lang.code} failed to be import ${formatError(err)}`, 'error');
              });
          } else {
            // the language has already been created
            addlogs(self.config, chalk.yellow("The language: '" + lang.code + "' already exists."), 'error');
          }
        },
        {
          concurrency: config.importConcurrency,
        },
      )
        .then(function () {
          // languages have imported successfully
          self
            .updateLocales(langUids)
            .then(() => {
              helper.writeFileSync(langSuccessPath, self.success);
              addlogs(config, chalk.green('Languages have been imported successfully!'), 'success');
              return resolve();
            })
            .catch(function (error) {
              addlogs(config, formatError(error), 'error');
              return reject('Error while updating the locales');
            });
        })
        .catch(function (error) {
          // error while importing languages
          helper.writeFileSync(langFailsPath, self.fails);
          addlogs(config, formatError(error), 'error');
          return reject('Failed to import locales');
        });
    });
  },
  updateLocales: function (langUids) {
    let self = this;
    return new Promise(function (resolve, reject) {
      Promise.all(
        langUids.map(async (langUid) => {
          let lang = {};
          let requireKeys = self.config.modules.locales.requiredKeys;
          let _lang = self.languages[langUid];
          requireKeys.forEach((e) => {
            lang[e] = _lang[e];
          });
          let langobj = self.client
            .stack({ api_key: self.config.target_stack, management_token: self.config.management_token })
            .locale(lang.code);
          Object.assign(langobj, cloneDeep(lang));
          langobj.update().then(() => {
            // empty function
          });
        }),
      )
        .then(resolve)
        .catch((error) => {
          addlogs(self.config, formatError(error), 'error');
          reject(error);
        });
    });
  },
};

module.exports = LocalesImport;
