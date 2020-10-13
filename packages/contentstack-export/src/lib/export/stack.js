/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

var chalk = require('chalk')
var mkdirp = require('mkdirp')
var path = require('path')

var request = require('../util/request')
var app = require('../../app')
var helper = require('../util/helper')
var {addlogs} = require('../util/log')

let config = require('../../config/default')

var stackConfig = config.modules.stack
let client

function ExportStack () {
  this.requestOption = {
    uri: config.host + config.apis.stacks,
    headers: config.headers,
    json: true
  }
}

ExportStack.prototype.start = function (credentialConfig) {
  config = credentialConfig
  addlogs(config, 'Exporting stack details', 'success')
  let stackFolderPath = path.resolve(config.data, stackConfig.dirName)
  let stackContentsFile = path.resolve(stackFolderPath, stackConfig.fileName)

  // Create asset folder
  mkdirp.sync(stackFolderPath)

  return new Promise((resolve, reject) => {
    return client.stack({api_key: config.source_stack}).fetch()
    .then(response => {
      helper.writeFile(stackContentsFile, response)
      addlogs(config, 'Exported stack details successfully!', 'success')
      return resolve()
    })
    .catch(reject)
  })
}

module.exports = new ExportStack()
