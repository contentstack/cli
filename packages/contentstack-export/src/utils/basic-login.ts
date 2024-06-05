/* eslint-disable max-statements-per-line */
/* eslint-disable no-console */
/* eslint-disable no-empty */
/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

import { ExportConfig, ExternalConfig } from '../types';
import { log } from './logger';
const {
  managementSDKClient,
  isAuthenticated,
  cliux,
  configHandler,
  authHandler,
} = require('@contentstack/cli-utilities');

const login = async (config: ExternalConfig): Promise<any> => {
  const client = await managementSDKClient(config);
  if (config.email && config.password) {
    const response = await client.login({ email: config.email, password: config.password }).catch(Promise.reject);
    if (response?.user?.authtoken) {
      config.headers = {
        api_key: config.source_stack,
        access_token: config.access_token,
        authtoken: response.user.authtoken,
        'X-User-Agent': 'contentstack-export/v',
      };
      await authHandler.setConfigData('basicAuth', response.user);
      log(config, 'Contentstack account authenticated successfully!', 'success');
      return config;
    } else {
      log(config, 'Failed to login, Invalid credentials', 'error');
      process.exit(1);
    }
  } else if (!config.email && !config.password && config.source_stack && config.access_token) {
    log(
      config,
      'Content types, entries, assets, labels, global fields, extensions modules will be exported',
      'success',
    );
    log(
      config,
      'Email, password, or management token is not set in the config, cannot export Webhook and label modules',
      'success',
    );
    config.headers = {
      api_key: config.source_stack,
      access_token: config.access_token,
      'X-User-Agent': 'contentstack-export/v',
    };
    return config;
  }
};

export default login;
