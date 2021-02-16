/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp')
const path = require('path')
const chalk = require('chalk')

let helper = require('../util/helper')
let {addlogs} = require('../util/log')

const stack = require('../util/contentstack-management-sdk')
let config = require('../../config/default')
const labels = require('./labels')
let workflowConfig = config.modules.workflows
let client
let workflows = {}

exports.start = function (credentialConfig) {
  addlogs(config, 'Starting workflow export', 'success')
  let self = this
  return new Promise(function (resolve, reject) {
    config = credentialConfig
    client = stack.Client(config)
    let workflowFolderPath = path.resolve(config.data, workflowConfig.dirName)
    mkdirp.sync(workflowFolderPath)
    return client.stack({api_key: config.source_stack, management_token: config.management_token}).workflow().query().find()
    .then(response => {
      // eslint-disable-next-line no-negated-condition
      if (response.items.length !== 0) {
        response.items.forEach(function (workflow) {
          addlogs(config, workflow.name + ' workflow was exported successfully', 'success')
          workflows[workflow.uid] = workflow
          let deleteItems = config.modules.workflow.invalidKeys
          deleteItems.forEach(e => delete workflow[e])
        })
        addlogs(config, chalk.green('All the workflows have been exported successfully'), 'success')
      } else {
        addlogs(config, 'No workflow were found in the Stack', 'success')
      }
      helper.writeFile(path.join(workflowFolderPath, workflowConfig.fileName), workflows)
      return resolve()
    }).catch(function (error) {
      if (error.statusCode === 401) {
        addlogs(config, chalk.red('You are not allowed to export workflow, Unless you provide email and password in config', 'error'))
        return resolve()
      }
      addlogs(config, error, 'error')
      return reject()
    })
  })
}
