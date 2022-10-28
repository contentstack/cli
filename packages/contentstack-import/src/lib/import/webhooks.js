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
let config = require('../../config/default');
let stack = require('../util/contentstack-management-sdk');
let reqConcurrency = config.concurrency;
let webhooksConfig = config.modules.webhooks;

let webhooksFolderPath;
let webMapperPath;
let webUidMapperPath;
let webSuccessPath;
let webFailsPath;
let client;

function importWebhooks() {
  this.fails = [];
  this.success = [];
  this.webUidMapper = {};
}

importWebhooks.prototype = {
  start: function (credentialConfig) {
    let self = this;
    config = credentialConfig;
    addlogs(config, chalk.white('Migrating webhooks'), 'success');
    client = stack.Client(config);
    webhooksFolderPath = path.resolve(config.data, webhooksConfig.dirName);
    webMapperPath = path.resolve(config.data, 'mapper', 'webhooks');
    webUidMapperPath = path.resolve(config.data, 'mapper', 'webhooks', 'uid-mapping.json');
    webSuccessPath = path.resolve(config.data, 'mapper', 'webhooks', 'success.json');
    webFailsPath = path.resolve(config.data, 'mapper', 'webhooks', 'fails.json');
    self.webhooks = helper.readFile(path.resolve(webhooksFolderPath, webhooksConfig.fileName));
    if (fs.existsSync(webUidMapperPath)) {
      self.webUidMapper = helper.readFile(webUidMapperPath);
      self.webUidMapper = self.webUidMapper || {};
    }
    mkdirp.sync(webMapperPath);

    return new Promise(function (resolve, reject) {
      if (self.webhooks == undefined || isEmpty(self.webhooks)) {
        addlogs(config, chalk.white('No Webhooks Found'), 'success');
        return resolve({ empty: true });
      }
      let webUids = Object.keys(self.webhooks);
      return Promise.map(
        webUids,
        function (webUid) {
          let web = self.webhooks[webUid];
          if (config.importWebhookStatus !== 'current' || config.importWebhookStatus === 'disable') {
            web.disabled = true;
          }

          if (!self.webUidMapper.hasOwnProperty(webUid)) {
            let requestOption = {
              json: {
                webhook: web,
              },
            };

            return client
              .stack({ api_key: config.target_stack, management_token: config.management_token })
              .webhook()
              .create(requestOption.json)
              .then(function (response) {
                self.success.push(response);
                self.webUidMapper[webUid] = response.uid;
                helper.writeFile(webUidMapperPath, self.webUidMapper);
              })
              .catch(function (err) {
                let error = JSON.parse(err.message);
                self.fails.push(web);
                addlogs(
                  config,
                  chalk.red("Webhooks: '" + web.name + "' failed to be import\n" + JSON.stringify(error)),
                  'error',
                );
              });
          } else {
            // the webhooks has already been created
            return client
              .stack({ api_key: config.target_stack, management_token: config.management_token })
              .webhook(webUid)
              .fetch()
              .then(function (webhook) {
                Object.keys(web).forEach(function (key) {
                  webhook[key] = web[key];
                });
                return webhook.update();
              })
              .catch(function (err) {
                let error = JSON.parse(err.message);
                self.fails.push(web);
                addlogs(
                  config,
                  chalk.red("Webhooks: '" + web.name + "' failed to be update\n" + JSON.stringify(error)),
                  'error',
                );
              });
          }
          // import 2 webhooks at a time
        },
        {
          concurrency: reqConcurrency,
        },
      )
        .then(function () {
          // webhooks have imported successfully
          helper.writeFile(webSuccessPath, self.success);
          addlogs(config, chalk.green('Webhooks have been imported successfully!'), 'success');
          return resolve();
        })
        .catch(function (error) {
          // error while importing environments
          helper.writeFile(webFailsPath, self.fails);
          addlogs(config, chalk.red('Webhooks import failed'), 'error');
          return reject(error);
        });
    });
  },
};

module.exports = new importWebhooks();
