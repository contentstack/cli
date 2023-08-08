import merge from 'merge';
import * as path from 'path';
import { omit, filter, includes, isArray } from 'lodash';
import { configHandler, isAuthenticated } from '@contentstack/cli-utilities';
import defaultConfig from '../config';
import { readFile } from './file-helper';
import { askContentDir, askAPIKey } from './interactive';
import login from './login-handler';
import { ImportConfig } from '../types';

const setupConfig = async (importCmdFlags: any): Promise<ImportConfig> => {
  let config: ImportConfig = merge({}, defaultConfig);
  // setup the config
  if (importCmdFlags['config']) {
    let externalConfig = await readFile(importCmdFlags['config']);
    if (isArray(externalConfig['modules'])) {
      config.modules.types = filter(config.modules.types, (module) => includes(externalConfig['modules'], module));
      externalConfig = omit(externalConfig, ['modules']);
    }
    config = merge.recursive(config, externalConfig);
  }
  config.contentDir = importCmdFlags['data'] || importCmdFlags['data-dir'] || config.data || (await askContentDir());
  config.contentDir = path.resolve(config.contentDir);
  //Note to support the old key
  config.data = config.contentDir;

  const managementTokenAlias = importCmdFlags['management-token-alias'] || importCmdFlags['alias'];

  if (managementTokenAlias) {
    const { token, apiKey } = configHandler.get(`tokens.${managementTokenAlias}`);
    config.management_token = token;
    config.apiKey = apiKey;
    if (!config.management_token) {
      throw new Error(`No management token found on given alias ${managementTokenAlias}`);
    }
  }

  if (!config.management_token) {
    if (!isAuthenticated()) {
      if (config.email && config.password) {
        await login(config);
      } else {
        throw new Error('Please login or provide an alias for the management token');
      }
    } else {
      config.apiKey =
        importCmdFlags['stack-uid'] || importCmdFlags['stack-api-key'] || config.target_stack || (await askAPIKey());
      if (typeof config.apiKey !== 'string') {
        throw new Error('Invalid API key received');
      }
    }
  }

  config.isAuthenticated = isAuthenticated();

  //Note to support the old key
  config.source_stack = config.apiKey;

  config.importWebhookStatus = importCmdFlags['import-webhook-status'];
  config.forceStopMarketplaceAppsPrompt = importCmdFlags.yes;

  if (importCmdFlags['branch']) {
    config.branchName = importCmdFlags['branch'];
    config.branchDir = path.join(config.contentDir, config.branchName);
  }
  if (importCmdFlags['module']) {
    config.moduleName = importCmdFlags['module'];
    config.singleModuleImport = true;
  }

  if (importCmdFlags['backup-dir']) {
    config.useBackedupDir = importCmdFlags['backup-dir'];
  }

  // Note to support old modules
  config.target_stack = config.apiKey;

  return config;
};

export default setupConfig;
