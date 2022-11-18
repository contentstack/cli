'use strict';

const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { merge } = require('lodash');

const helper = require('../util/fs');
const { addlogs } = require('../util/log');
const { formatError } = require('../util');
let config = require('../../config/default');
const stack = require('../util/contentstack-management-sdk');

module.exports = class ImportCustomRoles {
  fails = [];
  client = null;
  labelUids = [];
  customRolesUidMapper = {};
  customRolesConfig = config.modules.customRoles;

  constructor(credentialConfig) {
    this.config = merge(config, credentialConfig);
    this.client = stack.Client(this.config);
  }

  async start() {
    const self = this;
    addlogs(this.config, chalk.white('Migrating custom-roles'), 'success');

    let customRolesFolderPath = path.resolve(this.config.data, this.customRolesConfig.dirName);
    let customRolesMapperPath = path.resolve(this.config.data, 'mapper', 'custom-roles');
    let entriesUidMapperFolderPath = path.resolve(this.config.data, 'mapper', 'entries');
    let customRolesFailsPath = path.resolve(this.config.data, 'custom-roles', 'fails.json');
    let environmentsUidMapperFolderPath = path.resolve(this.config.data, 'mapper', 'environments');
    let customRolesUidMapperPath = path.resolve(this.config.data, 'mapper', 'custom-roles', 'uid-mapping.json');
    let customRolesLocalesFilePath = path.resolve(
      customRolesFolderPath,
      this.customRolesConfig.customRolesLocalesFileName,
    );

    try {
      self.customRoles = helper.readFileSync(path.resolve(customRolesFolderPath, this.customRolesConfig.fileName));
      self.customRolesLocales = helper.readFileSync(customRolesLocalesFilePath);
      // Mapper file paths.

      if (fs.existsSync(customRolesMapperPath)) {
        this.customRolesUidMapper = helper.readFileSync(customRolesUidMapperPath) || {};
      }

      mkdirp.sync(customRolesMapperPath);

      if (!self.customRoles) {
        addlogs(self.config, chalk.white('No custom-roles found'), 'error');
        return;
      }
      self.customRolesUids = Object.keys(self.customRoles);

      self.localesUidMap = await getLocalesUidMap(self.client, self.config, self.customRolesLocales);

      if (fs.existsSync(environmentsUidMapperFolderPath)) {
        self.environmentsUidMap = helper.readFileSync(
          path.resolve(environmentsUidMapperFolderPath, 'uid-mapping.json'),
        );
      }
      if (fs.existsSync(entriesUidMapperFolderPath)) {
        self.entriesUidMap = helper.readFileSync(path.resolve(entriesUidMapperFolderPath, 'uid-mapping.json'));
      }

      for (const uid of self.customRolesUids) {
        const customRole = self.customRoles[uid];

        if (uid in self.customRolesUidMapper) {
          addlogs(
            self.config,
            chalk.white(`The custom-role ${customRole.name} already exists. Skipping it to avoid duplicates!`),
            'success',
          );
          continue;
        }

        try {
          customRole.rules.forEach((rule) => {
            const transformUids = getTransformUidsFactory(rule);
            rule = transformUids(rule, self.environmentsUidMap, self.localesUidMap, self.entriesUidMap);
          });
          // rules.branch is required to create custom roles.
          const branchRuleExists = customRole.rules.find((rule) => rule.module === 'branch');
          if (!branchRuleExists) {
            customRole.rules.push({
              module: 'branch',
              branches: ['main'],
              acl: { read: true },
            });
          }
          const role = await self.client
            .stack({ api_key: self.config.target_stack, management_token: self.config.management_token })
            .role()
            .create({ role: customRole });

          self.customRolesUidMapper[uid] = role;
          helper.writeFileSync(customRolesUidMapperPath, self.customRolesUidMapper);
        } catch (error) {
          self.fails.push(customRole);

          if (error && error.errors && error.errors.name) {
            addlogs(self.config, chalk.red(`custom-role: ${customRole.name} already exists`), 'error');
          } else {
            addlogs(self.config, chalk.red(`custom-role: ${customRole.name} failed`), 'error');
          }

          addlogs(self.config, formatError(error), 'error');
        }
      }
      addlogs(self.config, chalk.green('Custom-roles have been imported successfully!'), 'success');
    } catch (error) {
      helper.writeFileSync(customRolesFailsPath, self.fails);
      addlogs(self.config, chalk.red('Custom-roles import failed'), 'error');
      addlogs(self.config, formatError(error), 'error');

      throw error;
    }
  }
};

const getTransformUidsFactory = (rule) => {
  if (rule.module === 'environment') {
    return environmentUidTransformer;
  } else if (rule.module === 'locale') {
    return localeUidTransformer;
  } else if (rule.module === 'entry') {
    return entryUidTransformer;
  } else {
    return noopTransformer;
  }
};

const environmentUidTransformer = (rule, environmentsUidMap) => {
  rule.environments = rule.environments.map((env) => environmentsUidMap[env]);
  return rule;
};

const localeUidTransformer = (rule, environmentsUidMap, localesUidMap) => {
  rule.locales = rule.locales.map((locale) => localesUidMap[locale]);
  return rule;
};

const entryUidTransformer = (rule, environmentsUidMap, localesUidMap, entriesUidMap) => {
  rule.entries = rule.entries.map((entry) => entriesUidMap[entry]);
  return rule;
};

const noopTransformer = (rule) => {
  return rule;
};

const getLocalesUidMap = async (client, config, sourceLocales) => {
  const { items } = await client
    .stack({ api_key: config.target_stack, management_token: config.management_token })
    .locale()
    .query()
    .find();
  const [targetLocalesMap, sourceLocalesMap] = [{}, {}];

  items.forEach((locale) => {
    targetLocalesMap[locale.code] = locale.uid;
  });
  for (const key in sourceLocales) {
    sourceLocalesMap[sourceLocales[key].code] = key;
  }
  const localesUidMap = {};
  for (const key in sourceLocalesMap) {
    localesUidMap[sourceLocalesMap[key]] = targetLocalesMap[key];
  }
  return localesUidMap;
};
