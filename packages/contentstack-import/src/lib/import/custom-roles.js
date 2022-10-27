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
// Mapper file paths variables.
let customRolesMapperPath;
let customRolesUidMapperPath;
let customRolesSuccessPath;
let customRolesFailsPath;
let environmentsUidMapperFolderPath;
let entriesUidMapperFolderPath;
let customRolesLocalesFilePath;

function ImportCustomRoles() {
  this.fails = [];
  this.customRolesUidMapper = {};
  this.labelUids = [];
  this.client = null;
  if (fs.existsSync(customRolesMapperPath)) {
    this.customRolesUidMapper = helper.readFileSync(customRolesUidMapperPath) || {};
  }
}

ImportCustomRoles.prototype.start = async function (credentialConfig) {
  let self = this;
  try {
    config = credentialConfig;
    this.client = stack.Client(config);
    addlogs(config, chalk.white('Migrating custom-roles'), 'success');
    customRolesFolderPath = path.resolve(config.data, customRolesConfig.dirName);
    self.customRoles = helper.readFileSync(path.resolve(customRolesFolderPath, customRolesConfig.fileName));
    customRolesLocalesFilePath = path.resolve(customRolesFolderPath, customRolesConfig.customRolesLocalesFileName);
    self.customRolesLocales = helper.readFileSync(customRolesLocalesFilePath);
    // Mapper file paths.
    customRolesMapperPath = path.resolve(config.data, 'mapper', 'custom-roles');
    customRolesUidMapperPath = path.resolve(config.data, 'mapper', 'custom-roles', 'uid-mapping.json');
    customRolesSuccessPath = path.resolve(config.data, 'custom-roles', 'success.json');
    customRolesFailsPath = path.resolve(config.data, 'custom-roles', 'fails.json');
    environmentsUidMapperFolderPath = path.resolve(config.data, 'mapper', 'environments');
    entriesUidMapperFolderPath = path.resolve(config.data, 'mapper', 'entries');
    mkdirp.sync(customRolesMapperPath);

    if (!self.customRoles) {
      addlogs(config, chalk.white('No custom-roles found'), 'error');
      return;
    }
    self.customRolesUids = Object.keys(self.customRoles);

    self.localesUidMap = await getLocalesUidMap(this.client, config, self.customRolesLocales);

    if (fs.existsSync(environmentsUidMapperFolderPath)) {
      self.environmentsUidMap = helper.readFileSync(path.resolve(environmentsUidMapperFolderPath, 'uid-mapping.json'));
    }
    if (fs.existsSync(entriesUidMapperFolderPath)) {
      self.entriesUidMap = helper.readFileSync(path.resolve(entriesUidMapperFolderPath, 'uid-mapping.json'));
    }

    for (const uid of self.customRolesUids) {
      const customRole = self.customRoles[uid];

      if (uid in self.customRolesUidMapper) {
        addlogs(
          config,
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
        const role = await this.client
          .stack({ api_key: config.target_stack, management_token: config.management_token })
          .role()
          .create({ role: customRole });

        self.customRolesUidMapper[uid] = role;
        helper.writeFile(customRolesUidMapperPath, self.customRolesUidMapper);
      } catch (error) {
        self.fails.push(customRole);
        if (error && error.errors && error.errors.name) {
          addlogs(config, chalk.red(`custom-role: ${customRole.name} already exists`), 'error');
        } else {
          addlogs(config, chalk.red(`custom-role: ${customRole.name} failed`), 'error');
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
module.exports = new ImportCustomRoles();
