import merge from 'merge';
import * as path from 'path';
import { configHandler, isAuthenticated } from '@contentstack/cli-utilities';
import defaultConfig from '../config';
import { readFile } from './file-helper';
import { askExportDir, askAPIKey } from './interactive';
import login from './basic-login';
import { filter, includes } from 'lodash';

const setupConfig = async (exportCmdFlags): Promise<any> => {
  let config = merge({}, defaultConfig);
  // setup the config
  if (exportCmdFlags['external-config-path']) {
    const externalConfig = await readFile(exportCmdFlags['external-config-path']);
    config = merge.recursive(config, externalConfig);
  }
  config.exportDir = exportCmdFlags['data'] || exportCmdFlags['data-dir'] || (await askExportDir());
  config.exportDir = path.resolve(config.exportDir);
  //Note to support the old key
  config.data = config.exportDir;

  const managementTokenAlias = exportCmdFlags['management-token-alias'] || exportCmdFlags['alias'];

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
      if (config.username && config.password) {
        await login(config);
      } else {
        throw new Error('Please login or provide an alias for the management token');
      }
    } else {
      config.apiKey = exportCmdFlags['stack-uid'] || exportCmdFlags['stack-api-key'] || (await askAPIKey());
      if (typeof config.apiKey !== 'string') {
        throw new Error('Invalid API key received');
      }
    }
  }

  // Note support old config
  config.source_stack = config.apiKey;

  config.forceStopMarketplaceAppsPrompt = exportCmdFlags.yes;
  config.auth_token = configHandler.get('authtoken'); // TBD remove once dependent modules are updated
  config.isAuthenticated = isAuthenticated();

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

  if (Array.isArray(config.filteredModules) && config.filteredModules.length > 0) {
    config.modules.types = filter(defaultConfig.modules.types, (module) => includes(config.filteredModules, module));
  }

  return config;
};

export default setupConfig;
