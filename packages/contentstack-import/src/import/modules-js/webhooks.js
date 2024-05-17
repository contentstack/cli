/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const chalk = require('chalk');
const { isEmpty, merge } = require('lodash');
let { default: config } = require('../../config');
const { fileHelper, log, formatError } = require('../../utils');

module.exports = class ImportWebhooks {
  config;
  fails = [];
  success = [];
  webUidMapper = {};
  webhooksConfig = config.modules.webhooks;
  reqConcurrency = config.concurrency || config.fetchConcurrency;

  constructor(importConfig, stackAPIClient) {
    this.config = merge(config, importConfig);
    this.stackAPIClient = stackAPIClient;
  }

  start() {
    log(this.config, chalk.white('Migrating webhooks'), 'success');

    const self = this;

    let webMapperPath = path.resolve(this.config.data, 'mapper', 'webhooks');
    let webFailsPath = path.resolve(this.config.data, 'mapper', 'webhooks', 'fails.json');
    let webSuccessPath = path.resolve(this.config.data, 'mapper', 'webhooks', 'success.json');
    let webUidMapperPath = path.resolve(this.config.data, 'mapper', 'webhooks', 'uid-mapping.json');

    let webhooksFolderPath = path.resolve(this.config.data, this.webhooksConfig.dirName);
    this.webhooks = fileHelper.readFileSync(path.resolve(webhooksFolderPath, this.webhooksConfig.fileName));

    if (fs.existsSync(webUidMapperPath)) {
      self.webUidMapper = fileHelper.readFileSync(webUidMapperPath);
      self.webUidMapper = self.webUidMapper || {};
    }

    mkdirp.sync(webMapperPath);

    return new Promise(function (resolve, reject) {
      if (self.webhooks == undefined || isEmpty(self.webhooks)) {
        log(self.config, chalk.white('No Webhooks Found'), 'success');
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

            return self.stackAPIClient
              .webhook()
              .create(requestOption.json)
              .then(function (response) {
                self.success.push(response);
                self.webUidMapper[webUid] = response.uid;
                fileHelper.writeFileSync(webUidMapperPath, self.webUidMapper);
              })
              .catch(function (err) {
                let error = JSON.parse(err.message);
                self.fails.push(web);
                log(self.config, `Webhooks '${web.name}' failed to be import.\n ${formatError(error)}`, 'error');
              });
          } else {
            // the webhooks has already been created
            log(
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
          fileHelper.writeFileSync(webSuccessPath, self.success);
          log(self.config, chalk.green('Webhooks have been imported successfully!'), 'success');
          return resolve();
        })
        .catch(function (error) {
          // error while importing environments
          fileHelper.writeFileSync(webFailsPath, self.fails);
          log(self.config, `Webhooks import failed. ${formatError(error)}`, 'error');
          return reject(error);
        });
    });
  }
};
