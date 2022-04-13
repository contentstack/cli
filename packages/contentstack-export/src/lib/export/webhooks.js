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
const stack = require('../util/contentstack-management-sdk');
const webhooksConfig = config.modules.webhooks;
let client;

// Create folder for environments

function ExportWebhooks() {
  this.requestOptions = {
    include_count: true,
    asc: 'updated_at',
  };
  this.master = {};
  this.webhooks = {};
}

ExportWebhooks.prototype.start = function (credentialConfig) {
  addlogs(config, 'Starting webhooks export', 'success');
  this.master = {};
  this.webhooks = {};
  let self = this;
  config = credentialConfig;
  client = stack.Client(config);
  const webhooksFolderPath = path.resolve(config.data, config.branchName || '', webhooksConfig.dirName);
  mkdirp.sync(webhooksFolderPath);
  return new Promise(function (resolve, reject) {
    client
      .stack({ api_key: config.source_stack, management_token: config.management_token })
      .webhook()
      .fetchAll(self.requestOptions)
      .then((webhooks) => {
        if (webhooks.items.length !== 0) {
          for (var i = 0, total = webhooks.count; i < total; i++) {
            const webUid = webhooks.items[i].uid;
            self.master[webUid] = '';
            self.webhooks[webUid] = webhooks.items[i];
            delete self.webhooks[webUid].uid;
            delete self.webhooks[webUid].SYS_ACL;
          }
          helper.writeFile(path.join(webhooksFolderPath, webhooksConfig.fileName), self.webhooks);
          addlogs(config, chalk.green('All the webhooks have been exported successfully'), 'success');
          return resolve();
        }
        addlogs(config, 'No webhooks found', 'success');
        return resolve();
      })
      .catch(function (error) {
        if (error.statusCode === 401) {
          addlogs(
            config,
            chalk.red('You are not allowed to export webhooks, Unless you provide email and password in config'),
            'error',
          );
          return resolve();
        }
        addlogs(config, error, 'error');
        return reject();
      });
  });
};

module.exports = new ExportWebhooks();
