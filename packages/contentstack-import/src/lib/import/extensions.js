/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const chalk = require('chalk');
const { isEmpty, merge } = require('lodash');

const util = require('../util');
const helper = require('../util/fs');
const { addlogs } = require('../util/log');

let config = util.getConfig();

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
    addlogs(this.config, chalk.white('Migrating extensions'), 'success');

    const self = this;
    let extensionsFolderPath = path.resolve(this.config.data, this.extensionsConfig.dirName);
    let extMapperPath = path.resolve(this.config.data, 'mapper', 'extensions');
    let extUidMapperPath = path.resolve(this.config.data, 'mapper/extensions', 'uid-mapping.json');
    let extSuccessPath = path.resolve(this.config.data, 'extensions', 'success.json');
    let extFailsPath = path.resolve(this.config.data, 'extensions', 'fails.json');
    this.extensions = helper.readFileSync(path.resolve(extensionsFolderPath, this.extensionsConfig.fileName));
    if (fs.existsSync(extUidMapperPath)) {
      self.extUidMapper = helper.readFileSync(extUidMapperPath);
      self.extUidMapper = self.extUidMapper || {};
    }

    mkdirp.sync(extMapperPath);

    return new Promise(function (resolve, reject) {
      if (self.extensions === undefined || isEmpty(self.extensions)) {
        addlogs(self.config, chalk.white('No Extensions Found'), 'success');
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
                helper.writeFileSync(extUidMapperPath, self.extUidMapper);
              })
              .catch(function (err) {
                let error = JSON.parse(err.message);
                self.fails.push(ext);
                if (error.errors.title) {
                  addlogs(self.config, `Extension '${ext.title}' already exists`, 'error');
                } else {
                  addlogs(
                    config,
                    chalk.white(`Extension '${ext.title}' failed to be import\n ${JSON.stringify(error.errors)}`),
                    'error',
                  );
                }
              });
          }
          // the extensions has already been created
          addlogs(
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
          helper.writeFileSync(extSuccessPath, self.success);
          addlogs(self.config, chalk.green('Extensions have been imported successfully!'), 'success');
          resolve();
        })
        .catch(function (error) {
          // error while importing extensions
          helper.writeFileSync(extFailsPath, self.fails);
          addlogs(self.config, `Extension import failed ${util.formatError(error)}`, 'error');
          reject(error);
        });
    });
  }
};
