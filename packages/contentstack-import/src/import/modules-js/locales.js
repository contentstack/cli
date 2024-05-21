/* eslint-disable no-prototype-builtins */
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
let { isEmpty, merge, cloneDeep } = require('lodash');
const { cliux } = require('@contentstack/cli-utilities');
let { default: config } = require('../../config');
const { fileHelper, log, formatError } = require('../../utils');
module.exports = class ImportLanguages {
  constructor(importConfig, stackAPIClient) {
    this.config = merge(config, importConfig);
    this.stackAPIClient = stackAPIClient;
    this.fails = [];
    this.success = [];
    this.langUidMapper = {};
    this.masterLanguage = importConfig.master_locale?.code;
    this.langConfig = importConfig.modules.locales;
    this.sourceMasterLangConfig = config.modules.masterLocale;
    this.reqConcurrency = importConfig.concurrency || importConfig.fetchConcurrency || 1;
  }

  start() {
    log(this.config, 'Migrating languages', 'success');

    const self = this;
    let langMapperPath = path.resolve(this.config.data, 'mapper', 'languages');
    let langFolderPath = path.resolve(this.config.data, this.langConfig.dirName);
    let langFailsPath = path.resolve(this.config.data, 'mapper', 'languages', 'fails.json');
    let langUidMapperPath = path.resolve(this.config.data, 'mapper', 'languages', 'uid-mapper.json');
    self.langSuccessPath = path.resolve(this.config.data, 'mapper', 'languages', 'success.json');
    self.languages = fileHelper.readFileSync(path.resolve(langFolderPath, this.langConfig.fileName));
    self.sourceMasterLanguages = fileHelper.readFileSync(
      path.resolve(langFolderPath, this.sourceMasterLangConfig.fileName),
    );
    mkdirp.sync(langMapperPath);

    if (fs.existsSync(langUidMapperPath)) {
      self.langUidMapper = fileHelper.readFileSync(langUidMapperPath);
      self.langUidMapper = self.langUidMapper || {};
    }

    return new Promise(async function (resolve, reject) {
      if (self.languages === undefined || isEmpty(self.languages)) {
        log(self.config, chalk.white('No Languages Found'), 'success');
        return resolve({ empty: true });
      }

      let sourceMasterLangDetails = self.sourceMasterLanguages && Object.values(self.sourceMasterLanguages);
      if (
        sourceMasterLangDetails &&
        sourceMasterLangDetails[0] &&
        sourceMasterLangDetails[0]['code'] &&
        self.masterLanguage['code'] === sourceMasterLangDetails[0]['code']
      ) {
        await self.checkAndUpdateMasterLocaleName(sourceMasterLangDetails).catch((error) => {
          log(self.config, formatError(error), 'warn');
        });
      }

      let langUids = Object.keys(self.languages);
      return Promise.map(
        langUids,
        (langUid) => {
          let lang = self.languages[langUid];
          if (!self.langUidMapper.hasOwnProperty(langUid) && lang.code !== self.masterLanguage) {
            let requestOption = {
              locale: {
                code: lang.code,
                name: lang.name,
              },
            };

            return self.stackAPIClient
              .locale()
              .create(requestOption)
              .then((locale) => {
                self.success.push(locale.items);
                self.langUidMapper[langUid] = locale.uid;
                fileHelper.writeFileSync(langUidMapperPath, self.langUidMapper);
              })
              .catch(function (err) {
                let error = JSON.parse(err.message);
                if (error.hasOwnProperty('errorCode') && error.errorCode === 247) {
                  if(error?.errors?.code){
                    log(self.config, error.errors.code[0], 'error');
                  }else{
                    log(self.config, err, 'error');
                  }
                  return err;
                }
                self.fails.push(lang);
                log(self.config, `Language '${lang.code}' failed to import\n`, 'error');
                log(self.config, formatError(err), 'error');
              });
          } else {
            // the language has already been created
            log(self.config, `The language '${lang.code}' already exists.`, 'error');
          }

          return Promise.resolve();
          // import 2 languages at a time
        },
        { concurrency: self.reqConcurrency },
      )
        .then(function () {
          // languages have imported successfully
          return self
            .updateLocales(langUids)
            .then(() => {
              fileHelper.writeFileSync(self.langSuccessPath, self.success);
              log(self.config, chalk.green('Languages have been imported successfully!'), 'success');
              resolve();
            })
            .catch(function (error) {
              log(self.config, formatError(error), 'error');
              reject(error);
            });
        })
        .catch(function (error) {
          // error while importing languages
          fileHelper.writeFileSync(langFailsPath, self.fails);
          log(self.config, `Language import failed. ${formatError(error)}`, 'error');
          reject('failed to import Languages');
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
          let langobj = self.stackAPIClient.locale(lang.code);
          Object.assign(langobj, cloneDeep(lang));
          langobj.update().then(() => {
            // empty function
          });
        }),
      )
        .then(resolve)
        .catch((error) => {
          log(self.config, formatError(error), 'error');
          reject(error);
        });
    });
  }

  checkAndUpdateMasterLocaleName(sourceMasterLangDetails) {
    let self = this;
    return new Promise(async function (resolve, reject) {
      let masterLangDetails = await self.stackAPIClient
        .locale(self.masterLanguage['code'])
        .fetch()
        .catch((error) => {
          log(self.config, formatError(error), 'warn');
        });
      if (
        masterLangDetails &&
        masterLangDetails['name'] &&
        sourceMasterLangDetails[0]['name'] &&
        masterLangDetails['name'].toString().toUpperCase() !==
          sourceMasterLangDetails[0]['name'].toString().toUpperCase()
      ) {
        cliux.print('WARNING!!! The master language name for the source and destination is different.', {
          color: 'yellow',
        });
        cliux.print(`Old Master language name: ${masterLangDetails['name']}`, { color: 'red' });
        cliux.print(`New Master language name: ${sourceMasterLangDetails[0]['name']}`, { color: 'green' });
        let confirm = await cliux.inquire({
          type: 'confirm',
          message: 'Are you sure you want to update name of master language?',
          name: 'confirmation',
        });

        if (confirm) {
          let languid = sourceMasterLangDetails[0] && sourceMasterLangDetails[0]['uid'];
          let lang = self.sourceMasterLanguages[languid];
          if (!lang) return reject('Locale not found.!');
          const langObj = self.stackAPIClient.locale(lang.code);
          Object.assign(langObj, { name: lang.name });
          langObj
            .update()
            .then(() => {
              fileHelper.writeFileSync(self.langSuccessPath, self.success);
              log(self.config, chalk.green('Master Languages name have been updated successfully!'), 'success');
              resolve();
            })
            .catch(function (error) {
              reject(error);
            });
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    });
  }
};
