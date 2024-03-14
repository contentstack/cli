'use strict';

const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { merge } = require('lodash');
const { fileHelper, log, formatError } = require('../../utils');
let { default: config } = require('../../config');

module.exports = class ImportCustomRoles {
  fails = [];
  labelUids = [];
  customRolesUidMapper = {};
  customRolesConfig = config.modules.customRoles;

  constructor(importConfig, stackAPIClient) {
    this.config = merge(config, importConfig);
    this.stackAPIClient = stackAPIClient;
  }

  async start() {
    const self = this;
    log(this.config, chalk.white('Migrating custom-roles'), 'success');

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
      self.customRoles = fileHelper.readFileSync(path.resolve(customRolesFolderPath, this.customRolesConfig.fileName));
      self.customRolesLocales = fileHelper.readFileSync(customRolesLocalesFilePath);
      // Mapper file paths.

      if (fs.existsSync(customRolesMapperPath)) {
        this.customRolesUidMapper = fileHelper.readFileSync(customRolesUidMapperPath) || {};
      }

      mkdirp.sync(customRolesMapperPath);

      if (!self.customRoles) {
        log(self.config, chalk.white('No custom-roles found'), 'info');
        return;
      }
      self.customRolesUids = Object.keys(self.customRoles);

      self.localesUidMap = await getLocalesUidMap(self.stackAPIClient, self.config, self.customRolesLocales);

      self.environmentsUidMap={}
      if (fs.existsSync(environmentsUidMapperFolderPath)) {
        self.environmentsUidMap = fileHelper.readFileSync(
          path.resolve(environmentsUidMapperFolderPath, 'uid-mapping.json'),
        );
      }
      self.entriesUidMap={}
      if (fs.existsSync(entriesUidMapperFolderPath)) {
        self.entriesUidMap = fileHelper.readFileSync(path.resolve(entriesUidMapperFolderPath, 'uid-mapping.json'));
      }

      for (const uid of self.customRolesUids) {
        const customRole = self.customRoles[uid];

        if (uid in self.customRolesUidMapper) {
          log(
            self.config,
            chalk.white(`The custom-role '${customRole.name}' already exists. Skipping it to avoid duplicates!`),
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
          const role = await self.stackAPIClient.role().create({ role: customRole });
          self.customRolesUidMapper[uid] = role;
          fileHelper.writeFileSync(customRolesUidMapperPath, self.customRolesUidMapper);
        } catch (error) {
          self.fails.push(customRole);

          if (((error && error.errors && error.errors.name) || '').includes('is not a unique.')) {
            log(self.config, `custom-role '${customRole.name}' already exists`, 'info');
          } else {
            if (!(error && error.errors && error.errors.name)) {
              log(self.config, `custom-role: ${customRole.name} already exists`, 'error');
            } else {
              log(self.config, `custom-role: ${customRole.name} failed`, 'error');
            }

            log(self.config, formatError(error), 'error');
          }
        }
      }
      log(self.config, chalk.green('Custom-roles have been imported successfully!'), 'success');
    } catch (error) {
      fileHelper.writeFileSync(customRolesFailsPath, self.fails);
      log(self.config, 'Custom-roles import failed', 'error');
      log(self.config, formatError(error), 'error');
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

const getLocalesUidMap = async (stackAPIClient, config, sourceLocales) => {
  const { items } = await stackAPIClient.locale().query().find();
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
