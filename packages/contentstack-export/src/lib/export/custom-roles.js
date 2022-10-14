'use strict';

const mkdirp = require('mkdirp');
const path = require('path');
const chalk = require('chalk');

const helper = require('../util/helper');
const { addlogs } = require('../util/log');

const stack = require('../util/contentstack-management-sdk');
let config = require('../../config/default');
const rolesConfig = config.modules.customRoles;

const EXISTING_ROLES = {
  Admin: 1,
  Developer: 1,
  'Content Manager': 1,
};

function ExportCustomRoles() {
  this.client = null;
  this.roles = {};
}

ExportCustomRoles.prototype.start = async function (credentialConfig) {
  try {
    addlogs(config, 'Starting roles export', 'success');
    let self = this;
    this.roles = {};
    config = credentialConfig;
    this.client = stack.Client(config);

    const rolesFolderPath = path.resolve(config.data, config.branchName || '', rolesConfig.dirName);
    mkdirp.sync(rolesFolderPath);

    const roles = await this.client
      .stack({ api_key: config.source_stack, management_token: config.management_token })
      .role()
      .fetchAll({ include_rules: true, include_permissions: true });

    const customRoles = roles.items.filter(role => !EXISTING_ROLES[role.name]);

    if (!customRoles.length) {
      addlogs(config, 'No custom roles were found in the Stack', 'success');
      return;
    }

    await getCustomRolesLocales(customRoles, path.join(rolesFolderPath, rolesConfig.customRolesLocalesFileName), this.client, config);
    self.customRoles = {};
    customRoles.forEach(role => {
      addlogs(config, role.name + ' role was exported successfully', 'success');
      self.customRoles[role.uid] = role;
    });
    helper.writeFile(path.join(rolesFolderPath, rolesConfig.fileName), self.customRoles);
    addlogs(config, chalk.green('All the custom roles have been exported successfully'), 'success');
  } catch (error) {
    if (error.statusCode === 401) {
      addlogs(config, chalk.red('You are not allowed to export roles, Unless you provide email and password in config'), 'error');
      return;
    }
    addlogs(config, 'Error occurred in exporting roles. ' + error && error.message, 'error');
    throw error;
  }
};

async function getCustomRolesLocales(customRoles, customRolesLocalesFilepath, client, config) {
  const localesMap = {};
  for (const role of customRoles) {
    const rulesLocales = role.rules.find(rule => rule.module === 'locale');
    if (rulesLocales.locales && rulesLocales.locales.length) {
      rulesLocales.locales.forEach(locale => {
        localesMap[locale] = 1;
      });
    }
  }

  if (Object.keys(localesMap).length) {
    const locales = await client.stack({ api_key: config.source_stack, management_token: config.management_token }).locale().query({}).find();
    const sourceLocalesMap = {};
    for (const locale of locales.items) {
      sourceLocalesMap[locale.uid] = locale;
    }
    for (const locale in localesMap) {
      delete sourceLocalesMap[locale]['stackHeaders'];
      localesMap[locale] = sourceLocalesMap[locale];
    }
    helper.writeFile(customRolesLocalesFilepath, localesMap);
  }
}

module.exports = new ExportCustomRoles();