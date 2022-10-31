/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const _ = require('lodash');
let defaultConfig = require('../../config/default');

exports.validateConfig = (config) => {
  if (!config.host || !config.cdn) {
    throw new Error('Host/CDN end point is missing from config');
  }

  if (config.email && config.password && !config.access_token && !config.source_stack) {
    throw new Error('Kindly provide access_token or api_token');
  } else if (
    !config.email &&
    !config.password &&
    !config.management_token &&
    config.source_stack &&
    !config.access_token &&
    !config.isAuthenticated
  ) {
    throw new Error('Kindly provide management_token or email and password');
  } else if (
    config.email &&
    config.password &&
    !config.access_token &&
    config.source_stack &&
    !config.management_token &&
    !config.isAuthenticated
  ) {
    throw new Error('Kindly provide access_token or management_token');
  } else if (!config.email && !config.password && config.preserveStackVersion) {
    throw new Error('Kindly provide Email and password for stack details');
  }
};

exports.buildAppConfig = function (config) {
  config = _.merge(defaultConfig, config);
  return config;
};
