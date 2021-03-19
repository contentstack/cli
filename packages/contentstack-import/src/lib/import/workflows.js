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
const _ = require('lodash')

const helper = require('../util/fs');
const { addlogs } = require('../util/log');
let config = require('../../config/default')
let stack = require('../util/contentstack-management-sdk');

let reqConcurrency = config.concurrency;
let workflowConfig = config.modules.workflows;
let workflowFolderPath
let workflowMapperPath
let workflowUidMapperPath
let workflowSuccessPath
let workflowFailsPath
let client


function importWorkflows() {
  this.fails = [];
  this.success = [];
  this.workflowUidMapper = {};
  this.labelUids = [];
  if (fs.existsSync(workflowUidMapperPath)) {
    this.workflowUidMapper = helper.readFile(workflowUidMapperPath);
    this.workflowUidMapper = this.workflowUidMapper || {};
  }
}

importWorkflows.prototype = {
  start: function (credentialConfig) {
    let self = this;
    config = credentialConfig
    client = stack.Client(config)
    addlogs(config, chalk.white('Migrating workflows'), 'success')
    workflowFolderPath = path.resolve(config.data, workflowConfig.dirName)
    self.workflows = helper.readFile(path.resolve(workflowFolderPath, workflowConfig.fileName));
    workflowMapperPath = path.resolve(config.data, 'mapper', 'workflows');
    workflowUidMapperPath = path.resolve(config.data, 'mapper', 'workflows', 'uid-mapping.json');
    workflowSuccessPath = path.resolve(config.data, 'workflows', 'success.json');
    workflowFailsPath = path.resolve(config.data, 'workflows', 'fails.json');
    mkdirp.sync(workflowMapperPath);
    return new Promise(function (resolve, reject) {
      if (self.workflows == undefined) {
        addlogs(config, chalk.white('No workflow Found'), 'error');
        return resolve();
      }
      self.workflowsUids = Object.keys(self.workflows);
      return Promise.map(self.workflowsUids, function (workflowUid) {
        let workflow = self.workflows[workflowUid];

        if (!self.workflowUidMapper.hasOwnProperty(workflowUid)) {
          for (let index = 0; index < workflow.workflow_stages.length; index++) {
            if (workflow.workflow_stages[index].SYS_ACL.users.uids.length > 0 && workflow.workflow_stages[index].SYS_ACL.users.uids[0] !== "$all") {
              workflow.workflow_stages[index].SYS_ACL.users.uids = ["$all"]
            }

            if (workflow.workflow_stages[index].SYS_ACL.roles.uids.length > 0) {
              workflow.workflow_stages[index].SYS_ACL.roles.uids = []
            }

            if (workflow.workflow_stages[index].next_available_stages.length > 0) {
              workflow.workflow_stages[index].next_available_stages = ["$all"]
            }
          }

          let requestOption = {
            workflow: workflow
          };

          return client.stack({ api_key: config.target_stack, management_token: config.management_token }).workflow().create(requestOption)
            .then(function (response) {
              self.workflowUidMapper[workflowUid] = response;
              helper.writeFile(workflowUidMapperPath, self.workflowUidMapper);
              return;
            }).catch(function (error) {
              self.fails.push(workflow);
              if (error.errors.name) {
                addlogs(config, chalk.red('workflow: \'' + workflow.name + '\'  already exist'), 'error');
              } else if (error.errors['workflow_stages.0.users']) {
                addlogs(config, chalk.red("Failed to import Workflows as you've specified certain roles in the Stage transition and access rules section. We currently don't import roles to the stack."), 'error');
              } else {
                addlogs(config, chalk.red('workflow: \'' + workflow.name + '\'  already exist'), 'error');
              }
              return;
            });
        } else {
          // the workflow has already been created
          addlogs(config, (chalk.white('The Workflows: \'' + workflow.name +
            '\' already exists. Skipping it to avoid duplicates!')), 'success');
          return;
        }
        // import 1 workflows at a time
      }, {
        concurrency: reqConcurrency
      }).then(function () {
        helper.writeFile(workflowSuccessPath, self.success);
        addlogs(config, (chalk.green('Workflows have been imported successfully!')), 'success');
        return resolve();
      }).catch(function (error) {
        helper.writeFile(workflowFailsPath, self.fails);
        addlogs(config, chalk.red('Workflows import failed'), 'error');
        return reject(error);
      });
    });
  }
}
module.exports = new importWorkflows();