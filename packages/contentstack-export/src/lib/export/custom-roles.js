'use strict';

const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const { merge } = require('lodash');

const helper = require('../util/helper');
const { addlogs } = require('../util/log');
const { formatError } = require('../util');
const config = require('../../config/default');
const stack = require('../util/contentstack-management-sdk');

module.exports = class ExportCustomRoles {
  roles = {};
  client = null;
  customRoles = {};
  EXISTING_ROLES = {
    Admin: 1,
    Developer: 1,
    'Content Manager': 1,
  };
  rolesConfig = config.modules.customRoles;

  constructor(credentialConfig) {
    this.config = merge(config, credentialConfig);
    this.client = stack.Client(this.config);
  }

  async start() {
    try {
      const self = this;
      addlogs(this.config, 'Starting roles export', 'success');

      const rolesFolderPath = path.resolve(this.config.data, this.config.branchName || '', this.rolesConfig.dirName);
      mkdirp.sync(rolesFolderPath);

      const roles = await this.client
        .stack({ api_key: self.config.source_stack, management_token: self.config.management_token })
        .role()
        .fetchAll({ include_rules: true, include_permissions: true });

      const customRoles = roles.items.filter((role) => !self.EXISTING_ROLES[role.name]);

      if (!customRoles.length) {
        addlogs(self.config, 'No custom roles were found in the Stack', 'success');
        return;
      }

      await getCustomRolesLocales(
        customRoles,
        path.join(rolesFolderPath, self.rolesConfig.customRolesLocalesFileName),
        this.client,
        self.config,
      );
      self.customRoles = {};
      customRoles.forEach((role) => {
        addlogs(self.config, role.name + ' role was exported successfully', 'success');
        self.customRoles[role.uid] = role;
      });
      helper.writeFileSync(path.join(rolesFolderPath, self.rolesConfig.fileName), self.customRoles);
      addlogs(self.config, chalk.green('All the custom roles have been exported successfully'), 'success');
    } catch (error) {
      if (error.statusCode === 401) {
        addlogs(
          self.config,
          chalk.red('You are not allowed to export roles, Unless you provide email and password in config'),
          'error',
        );
        return;
      }
      addlogs(self.config, 'Error occurred in exporting roles. ' + error && error.message, 'error');
      addlogs(self.config, formatError(error), 'error');
      throw error;
    }
  }

  async getCustomRolesLocales(customRoles, customRolesLocalesFilepath, client, config) {
    const localesMap = {};
    for (const role of customRoles) {
      const rulesLocales = role.rules.find((rule) => rule.module === 'locale');
      if (rulesLocales.locales && rulesLocales.locales.length) {
        rulesLocales.locales.forEach((locale) => {
          localesMap[locale] = 1;
        });
      }
    }

    if (Object.keys(localesMap).length) {
      const locales = await client
        .stack({ api_key: config.source_stack, management_token: config.management_token })
        .locale()
        .query({})
        .find();
      const sourceLocalesMap = {};
      for (const locale of locales.items) {
        sourceLocalesMap[locale.uid] = locale;
      }
      for (const locale in localesMap) {
        delete sourceLocalesMap[locale]['stackHeaders'];
        localesMap[locale] = sourceLocalesMap[locale];
      }
      helper.writeFileSync(customRolesLocalesFilepath, localesMap);
    }
  }
};
