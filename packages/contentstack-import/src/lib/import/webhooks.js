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

const helper = require('../util/fs');
const { formatError } = require('../util');
const { addlogs } = require('../util/log');
const config = require('../../config/default');
const stack = require('../util/contentstack-management-sdk');

module.exports = class ImportWebhooks {
  config;
  fails = [];
  success = [];
  webUidMapper = {};
  webhooksConfig = config.modules.webhooks;
  reqConcurrency = config.concurrency || config.fetchConcurrency;

  constructor(credentialConfig) {
    this.config = merge(config, credentialConfig);
  }

  start() {
    addlogs(this.config, chalk.white('Migrating webhooks'), 'success');

    const self = this;
    const client = stack.Client(this.config);

    let webMapperPath = path.resolve(this.config.data, 'mapper', 'webhooks');
    let webFailsPath = path.resolve(this.config.data, 'mapper', 'webhooks', 'fails.json');
    let webSuccessPath = path.resolve(this.config.data, 'mapper', 'webhooks', 'success.json');
    let webUidMapperPath = path.resolve(this.config.data, 'mapper', 'webhooks', 'uid-mapping.json');

    let webhooksFolderPath = path.resolve(this.config.data, this.webhooksConfig.dirName);
    this.webhooks = helper.readFileSync(path.resolve(webhooksFolderPath, this.webhooksConfig.fileName));

    if (fs.existsSync(webUidMapperPath)) {
      self.webUidMapper = helper.readFileSync(webUidMapperPath);
      self.webUidMapper = self.webUidMapper || {};
    }

    mkdirp.sync(webMapperPath);

    return new Promise(function (resolve, reject) {
      if (self.webhooks == undefined || isEmpty(self.webhooks)) {
        addlogs(self.config, chalk.white('No Webhooks Found'), 'success');
        return resolve({ empty: true });
      }

      let webUids = Object.keys(self.webhooks);
      return Promise.map(
        webUids,
        function (webUid) {
          let web = self.webhooks[webUid];
          if (self.config.importWebhookStatus !== 'current' || self.config.importWebhookStatus === 'disable') {
            web.disabled = true;
          }

          if (!self.webUidMapper.hasOwnProperty(webUid)) {
            let requestOption = { json: { webhook: web } };

            return client
              .stack({ api_key: self.config.target_stack, management_token: self.config.management_token })
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
                  self.config,
                  chalk.red("Webhooks: '" + web.name + "' failed to be import\n" + formatError(error)),
                  'error',
                );
              });
          } else {
            // the webhooks has already been created
            addlogs(
              self.config,
              chalk.white("The Webhooks: '" + web.name + "' already exists. Skipping it to avoid duplicates!"),
              'success',
            );
          }
          // import 2 webhooks at a time
        },
        { concurrency: self.reqConcurrency },
      )
        .then(function () {
          // webhooks have imported successfully
          helper.writeFile(webSuccessPath, self.success);
          addlogs(self.config, chalk.green('Webhooks have been imported successfully!'), 'success');
          return resolve();
        })
        .catch(function (error) {
          // error while importing environments
          helper.writeFile(webFailsPath, self.fails);
          addlogs(self.config, chalk.red('Webhooks import failed'), 'error');
          return reject(error);
        });
    });
  }
};
