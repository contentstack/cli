'use strict';

const { error } = require('./logger');
const { errorMessageHandler } = require('./constants');

module.exports = (data, type, method, err) => {
  if (data && type && method) {
    error(`Error occurred while ${errorMessageHandler[method]} ${type}: ${data}.`);
  }

  if (err.errorMessage) {
    error(err.errorMessage);
  }
  if (err instanceof Error && err && err.message && err.stack) {
    error(err.message);
    // error(err.stack)
  } else {
    error(err);
  }
  // throw new Error(err);
};
