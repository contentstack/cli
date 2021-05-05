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

exports.configWithMToken = function (config, managementTokens, host, _authToken) {
  let externalConfig = require(config)
  defaultConfig.auth_token = _authToken
  defaultConfig.management_token = managementTokens.token
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  defaultConfig = _.merge(defaultConfig, externalConfig)
  initial(defaultConfig)
}

exports.parameterWithMToken = function (managementTokens, data, moduleName, host, _authToken) {
  defaultConfig.management_token = managementTokens.token
  defaultConfig.auth_token = _authToken
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
  }
  defaultConfig.source_stack = managementTokens.apiKey
  defaultConfig.data = data
  initial(defaultConfig)
}

// using ManagementToken
exports.withoutParameterMToken = async (managementTokens, moduleName, host, _authToken) => {
  const stackUid = managementTokens.apiKey
  const pathOfExport = await cli.prompt(message.promptMessageList.promptPathStoredData)
  defaultConfig.management_token = managementTokens.token
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  defaultConfig.auth_token = _authToken
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
  }
  defaultConfig.source_stack = stackUid
  defaultConfig.data = pathOfExport
  initial(defaultConfig)
}

exports.configWithAuthToken = function (config, _authToken, moduleName, host) {
  debugger
  let externalConfig = helper.readFile(path.resolve(config))
  defaultConfig.auth_token = _authToken
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
  }
  defaultConfig = _.merge(defaultConfig, externalConfig)
  initial(defaultConfig)
}

exports.parametersWithAuthToken = function (_authToken, sourceStack, data, moduleName, host) {
  return new Promise(async(resolve, reject) => {
    defaultConfig.auth_token = _authToken
    defaultConfig.source_stack = sourceStack
    if (moduleName && moduleName !== undefined) {
      defaultConfig.moduleName = moduleName
    }
    defaultConfig.host = host.cma
    defaultConfig.cdn = host.cda
    defaultConfig.data = data
    var exportStart = initial(defaultConfig)
    exportStart.then(() => {
      return resolve()
    }).catch((error) => {
      return reject(error)
    })
  })
}

exports.withoutParametersWithAuthToken = async (_authToken, moduleName, host) => {
  debugger
  const stackUid = await cli.prompt(message.promptMessageList.promptSourceStack)
  const pathOfExport = await cli.prompt(message.promptMessageList.promptPathStoredData)
  defaultConfig.auth_token = _authToken
  defaultConfig.source_stack = stackUid
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
  }
  defaultConfig.data = pathOfExport
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  initial(defaultConfig)
}
