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
  return new Promise(function (resolve, reject) {
    return client
      .stack({ api_key: config.source_stack, management_token: config.management_token })
      .workflow()
      .fetchAll()
      .then(async (response) => {
        try {
          if (response.items.length) {
            await getWorkflowsData(self, response.items);
            addlogs(config, chalk.green('All the workflow have been exported successfully'), 'success');
          }
          if (!response.items.length) {
            addlogs(config, 'No workflow were found in the Stack', 'success');
          }
          helper.writeFile(path.join(workflowsFolderPath, workFlowConfig.fileName), self.workflows);
          return resolve();
        } catch (error) {
          return reject(error);
        }
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

const getWorkflowsData = async (self, workflows) => {
  try {
    for (const workflow of workflows) {
      addlogs(config, workflow.name + ' workflow was exported successfully', 'success');
      await getWorkflowRoles(workflow);
      self.workflows[workflow.uid] = workflow;
      let deleteItems = config.modules.workflows.invalidKeys;
      deleteItems.forEach((e) => delete workflow[e]);
    }
  } catch (error) {
    throw error;
  }
};

const getWorkflowRoles = async (workflow) => {
  try {
    for (const stage of workflow.workflow_stages) {
      if (stage.SYS_ACL.roles.uids.length) {
        for (let i = 0; i < stage.SYS_ACL.roles.uids.length; i++) {
          const roleUid = stage.SYS_ACL.roles.uids[i];
          const roleData = await client.stack({ api_key: config.source_stack, management_token: config.management_token }).role(roleUid).fetch({ include_rules: true, include_permissions: true });
          stage.SYS_ACL.roles.uids[i] = roleData;
        }
      }
    }
  } catch (error) {
    console.log('Error getting roles', error && error.message);
    addlogs(config, 'Error fetching roles in export workflows task.', 'error');
    throw { message: 'Error fetching roles in export workflows task.' };
  }
};

module.exports = new ExportWorkFlows();
