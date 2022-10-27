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
const { isEmpty } = require('lodash');

const helper = require('../util/fs');
const { addlogs } = require('../util/log');
const util = require('../util');

let config = util.getConfig();
const reqConcurrency = config.concurrency;
const extensionsConfig = config.modules.extensions;
const stack = require('../util/contentstack-management-sdk');
let extensionsFolderPath;
let extMapperPath;
let extUidMapperPath;
let extSuccessPath;
let extFailsPath;
let client;

function importExtensions() {
  this.fails = [];
  this.success = [];
  this.extUidMapper = {};
}

importExtensions.prototype = {
  start: function (credential) {
    addlogs(config, chalk.white('Migrating extensions'), 'success');
    let self = this;
    config = credential;
    client = stack.Client(config);

    extensionsFolderPath = path.resolve(config.data, extensionsConfig.dirName);
    extMapperPath = path.resolve(config.data, 'mapper', 'extensions');
    extUidMapperPath = path.resolve(config.data, 'mapper/extensions', 'uid-mapping.json');
    extSuccessPath = path.resolve(config.data, 'extensions', 'success.json');
    extFailsPath = path.resolve(config.data, 'extensions', 'fails.json');
    self.extensions = helper.readFileSync(path.resolve(extensionsFolderPath, extensionsConfig.fileName));
    if (fs.existsSync(extUidMapperPath)) {
      self.extUidMapper = helper.readFileSync(extUidMapperPath);
      self.extUidMapper = self.extUidMapper || {};
    }

    mkdirp.sync(extMapperPath);

    return new Promise(function (resolve, reject) {
      if (self.extensions === undefined || isEmpty(self.extensions)) {
        addlogs(config, chalk.white('No Extensions Found'), 'success');
        return resolve({ empty: true });
      }
      let extUids = Object.keys(self.extensions);
      return Promise.map(
        extUids,
        function (extUid) {
          let ext = self.extensions[extUid];
          if (!self.extUidMapper.hasOwnProperty(extUid)) {
            return client
              .stack({ api_key: config.target_stack, management_token: config.management_token })
              .extension()
              .create({ extension: ext })
              .then((response) => {
                self.success.push(response);
                self.extUidMapper[extUid] = response.uid;
                helper.writeFile(extUidMapperPath, self.extUidMapper);
              })
              .catch(function (err) {
                let error = JSON.parse(err.message);
                self.fails.push(ext);
                if (error.errors.title) {
                  addlogs(config, chalk.white("Extension: '" + ext.title + "' already exists"), 'success');
                } else {
                  addlogs(
                    config,
                    chalk.white("Extension: '" + ext.title + "' failed to be import\n " + JSON.stringify(error.errors)),
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
          concurrency: reqConcurrency,
        },
      )
        .then(function () {
          // extensions have imported successfully
          helper.writeFile(extSuccessPath, self.success);
          addlogs(config, chalk.green('Extensions have been imported successfully!'), 'success');
          return resolve();
        })
        .catch(function (error) {
          // error while importing extensions
          helper.writeFile(extFailsPath, self.fails);
          addlogs(config, chalk.red('Extension import failed'), 'error');
          return reject(error);
        });
    });
  },
};

module.exports = new importExtensions();
