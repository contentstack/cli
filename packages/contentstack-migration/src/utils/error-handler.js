'use strict';

const { errorMessageHandler } = require('./constants');

module.exports = (data, type, method, err) => {
  // NOTE: Commenting this code as the API errors are handled through error-helper.js also
  // if (data && type && method) {
  //   logger.log('error', { error: `Error occurred while ${errorMessageHandler[method]} ${type}: ${data}.` });
  // }
  // if (err.errorMessage) {
  //   logger.log('error', { errorAPI: err.errorMessage });
  // }
  // if (err instanceof Error && err && err.message && err.stack) {
  //   logger.log('error', { error: err.message });
  // } else {
  //   logger.log('error', { error: err });
  // }
  // throw new Error(err);
};
