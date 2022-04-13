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
const extensionConfig = config.modules.extensions;
const stack = require('../util/contentstack-management-sdk');

function ExportExtensions() {
  this.queryRequestOptions = {
    include_count: true,
    asc: 'updated_at',
  };
  this.master = {};
  this.extensions = {};
}

ExportExtensions.prototype.start = function (mergeConfig) {
  this.master = {};
  this.extensions = {};
  addlogs(config, 'Starting extension export', 'success');
  let self = this;
  config = mergeConfig;
  let extensionsFolderPath = path.resolve(config.data, config.branchName || '', extensionConfig.dirName);
  // Create folder for extensions
  mkdirp.sync(extensionsFolderPath);
  let client = stack.Client(config);
  return new Promise(function (resolve, reject) {
    client
      .stack({ api_key: config.source_stack, management_token: config.management_token })
      .extension()
      .query(self.queryRequestOptions)
      .find()
      .then((extension) => {
        if (extension.items.length !== 0) {
          for (let i = 0, total = extension.count; i < total; i++) {
            let extUid = extension.items[i].uid;
            self.master[extUid] = '';
            self.extensions[extUid] = extension.items[i];
            delete self.extensions[extUid].uid;
            delete self.extensions[extUid].SYS_ACL;
          }
          helper.writeFile(path.join(extensionsFolderPath, extensionConfig.fileName), self.extensions);
          addlogs(config, chalk.green('All the extensions have been exported successfully'), 'success');
          return resolve();
        }
        addlogs(config, 'No extensions found', 'success');
        return resolve();
      })
      .catch((error) => {
        addlogs(config, error, 'error');
        return reject();
      });
  });
};

module.exports = new ExportExtensions();
