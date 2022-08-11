/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp');
const path = require('path');
const chalk = require('chalk');

let helper = require('../util/helper');
let { addlogs } = require('../util/log');

const stack = require('../util/contentstack-management-sdk');
let config = require('../../config/default');
let workFlowConfig = config.modules.workflows;
let client;

function ExportWorkFlows() {
  this.workflows = {};
}

ExportWorkFlows.prototype.start = function (credentialConfig) {
  addlogs(config, 'Starting workflow export', 'success');
  this.workflows = {};
  let self = this;
  config = credentialConfig;
  client = stack.Client(config);

  let workflowsFolderPath = path.resolve(config.data, config.branchName || '', workFlowConfig.dirName);
  mkdirp.sync(workflowsFolderPath);
  return new Promise(function (resolve) {
    return client
      .stack({ api_key: config.source_stack, management_token: config.management_token })
      .workflow()
      .fetchAll()
      .then((response) => {
        if (response.items.length !== 0) {
          response.items.forEach(function (workflow) {
            addlogs(config, workflow.name + ' workflow was exported successfully', 'success');
            self.workflows[workflow.uid] = workflow;
            let deleteItems = config.modules.workflows.invalidKeys;
            deleteItems.forEach((e) => delete workflow[e]);
          });
          addlogs(config, chalk.green('All the workflow have been exported successfully'), 'success');
        }
        if (response.items.length === 0) {
          addlogs(config, 'No workflow were found in the Stack', 'success');
        }
        helper.writeFile(path.join(workflowsFolderPath, workFlowConfig.fileName), self.workflows);
        return resolve();
      })
      .catch(function (error) {
        if (error.statusCode === 401) {
          addlogs(
            config,
            chalk.red(
              'You are not allowed to export workflow, Unless you provide email and password in config',
              'error',
            ),
          );
          return resolve();
        }
        addlogs(config, error, 'error');
        return resolve();
      });
  });
};

module.exports = new ExportWorkFlows();
