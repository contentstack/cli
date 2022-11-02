/* eslint-disable no-console */
/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const chalk = require('chalk');

const { addlogs } = require('../util/log');
let stack = require('../util/contentstack-management-sdk');
let client;

module.exports = function (config) {
  client = stack.Client(config);

  return new Promise(function (resolve, reject) {
    // eslint-disable-next-line no-console
    if (config.email && config.password) {
      console.log('Logging into Contentstack');
      return client
        .login({ email: config.email, password: config.password })
        .then(function (response) {
          // eslint-disable-next-line no-console
          console.log(chalk.green('Contentstack account authenticated successfully!'));
          config.authtoken = response.user.authtoken;
          config.headers = {
            api_key: config.target_stack,
            authtoken: config.authtoken,
            'X-User-Agent': 'contentstack-import/v',
          };
          return resolve(config);
        })
        .catch(reject);
    } else if (config.management_token) {
      return resolve();
    } else if (config.auth_token) {
      client
        .stack({ api_key: config.target_stack, management_token: config.management_token })
        .fetch()
        .then(function (stack) {
          config.destinationStackName = stack.name
          return resolve();
        })
        .catch((error) => {
          let errorstack_key = error.errors.api_key;
          if (error.errors.api_key) {
            addlogs(config, chalk.red('Stack Api key ' + errorstack_key[0], 'Please enter valid Key'), 'error');
            return reject(error);
          }
          addlogs(config, error.errorMessage, 'error');
          return reject(error);
        });
    }
  });
};
