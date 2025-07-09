/* eslint-disable max-statements-per-line */
/* eslint-disable no-console */
/* eslint-disable no-empty */
/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

import { managementSDKClient, isAuthenticated, log } from '@contentstack/cli-utilities';
import { ImportConfig } from '../types';

const login = async (config: ImportConfig): Promise<any> => {
  log.debug('Starting login process');
  
  const client = await managementSDKClient(config);
  
  if (config.email && config.password) {
    log.debug('Attempting login with email and password');
    
    const { user: { authtoken = null } = {} } = await client.login({ email: config.email, password: config.password });
    
    if (authtoken) {
      log.debug('Login successful, setting up headers');
      
      config.headers = {
        api_key: config.source_stack,
        access_token: config.access_token,
        authtoken: config.authtoken,
        'X-User-Agent': 'contentstack-export/v',
      };
      return config;
    } else {
      throw new Error('Invalid auth token received after login');
    }
  } else if (config.management_token) {
    log.debug('Using management token for authentication');
    return config;
  } else if (isAuthenticated()) {
    log.debug('Using existing authentication, validating stack access');
    
    const stackAPIClient = client.stack({
      api_key: config.target_stack,
      management_token: config.management_token,
    });
    
    const stack = await stackAPIClient.fetch().catch((error: any) => {
      let errorstack_key = error?.errors?.api_key;
      
      if (errorstack_key) {
        log.error(`Invalid stack API key: ${errorstack_key[0]} Please enter valid stack API key.`);
        throw error;
      }
      
      log.error(`Stack fetch error: ${error?.errorMessage}`);
      throw error;
    });
    
    config.destinationStackName = stack.name;
    return config;
  }

};

export default login;
