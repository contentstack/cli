/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const Promise = require('bluebird');
const { isEmpty, merge, filter, map, cloneDeep, find } = require('lodash');

let { default: config } = require('../../config');
const { fileHelper, log, formatError } = require('../../utils');

module.exports = class importWorkflows {
  fails = [];
  success = [];
  workflowUidMapper = {};
  workflowConfig = config.modules.workflows;
  reqConcurrency = config.concurrency || config.fetchConcurrency || 1;

  constructor(importConfig, stackAPIClient) {
    this.config = merge(config, importConfig);
    this.stackAPIClient = stackAPIClient;
  }

  start() {
    log(this.config, chalk.white('Migrating workflows'), 'success');

    let self = this;
    let workflowMapperPath = path.resolve(this.config.data, 'mapper', 'workflows');
    let workflowFailsPath = path.resolve(this.config.data, 'workflows', 'fails.json');
    let workflowSuccessPath = path.resolve(this.config.data, 'workflows', 'success.json');
    let workflowUidMapperPath = path.resolve(this.config.data, 'mapper', 'workflows', 'uid-mapping.json');
    let workflowFolderPath = path.resolve(this.config.data, this.workflowConfig.dirName);

    self.workflows = fileHelper.readFileSync(path.resolve(workflowFolderPath, this.workflowConfig.fileName));

    if (fs.existsSync(workflowUidMapperPath)) {
      this.workflowUidMapper = fileHelper.readFileSync(workflowUidMapperPath);
      this.workflowUidMapper = this.workflowUidMapper || {};
    }

    mkdirp.sync(workflowMapperPath);

    return new Promise(function (resolve, reject) {
      if (self.workflows == undefined || isEmpty(self.workflows)) {
        log(self.config, chalk.white('No workflow Found'), 'success');
        return resolve({ empty: true });
      }
      self.workflowsUids = Object.keys(self.workflows);
      return Promise.map(
        self.workflowsUids,
        async function (workflowUid) {
          let workflow = self.workflows[workflowUid];

          if (!self.workflowUidMapper.hasOwnProperty(workflowUid)) {
            const roleNameMap = {};
            const workflowStages = workflow.workflow_stages;
            const oldWorkflowStages = cloneDeep(workflow.workflow_stages);
            const roles = await self.stackAPIClient.role().fetchAll();

            for (const role of roles.items) {
              roleNameMap[role.name] = role.uid;
            }

            for (const stage of workflowStages) {
              delete stage.uid;

              if (!isEmpty(stage.next_available_stages)) {
                stage.next_available_stages = ['$all'];
              }

              if (stage.SYS_ACL.users.uids.length && stage.SYS_ACL.users.uids[0] !== '$all') {
                stage.SYS_ACL.users.uids = ['$all'];
              }

              if (stage.SYS_ACL.roles.uids.length) {
                try {
                  for (let i = 0; i < stage.SYS_ACL.roles.uids.length; i++) {
                    const roleData = stage.SYS_ACL.roles.uids[i];
                    if (!roleNameMap[roleData.name]) {
                      // rules.branch is required to create custom roles.
                      const branchRuleExists = roleData.rules.find((rule) => rule.module === 'branch');
                      if (!branchRuleExists) {
                        roleData.rules.push({
                          module: 'branch',
                          branches: ['main'],
                          acl: { read: true },
                        });
                      }

                      const role = await self.stackAPIClient.role().create({ role: roleData });
                      stage.SYS_ACL.roles.uids[i] = role.uid;
                      roleNameMap[roleData.name] = role.uid;
                    } else {
                      stage.SYS_ACL.roles.uids[i] = roleNameMap[roleData.name];
                    }
                  }
                } catch (error) {
                  log(self.config, `Error while importing workflows roles. ${formatError(error)}`, 'error');
                  reject({ message: 'Error while importing workflows roles' });
                }
              }
            }

            if (workflow.admin_users !== undefined) {
              log(self.config, chalk.yellow('We are skipping import of `Workflow superuser(s)` from workflow'), 'info');
              delete workflow.admin_users;
            }
            // One branch is required to create workflow.
            if (!workflow.branches) {
              workflow.branches = ['main'];
            }

            return self.stackAPIClient
              .workflow()
              .create({ workflow })
              .then(async function (response) {
                if (
                  !isEmpty(filter(oldWorkflowStages, ({ next_available_stages }) => !isEmpty(next_available_stages)))
                ) {
                  let updateRresponse = await self
                    .updateNextAvailableStagesUid(response, response.workflow_stages, oldWorkflowStages)
                    .catch((error) => {
                      log(self.config, `Workflow '${workflow.name}' update failed.`, 'error');
                      log(self.config, error, 'error');
                    });

                  if (updateRresponse) response = updateRresponse;
                }

                self.workflowUidMapper[workflowUid] = response;
                fileHelper.writeFileSync(workflowUidMapperPath, self.workflowUidMapper);
              })
              .catch(function (error) {
                self.fails.push(workflow);
                if (error.errors.name) {
                  log(self.config, `workflow '${workflow.name}' already exist`, 'error');
                } else if (error.errors['workflow_stages.0.users']) {
                  log(
                    self.config,
                    "Failed to import Workflows as you've specified certain roles in the Stage transition and access rules section. We currently don't import roles to the stack.",
                    'error',
                  );
                } else {
                  log(self.config, `Workflow '${workflow.name}' failed.`, 'error');
                }
              });
          } else {
            // the workflow has already been created
            log(
              self.config,
              chalk.white(`The Workflows ${workflow.name} already exists. Skipping it to avoid duplicates!`),
              'success',
            );
          }
          // import 1 workflows at a time
        },
        { concurrency: self.reqConcurrency },
      )
        .then(function () {
          fileHelper.writeFileSync(workflowSuccessPath, self.success);
          log(self.config, chalk.green('Workflows have been imported successfully!'), 'success');
          resolve();
        })
        .catch(function (error) {
          fileHelper.writeFileSync(workflowFailsPath, self.fails);
          log(self.config, `Workflows import failed. ${formatError(error)}`, 'error');
          return reject(error);
        });
    });
  }

  updateNextAvailableStagesUid(workflow, newWorkflowStages, oldWorkflowStages) {
    newWorkflowStages = map(newWorkflowStages, (newStage, index) => {
      const oldStage = oldWorkflowStages[index];
      if (!isEmpty(oldStage.next_available_stages)) {
        newStage.next_available_stages = map(oldStage.next_available_stages, (stageUid) => {
          if (stageUid === '$all') return stageUid;
          const stageName = find(oldWorkflowStages, { uid: stageUid })?.name;
          return find(newWorkflowStages, { name: stageName })?.uid;
        }).filter((val) => val);
      }

      return newStage;
    });

    const updateWorkflow = this.stackAPIClient.workflow(workflow.uid);
    Object.assign(updateWorkflow, {
      name: workflow.name,
      branches: workflow.branches,
      workflow_stages: newWorkflowStages,
      content_types: workflow.content_types
    });
    return updateWorkflow.update();
  }
};
