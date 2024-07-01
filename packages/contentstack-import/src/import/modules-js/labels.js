/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const Promise = require('bluebird');
const { existsSync } = require('fs');
const { isEmpty, merge } = require('lodash');
let { default: config } = require('../../config');
const { fileHelper, log, formatError } = require('../../utils');

module.exports = class ImportLabels {
  config;
  fails = [];
  success = [];
  labelUids = [];
  labelsFolderPath;
  labelUidMapper = {};
  labelConfig = config.modules.labels;
  reqConcurrency = config.concurrency || config.fetchConcurrency || 1;

  constructor(importConfig, stackAPIClient) {
    this.config = merge(config, importConfig);
    this.stackAPIClient = stackAPIClient;
  }

  start() {
    const self = this;
    log(this.config, chalk.white('Migrating labels'), 'success');
    let labelMapperPath = path.resolve(this.config.data, 'mapper', 'labels');
    let labelFailsPath = path.resolve(this.config.data, 'labels', 'fails.json');
    let labelSuccessPath = path.resolve(this.config.data, 'labels', 'success.json');
    this.labelsFolderPath = path.resolve(this.config.data, this.labelConfig.dirName);
    let labelUidMapperPath = path.resolve(this.config.data, 'mapper', 'labels', 'uid-mapping.json');

    if (existsSync(labelUidMapperPath)) {
      this.labelUidMapper = fileHelper.readFileSync(labelUidMapperPath);
      this.labelUidMapper = this.labelUidMapper || {};
    }

    self.labels = fileHelper.readFileSync(path.resolve(this.labelsFolderPath, this.labelConfig.fileName));

    mkdirp.sync(labelMapperPath);

    return new Promise(function (resolve, reject) {
      if (self.labels == undefined || isEmpty(self.labels)) {
        log(self.config, chalk.white('No Label Found'), 'success');
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
            let requestOption = { label: label };

            return self.stackAPIClient
              .label()
              .create(requestOption)
              .then(function (response) {
                self.labelUidMapper[labelUid] = response;
              })
              .catch(function (error) {
                self.fails.push(label);
                if (error.errors.name) {
                  log(self.config, `Label '${label.name}' already exist`, 'error');
                } else {
                  log(self.config, `Label '${label.name}' failed to be imported\n`, 'error');
                }
              });
          } else {
            // the label has already been created
            log(
              self.config,
              chalk.white(`The label '${label.name}' already exists. Skipping it to avoid duplicates!'`),
              'success',
            );
          }
          // import 1 labels at a time
        },
        { concurrency: self.reqConcurrency },
      )
        .then(function () {
          fileHelper.writeFileSync(labelUidMapperPath, self.labelUidMapper);
          // eslint-disable-next-line no-undef
          return self
            .updateLabels()
            .then(function () {
              fileHelper.writeFileSync(labelSuccessPath, self.success);
              log(self.config, chalk.green('Labels have been imported successfully!'), 'success');
              return resolve();
            })
            .catch(function (error) {
              log(self.config, self.config, `Failed to import label, ${formatError(error)}`, 'error');
              // eslint-disable-next-line no-console
              return reject(error);
            });
        })
        .catch(function (error) {
          // error while importing labels
          fileHelper.writeFileSync(labelUidMapperPath, self.labelUidMapper);
          fileHelper.writeFileSync(labelFailsPath, self.fails);
          log(self.config, `Failed to import label, ${formatError(error)}`, 'error');
          return reject(error);
        });
    });
  }

  updateLabels() {
    const self = this;
    return new Promise(function (resolve, reject) {
      let labelsObj = fileHelper.readFileSync(path.resolve(self.labelsFolderPath, self.labelConfig.fileName));
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
              return self.stackAPIClient
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
                      log(self.config, formatError(error), 'error');
                      return reject(error);
                    });
                })
                .catch(function (error) {
                  log(self.config, formatError(error), 'error');
                  return reject(error);
                });
            }
          }
        },
        {
          concurrency: self.reqConcurrency,
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
  }
};
