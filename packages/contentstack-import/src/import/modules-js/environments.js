/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const Promise = require('bluebird');
const { isEmpty, merge } = require('lodash');

const { readFileSync, writeFileSync } = require('../../utils/file-helper');
const { log } = require('../../utils/logger');
const { formatError } = require('../../utils');
const config = require('../../config').default;

module.exports = class ImportEnvironments {
  fails = [];
  success = [];
  envUidMapper = {};
  fetchConcurrency = config.modules.environments.concurrency || config.fetchConcurrency || 2;

  constructor(importConfig, stackAPIClient) {
    this.config = importConfig;
    this.stackAPIClient = stackAPIClient;
  }

  start() {
    log(this.config, 'Migrating environment', 'success');

    const self = this;
    let environmentConfig = config.modules.environments;
    let environmentsFolderPath = path.resolve(this.config.data, environmentConfig.dirName);
    let envMapperPath = path.resolve(this.config.data, 'mapper', 'environments');
    let envUidMapperPath = path.resolve(this.config.data, 'mapper', 'environments', 'uid-mapping.json');
    let envSuccessPath = path.resolve(this.config.data, 'environments', 'success.json');
    let envFailsPath = path.resolve(this.config.data, 'environments', 'fails.json');
    self.environments = readFileSync(path.resolve(environmentsFolderPath, environmentConfig.fileName));

    if (fs.existsSync(envUidMapperPath)) {
      self.envUidMapper = readFileSync(envUidMapperPath);
      self.envUidMapper = self.envUidMapper || {};
    }

    mkdirp.sync(envMapperPath);
    return new Promise(function (resolve, reject) {
      if (self.environments === undefined || isEmpty(self.environments)) {
        log(self.config, chalk.yellow('No Environment Found'), 'success');
        return resolve({ empty: true });
      }

      let envUids = Object.keys(self.environments);
      return Promise.map(
        envUids,
        function (envUid) {
          let env = self.environments[envUid];
          if (!self.envUidMapper.hasOwnProperty(envUid)) {
            let requestOption = { environment: env };

            return self.stackAPIClient
              .environment()
              .create(requestOption)
              .then((environment) => {
                self.success.push(environment.items);
                self.envUidMapper[envUid] = environment.uid;
                writeFileSync(envUidMapperPath, self.envUidMapper);
              })
              .catch(function (err) {
                let error = JSON.parse(err.message);

                if (error.errors.name) {
                  log(self.config, `Environment '${env.name}' already exists`, 'error');
                } else {
                  log(
                    config,
                    `Environment '${env.name}' failed to be import\n ${JSON.stringify(error.errors)}`,
                    'error',
                  );
                }
              });
          } else {
            // the environment has already been created
            log(config, `The environment '${env.name}' already exists. Skipping it to avoid duplicates!`, 'success');
          }
        },
        { concurrency: self.fetchConcurrency },
      )
        .then(function () {
          writeFileSync(envSuccessPath, self.success);
          log(self.config, chalk.green('Environments have been imported successfully!'), 'success');
          resolve('');
        })
        .catch(function (error) {
          writeFileSync(envFailsPath, self.fails);
          log(self.config, `Failed to import environment ${formatError(error)}`, 'error');
          reject(error);
        });
    });
  }
};
