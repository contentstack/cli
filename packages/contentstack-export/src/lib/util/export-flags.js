/*!
* Contentstack Export
* Copyright (c) 2019 Contentstack LLC
* MIT Licensed
*/
let defaultConfig = require('../../config/default')
let message = require('../../../messages/index.json')
let {initial} = require('../../app')
let _ = require('lodash')
const {cli} = require('cli-ux')

exports.configWithMToken = function (config, managementTokens, host) {
  let externalConfig = require(config)
  defaultConfig.management_token = managementTokens.token
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  defaultConfig = _.merge(defaultConfig, externalConfig)
  initial(defaultConfig)
}

exports.parameterWithMToken = function (masterLang, managementTokens, sourceStack, data, moduleName, host) {
  let masterloc = {master_locale: {code: masterLang}}
  defaultConfig.management_token = managementTokens.token
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
  }
  defaultConfig.source_stack = sourceStack
  defaultConfig.data = data
  defaultConfig = _.merge(defaultConfig, masterloc)
  initial(defaultConfig)
}

// using ManagementToken
exports.withoutParameterMToken = async (managementTokens, moduleName, host) => {
  const masterLocale = await cli.prompt(message.promptMessageList.promptMasterLocale)
  const stackUid = managementTokens.apiKey
  const pathOfExport = await cli.prompt(message.promptMessageList.promptPathStoredData)
  let masterloc = {master_locale: {code: masterLocale}}
  defaultConfig.management_token = managementTokens.token
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
  }
  defaultConfig.source_stack = stackUid
  defaultConfig.data = pathOfExport
  defaultConfig = _.merge(defaultConfig, masterloc)
  initial(defaultConfig)
}

exports.configWithAuthToken = function (config, _authToken, moduleName, host) {
  let externalConfig = require(config)
  defaultConfig.auth_token = _authToken
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
  }
  defaultConfig = _.merge(defaultConfig, externalConfig)
  initial(defaultConfig)
}

exports.parametersWithAuthToken = function (masterLang, _authToken, sourceStack, data, moduleName, host) {
  let masterloc = {master_locale: {code: masterLang}}
  defaultConfig.auth_token = _authToken
  defaultConfig.source_stack = sourceStack
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
  }
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  defaultConfig.data = data
  defaultConfig = _.merge(defaultConfig, masterloc)
  initial(defaultConfig)
}

exports.withoutParametersWithAuthToken = async (_authToken, moduleName, host) => {
  const masterLocale = await cli.prompt(message.promptMessageList.promptMasterLocale)
  const stackUid = await cli.prompt(message.promptMessageList.promptSourceStack)
  const pathOfExport = await cli.prompt(message.promptMessageList.promptPathStoredData)
  let masterloc = {master_locale: {code: masterLocale}}
  defaultConfig.auth_token = _authToken
  defaultConfig.source_stack = stackUid
  if (moduleName && moduleName !== undefined) {
    defaultConfig.moduleName = moduleName
  }
  defaultConfig.data = pathOfExport
  defaultConfig.host = host.cma
  defaultConfig.cdn = host.cda
  defaultConfig = _.merge(defaultConfig, masterloc)
  initial(defaultConfig)
}
