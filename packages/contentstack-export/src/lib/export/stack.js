/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

var chalk = require('chalk')
var mkdirp = require('mkdirp')
var path = require('path')

var app = require('../../app')
var helper = require('../util/helper')
var {addlogs} = require('../util/log')
const stack = require('../util/contentstack-management-sdk')


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
  client = stack.Client(config)
  if (!config.preserveStackVersion && !config.hasOwnProperty("master_locale")) {
    return new Promise((resolve, reject) => {
    var result =  client.stack({ api_key: credentialConfig.source_stack, management_token: credentialConfig.management_token }).locale().query()     
    result.find()
      .then(response => {
        var masterLocalObj = response.items.filter(obj => {
            if (obj.fallback_locale === null) {
              return obj
            }
            });
        return resolve(masterLocalObj[0])
      }).catch(error => {
        return reject(error)
      })
    })
  } else if(config.preserveStackVersion) {
    addlogs(config, 'Exporting stack details', 'success')
    let stackFolderPath = path.resolve(config.data, stackConfig.dirName)
    let stackContentsFile = path.resolve(stackFolderPath, stackConfig.fileName)
  
    mkdirp.sync(stackFolderPath)
  
    return new Promise((resolve, reject) => {
      return client.stack({api_key: config.source_stack}).fetch()
      .then(response => {
        helper.writeFile(stackContentsFile, response)
        addlogs(config, 'Exported stack details successfully!', 'success')
        return resolve(response)
      })
      .catch(reject)
    })
  }
}

module.exports = new ExportStack()
