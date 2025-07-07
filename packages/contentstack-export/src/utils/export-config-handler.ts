import merge from 'merge';
import * as path from 'path';
import { configHandler, isAuthenticated,cliux, sanitizePath, log } from '@contentstack/cli-utilities';
import defaultConfig from '../config';
import { readFile } from './file-helper';
import { askExportDir, askAPIKey } from './interactive';
import login from './basic-login';
import { filter, includes } from 'lodash';
import { ExportConfig } from '../types';

const setupConfig = async (exportCmdFlags: any): Promise<ExportConfig> => {
  let config = merge({}, defaultConfig);

  // Track authentication method
  let authMethod = 'unknown';

  log.debug('Setting up export configuration');

  // setup the config
  if (exportCmdFlags['config']) {
    log.debug('Loading external configuration file', { configFile: exportCmdFlags['config'] });
    const externalConfig = await readFile(exportCmdFlags['config']);
    config = merge.recursive(config, externalConfig);
  }
  config.exportDir = sanitizePath(
    exportCmdFlags['data'] || exportCmdFlags['data-dir'] || config.data || (await askExportDir()),
  );

  const pattern = /[*$%#<>{}!&?]/g;
  if (pattern.test(config.exportDir)) {
    cliux.print(`\nPlease add a directory path without any of the special characters: (*,&,{,},[,],$,%,<,>,?,!)`, {
      color: 'yellow',
    });
    config.exportDir = sanitizePath(await askExportDir());
  }
  config.exportDir = config.exportDir.replace(/['"]/g, '');
  config.exportDir = path.resolve(config.exportDir);

  //Note to support the old key
  config.data = config.exportDir;

  const managementTokenAlias = exportCmdFlags['management-token-alias'] || exportCmdFlags['alias'];

  if (managementTokenAlias) {
    log.debug('Using management token alias', { alias: managementTokenAlias });
    const { token, apiKey } = configHandler.get(`tokens.${managementTokenAlias}`) || {};
    config.management_token = token;
    config.apiKey = apiKey;
    authMethod = 'management_token';
    if (!config.management_token) {
      log.debug('Management token not found for alias', { alias: managementTokenAlias });
      throw new Error(`No management token found on given alias ${managementTokenAlias}`);
    }

    log.debug('Management token configuration successful');
  }

  if (!config.management_token) {
    if (!isAuthenticated()) {
      log.debug('User not authenticated, checking for basic auth credentials');
      if (config.username && config.password) {
        log.debug('Using basic authentication with username/password');
        await login(config);
        authMethod = 'basic_auth';
        log.debug('Basic authentication successful');
      } else {
        log.debug('No authentication method available');
        throw new Error('Please login or provide an alias for the management token');
      }
    } else {
      // Check if user is authenticated via OAuth
      const isOAuthUser = configHandler.get('authorisationType') === 'OAUTH' || false;

      if (isOAuthUser) {
        authMethod = 'Oauth';
        log.debug('User authenticated via OAuth');
      } else {
        authMethod = 'Basic Auth';
        log.debug('User authenticated via auth token');
      }

      config.apiKey =
        exportCmdFlags['stack-uid'] || exportCmdFlags['stack-api-key'] || config.source_stack || (await askAPIKey());
      if (typeof config.apiKey !== 'string') {
        log.debug('Invalid API key received', { apiKey: config.apiKey });
        throw new Error('Invalid API key received');
      }
    }
  }

  // Note support old config
  config.source_stack = config.apiKey;

  config.forceStopMarketplaceAppsPrompt = exportCmdFlags.yes;
  config.auth_token = configHandler.get('authtoken'); // TBD handle auth token in httpClient & sdk
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

  // Add authentication details to config for context tracking
  config.authMethod = authMethod;
  log.debug('Export configuration setup completed', { ...config });

  return config;
};

export default setupConfig;
