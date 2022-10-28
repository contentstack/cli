/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const chalk = require('chalk');
const { isEmpty } = require('lodash');

const helper = require('../util/fs');
const { addlogs } = require('../util/log');
let config = require('../../config/default');
let stack = require('../util/contentstack-management-sdk');

let reqConcurrency = config.concurrency;
let workflowConfig = config.modules.workflows;
let workflowFolderPath;
let workflowMapperPath;
let workflowUidMapperPath;
let workflowSuccessPath;
let workflowFailsPath;
let client;

function importWorkflows() {
  this.fails = [];
  this.success = [];
  this.workflowUidMapper = {};
  this.labelUids = [];
  if (fs.existsSync(workflowUidMapperPath)) {
    this.workflowUidMapper = helper.readFileSync(workflowUidMapperPath);
    this.workflowUidMapper = this.workflowUidMapper || {};
  }
}

importWorkflows.prototype = {
  start: function (credentialConfig) {
    let self = this;
    config = credentialConfig;
    client = stack.Client(config);
    addlogs(config, chalk.white('Migrating workflows'), 'success');
    workflowFolderPath = path.resolve(config.data, workflowConfig.dirName);
    self.workflows = helper.readFileSync(path.resolve(workflowFolderPath, workflowConfig.fileName));
    workflowMapperPath = path.resolve(config.data, 'mapper', 'workflows');
    workflowUidMapperPath = path.resolve(config.data, 'mapper', 'workflows', 'uid-mapping.json');
    workflowSuccessPath = path.resolve(config.data, 'workflows', 'success.json');
    workflowFailsPath = path.resolve(config.data, 'workflows', 'fails.json');
    mkdirp.sync(workflowMapperPath);
    return new Promise(function (resolve, reject) {
      if (self.workflows == undefined || isEmpty(self.workflows)) {
        addlogs(config, chalk.white('No workflow Found'), 'success');
        return resolve({ empty: true });
      }
      self.workflowsUids = Object.keys(self.workflows);
      return Promise.map(
        self.workflowsUids,
        async function (workflowUid) {
          let workflow = self.workflows[workflowUid];

          if (!self.workflowUidMapper.hasOwnProperty(workflowUid)) {
            const workflowStages = workflow.workflow_stages;
            const roleNameMap = {};
            const roles = await client
              .stack({ api_key: config.target_stack, management_token: config.management_token })
              .role()
              .fetchAll();
            for (const role of roles.items) {
              roleNameMap[role.name] = role.uid;
            }
            for (let i = 0; i < workflowStages.length; i++) {
              const stage = workflowStages[i];
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

                      const role = await client
                        .stack({ api_key: config.target_stack, management_token: config.management_token })
                        .role()
                        .create({ role: roleData });
                      stage.SYS_ACL.roles.uids[i] = role.uid;
                      roleNameMap[roleData.name] = role.uid;
                    } else {
                      stage.SYS_ACL.roles.uids[i] = roleNameMap[roleData.name];
                    }
                  }
                } catch (error) {
                  addlogs(
                    config,
                    chalk.red('Error while importing workflows roles. ' + error && error.message),
                    'error',
                  );
                  return reject({ message: 'Error while importing workflows roles' });
                }
              }
            }

            if (workflow.admin_users !== undefined) {
              addlogs(config, chalk.yellow('We are skipping import of `Workflow superuser(s)` from workflow'), 'info');
              delete workflow.admin_users;
            }
            // One branch is required to create workflow.
            if (!workflow.branches) {
              workflow.branches = ['main'];
            }

            return client
              .stack({ api_key: config.target_stack, management_token: config.management_token })
              .workflow()
              .create({ workflow })
              .then(function (response) {
                self.workflowUidMapper[workflowUid] = response;
                helper.writeFile(workflowUidMapperPath, self.workflowUidMapper);
              })
              .catch(function (error) {
                self.fails.push(workflow);
                if (error.errors.name) {
                  addlogs(config, chalk.red("workflow: '" + workflow.name + "'  already exist"), 'error');
                } else if (error.errors['workflow_stages.0.users']) {
                  addlogs(
                    config,
                    chalk.red(
                      "Failed to import Workflows as you've specified certain roles in the Stage transition and access rules section. We currently don't import roles to the stack.",
                    ),
                    'error',
                  );
                } else {
                  addlogs(config, chalk.red("workflow: '" + workflow.name + "'  failed"), 'error');
                }
              });
          } else {
            // the workflow has already been created
            addlogs(
              config,
              chalk.white("The Workflows: '" + workflow.name + "' already exists. Skipping it to avoid duplicates!"),
              'success',
            );
          }
          // import 1 workflows at a time
        },
        {
          concurrency: reqConcurrency,
        },
      )
        .then(function () {
          helper.writeFile(workflowSuccessPath, self.success);
          addlogs(config, chalk.green('Workflows have been imported successfully!'), 'success');
          return resolve();
        })
        .catch(function (error) {
          helper.writeFile(workflowFailsPath, self.fails);
          addlogs(config, chalk.red('Workflows import failed'), 'error');
          return reject(error);
        });
    });
  },
};
module.exports = new importWorkflows();
