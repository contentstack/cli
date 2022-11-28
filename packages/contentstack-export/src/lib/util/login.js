/* eslint-disable max-statements-per-line */
/* eslint-disable no-console */
/* eslint-disable no-empty */
/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const chalk = require('chalk');
const { addlogs } = require('../util/log');

module.exports.login = (config, APIClient, stackAPIClient) => {
  return new Promise(function (resolve, reject) {
    if (config.email && config.password) {
      // eslint-disable-next-line no-console
      console.log('Logging into Contentstack');
      APIClient.login({ email: config.email, password: config.password })
        .then(function (response) {
          // eslint-disable-next-line no-console
          console.log(chalk.green('Contentstack account authenticated successfully!'));
          config.authtoken = response.user.authtoken;
          config.headers = {
            api_key: config.source_stack,
            access_token: config.access_token,
            authtoken: config.authtoken,
            'X-User-Agent': 'contentstack-export/v',
          };
          resolve(config);
        })
        .catch(function (error) {
          reject(error);
        });
    } else if (!config.email && !config.password && config.source_stack && config.access_token) {
      addlogs(
        config,
        chalk.yellow('Content types, entries, assets, labels, global fields, extensions modules will be exported'),
        'success',
      );
      addlogs(
        config,
        chalk.yellow(
          'Email, password, or management token is not set in the config, cannot export Webhook and label modules',
        ),
        'success',
      );
      config.headers = {
        api_key: config.source_stack,
        access_token: config.access_token,
        'X-User-Agent': 'contentstack-export/v',
      };
      resolve(config);
      // eslint-disable-next-line no-else-return
    } else if (config.isAuthenticated && !config.management_token) {
      stackAPIClient
        .users()
        .then(function () {
          resolve();
        })
        .catch((error) => {
          if (error.errors.api_key) {
            return reject(error);
          }
          addlogs(config, error.errorMessage, 'error');
          reject(error);
        });
    } else if (config.management_token) {
      resolve();
    }
  });
};
