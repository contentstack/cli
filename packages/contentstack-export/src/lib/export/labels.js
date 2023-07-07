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
const { addlogs } = require('../util/log');
const { formatError } = require('../util');
const config = require('../../config/default');

module.exports = class ExportLabels {
  labels = {};
  labelConfig = config.modules.labels;

  constructor(exportConfig, stackAPIClient) {
    this.config = merge(config, exportConfig);
    this.stackAPIClient = stackAPIClient;
  }

  start() {
    addlogs(this.config, 'Starting labels export', 'success');
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
              addlogs(self.config, `'${label.name}' label was exported successfully`, 'success');
              self.labels[label.uid] = label;
              const deleteItems = self.config.modules.labels.invalidKeys;
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
              'You are not allowed to export label, Unless you provide email and password in config',
              'error'
            );
            return resolve();
          }

          addlogs(self.config,  `Failed to export labels. ${formatError(error)}`, 'error');
          reject();
        });
    });
  }
};
