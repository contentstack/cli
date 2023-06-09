/* eslint-disable max-statements-per-line */
/* eslint-disable no-console */
/* eslint-disable no-empty */
/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

import { log } from './logger';
import { managementSDKClient } from '@contentstack/cli-utilities';

const login = async (config): Promise<any> => {
  const client = await managementSDKClient(config);
  if (config.email && config.password) {
    const { user: { authtoken = null } = {} } = await client.login({ email: config.email, password: config.password });
    if (authtoken) {
      config.authtoken = authtoken;
      config.headers = {
        api_key: config.source_stack,
        access_token: config.access_token,
        authtoken: config.authtoken,
        'X-User-Agent': 'contentstack-export/v',
      };
      log(config, 'Contentstack account authenticated successfully!', 'success');
      return config;
    } else {
      throw new Error('Invalid auth token received after login');
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
  } else if (config.auth_token && !config.management_token) {
    await client.stack({ api_key: config.source_stack, management_token: config.management_token }).users();
  } else if (config.management_token) {
    return '';
  }
};

export default login;
