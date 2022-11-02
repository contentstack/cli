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
let { addlogs } = require('../util/log');
const { formatError } = require('../util');
let config = require('../../config/default');
let stack = require('../util/contentstack-management-sdk');

module.exports = class ImportLanguages {
  client;
  fails = [];
  success = [];
  langUidMapper = {};
  masterLanguage = config.master_locale;
  langConfig = config.modules.locales;
  reqConcurrency = config.concurrency || config.fetchConcurrency || 1;

  constructor(credentialConfig) {
    this.config = merge(config, credentialConfig);
    this.client = stack.Client(this.config);
  }

  start() {
    addlogs(this.config, 'Migrating languages', 'success');

    const self = this;
    let langMapperPath = path.resolve(this.config.data, 'mapper', 'languages');
    let langFolderPath = path.resolve(this.config.data, this.langConfig.dirName);
    let langFailsPath = path.resolve(this.config.data, 'mapper', 'languages', 'fails.json');
    let langSuccessPath = path.resolve(this.config.data, 'mapper', 'languages', 'success.json');
    let langUidMapperPath = path.resolve(this.config.data, 'mapper', 'languages', 'uid-mapper.json');
    self.languages = helper.readFileSync(path.resolve(langFolderPath, this.langConfig.fileName));

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
                addlogs(self.config, chalk.red("Language: '" + lang.code + "' failed to be import\n"), 'error');
                addlogs(self.config, formatError(err), 'error');
              });
          } else {
            // the language has already been created
            addlogs(self.config, chalk.yellow("The language: '" + lang.code + "' already exists."), 'error');
          }

          // import 2 languages at a time
        },
        { concurrency: self.reqConcurrency },
      )
        .then(function () {
          // languages have imported successfully
          self
            .updateLocales(langUids)
            .then(() => {
              helper.writeFileSync(langSuccessPath, self.success);
              addlogs(self.config, chalk.green('Languages have been imported successfully!'), 'success');
              resolve();
            })
            .catch(function (error) {
              addlogs(self.config, formatError(error), 'error');
              reject(error);
            });
        })
        .catch(function (error) {
          // error while importing languages
          helper.writeFileSync(langFailsPath, self.fails);
          addlogs(self.config, chalk.red('Language import failed'), 'error');
          addlogs(self.config, formatError(error), 'error');
          reject(error);
        });
    });
  }

  updateLocales(langUids) {
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
  }
};
