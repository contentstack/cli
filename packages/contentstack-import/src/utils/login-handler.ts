/* eslint-disable max-statements-per-line */
/* eslint-disable no-console */
/* eslint-disable no-empty */
/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

import { log } from './logger';
import { managementSDKClient, isAuthenticated } from '@contentstack/cli-utilities';
import { ImportConfig } from '../types';

const login = async (config: ImportConfig): Promise<any> => {
  const client = await managementSDKClient(config);
  if (config.email && config.password) {
    const { user: { authtoken = null } = {} } = await client.login({ email: config.email, password: config.password });
    if (authtoken) {
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
  } else if (config.management_token) {
    return config;
  } else if (isAuthenticated()) {
    const stackAPIClient = client.stack({
      api_key: config.target_stack,
      management_token: config.management_token,
    });
    const stack = await stackAPIClient.fetch().catch((error: any) => {
      let errorstack_key = error?.errors?.api_key;
      if (errorstack_key) {
        log(config, 'Stack Api key ' + errorstack_key[0] + 'Please enter valid Key', 'error');
        throw error;
      }
      log(config, error?.errorMessage, 'error');
      throw error;
    });
    config.destinationStackName = stack.name;
    return config;
  }
};

export default login;
