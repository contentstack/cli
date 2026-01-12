/* eslint-disable max-statements-per-line */
/* eslint-disable no-console */
/* eslint-disable no-empty */
/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

import {
  managementSDKClient as defaultManagementSDKClient,
  isAuthenticated as defaultIsAuthenticated,
  log as defaultLog,
} from '@contentstack/cli-utilities';
import { ImportConfig } from '../types';

/**
 * Dependencies for login handler - can be injected for testing
 */
export interface LoginHandlerDeps {
  managementSDKClient?: typeof defaultManagementSDKClient;
  isAuthenticated?: typeof defaultIsAuthenticated;
  log?: typeof defaultLog;
}

const login = async (config: ImportConfig, deps: LoginHandlerDeps = {}): Promise<any> => {
  const managementSDKClient = deps.managementSDKClient ?? defaultManagementSDKClient;
  const isAuthenticated = deps.isAuthenticated ?? defaultIsAuthenticated;
  const log = deps.log ?? defaultLog;

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
      log.success('Contentstack account authenticated successfully!');
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
      const errorstack_key = error?.errors?.api_key;
      if (errorstack_key) {
        log.error('Stack Api key ' + errorstack_key[0] + 'Please enter valid Key', { error });
        throw error;
      }
      log.error(error?.errorMessage || 'Unknown error', { error });
      throw error;
    });
    config.destinationStackName = stack.name;
    return config;
  }
};

export default login;
