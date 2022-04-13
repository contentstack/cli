/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp');
const path = require('path');
const chalk = require('chalk');

const helper = require('../util/helper');
let stack = require('../util/contentstack-management-sdk');
const { addlogs } = require('../util/log');
let config;

function ExportEnvironments() {
  this.requestOptions = {
    qs: {
      include_count: true,
      asc: 'updated_at',
    },
    json: true,
  };
  this.master = {};
  this.environments = {};
}

ExportEnvironments.prototype.start = function (mergConfig) {
  this.master = {};
  this.environments = {};
  let self = this;
  config = mergConfig;
  addlogs(config, 'Starting environment export', 'success');
  const environmentConfig = config.modules.environments;
  const environmentsFolderPath = path.resolve(config.data, config.branchName || '', environmentConfig.dirName);
  // Create folder for environments
  mkdirp.sync(environmentsFolderPath);
  let client = stack.Client(config);
  return new Promise(function (resolve, reject) {
    client
      .stack({ api_key: config.source_stack, management_token: config.management_token })
      .environment()
      .query(self.requestOptions.qs)
      .find()
      .then((environmentResponse) => {
        if (environmentResponse.items.length !== 0) {
          for (let i = 0, total = environmentResponse.count; i < total; i++) {
            let envUid = environmentResponse.items[i].uid;
            self.master[envUid] = '';
            self.environments[envUid] = environmentResponse.items[i];
            delete self.environments[envUid].uid;
            delete self.environments[envUid]['ACL'];
          }
          helper.writeFile(path.join(environmentsFolderPath, environmentConfig.fileName), self.environments);
          addlogs(config, chalk.green('All the environments have been exported successfully'), 'success');
          return resolve();
        }
        if (environmentResponse.items.length === 0) {
          addlogs(config, 'No environments found', 'success');
          return resolve();
        }
      })
      .catch((error) => {
        addlogs(config, error, 'error');
        reject(error);
      });
  });
};

module.exports = new ExportEnvironments();
