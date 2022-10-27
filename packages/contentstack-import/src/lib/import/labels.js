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
let labelConfig = config.modules.labels;
let labelsFolderPath;
let labelMapperPath;
let labelUidMapperPath;
let labelSuccessPath;
let labelFailsPath;
let client;

function importLabels() {
  this.fails = [];
  this.success = [];
  this.labelUidMapper = {};
  this.labelUids = [];
  if (fs.existsSync(labelUidMapperPath)) {
    this.labelUidMapper = helper.readFileSync(labelUidMapperPath);
    this.labelUidMapper = this.labelUidMapper || {};
  }
}

importLabels.prototype = {
  start: function (credentialConfig) {
    let self = this;
    config = credentialConfig;
    client = stack.Client(config);
    addlogs(config, chalk.white('Migrating labels'), 'success');
    labelsFolderPath = path.resolve(config.data, labelConfig.dirName);
    self.labels = helper.readFileSync(path.resolve(labelsFolderPath, labelConfig.fileName));
    labelMapperPath = path.resolve(config.data, 'mapper', 'labels');
    labelUidMapperPath = path.resolve(config.data, 'mapper', 'labels', 'uid-mapping.json');
    labelSuccessPath = path.resolve(config.data, 'labels', 'success.json');
    labelFailsPath = path.resolve(config.data, 'labels', 'fails.json');
    mkdirp.sync(labelMapperPath);
    return new Promise(function (resolve, reject) {
      if (self.labels == undefined || isEmpty(self.labels)) {
        addlogs(config, chalk.white('No Label Found'), 'success');
        return resolve({ empty: true });
      }
      self.labelUids = Object.keys(self.labels);
      return Promise.map(
        self.labelUids,
        function (labelUid) {
          let label = self.labels[labelUid];
          if (label.parent.length != 0) {
            delete label['parent'];
          }

          if (!self.labelUidMapper.hasOwnProperty(labelUid)) {
            let requestOption = {
              label: label,
            };

            return client
              .stack({ api_key: config.target_stack, management_token: config.management_token })
              .label()
              .create(requestOption)
              .then(function (response) {
                self.labelUidMapper[labelUid] = response;
                helper.writeFile(labelUidMapperPath, self.labelUidMapper);
              })
              .catch(function (error) {
                self.fails.push(label);
                if (error.errors.name) {
                  addlogs(config, chalk.red("Label: '" + label.name + "'  already exist"), 'error');
                } else {
                  addlogs(config, chalk.red("Label: '" + label.name + "' failed to be imported\n"), 'error');
                }
              });
          } else {
            // the label has already been created
            addlogs(
              config,
              chalk.white("The label: '" + label.name + "' already exists. Skipping it to avoid duplicates!"),
              'success',
            );
          }
          // import 1 labels at a time
        },
        {
          concurrency: reqConcurrency,
        },
      )
        .then(function () {
          // eslint-disable-next-line no-undef
          return self
            .updateLabels()
            .then(function () {
              helper.writeFile(labelSuccessPath, self.success);
              addlogs(config, chalk.green('Labels have been imported successfully!'), 'success');
              return resolve();
            })
            .catch(function (error) {
              // eslint-disable-next-line no-console
              return reject(error);
            });
        })
        .catch(function (error) {
          // error while importing labels
          helper.writeFile(labelFailsPath, self.fails);
          addlogs(config, chalk.red('Label import failed'), 'error');
          return reject(error);
        });
    });
  },

  updateLabels: function () {
    let self = this;
    return new Promise(function (resolve, reject) {
      let labelsObj = helper.readFileSync(path.resolve(labelsFolderPath, labelConfig.fileName));
      return Promise.map(
        self.labelUids,
        function (labelUid) {
          let label = labelsObj[labelUid];
          if (self.labelUidMapper.hasOwnProperty(labelUid)) {
            let newLabelUid = self.labelUidMapper[labelUid];
            if (label.parent.length > 0) {
              let parentUids = label.parent;
              for (let i = 0; i < parentUids.length; i++) {
                if (self.labelUidMapper.hasOwnProperty(parentUids[i])) {
                  label.parent[i] = self.labelUidMapper[parentUids[i]].uid;
                }
              }
              return client
                .stack({ api_key: config.target_stack, management_token: config.management_token })
                .label(newLabelUid.uid)
                .fetch()
                .then(function (response) {
                  //Object.assign(response, _.cloneDeep(label))
                  response.parent = label.parent;
                  response
                    .update()
                    .then((result) => {
                      self.success.push(result);
                    })
                    .catch((error) => {
                      return reject(error);
                    });
                })
                .catch(function (error) {
                  return reject(error);
                });
            }
          }
        },
        {
          concurrency: reqConcurrency,
        },
      )
        .then(function () {
          return resolve();
        })
        .catch(function (error) {
          // eslint-disable-next-line no-console
          return reject(error);
        });
    });
  },
};
module.exports = new importLabels();
