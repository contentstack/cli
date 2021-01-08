/*!
* Contentstack Export
* Copyright (c) 2019 Contentstack LLC
* MIT Licensed
*/
let defaultConfig = require('../../config/default')
let { initial } = require('../../app')
let _ = require('lodash')
const {cli} = require('cli-ux')
let message = require('../../../messages/index.json')

exports.configWithMToken = function (config, managementTokens, moduleName, host, _authToken) {
  let externalConfig = require(config)
  defaultConfig.management_token = managementTokens.token
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
  }
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  defaultConfig.auth_token = _authToken
  defaultConfig = _.merge(defaultConfig, externalConfig)
  initial(defaultConfig)
}

exports.parameterWithMToken = function (managementTokens, data, moduleName, host, _authToken) {
  defaultConfig.management_token = managementTokens.token  
  defaultConfig.target_stack = managementTokens.apiKey
  defaultConfig.auth_token = _authToken
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
  }
  defaultConfig.data = data
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  initial(defaultConfig)
}

// using ManagemetToken
exports.withoutParameterMToken = async (managementTokens, moduleName, host, _authToken) => {
  const exporteddata = await cli.prompt(message.promptMessageList.promptPathStoredData)
  defaultConfig.management_token = managementTokens.token
  defaultConfig.target_stack = managementTokens.apiKey
  defaultConfig.auth_token = _authToken
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
  }
  defaultConfig.data = exporteddata
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  initial(defaultConfig)
}

exports.configWithAuthToken = function (config, _authToken, moduleName, host) {
  let externalConfig = require(config)
  defaultConfig.auth_token = _authToken
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
  }
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  defaultConfig = _.merge(defaultConfig, externalConfig)
  initial(defaultConfig)
}

exports.parametersWithAuthToken = function (_authToken, targetStack, data, moduleName, host, backupdir) {
  defaultConfig.auth_token = _authToken
  defaultConfig.target_stack = targetStack
  if (moduleName && moduleName !== undefined && backupdir === undefined) {
    defaultConfig.moduleName = moduleName
  } else if (moduleName && moduleName !== undefined && backupdir !== undefined) {
    defaultConfig.moduleName = moduleName
    defaultConfig.useBackedupDir = backupdir
  }
  defaultConfig.data = data
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  initial(defaultConfig)
}

exports.withoutParametersWithAuthToken = async (_authToken, moduleName, host, backupdir) => {
  const stackUid = await cli.prompt(message.promptMessageList.promptTargetStack)
  const exporteddata = await cli.prompt(message.promptMessageList.promptPathStoredData)
  defaultConfig.auth_token = _authToken
  defaultConfig.target_stack = stackUid
  defaultConfig.data = exporteddata
  if (moduleName && moduleName !== undefined && backupdir === undefined) {
    defaultConfig.moduleName = moduleName
  } else if (moduleName && moduleName !== undefined && backupdir !== undefined) {
    defaultConfig.moduleName = moduleName
    defaultConfig.useBackedupDir = backupdir
  }

  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda  
  initial(defaultConfig)
}
