'use strict';

const { success } = require('./logger');
const { successMessageHandler } = require('./constants');

module.exports = (data, type, method) => {
  if (data && type && method) {
    //success(`Successfully ${successMessageHandler[method]} ${type}: ${data}`);
  } else {
    success(`${type} successfully completed`);
  }
};
