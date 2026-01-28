/* eslint-disable max-statements-per-line */
/* eslint-disable no-console */
/* eslint-disable no-empty */
/*!
 * Contentstack Import
 * Copyright (c) 2026 Contentstack LLC
 * MIT Licensed
 */

import { log, managementSDKClient, authHandler } from '@contentstack/cli-utilities';
import { ExternalConfig } from '../types';

const login = async (config: ExternalConfig): Promise<any> => {
  const client = await managementSDKClient(config);
  if (config.email && config.password) {
    const response = await client.login({ email: config.email, password: config.password }).catch(Promise.reject);
    if (response?.user?.authtoken) {
      config.headers = {
        api_key: config.apiKey,
        access_token: config.access_token,
        authtoken: response.user.authtoken,
        'X-User-Agent': 'contentstack-export/v',
      };
      await authHandler.setConfigData('basicAuth', response.user);
      log.success(`Contentstack account authenticated successfully!`, config.context);
      return config;
    } else {
      log.error(`Failed to log in!`, config.context);
      process.exit(1);
    }
  } else if (!config.email && !config.password && config.apiKey && config.access_token) {
    log.info(
      `Content types, entries, assets, labels, global fields, extensions modules will be exported`,
      config.context,
    );
    log.info(
      `Email, password, or management token is not set in the config, cannot export Webhook and label modules`,
      config.context,
    );
    config.headers = {
      api_key: config.apiKey,
      access_token: config.access_token,
      'X-User-Agent': 'contentstack-export/v',
    };
    return config;
  }
};

export default login;
