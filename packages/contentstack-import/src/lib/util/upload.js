/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

'use strict';

var debug = require('debug')('util:requests');
var MAX_RETRY_LIMIT = 5;
var Bluebird = require('bluebird');

var util = require('./index');
var config = util.getConfig();
const client = require('../util/contentstack-management-sdk').Client(config);

function validate(req) {
  if (typeof req !== 'object') {
    throw new Error(`Invalid params passed for request\n${JSON.stringify(arguments)}`);
  }
}

var upload = (module.exports = function (req, fsPath, RETRY) {
  return new Bluebird(function (resolve, reject) {
    try {
      validate(req);
      if (typeof RETRY !== 'number') {
        RETRY = 1;
      } else if (RETRY > MAX_RETRY_LIMIT) {
        return reject(new Error('Max retry limit exceeded!'));
      }

      req.upload = fsPath;
      client
        .stack({ api_key: config.target_stack, management_token: config.management_token })
        .asset()
        .create(req)
        .then((response) => {
          return resolve(response);
        })
        .catch((error) => {
          return reject(error);
        });
    } catch (error) {
      debug(error);
      return reject(error);
    }
  });
});
