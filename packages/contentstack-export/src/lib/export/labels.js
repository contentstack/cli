/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const { merge } = require('lodash');

let helper = require('../util/helper');
let { addlogs } = require('../util/log');
const { formatError } = require('../util');
const config = require('../../config/default');
const stack = require('../util/contentstack-management-sdk');

module.exports = class ExportLabels {
  labels = {};
  labelConfig = config.modules.labels;

  constructor(credentialConfig) {
    this.config = merge(config, credentialConfig);
  }

  start() {
    addlogs(this.config, 'Starting labels export', 'success');

    const self = this;
    const client = stack.Client(this.config);
    let labelsFolderPath = path.resolve(config.data, this.config.branchName || '', self.labelConfig.dirName);
    // Create locale folder
    mkdirp.sync(labelsFolderPath);
    return new Promise(function (resolve, reject) {
      return client
        .stack({ api_key: self.config.source_stack, management_token: self.config.management_token })
        .label()
        .query()
        .find()
        .then((response) => {
          if (response.items.length !== 0) {
            response.items.forEach(function (label) {
              addlogs(self.config, label.name + ' labels was exported successfully', 'success');
              self.labels[label.uid] = label;
              let deleteItems = self.config.modules.labels.invalidKeys;
              deleteItems.forEach((e) => delete label[e]);
            });
            addlogs(self.config, chalk.green('All the labels have been exported successfully'), 'success');
          } else {
            addlogs(self.config, 'No labels found', 'success');
          }
          helper.writeFileSync(path.join(labelsFolderPath, self.labelConfig.fileName), self.labels);
          resolve();
        })
        .catch(function (error) {
          if (error.statusCode === 401) {
            addlogs(
              self.config,
              chalk.red(
                'You are not allowed to export label, Unless you provide email and password in config',
                'error',
              ),
            );
            return resolve();
          }

          addlogs(self.config, formatError(error), 'error');
          reject();
        });
    });
  }
};
