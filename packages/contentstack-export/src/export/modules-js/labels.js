/*!
 * Contentstack Export
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const { merge } = require('lodash');
const { formatError, log, fileHelper } = require('../../utils');
const { default: config } = require('../../config');

module.exports = class ExportLabels {
  labels = {};
  labelConfig = config.modules.labels;

  constructor(exportConfig, stackAPIClient) {
    this.config = merge(config, exportConfig);
    this.stackAPIClient = stackAPIClient;
  }

  start() {
    log(this.config, 'Starting labels export', 'success');
    const self = this;
    const labelsFolderPath = path.resolve(config.data, this.config.branchName || '', self.labelConfig.dirName);
    // Create locale folder
    mkdirp.sync(labelsFolderPath);
    return new Promise(function (resolve, reject) {
      return self.stackAPIClient
        .label()
        .query()
        .find()
        .then((response) => {
          if (response.items.length !== 0) {
            response.items.forEach(function (label) {
              log(self.config, `'${label.name}' label was exported successfully`, 'success');
              self.labels[label.uid] = label;
              const deleteItems = self.config.modules.labels.invalidKeys;
              deleteItems.forEach((e) => delete label[e]);
            });
            log(self.config, chalk.green('All the labels have been exported successfully'), 'success');
          } else {
            log(self.config, 'No labels found', 'success');
          }
          fileHelper.writeFileSync(path.join(labelsFolderPath, self.labelConfig.fileName), self.labels);
          resolve();
        })
        .catch(function (error) {
          if (error.statusCode === 401) {
            log(
              self.config,
              'You are not allowed to export label, Unless you provide email and password in config',
              'error',
            );
            return resolve();
          }
          log(self.config, `Failed to export labels. ${formatError(error)}`, 'error');
          reject();
        });
    });
  }
};
