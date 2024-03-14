'use strict';

const { apiConfig } = require('../config');

module.exports = ({ method, path, sdkAction }) => {
  return {
    ...apiConfig,
    path: path ? `${apiConfig.version}${path}` : apiConfig.version,
    method,
    headers: { ...apiConfig.headers },
    sdkAction,
  };
};
