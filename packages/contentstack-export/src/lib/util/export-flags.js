/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */
let defaultConfig = require('../../config/default');
let message = require('../../../messages/index.json');
let { initial } = require('../../app');
let path = require('path');
const helper = require('../util/helper');
let _ = require('lodash');
const { ux: cli } = require('@contentstack/cli-utilities');

exports.configWithMToken = function (config, managementTokens, host, contentTypes, branchName, securedAssets) {
  let externalConfig = require(config);
  defaultConfig.securedAssets = securedAssets;
  defaultConfig.management_token = managementTokens.token;
  defaultConfig.host = host.cma;
  defaultConfig.cdn = host.cda;
  defaultConfig.branchName = branchName;
  if (moduleName) {
    defaultConfig.moduleName = moduleName;
    // Specfic content type setting is only for entries module
    if (moduleName === 'entries' && Array.isArray(contentTypes) && contentTypes.length > 0) {
      defaultConfig.contentTypes = contentTypes;
    }
  }
  defaultConfig = _.merge(defaultConfig, externalConfig);
  initial(defaultConfig);
};

exports.parameterWithMToken = function (
  managementTokens,
  data,
  moduleName,
  host,
  _authToken,
  contentTypes,
  branchName,
  securedAssets,
) {
  defaultConfig.management_token = managementTokens.token;
  defaultConfig.auth_token = _authToken;
  defaultConfig.host = host.cma;
  defaultConfig.cdn = host.cda;
  defaultConfig.branchName = branchName;
  defaultConfig.securedAssets = securedAssets;
  if (moduleName) {
    defaultConfig.moduleName = moduleName;
    // Specfic content type setting is only for entries module
    if (moduleName === 'entries' && Array.isArray(contentTypes) && contentTypes.length > 0) {
      defaultConfig.contentTypes = contentTypes;
    }
  }
  defaultConfig.source_stack = managementTokens.apiKey;
  defaultConfig.data = data;
  initial(defaultConfig);
};

// using ManagementToken
exports.withoutParameterMToken = async (
  managementTokens,
  moduleName,
  host,
  _authToken,
  contentTypes,
  branchName,
  securedAssets,
) => {
  const stackUid = managementTokens.apiKey;
  const pathOfExport = await cli.prompt(message.promptMessageList.promptPathStoredData);
  defaultConfig.management_token = managementTokens.token;
  defaultConfig.host = host.cma;
  defaultConfig.cdn = host.cda;
  defaultConfig.branchName = branchName;
  defaultConfig.auth_token = _authToken;
  defaultConfig.securedAssets = securedAssets;
  if (moduleName) {
    defaultConfig.moduleName = moduleName;
    // Specfic content type setting is only for entries module
    if (moduleName === 'entries' && Array.isArray(contentTypes) && contentTypes.length > 0) {
      defaultConfig.contentTypes = contentTypes;
    }
  }
  defaultConfig.source_stack = stackUid;
  defaultConfig.data = pathOfExport;
  initial(defaultConfig);
};

exports.configWithAuthToken = function (config, _authToken, moduleName, host, contentTypes, branchName, securedAssets) {
  let externalConfig = helper.readFile(path.resolve(config));
  defaultConfig.auth_token = _authToken;
  defaultConfig.host = host.cma;
  defaultConfig.cdn = host.cda;
  defaultConfig.branchName = branchName;
  defaultConfig.securedAssets = securedAssets;
  if (moduleName) {
    defaultConfig.moduleName = moduleName;
    // Specfic content type setting is only for entries module
    if (moduleName === 'entries' && Array.isArray(contentTypes) && contentTypes.length > 0) {
      defaultConfig.contentTypes = contentTypes;
    }
  }
  defaultConfig = _.merge(defaultConfig, externalConfig);
  initial(defaultConfig);
};

exports.parametersWithAuthToken = function (
  _authToken,
  sourceStack,
  data,
  moduleName,
  host,
  contentTypes,
  branchName,
  securedAssets,
) {
  return new Promise(async (resolve, reject) => {
    defaultConfig.auth_token = _authToken;
    defaultConfig.source_stack = sourceStack;
    if (moduleName) {
      defaultConfig.moduleName = moduleName;
      // Specfic content type setting is only for entries module
      if (moduleName === 'entries' && Array.isArray(contentTypes) && contentTypes.length > 0) {
        defaultConfig.contentTypes = contentTypes;
      }
    }
    defaultConfig.branchName = branchName;
    defaultConfig.host = host.cma;
    defaultConfig.cdn = host.cda;
    defaultConfig.data = data;
    defaultConfig.securedAssets = securedAssets;
    var exportStart = initial(defaultConfig);
    exportStart
      .then(() => {
        return resolve();
      })
      .catch((error) => {
        return reject(error);
      });
  });
};

exports.withoutParametersWithAuthToken = async (
  _authToken,
  moduleName,
  host,
  contentTypes,
  branchName,
  securedAssets,
) => {
  const stackUid = await cli.prompt(message.promptMessageList.promptSourceStack);
  const pathOfExport = await cli.prompt(message.promptMessageList.promptPathStoredData);
  defaultConfig.auth_token = _authToken;
  defaultConfig.source_stack = stackUid;
  defaultConfig.securedAssets = securedAssets;
  if (moduleName) {
    defaultConfig.moduleName = moduleName;
    // Specfic content type setting is only for entries module
    if (moduleName === 'entries' && Array.isArray(contentTypes) && contentTypes.length > 0) {
      defaultConfig.contentTypes = contentTypes;
    }
  }
  defaultConfig.branchName = branchName;
  defaultConfig.data = pathOfExport;
  defaultConfig.host = host.cma;
  defaultConfig.cdn = host.cda;
  initial(defaultConfig);
};
