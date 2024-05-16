/*!
 * Contentstack Export
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */
const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const { merge } = require('lodash');
const { fileHelper, log, formatError } = require('../../utils');
module.exports = class ExportEnvironments {
  config = {};
  master = {};
  environments = {};
  requestOptions = {
    json: true,
    qs: {
      asc: 'updated_at',
      include_count: true,
    },
  };

  constructor(exportConfig, stackAPIClient) {
    this.config = merge(this.config, exportConfig);
    this.stackAPIClient = stackAPIClient;
  }

  start() {
    const self = this;
    const environmentConfig = self.config.modules.environments;
    const environmentsFolderPath = path.resolve(
      self.config.data,
      self.config.branchName || '',
      environmentConfig.dirName,
    );

    // Create folder for environments
    fileHelper.makeDirectory(environmentsFolderPath);
    log(this.config, 'Starting environment export', 'success');
    return new Promise(function (resolve, reject) {
      self.stackAPIClient
        .environment()
        .query(self.requestOptions.qs)
        .find()
        .then((environmentResponse) => {
          if (environmentResponse.items.length !== 0) {
            for (let i = 0, total = environmentResponse.count; i < total; i++) {
              const envUid = environmentResponse.items[i].uid;
              self.master[envUid] = '';
              self.environments[envUid] = environmentResponse.items[i];
              delete self.environments[envUid].uid;
              delete self.environments[envUid]['ACL'];
            }
            fileHelper.writeFileSync(path.join(environmentsFolderPath, environmentConfig.fileName), self.environments);
            log(self.config, chalk.green('All the environments have been exported successfully'), 'success');
            return resolve();
          }
          if (environmentResponse.items.length === 0) {
            log(self.config, 'No environments found', 'success');
            resolve();
          }
        })
        .catch((error) => {
          log(self.config, `Environments export failed. ${formatError(error)}`, 'error');
          reject(error);
        });
    });
  }
};
