/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const Promise = require('bluebird');
const { isEmpty } = require('lodash');

const helper = require('../util/fs');
let { addlogs } = require('../util/log');
const { formatError } = require('../util');
const config = require('../../config/default');
const stack = require('../util/contentstack-management-sdk');

module.exports = class ImportEnvironments {
  fails = [];
  success = [];
  envUidMapper = {};
  fetchConcurrency = config.modules.environments.concurrency || config.fetchConcurrency || 2;

  constructor(credentialConfig) {
    this.config = credentialConfig;
  }

  start() {
    addlogs(this.config, 'Migrating environment', 'success');

    const self = this;
    const client = stack.Client(this.config);
    let environmentConfig = config.modules.environments;
    let environmentsFolderPath = path.resolve(this.config.data, environmentConfig.dirName);
    let envMapperPath = path.resolve(this.config.data, 'mapper', 'environments');
    let envUidMapperPath = path.resolve(this.config.data, 'mapper', 'environments', 'uid-mapping.json');
    let envSuccessPath = path.resolve(this.config.data, 'environments', 'success.json');
    let envFailsPath = path.resolve(this.config.data, 'environments', 'fails.json');
    self.environments = helper.readFileSync(path.resolve(environmentsFolderPath, environmentConfig.fileName));

    if (fs.existsSync(envUidMapperPath)) {
      self.envUidMapper = helper.readFileSync(envUidMapperPath);
      self.envUidMapper = self.envUidMapper || {};
    }

    mkdirp.sync(envMapperPath);
    return new Promise(function (resolve, reject) {
      if (self.environments === undefined || isEmpty(self.environments)) {
        addlogs(self.config, chalk.yellow('No Environment Found'), 'success');
        return resolve({ empty: true });
      }

      let envUids = Object.keys(self.environments);
      return Promise.map(
        envUids,
        function (envUid) {
          let env = self.environments[envUid];
          if (!self.envUidMapper.hasOwnProperty(envUid)) {
            let requestOption = { environment: env };

            return client
              .stack({ api_key: config.target_stack, management_token: config.management_token })
              .environment()
              .create(requestOption)
              .then((environment) => {
                self.success.push(environment.items);
                self.envUidMapper[envUid] = environment.uid;
                helper.writeFile(envUidMapperPath, self.envUidMapper);
              })
              .catch(function (err) {
                let error = JSON.parse(err.message);

                if (error.errors.name) {
                  addlogs(self.config, chalk.white("Environment: '" + env.name + "' already exists"), 'error');
                } else {
                  addlogs(
                    config,
                    chalk.white(
                      "Environment: '" + env.name + "' failed to be import\n " + JSON.stringify(error.errors),
                    ),
                    'error',
                  );
                }
              });
          } else {
            // the environment has already been created
            addlogs(
              config,
              chalk.white("The environment: '" + env.name + "' already exists. Skipping it to avoid duplicates!"),
              'success',
            );
          }
        },
        { concurrency: self.fetchConcurrency },
      )
        .then(function () {
          helper.writeFile(envSuccessPath, self.success);
          addlogs(self.config, chalk.green('Environments have been imported successfully!'), 'success');
          resolve();
        })
        .catch(function (error) {
          helper.writeFile(envFailsPath, self.fails);
          addlogs(self.config, chalk.red(`Failed to import environment ${formatError(error)}`), 'error');
          reject(error);
        });
    });
  }
};
