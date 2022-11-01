/* eslint-disable no-prototype-builtins */
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

let helper = require('../util/fs');
const { formatError } = require('../util');
let { addlogs } = require('../util/log');
let stack = require('../util/contentstack-management-sdk');
let config = require('../../config/default');
let { isEmpty, cloneDeep } = require('lodash');
let reqConcurrency = config.concurrency;
let langConfig = config.modules.locales;
let langFolderPath;
let langMapperPath;
let langUidMapperPath;
let langSuccessPath;
let langFailsPath;
let client;

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
    self.languages = helper.readFileSync(path.resolve(langFolderPath, langConfig.fileName));

    if (fs.existsSync(langUidMapperPath)) {
      self.langUidMapper = helper.readFileSync(langUidMapperPath);
      self.langUidMapper = self.langUidMapper || {};
    }

    return new Promise(function (resolve, reject) {
      if (self.languages === undefined || isEmpty(self.languages)) {
        addlogs(config, chalk.white('No Languages Found'), 'success');
        return resolve({ empty: true });
      }
      let langUids = Object.keys(self.languages);
      return Promise.map(
        langUids,
        function (langUid) {
          let lang = self.languages[langUid];
          if (!self.langUidMapper.hasOwnProperty(langUid) && lang.code !== masterLanguage) {
            let requestOption = {
              locale: {
                code: lang.code,
                name: lang.name,
              },
            };

            return client
              .stack({ api_key: config.target_stack, management_token: config.management_token })
              .locale()
              .create(requestOption)
              .then((locale) => {
                self.success.push(locale.items);
                self.langUidMapper[langUid] = locale.uid;
                helper.writeFileSync(langUidMapperPath, self.langUidMapper);
              })
              .catch(function (error) {
                let error = JSON.parse(err.message);
                if (error.hasOwnProperty('errorCode') && error.errorCode === 247) {
                  addlogs(config, error.errors.code[0], 'success');
                  return;
                }
                self.fails.push(lang);
                addlogs(config, `Language: ${lang.code} failed to be import ${formatError(error)}`, 'error');
              });
          } else {
            // the language has already been created
            addlogs(config, chalk.yellow("The language: '" + lang.code + "' already exists."), 'error');
          }
        },
        {
          concurrency: config.importConcurrency,
        },
      )
        .then(function () {
          // languages have imported successfully
          self
            .update_locales(langUids)
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
  update_locales: function (langUids) {
    let self = this;
    return new Promise(function (resolve, reject) {
      Promise.all(
        langUids.map(async (langUid) => {
          let lang = {};
          let requireKeys = config.modules.locales.requiredKeys;
          let _lang = self.languages[langUid];
          requireKeys.forEach((e) => {
            lang[e] = _lang[e];
          });
          let langobj = client
            .stack({ api_key: config.target_stack, management_token: config.management_token })
            .locale(lang.code);
          Object.assign(langobj, cloneDeep(lang));
          langobj.update().then(() => {
            // empty function
          });
        }),
      )
        .then(() => {
          return resolve();
        })
        .catch((error) => {
          return reject(error);
        });
    });
  },
};

module.exports = LocalesImport;
