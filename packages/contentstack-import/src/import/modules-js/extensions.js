/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const chalk = require('chalk');
const { isEmpty, merge } = require('lodash');
const { default: config } = require('../../config');
const { fileHelper, log, formatError } = require('../../utils');

module.exports = class ImportExtensions {
  fails = [];
  success = [];
  extUidMapper = {};
  extensionsConfig = config.modules.extensions;
  reqConcurrency = config.concurrency || config.fetchConcurrency || 1;

  constructor(importConfig, stackAPIClient) {
    this.config = merge(config, importConfig);
    this.stackAPIClient = stackAPIClient;
  }

  start() {
    log(this.config, chalk.white('Migrating extensions'), 'success');

    const self = this;
    let extensionsFolderPath = path.resolve(this.config.data, this.extensionsConfig.dirName);
    let extMapperPath = path.resolve(this.config.data, 'mapper', 'extensions');
    let extUidMapperPath = path.resolve(this.config.data, 'mapper/extensions', 'uid-mapping.json');
    let extSuccessPath = path.resolve(this.config.data, 'extensions', 'success.json');
    let extFailsPath = path.resolve(this.config.data, 'extensions', 'fails.json');
    this.extensions = fileHelper.readFileSync(path.resolve(extensionsFolderPath, this.extensionsConfig.fileName));
    if (fs.existsSync(extUidMapperPath)) {
      self.extUidMapper = fileHelper.readFileSync(extUidMapperPath);
      self.extUidMapper = self.extUidMapper || {};
    }

    mkdirp.sync(extMapperPath);

    return new Promise(function (resolve, reject) {
      if (self.extensions === undefined || isEmpty(self.extensions)) {
        log(self.config, chalk.white('No Extensions Found'), 'success');
        return resolve({ empty: true });
      }
      let extUids = Object.keys(self.extensions);
      return Promise.map(
        extUids,
        function (extUid) {
          let ext = self.extensions[extUid];
          if (!self.extUidMapper.hasOwnProperty(extUid)) {
            return self.stackAPIClient
              .extension()
              .create({ extension: ext })
              .then((response) => {
                self.success.push(response);
                self.extUidMapper[extUid] = response.uid;
                fileHelper.writeFileSync(extUidMapperPath, self.extUidMapper);
              })
              .catch(function (err) {
                let error = JSON.parse(err.message);
                self.fails.push(ext);
                if (error.errors.title) {
                  log(self.config, `Extension '${ext.title}' already exists`, 'error');
                } else {
                  log(self.config, "Extension: '" + ext.title + "' failed to import" + formatError(error), 'error');
                }
              });
          }
          // the extensions has already been created
          log(
            config,
            chalk.white("The extension: '" + ext.title + "' already exists. Skipping it to avoid duplicates!"),
            'success',
          );
          // import 2 extensions at a time
        },
        {
          concurrency: self.reqConcurrency,
        },
      )
        .then(function () {
          // extensions have imported successfully
          fileHelper.writeFileSync(extSuccessPath, self.success);
          log(self.config, chalk.green('Extensions have been imported successfully!'), 'success');
          resolve();
        })
        .catch(function (error) {
          // error while importing extensions
          fileHelper.writeFileSync(extFailsPath, self.fails);
          log(self.config, `Extension import failed ${formatError(error)}`, 'error');
          reject(error);
        });
    });
  }
};
