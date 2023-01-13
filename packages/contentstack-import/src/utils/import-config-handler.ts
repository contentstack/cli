import merge from 'merge';
import * as path from 'path';
import { omit, filter, includes, isArray } from 'lodash';
import { CLIError, configHandler } from '@contentstack/cli-utilities';
import defaultConfig from '../config';
import { readFile } from './file-helper';
import { askContentDir, askAPIKey } from './interactive';

const setupConfig = async (importCmdFlags): Promise<any> => {
  let config = merge({}, defaultConfig);
  // setup the config
  if (importCmdFlags['external-config-path']) {
    let externalConfig = await readFile(importCmdFlags['external-config-path']);
    if (isArray(externalConfig['modules'])) {
      config.modules.types = filter(config.modules.types, (module) => includes(externalConfig['modules'], module));
      externalConfig = omit(externalConfig, ['modules']);
    }
    config = merge.recursive(config, externalConfig);
  }
  config.contentDir = importCmdFlags['data'] || importCmdFlags['data-dir'] || (await askContentDir());
  config.contentDir = path.resolve(config.contentDir);
  //Note to support the old key
  config.data = config.contentDir;

  config.apiKey = importCmdFlags['stack-uid'] || importCmdFlags['stack-api-key'] || (await askAPIKey());
  if (!config.apiKey) {
    throw new CLIError('API Key is mandatory');
  }

  if (importCmdFlags['mtoken-alias']) {
    config.mToken = configHandler.get(importCmdFlags['mtoken-alias']);
    if (!config.mToken) {
      throw new CLIError('Management token is mandatory');
    }
  }

  config.importWebhookStatus = importCmdFlags.importWebhookStatus;

  if (!configHandler.get('authtoken') && !importCmdFlags['mtoken-alias']) {
    // TBD: ask the auth method and get the either of the token and continue
    throw new CLIError('Invalid auth method');
  }

  if (importCmdFlags['branch']) {
    config.branchName = importCmdFlags['branch'];
  }
  if (importCmdFlags['module']) {
    config.moduleName = importCmdFlags['module'];
    config.singleModuleImport = true;
  }

  if (importCmdFlags['backup-dir']) {
    config.useBackedupDir = importCmdFlags['backup-dir'];
  }

  return config;
};

export default setupConfig;
