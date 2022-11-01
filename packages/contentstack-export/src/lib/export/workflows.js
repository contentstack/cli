/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const { merge } = require('lodash');

const helper = require('../util/helper');
const { addlogs } = require('../util/log');
const { formatError } = require('../util');
const config = require('../../config/default');
const stack = require('../util/contentstack-management-sdk');

module.exports = class ExportWorkFlows {
  client;
  config;
  workflows = {};
  workFlowConfig = config.modules.workflows;

  constructor(credentialConfig) {
    this.config = merge(config, credentialConfig);
  }

  start() {
    addlogs(this.config, 'Starting workflow export', 'success');

    const self = this;
    this.client = stack.Client(this.config);
    let workflowsFolderPath = path.resolve(this.config.data, this.config.branchName || '', this.workFlowConfig.dirName);

    mkdirp.sync(workflowsFolderPath);

    return new Promise(function (resolve, reject) {
      return self.client
        .stack({ api_key: self.config.source_stack, management_token: self.config.management_token })
        .workflow()
        .fetchAll()
        .then(async (response) => {
          try {
            if (response.items.length) {
              await self.getWorkflowsData(self, response.items);
              addlogs(self.config, chalk.green('All the workflow have been exported successfully'), 'success');
            }
            if (!response.items.length) {
              addlogs(self.config, 'No workflow were found in the Stack', 'success');
            }
            helper.writeFileSync(path.join(workflowsFolderPath, self.workFlowConfig.fileName), self.workflows);
            resolve();
          } catch (error) {
            addlogs(self.config, formatError(error), 'error');
            reject(error);
          }
        })
        .catch(function (error) {
          if (error.statusCode === 401) {
            addlogs(
              self.config,
              chalk.red(
                'You are not allowed to export workflow, Unless you provide email and password in config',
                'error',
              ),
            );
            return resolve();
          }
          addlogs(self.config, formatError(error), 'error');
          resolve();
        });
    });
  }

  async getWorkflowRoles(self, workflow) {
    try {
      for (const stage of workflow.workflow_stages) {
        if (stage.SYS_ACL.roles.uids.length) {
          for (let i = 0; i < stage.SYS_ACL.roles.uids.length; i++) {
            const roleUid = stage.SYS_ACL.roles.uids[i];
            const roleData = await self.client
              .stack({ api_key: config.source_stack, management_token: config.management_token })
              .role(roleUid)
              .fetch({ include_rules: true, include_permissions: true });
            stage.SYS_ACL.roles.uids[i] = roleData;
          }
        }
      }
    } catch (error) {
      console.log('Error getting roles', error && error.message);
      addlogs(config, 'Error fetching roles in export workflows task.', 'error');
      throw new Error({ message: 'Error fetching roles in export workflows task.' });
    }
  }

  async getWorkflowsData(self, workflows) {
    try {
      for (const workflow of workflows) {
        addlogs(config, workflow.name + ' workflow was exported successfully', 'success');
        await self.getWorkflowRoles(self, workflow);
        self.workflows[workflow.uid] = workflow;
        let deleteItems = config.modules.workflows.invalidKeys;
        deleteItems.forEach((e) => delete workflow[e]);
      }
    } catch (error) {
      throw error;
    }
  }
};
