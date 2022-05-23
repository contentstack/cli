/* eslint-disable node/no-extraneous-require */
/* eslint-disable no-mixed-operators */
/* eslint-disable max-statements-per-line */
/* eslint-disable no-multi-assign */
const Bluebird = require('bluebird');
const request = Bluebird.promisify(require('request'));
const debug = require('debug')('requests');
const { configHandler } = require('@contentstack/cli-utilities');
let config = configHandler

const MAX_RETRY_LIMIT = 8;

var makeCall = (module.exports = function (req, RETRY) {
  return new Bluebird((resolve, reject) => {
    try {
      if (typeof RETRY !== 'number') {
        RETRY = 1;
      } else if (RETRY > MAX_RETRY_LIMIT) {
        return reject(new Error('Max retry limit exceeded!'));
      }
      if (!req.headers) {
        req.headers = {};
      }
      req.headers['X-User-Agent'] = `bulk-publish-entries-assets/v${config.get('apiVersion')}`;
      return request(req)
        .then((response) => {
          let timeDelay;
          if (response.statusCode >= 200 && response.statusCode <= 399) {
            return resolve(JSON.parse(response.body));
          }
          if (response.statusCode === 429) {
            // eslint-disable-next-line no-mixed-operators
            timeDelay = Math.SQRT2 ** RETRY * 100;
            debug(`API rate limit exceeded.\nReceived ${response.statusCode} status\nBody ${JSON.stringify(response)}`);
            debug(`Retrying ${req.uri || req.url} with ${timeDelay} sec delay`);
            return setTimeout(
              (req1, RETRY1) => makeCall(req1, RETRY1).then(resolve).catch(reject),
              timeDelay,
              req,
              RETRY,
            );
          }
          if (response.statusCode >= 500) {
            // retry, with delay
            timeDelay = Math.SQRT2 ** RETRY * 100;
            debug(`Recevied ${response.statusCode} status\nBody ${JSON.stringify(response)}`);
            debug(`Retrying ${req.uri || req.url} with ${timeDelay} sec delay`);
            RETRY++;
            return setTimeout(
              (req2, RETRY2) => makeCall(req2, RETRY2).then(resolve).catch(reject),
              timeDelay,
              req,
              RETRY,
            );
          }
          debug(`Request failed\n${JSON.stringify(req)}`);
          debug(`Response received\n${JSON.stringify(response)}`);
          return reject(response.body);
        })
        .catch(reject);
    } catch (error) {
      debug(error);
      return reject(error);
    }
  });
});
