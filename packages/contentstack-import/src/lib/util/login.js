/* eslint-disable no-console */
/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const chalk = require('chalk');

const { addlogs } = require('../util/log');
const { managementSDKClient, isAuthenticated } = require('@contentstack/cli-utilities');

module.exports = (config) => {
  return new Promise((resolve, reject) => {
    managementSDKClient(config)
      .then((APIClient) => {
        // eslint-disable-next-line no-console
        if (config.email && config.password) {
          console.log('Logging into Contentstack');
          return APIClient.login({ email: config.email, password: config.password })
            .then((response) => {
              // eslint-disable-next-line no-console
              console.log(chalk.green('Contentstack account authenticated successfully!'));
              config.headers = {
                api_key: config.target_stack,
                authtoken: response.user.authtoken,
                'X-User-Agent': 'contentstack-import/v',
              };
              return resolve(config);
            })
            .catch(reject);
        } else if (config.management_token) {
          return resolve();
        } else if (isAuthenticated()) {
          const stackAPIClient = APIClient.stack({
            api_key: config.target_stack,
            management_token: config.management_token,
          });
          stackAPIClient
            .fetch()
            .then((stack) => {
              config.destinationStackName = stack.name;
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
      })
      .catch((error) => reject(error));
  });
};
