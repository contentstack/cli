import merge from 'merge';
import * as path from 'path';
import { CLIError, configHandler } from '@contentstack/cli-utilities';
import defaultConfig from '../config';
import { readFile } from './file-helper';
import { askExportDir, askAPIKey } from './interactive';

const setupConfig = async (exportCmdFlags): Promise<any> => {
  let config = merge({}, defaultConfig);
  // setup the config
  if (exportCmdFlags['external-config-path']) {
    const externalConfig = await readFile(exportCmdFlags['external-config-path']);
    config = merge.recursive(config, externalConfig);
  }
  config.exportDir = exportCmdFlags['data'] || exportCmdFlags['data-dir'] || (await askExportDir());
  config.exportDir = path.resolve(config.exportDir);
  config.apiKey = exportCmdFlags['stack-uid'] || exportCmdFlags['stack-api-key'] || (await askAPIKey());
  if (!config.apiKey) {
    throw new CLIError('API Key is mandatory');
  }

  if (exportCmdFlags['mtoken-alias']) {
    config.mToken = configHandler.get(exportCmdFlags['mtoken-alias']);
    if (!config.mToken) {
      throw new CLIError('Management token is mandatory');
    }
  }
  if (!configHandler.get('authtoken') && !exportCmdFlags['mtoken-alias']) {
    // TBD: ask the auth method and get the either of the token and continue
    throw new CLIError('Invalid auth method');
  }
  if (exportCmdFlags['branch']) {
    config.branchName = exportCmdFlags['branch'];
  }
  if (exportCmdFlags['module']) {
    config.moduleName = exportCmdFlags['module'];
    config.singleModuleExport = true;
  }
  if (exportCmdFlags['secured-assets']) {
    config.securedAssets = true;
  }
  if (Array.isArray(exportCmdFlags['content-types']) && exportCmdFlags['content-types'].length > 0) {
    config.contentTypes = exportCmdFlags['content-types'];
  }

  return config;
};

export default setupConfig;
