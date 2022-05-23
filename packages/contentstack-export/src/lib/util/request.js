/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

'use strict';

var Bluebird = require('bluebird');
var request = Bluebird.promisify(require('request'));
var app = require('../../app');

var MAX_RETRY_LIMIT = 8;

function validate(req) {
  if (typeof req !== 'object') {
    throw new Error(`Invalid params passed for request\n${JSON.stringify(arguments)}`);
  }
  if (typeof req.uri === 'undefined' && typeof req.url === 'undefined') {
    throw new Error(`Missing uri in request!\n${JSON.stringify(req)}`);
  }
  if (typeof req.method === 'undefined') {
    req.method = 'GET';
  }
  if (typeof req.json === 'undefined') {
    req.json = true;
  }
  if (typeof req.headers === 'undefined') {
    var config = app.getConfig();
    req.headers = config.headers;
  }
}

var makeCall = (module.exports = function (req, RETRY) {
  return new Bluebird(function (resolve, reject) {
    try {
      validate(req);
      if (typeof RETRY !== 'number') {
        RETRY = 1;
      } else if (RETRY > MAX_RETRY_LIMIT) {
        return reject(new Error('Max retry limit exceeded!'));
      }
      return request(req)
        .then(function (response) {
          var timeDelay;
          if (response.statusCode >= 200 && response.statusCode <= 399) {
            return resolve(response);
          } else if (response.statusCode === 429) {
            timeDelay = Math.pow(Math.SQRT2, RETRY) * 100;
            console.log(`Retrying ${req.uri || req.url} with ${timeDelay} sec delay`);
            return setTimeout(
              function (reqObj, retry) {
                return makeCall(reqObj, retry).then(resolve).catch(reject);
              },
              timeDelay,
              req,
              RETRY,
            );
          } else if (response.statusCode >= 500) {
            // retry, with delay
            timeDelay = Math.pow(Math.SQRT2, RETRY) * 100;
            console.log(`Retrying ${req.uri || req.url} with ${timeDelay} sec delay`);
            RETRY++;
            return setTimeout(
              function (_req, _RETRY) {
                return makeCall(_req, _RETRY).then(resolve).catch(reject);
              },
              timeDelay,
              req,
              RETRY,
            );
          } else {
            return reject(response);
          }
        })
        .catch(reject);
    } catch (error) {
      console.log("Error on http request", error && error.message);
      return reject(error);
    }
  });
});
