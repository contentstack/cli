/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

'use strict';

const debug = require('debug')('util:requests');
const MAX_RETRY_LIMIT = 5;
const Bluebird = require('bluebird');

const util = require('./index');
const config = util.getConfig();
const { managementSDKClient } = require('@contentstack/cli-utilities');

function validate(req) {
  if (typeof req !== 'object') {
    throw new Error(`Invalid params passed for request\n${JSON.stringify(arguments)}`);
  }
}

const upload = (module.exports = function (req, fsPath, RETRY) {
  return new Bluebird(function (resolve, reject) {
    try {
      managementSDKClient(config)
        .then((APIClient) => {
          validate(req);
          if (typeof RETRY !== 'number') {
            RETRY = 1;
          } else if (RETRY > MAX_RETRY_LIMIT) {
            return reject(new Error('Max retry limit exceeded!'));
          }

          req.upload = fsPath;
          const stackAPIClient = APIClient.stack({
            api_key: config.target_stack,
            management_token: config.management_token,
          });
          stackAPIClient
            .asset()
            .create(req)
            .then((response) => {
              return resolve(response);
            })
            .catch((error) => {
              return reject(error);
            });
        })
        .catch(reject);
    } catch (error) {
      debug(error);
      return reject(error);
    }
  });
});
