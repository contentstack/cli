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
const _ = require('lodash')

const helper = require('../util/fs');
const { addlogs } = require('../util/log');
let config = require('../../config/default')
let stack = require('../util/contentstack-management-sdk')

let reqConcurrency = config.concurrency;
let labelConfig = config.modules.labels;
let labelsFolderPath
let labelMapperPath
let labelUidMapperPath
let labelSuccessPath
let labelFailsPath
let client


function importLabels() {
  
}

exports.start = function (credentialConfig) {
  this.fails = [];
  this.success = [];
  this.labelUidMapper = {};
  this.labelUids = [];
  if (fs.existsSync(labelUidMapperPath)) {
    this.labelUidMapper = helper.readFile(labelUidMapperPath);
    this.labelUidMapper = this.labelUidMapper || {};
  }
//   start: function (credentialConfig) {
    let self = this;
    config = credentialConfig
    client = stack.Client(config)
    addlogs(config, chalk.white('Migrating labels'), 'success')
    labelsFolderPath = path.resolve(config.data, labelConfig.dirName)
    self.labels = helper.readFile(path.resolve(labelsFolderPath, labelConfig.fileName));
    labelMapperPath = path.resolve(config.data, 'mapper', 'labels');
    labelUidMapperPath = path.resolve(config.data, 'mapper', 'labels', 'uid-mapping.json');
    labelSuccessPath = path.resolve(config.data, 'labels', 'success.json');
    labelFailsPath = path.resolve(config.data, 'labels', 'fails.json');
    mkdirp.sync(labelMapperPath);
    return new Promise(function (resolve, reject) {
      if (self.labels == undefined) {
        addlogs(config, chalk.white('No Label Found'), 'error');
        return resolve();
      }
      self.labelUids = Object.keys(self.labels);
      return Promise.map(self.labelUids, function (labelUid) {
        let label = self.labels[labelUid];
        if (label.parent.length != 0) {
          delete label['parent'];
        }

        if (!self.labelUidMapper.hasOwnProperty(labelUid)) {
          let requestOption = {
            label: label
          };

          // return self.createLabels(self.labels[labelUid]);
          return client.stack({ api_key: config.target_stack, management_token: config.management_token }).label().create(requestOption)
            .then(function (response) {
              self.labelUidMapper[labelUid] = response;
              helper.writeFile(labelUidMapperPath, self.labelUidMapper);
              return;
            }).catch(function (error) {
              self.fails.push(label);
              // addlogs(config, chalk.red('Label: \'' + label.name + '\' failed to be imported\n'), 'error');
              if (error.errors.name) {
                addlogs(config, chalk.red('Label: \'' + label.name + '\'  already exist'), 'error');
              } else {
                addlogs(config, chalk.red('Label: \'' + label.name + '\' failed to be imported\n'), 'error');
              }
              return;
            });
        } else {
          // the label has already been created
          addlogs(config, (chalk.white('The label: \'' + label.name +
            '\' already exists. Skipping it to avoid duplicates!')), 'success');
          return;
        }
        // import 1 labels at a time
      }, {
        concurrency: reqConcurrency
      }).then(function () {
        // eslint-disable-next-line no-undef
        return self.updateLabels().then(function () {
          helper.writeFile(labelSuccessPath, self.success);
          addlogs(config, (chalk.green('Labels have been imported successfully!')), 'success');
          return resolve();
        }).catch(function (error) {
          // eslint-disable-next-line no-console
          return reject(error);
        });
      }).catch(function (error) {
        // error while importing labels
        helper.writeFile(labelFailsPath, self.fails);
        addlogs(config, chalk.red('Label import failed'), 'error');
        return reject(error);
      });
    });
  }
module.exports = new importLabels();
