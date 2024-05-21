/*!
 * Contentstack Export
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const { merge } = require('lodash');
const { formatError, log, fileHelper } = require('../../utils');
const { default: config } = require('../../config');
module.exports = class ExportWorkFlows {
  config;
  workflows = {};
  workFlowConfig = config.modules.workflows;

  constructor(exportConfig, stackAPIClient) {
    this.config = merge(config, exportConfig);
    this.stackAPIClient = stackAPIClient;
  }

  start() {
    log(this.config, 'Starting workflow export', 'success');

    const self = this;
    const workflowsFolderPath = path.resolve(
      this.config.data,
      this.config.branchName || '',
      this.workFlowConfig.dirName,
    );
    mkdirp.sync(workflowsFolderPath);

    return new Promise(function (resolve, reject) {
      return self.stackAPIClient
        .workflow()
        .fetchAll()
        .then(async (response) => {
          try {
            if (response.items.length) {
              await self.getWorkflowsData(self, response.items);
              log(self.config, chalk.green('All the workflow have been exported successfully'), 'success');
            }
            if (!response.items.length) {
              log(self.config, 'No workflow were found in the Stack', 'success');
            }
            fileHelper.writeFileSync(path.join(workflowsFolderPath, self.workFlowConfig.fileName), self.workflows);
            resolve();
          } catch (error) {
            log(self.config, formatError(error), 'error');
            reject(error);
          }
        })
        .catch(function (error) {
          if (error.statusCode === 401) {
            log(
              self.config,
              'You are not allowed to export workflow, Unless you provide email and password in config',
              'error',
            );
            return resolve();
          }
          log(self.config, formatError(error), 'error');
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
            const roleData = await self.stackAPIClient
              .role(roleUid)
              .fetch({ include_rules: true, include_permissions: true });
            stage.SYS_ACL.roles.uids[i] = roleData;
          }
        }
      }
    } catch (error) {
      log(self.config, `Error fetching roles in export workflows task. ${formatError(error)}`, 'error');
      throw new Error({ message: 'Error fetching roles in export workflows task.' });
    }
  }

  async getWorkflowsData(self, workflows) {
    try {
      for (const workflow of workflows) {
        log(self.config, workflow.name + ' workflow was exported successfully', 'success');
        await self.getWorkflowRoles(self, workflow);
        self.workflows[workflow.uid] = workflow;
        const deleteItems = config.modules.workflows.invalidKeys;
        deleteItems.forEach((e) => delete workflow[e]);
      }
    } catch (error) {
      log(self.config, `Error fetching workflow data in export workflows task. ${formatError(error)}`, 'error');
      throw error;
    }
  }
};
