import merge from 'merge';
import * as path from 'path';
import { omit, filter, includes, isArray } from 'lodash';
import {
  configHandler,
  isAuthenticated,
  cliux,
  sanitizePath,
  log,
} from '@contentstack/cli-utilities';
import defaultConfig from '../config';
import { readFile, fileExistsSync } from './file-helper';
import { askContentDir, askAPIKey } from './interactive';
import login from './login-handler';
import { ImportConfig } from '../types';

const setupConfig = async (importCmdFlags: any): Promise<ImportConfig> => {
  let config: ImportConfig = merge({}, defaultConfig);
  // Track authentication method
  let authenticationMethod = 'unknown';

  // setup the config
  if (importCmdFlags['config']) {
    let externalConfig = await readFile(importCmdFlags['config']);
    if (isArray(externalConfig['modules'])) {
      config.modules.types = filter(config.modules.types, (module) => includes(externalConfig['modules'], module));
      externalConfig = omit(externalConfig, ['modules']);
    }
    config = merge.recursive(config, externalConfig);
  }

  config.contentDir = sanitizePath(
    importCmdFlags['data'] || importCmdFlags['data-dir'] || config.data || (await askContentDir()),
  );
  const pattern = /[*$%#<>{}!&?]/g;
  if (pattern.test(config.contentDir)) {
    cliux.print(`\nPlease enter a directory path without any special characters: (*,&,{,},[,],$,%,<,>,?,!)`, {
      color: 'yellow',
    });
    config.contentDir = sanitizePath(await askContentDir());
  }
  config.contentDir = config.contentDir.replace(/['"]/g, '');
  config.contentDir = path.resolve(config.contentDir);
  //Note to support the old key
  config.data = config.contentDir;

  const managementTokenAlias = importCmdFlags['management-token-alias'] || importCmdFlags['alias'];

  if (managementTokenAlias) {
    const { token, apiKey } = configHandler.get(`tokens.${managementTokenAlias}`) ?? {};
    config.management_token = token;
    config.apiKey = apiKey;
    authenticationMethod = 'Management Token';
    if (!config.management_token) {
      throw new Error(`No management token found on given alias ${managementTokenAlias}`);
    }
  }

  if (!config.management_token) {
    if (!isAuthenticated()) {
      log.debug('User not authenticated, checking for basic auth credentials');
      if (config.email && config.password) {
        log.debug('Using basic authentication with username/password');
        await login(config);
        authenticationMethod = 'Basic Auth';
        log.debug('Basic authentication successful');
      } else {
        log.debug('No authentication method available');
        throw new Error('Please login or provide an alias for the management token');
      }
    } else {
      // Check if user is authenticated via OAuth
      const isOAuthUser = configHandler.get('authorisationType') === 'OAUTH' || false;

      if (isOAuthUser) {
        authenticationMethod = 'OAuth';
        log.debug('User authenticated via OAuth');
      } else {
        authenticationMethod = 'Basic Auth';
        log.debug('User authenticated via auth token');
      }
      config.apiKey =
        importCmdFlags['stack-uid'] || importCmdFlags['stack-api-key'] || config.target_stack || (await askAPIKey());
      if (typeof config.apiKey !== 'string' || !config.apiKey || !config.apiKey.trim()) {
        log.debug('Invalid or empty API key received!', { apiKey: config.apiKey });
        throw new Error('Stack API key cannot be empty. Please provide a valid stack API key.');
      }
    }
  }

  config.isAuthenticated = isAuthenticated();
  config.auth_token = configHandler.get('authtoken'); // TBD handle auth token in httpClient & sdk

  //Note to support the old key
  config.source_stack = config.apiKey;

  config.skipAudit = importCmdFlags['skip-audit'];
  config.forceStopMarketplaceAppsPrompt = importCmdFlags.yes;
  config.importWebhookStatus = importCmdFlags['import-webhook-status'];
  config.skipPrivateAppRecreationIfExist = !importCmdFlags['skip-app-recreation'];

  if (importCmdFlags['branch-alias']) {
    config.branchAlias = importCmdFlags['branch-alias'];
  }

  if (importCmdFlags['branch']) {
    config.branchName = importCmdFlags['branch'];
    config.branchDir = config.contentDir;
  }
  if (importCmdFlags['module']) {
    config.moduleName = importCmdFlags['module'];
    config.singleModuleImport = true;
  }

  if (importCmdFlags['backup-dir']) {
    config.useBackedupDir = importCmdFlags['backup-dir'];
  }

  if (importCmdFlags['skip-assets-publish']) {
    config.skipAssetsPublish = importCmdFlags['skip-assets-publish'];
  }

  if (importCmdFlags['skip-entries-publish']) {
    config.skipEntriesPublish = importCmdFlags['skip-entries-publish'];
  }

  // Note to support old modules
  config.target_stack = config.apiKey;

  config.replaceExisting = importCmdFlags['replace-existing'];
  config.skipExisting = importCmdFlags['skip-existing'];

  config.personalizeProjectName = importCmdFlags['personalize-project-name'];

  if (importCmdFlags['exclude-global-modules']) {
    config['exclude-global-modules'] = importCmdFlags['exclude-global-modules'];
  }

  // Add authentication details to config for context tracking
  config.authenticationMethod = authenticationMethod;
  log.debug('Import configuration setup completed.', { ...config });

  return config;
};

export default setupConfig;
