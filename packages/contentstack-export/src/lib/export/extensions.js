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
const { formatError } = require('../util');
let config = require('../../config/default');
const stack = require('../util/contentstack-management-sdk');

module.exports = class ExportExtensions {
  master = {};
  extensions = {};
  extensionConfig = config.modules.extensions;
  queryRequestOptions = {
    asc: 'updated_at',
    include_count: true,
  };

  constructor(mergeConfig) {
    this.config = mergeConfig;
  }

  start() {
    addlogs(this.config, 'Starting extension export', 'success');

    const self = this;
    const extensionsFolderPath = path.resolve(
      this.config.data,
      this.config.branchName || '',
      this.extensionConfig.dirName,
    );
    // Create folder for extensions
    mkdirp.sync(extensionsFolderPath);
    let client = stack.Client(this.config);
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
            helper.writeFile(path.join(extensionsFolderPath, self.extensionConfig.fileName), self.extensions);
            addlogs(config, chalk.green('All the extensions have been exported successfully'), 'success');
            return resolve();
          }
          addlogs(config, 'No extensions found', 'success');
          resolve();
        })
        .catch((error) => {
          addlogs(self.config, `Failed to export extensions ${formatError(error)}`, 'error');
          reject();
        });
    });
  }
};
