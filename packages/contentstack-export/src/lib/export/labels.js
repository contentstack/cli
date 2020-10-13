/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp')
const path = require('path')
const chalk = require('chalk')

// let request = require('../util/request')
let helper = require('../util/helper')
let {addlogs} = require('../util/log')

const stack = require('../util/contentstack-management-sdk')
let config = require('../../config/default')
let labelConfig = config.modules.labels
let client

function ExportLabels() {
  this.requestOptions = {
    url: config.host + config.apis.labels,
    headers: config.headers,
    json: true,
  }
  this.labels = {}
}

ExportLabels.prototype.start = function (credentialConfig) {
  addlogs(config, chalk.white('Starting labels export'))
  let self = this
  config = credentialConfig
  client = stack.Client(config)
  let labelsFolderPath = path.resolve(config.data, labelConfig.dirName)
  // Create locale folder
  mkdirp.sync(labelsFolderPath)
  return new Promise(function (resolve, reject) {
    return client.stack({api_key: config.source_stack, management_token: config.management_token}).label().query().find()
    .then((response) => {
      if (response.items.length !== 0) {
        response.items.forEach(function (label) {
          delete label['stackHeaders']
          addlogs(config, chalk.white(label.name + ' labels was exported successfully'))
          self.labels[label.uid] = label
        })
        addlogs(config, chalk.green('All the labels have been exported successfully'))
      } else {
        addlogs(config, 'No labels, other than master-labels were found in the Stack') 
      }
      helper.writeFile(path.join(labelsFolderPath, labelConfig.fileName), self.labels)
      return resolve()
    }).catch(function (error) {
      if (error.statusCode === 401) {
        addlogs(config, chalk.red('You are not allowed to export label, Unless you provide email and password in config', 'error'))
        return resolve()
      }
      addlogs(config, error, 'error')
      return reject()
    })
  })
}

module.exports = new ExportLabels()
