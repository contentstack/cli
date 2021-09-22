/*!
* Contentstack Export
* Copyright (c) 2019 Contentstack LLC
* MIT Licensed
*/
let defaultConfig = require('../../config/default')
let message = require('../../../messages/index.json')
let {initial} = require('../../app')
let path = require('path')
const helper = require('../util/helper');
let _ = require('lodash')
const {cli} = require('cli-ux')

exports.configWithMToken = function (config, managementTokens, host, securedAssets) {
  let externalConfig = require(config)
  defaultConfig.securedAssets = securedAssets
  defaultConfig.management_token = managementTokens.token
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  defaultConfig = _.merge(defaultConfig, externalConfig)
  initial(defaultConfig)
}

exports.parameterWithMToken = function (managementTokens, data, moduleName, host, _authToken, securedAssets) {
  defaultConfig.management_token = managementTokens.token
  defaultConfig.auth_token = _authToken
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  defaultConfig.securedAssets = securedAssets
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
  }
  defaultConfig.source_stack = managementTokens.apiKey
  defaultConfig.data = data
  initial(defaultConfig)
}

// using ManagementToken
exports.withoutParameterMToken = async (managementTokens, moduleName, host, _authToken, securedAssets) => {
  const stackUid = managementTokens.apiKey
  const pathOfExport = await cli.prompt(message.promptMessageList.promptPathStoredData)
  defaultConfig.management_token = managementTokens.token
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  defaultConfig.auth_token = _authToken
  defaultConfig.securedAssets = securedAssets
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
  }
  defaultConfig.source_stack = stackUid
  defaultConfig.data = pathOfExport
  initial(defaultConfig)
}

exports.configWithAuthToken = function (config, _authToken, moduleName, host, securedAssets) {
  let externalConfig = helper.readFile(path.resolve(config))
  defaultConfig.auth_token = _authToken
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  defaultConfig.securedAssets = securedAssets
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
  }
  defaultConfig = _.merge(defaultConfig, externalConfig)
  initial(defaultConfig)
}

exports.parametersWithAuthToken = function (_authToken, sourceStack, data, moduleName, host, securedAssets) {
  return new Promise(async(resolve, reject) => {
    defaultConfig.auth_token = _authToken
    defaultConfig.source_stack = sourceStack
    if (moduleName && moduleName !== undefined) {
      defaultConfig.moduleName = moduleName
    }
    defaultConfig.host = host.cma
    defaultConfig.cdn = host.cda
    defaultConfig.data = data
    defaultConfig.securedAssets = securedAssets
    var exportStart = initial(defaultConfig)
    exportStart.then(() => {
      return resolve()
    }).catch((error) => {
      return reject(error)
    })
  })
}

exports.withoutParametersWithAuthToken = async (_authToken, moduleName, host, securedAssets) => {
  const stackUid = await cli.prompt(message.promptMessageList.promptSourceStack)
  const pathOfExport = await cli.prompt(message.promptMessageList.promptPathStoredData)
  defaultConfig.auth_token = _authToken
  defaultConfig.source_stack = stackUid
  defaultConfig.securedAssets = securedAssets
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
  }
  defaultConfig.data = pathOfExport
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  initial(defaultConfig)
}
