/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const { merge } = require('lodash');

const helper = require('../util/helper');
const { formatError } = require('../util');
const { addlogs } = require('../util/log');
const config = require('../../config/default');
const stack = require('../util/contentstack-management-sdk');

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

  constructor(credentialConfig) {
    this.config = merge(config, credentialConfig);
  }

  start() {
    addlogs(this.config, 'Starting webhooks export', 'success');

    const self = this;
    const client = stack.Client(this.config);
    const webhooksFolderPath = path.resolve(
      this.config.data,
      this.config.branchName || '',
      self.webhooksConfig.dirName,
    );
    mkdirp.sync(webhooksFolderPath);
    return new Promise((resolve, reject) => {
      client
        .stack({ api_key: self.config.source_stack, management_token: self.config.management_token })
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
            helper.writeFileSync(path.join(webhooksFolderPath, self.webhooksConfig.fileName), self.webhooks);
            addlogs(self.config, chalk.green('All the webhooks have been exported successfully'), 'success');
            return resolve();
          }
          addlogs(self.config, 'No webhooks found', 'success');
          resolve();
        })
        .catch(function (error) {
          if (error.statusCode === 401) {
            addlogs(
              self.config,
              chalk.red('You are not allowed to export webhooks, Unless you provide email and password in config'),
              'error',
            );
            return resolve();
          }
          addlogs(self.config, formatError(error), 'error');
          reject('Failed export webhooks');
        });
    });
  }
};
