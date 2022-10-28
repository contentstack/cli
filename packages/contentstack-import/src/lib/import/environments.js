/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const { isEmpty } = require('lodash');

const helper = require('../util/fs');
let { addlogs } = require('../util/log');
const chalk = require('chalk');
let stack = require('../util/contentstack-management-sdk');

let config = require('../../config/default');
let environmentConfig = config.modules.environments;
let environmentsFolderPath;
let envMapperPath;
let envUidMapperPath;
let envSuccessPath;
let envFailsPath;
let client;

function importEnvironments() {
  this.fails = [];
  this.success = [];
  this.envUidMapper = {};
}

importEnvironments.prototype = {
  start: function (credentialConfig) {
    let self = this;
    config = credentialConfig;
    addlogs(config, 'Migrating environment', 'success');
    environmentsFolderPath = path.resolve(config.data, environmentConfig.dirName);
    envMapperPath = path.resolve(config.data, 'mapper', 'environments');
    envUidMapperPath = path.resolve(config.data, 'mapper', 'environments', 'uid-mapping.json');
    envSuccessPath = path.resolve(config.data, 'environments', 'success.json');
    envFailsPath = path.resolve(config.data, 'environments', 'fails.json');
    self.environments = helper.readFileSync(path.resolve(environmentsFolderPath, environmentConfig.fileName));
    client = stack.Client(config);
    if (fs.existsSync(envUidMapperPath)) {
      self.envUidMapper = helper.readFileSync(envUidMapperPath);
      self.envUidMapper = self.envUidMapper || {};
    }

    mkdirp.sync(envMapperPath);
    return new Promise(function (resolve, reject) {
      if (self.environments === undefined || isEmpty(self.environments)) {
        addlogs(config, chalk.yellow('No Environment Found'), 'success');
        return resolve({ empty: true });
      }

      let envUids = Object.keys(self.environments);
      return Promise.map(
        envUids,
        function (envUid) {
          let env = self.environments[envUid];
          if (!self.envUidMapper.hasOwnProperty(envUid)) {
            let requestOption = {
              environment: env,
            };

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
                  addlogs(config, chalk.white("Environment: '" + env.name + "' already exists"), 'error');
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
          // import 2 environments at a time
        },
        {
          concurrency: 2,
        },
      )
        .then(function () {
          // environments have imported successfully
          helper.writeFile(envSuccessPath, self.success);
          addlogs(config, chalk.green('Environments have been imported successfully!'), 'success');
          return resolve();
        })
        .catch(function (error) {
          // error while importing environments
          helper.writeFile(envFailsPath, self.fails);
          addlogs(config, chalk.red('Environment import failed'), 'error');
          return reject(error);
        });
    });
  },
};

module.exports = new importEnvironments();
