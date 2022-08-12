'use strict';

const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const helper = require('../util/fs');
const { addlogs } = require('../util/log');
const stack = require('../util/contentstack-management-sdk');
let config = require('../../config/default');

const customRolesConfig = config.modules.customRoles;
let customRolesFolderPath;
let customRolesMapperPath;
let customRolesUidMapperPath;
let customRolesSuccessPath;
let customRolesFailsPath;

function ImportCustomRoles() {
  this.fails = [];
  this.customRolesUidMapper = {};
  this.labelUids = [];
  this.client = null;
  if (fs.existsSync(customRolesMapperPath)) {
    this.customRolesUidMapper = helper.readFile(customRolesUidMapperPath) || {};
  }
}

ImportCustomRoles.prototype.start = async function(credentialConfig) {
  let self = this;
  try {
    config = credentialConfig;
    this.client = stack.Client(config);
    addlogs(config, chalk.white('Migrating custom-roles'), 'success');
    customRolesFolderPath = path.resolve(config.data, customRolesConfig.dirName);
    self.customRoles = helper.readFile(path.resolve(customRolesFolderPath, customRolesConfig.fileName));
    customRolesMapperPath = path.resolve(config.data, 'mapper', 'custom-roles');
    customRolesUidMapperPath = path.resolve(config.data, 'mapper', 'custom-roles', 'uid-mapping.json');
    customRolesSuccessPath = path.resolve(config.data, 'custom-roles', 'success.json');
    customRolesFailsPath = path.resolve(config.data, 'custom-roles', 'fails.json');
    mkdirp.sync(customRolesMapperPath);

    if (!self.customRoles) {
      addlogs(config, chalk.white('No custom-roles found'), 'error');
      return;
    }
    self.customRolesUids = Object.keys(self.customRoles);
    for (const uid of self.customRolesUids) {
      const customRole = self.customRoles[uid];

      if (uid in self.customRolesUidMapper) {
        addlogs(config, chalk.white(`The custom-role ${customRole.name} already exists. Skipping it to avoid duplicates!`), 'success');
        continue;
      }

      try {
        // rules.branch is required to create custom roles.
        const branchRuleExists = customRole.rules.find(rule => rule.module === 'branch');
        if (!branchRuleExists) {
          customRole.rules.push({
            module: 'branch',
            branches: ['main'],
            acl: { read: true }
          });
        }
        const role = await this.client.stack({ api_key: config.target_stack, management_token: config.management_token })
          .role().create({ role: customRole });

        self.customRolesUidMapper[uid] = role;
        helper.writeFile(customRolesUidMapperPath, self.customRolesUidMapper); 
      } catch (error) {
        self.fails.push(customRole);
        if (error.errors.name) {
          addlogs(config, chalk.red(`custom-role: ${customRole.name} already exists`), 'error');
        } else {
          addlogs(config, chalk.red(`custom-role: ${workflow.name} failed`), 'error');
        }
      }
    }
    addlogs(config, chalk.green('Custom-roles have been imported successfully!'), 'success');
  } catch (error) {
    helper.writeFile(customRolesFailsPath, self.fails);
    addlogs(config, chalk.red('Custom-roles import failed'), 'error');
    throw error;
  }
};

module.exports = new ImportCustomRoles();