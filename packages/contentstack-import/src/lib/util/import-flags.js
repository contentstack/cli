/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */
let defaultConfig = require('../../config/default');
let { initial } = require('../../app');
let _ = require('lodash');
const { cliux } = require('@contentstack/cli-utilities');
let message = require('../../../messages/index.json');

exports.configWithMToken = function (config, managementTokens, moduleName, host, _authToken, backupdir, branchName) {
  return new Promise(async function (resolve, reject) {
    let externalConfig = require(config);
    defaultConfig.management_token = managementTokens.token;
    defaultConfig.branchName = branchName;
    if (moduleName && moduleName !== undefined) {
      defaultConfig.moduleName = moduleName;
    }
    defaultConfig.host = host;
    if (backupdir) {
      defaultConfig.useBackedupDir = backupdir;
    }
    defaultConfig.auth_token = _authToken;
    defaultConfig = _.merge(defaultConfig, externalConfig);
    initial(defaultConfig)
      .then(resolve)
      .catch(reject);
  });
};

exports.parameterWithMToken = function (managementTokens, data, moduleName, host, _authToken, backupdir, branchName) {
  return new Promise(async function (resolve, reject) {
    defaultConfig.management_token = managementTokens.token;
    defaultConfig.target_stack = managementTokens.apiKey;
    defaultConfig.auth_token = _authToken;
    defaultConfig.branchName = branchName;
    if (moduleName && moduleName !== undefined) {
      defaultConfig.moduleName = moduleName;
    }
    defaultConfig.data = data;
    defaultConfig.host = host;
    if (backupdir) {
      defaultConfig.useBackedupDir = backupdir;
    }
    initial(defaultConfig)
      .then(resolve)
      .catch(reject);
  });
};

// using ManagemetToken
exports.withoutParameterMToken = async (managementTokens, moduleName, host, _authToken, backupdir, branchName) => {
  return new Promise(async function (resolve, reject) {
    const exporteddata = await cliux.prompt(message.promptMessageList.promptPathStoredData);
    defaultConfig.management_token = managementTokens.token;
    defaultConfig.target_stack = managementTokens.apiKey;
    defaultConfig.auth_token = _authToken;
    defaultConfig.branchName = branchName;
    if (moduleName && moduleName !== undefined) {
      defaultConfig.moduleName = moduleName;
    }
    defaultConfig.data = exporteddata;
    defaultConfig.host = host;
    if (backupdir) {
      defaultConfig.useBackedupDir = backupdir;
    }
    initial(defaultConfig)
      .then(resolve)
      .catch(reject);
  });
};

exports.configWithAuthToken = function (config, _authToken, moduleName, host, backupdir, branchName) {
  return new Promise(async function (resolve, reject) {
    let externalConfig = require(config);
    defaultConfig.auth_token = _authToken;
    defaultConfig.branchName = branchName;
    if (moduleName && moduleName !== undefined) {
      defaultConfig.moduleName = moduleName;
    }
    defaultConfig.host = host;

    if (externalConfig.modules) {
      defaultConfig.modules.types = externalConfig.modules;
      delete externalConfig.modules;
    }

    if (backupdir) {
      defaultConfig.useBackedupDir = backupdir;
    }
    defaultConfig = _.merge(defaultConfig, externalConfig);
    initial(defaultConfig)
      .then(resolve)
      .catch(reject);
  });
};

exports.parametersWithAuthToken = function (_authToken, targetStack, data, moduleName, host, backupdir, branchName, config) {
  return new Promise(async function (resolve, reject) {
    let externalConfig = require(config);
    defaultConfig.auth_token = _authToken;
    defaultConfig.target_stack = targetStack;
    defaultConfig.branchName = branchName;
    if (moduleName && moduleName !== undefined && backupdir === undefined) {
      defaultConfig.moduleName = moduleName;
    } else if (moduleName && moduleName !== undefined && backupdir !== undefined) {
      defaultConfig.moduleName = moduleName;
      defaultConfig.useBackedupDir = backupdir;
    }
    defaultConfig.data = data;
    defaultConfig.host = host;
    defaultConfig = _.merge(defaultConfig, externalConfig);

    initial(defaultConfig)
      .then(resolve)
      .catch(reject);
  });
};

exports.withoutParametersWithAuthToken = async (_authToken, moduleName, host, backupdir, branchName) => {
  return new Promise(async function (resolve, reject) {
    const stackUid = await cliux.prompt(message.promptMessageList.promptTargetStack);
    const exporteddata = await cliux.prompt(message.promptMessageList.promptPathStoredData);
    defaultConfig.auth_token = _authToken;
    defaultConfig.target_stack = stackUid;
    defaultConfig.data = exporteddata;
    defaultConfig.branchName = branchName;
    if (moduleName && moduleName !== undefined && backupdir === undefined) {
      defaultConfig.moduleName = moduleName;
    } else if (moduleName && moduleName !== undefined && backupdir !== undefined) {
      defaultConfig.moduleName = moduleName;
      defaultConfig.useBackedupDir = backupdir;
    }

    defaultConfig.host = host;

    initial(defaultConfig)
      .then(resolve)
      .catch(reject);
  });
};
