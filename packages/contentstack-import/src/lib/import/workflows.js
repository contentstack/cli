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
const { isEmpty, merge } = require('lodash');

const helper = require('../util/fs');
const { formatError } = require('../util');
const { addlogs } = require('../util/log');
let config = require('../../config/default');

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
    addlogs(this.config, chalk.white('Migrating workflows'), 'success');

    let self = this;
    let workflowMapperPath = path.resolve(this.config.data, 'mapper', 'workflows');
    let workflowFailsPath = path.resolve(this.config.data, 'workflows', 'fails.json');
    let workflowSuccessPath = path.resolve(this.config.data, 'workflows', 'success.json');
    let workflowUidMapperPath = path.resolve(this.config.data, 'mapper', 'workflows', 'uid-mapping.json');
    let workflowFolderPath = path.resolve(this.config.data, this.workflowConfig.dirName);

    self.workflows = helper.readFileSync(path.resolve(workflowFolderPath, this.workflowConfig.fileName));

    if (fs.existsSync(workflowUidMapperPath)) {
      this.workflowUidMapper = helper.readFileSync(workflowUidMapperPath);
      this.workflowUidMapper = this.workflowUidMapper || {};
    }

    mkdirp.sync(workflowMapperPath);

    return new Promise(function (resolve, reject) {
      if (self.workflows == undefined || isEmpty(self.workflows)) {
        addlogs(self.config, chalk.white('No workflow Found'), 'success');
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
            const roles = await self.stackAPIClient.role().fetchAll();

            for (const role of roles.items) {
              roleNameMap[role.name] = role.uid;
            }

            for (const stage of workflowStages) {
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
                  addlogs(
                    self.config,
                    `Error while importing workflows roles. ${formatError(error)}`,
                    'error',
                  );
                  reject({ message: 'Error while importing workflows roles' });
                }
              }
            }

            if (workflow.admin_users !== undefined) {
              addlogs(
                self.config,
                chalk.yellow('We are skipping import of `Workflow superuser(s)` from workflow'),
                'info',
              );
              delete workflow.admin_users;
            }
            // One branch is required to create workflow.
            if (!workflow.branches) {
              workflow.branches = ['main'];
            }

            return self.stackAPIClient
              .workflow()
              .create({ workflow })
              .then(function (response) {
                self.workflowUidMapper[workflowUid] = response;
                helper.writeFileSync(workflowUidMapperPath, self.workflowUidMapper);
              })
              .catch(function (error) {
                self.fails.push(workflow);
                if (error.errors.name) {
                  addlogs(self.config, `workflow ${workflow.name} already exist`, 'error');
                } else if (error.errors['workflow_stages.0.users']) {
                  addlogs(
                    self.config,
                    "Failed to import Workflows as you've specified certain roles in the Stage transition and access rules section. We currently don't import roles to the stack.",
                    'error',
                  );
                } else {
                  addlogs(self.config, `workflow ${workflow.name} failed.`, 'error');
                }
              });
          } else {
            // the workflow has already been created
            addlogs(
              self.config,
              chalk.white( `The Workflows ${workflow.name} already exists. Skipping it to avoid duplicates!`),
              'success',
            );
          }
          // import 1 workflows at a time
        },
        { concurrency: self.reqConcurrency },
      )
        .then(function () {
          helper.writeFileSync(workflowSuccessPath, self.success);
          addlogs(self.config, chalk.green('Workflows have been imported successfully!'), 'success');
          resolve();
        })
        .catch(function (error) {
          helper.writeFileSync(workflowFailsPath, self.fails);
          addlogs(self.config, `Workflows import failed. ${formatError(error)}`, 'error');
          return reject(error);
        });
    });
  }
};
