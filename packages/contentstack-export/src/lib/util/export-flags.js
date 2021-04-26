/*!
* Contentstack Export
* Copyright (c) 2019 Contentstack LLC
* MIT Licensed
*/
let defaultConfig = require('../../config/default')
let message = require('../../../messages/index.json')
let { initial } = require('../../app')
let path = require('path')
const helper = require('../util/helper');
let _ = require('lodash')
const { cli } = require('cli-ux')

exports.configWithMToken = function (config, managementTokens, host, _authToken, moduleName, contentType) {
  let externalConfig = require(config)
  defaultConfig.auth_token = _authToken
  defaultConfig.management_token = managementTokens.token
  defaultConfig.host = host.cmacontentTypenagementTokens.token
  defaultConfig.auth_token = _authToken
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
    // Specfic content type setting is only for entries module
    if (moduleName === 'entries' && contentType) {
      defaultConfig.contentType = contentType
    }
  }
  defaultConfig.source_stack = managementTokens.apiKey
  defaultConfig.data = data
  initial(defaultConfig)
}

// using ManagementToken
exports.withoutParameterMToken = async (managementTokens, moduleName, host, _authToken, contentType) => {
  const stackUid = managementTokens.apiKey
  const pathOfExport = await cli.prompt(message.promptMessageList.promptPathStoredData)
  defaultConfig.management_token = managementTokens.token
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  defaultConfig.auth_token = _authToken
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
    if (moduleName === 'entries' && contentType) {
      defaultConfig.contentType = contentType
    }
  }
  defaultConfig.source_stack = stackUid
  defaultConfig.data = pathOfExport
  initial(defaultConfig)
}

exports.configWithAuthToken = function (config, _authToken, moduleName, host, contentType) {
  let externalConfig = helper.readFile(path.resolve(config))
  defaultConfig.auth_token = _authToken
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
    if (moduleName === 'entries' && contentType) {
      defaultConfig.contentType = contentType
    }
  }
  defaultConfig = _.merge(defaultConfig, externalConfig)
  initial(defaultConfig)
}

exports.parametersWithAuthToken = function (_authToken, sourceStack, data, moduleName, host, contentType) {
  return new Promise(async (resolve, reject) => {
    defaultConfig.auth_token = _authToken
    defaultConfig.source_stack = sourceStack
    if (moduleName && moduleName !== undefined) {
      defaultConfig.moduleName = moduleName
      if (moduleName === 'entries' && contentType) {
        defaultConfig.contentType = contentType
      }
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

exports.withoutParametersWithAuthToken = async (_authToken, moduleName, host, contentType) => {
  const stackUid = await cli.prompt(message.promptMessageList.promptSourceStack)
  const pathOfExport = await cli.prompt(message.promptMessageList.promptPathStoredData)
  defaultConfig.auth_token = _authToken
  defaultConfig.source_stack = stackUid
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
    if (moduleName === 'entries' && contentType) {
      defaultConfig.contentType = contentType
    }
  }
  defaultConfig.data = pathOfExport
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  initial(defaultConfig)
}
