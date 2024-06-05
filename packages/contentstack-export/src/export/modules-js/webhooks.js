/*!
 * Contentstack Export
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const { merge } = require('lodash');
const { default: config } = require('../../config');
const { formatError, log, fileHelper } = require('../../utils');

// Create folder for environments
module.exports = class ExportWebhooks {
  config;
  master = {};
  webhooks = {};
  requestOptions = {
    include_count: true,
    asc: 'updated_at',
  };
  webhooksConfig = config.modules.webhooks;

  constructor(exportConfig, stackAPIClient) {
    this.config = merge(config, exportConfig);
    this.stackAPIClient = stackAPIClient;
  }

  start() {
    log(this.config, 'Starting webhooks export', 'success');
    const self = this;
    const webhooksFolderPath = path.resolve(
      this.config.data,
      this.config.branchName || '',
      self.webhooksConfig.dirName,
    );
    mkdirp.sync(webhooksFolderPath);
    return new Promise((resolve, reject) => {
      self.stackAPIClient
        .webhook()
        .fetchAll(self.requestOptions)
        .then((webhooks) => {
          if (webhooks.items.length !== 0) {
            for (let i = 0, total = webhooks.count; i < total; i++) {
              const webUid = webhooks.items[i].uid;
              self.master[webUid] = '';
              self.webhooks[webUid] = webhooks.items[i];
              delete self.webhooks[webUid].uid;
              delete self.webhooks[webUid].SYS_ACL;
            }
            fileHelper.writeFileSync(path.join(webhooksFolderPath, self.webhooksConfig.fileName), self.webhooks);
            log(self.config, chalk.green('All the webhooks have been exported successfully'), 'success');
            return resolve();
          }
          log(self.config, 'No webhooks found', 'success');
          resolve();
        })
        .catch(function (error) {
          if (error.statusCode === 401) {
            log(
              self.config,
              'You are not allowed to export webhooks, Unless you provide email and password in config',
              'error',
            );
            return resolve();
          }
          log(self.config, `Failed to export webhooks. ${formatError(error)}`, 'error');
          reject('Failed to export webhooks');
        });
    });
  }
};
