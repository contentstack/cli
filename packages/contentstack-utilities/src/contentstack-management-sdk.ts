import { client, ContentstackClient, ContentstackConfig } from '@contentstack/management';
import authHandler from './auth-handler';
import { Agent } from 'node:https';
import configHandler, { default as configStore } from './config-handler';
import { getProxyConfig } from './proxy-helper';
import dotenv from 'dotenv';

dotenv.config();

class ManagementSDKInitiator {
  private analyticsInfo: string;

  constructor() {}

  init(context) {
    this.analyticsInfo = context?.analyticsInfo;
  }

  async createAPIClient(config): Promise<ContentstackClient> {
    // Get proxy configuration with priority: Environment variables > Global config
    const proxyConfig = getProxyConfig();

    const option: ContentstackConfig = {
      host: config.host,
      maxContentLength: config.maxContentLength || 100000000,
      maxBodyLength: config.maxBodyLength || 1000000000,
      maxRequests: 10,
      retryLimit: 3,
      timeout: proxyConfig ? 10000 : 60000, // 10s timeout with proxy, 60s without
      delayMs: config.delayMs,
      httpsAgent: new Agent({
        maxSockets: 100,
        maxFreeSockets: 10,
        keepAlive: true,
        timeout: 60000, // active socket keepalive for 60 seconds
        // NOTE freeSocketTimeout option not exist in https client
        // freeSocketTimeout: 30000, // free socket keepalive for 30 seconds
      }),
      retryDelay: Math.floor(Math.random() * (8000 - 3000 + 1) + 3000),
      logHandler: (level, data) => {},
      retryCondition: (error: any): boolean => {
        // Don't retry proxy connection errors - fail fast
        // Check if proxy is configured and this is a connection error
        if (proxyConfig) {
          const errorCode = error.code || error.errno || error.syscall;
          const errorMessage = error.message || String(error);
          
          // Detect proxy connection failures - don't retry these
          if (
            errorCode === 'ECONNREFUSED' ||
            errorCode === 'ETIMEDOUT' ||
            errorCode === 'ENOTFOUND' ||
            errorCode === 'ERR_BAD_RESPONSE' ||
            errorMessage?.includes('ECONNREFUSED') ||
            errorMessage?.includes('connect ECONNREFUSED') ||
            errorMessage?.includes('ERR_BAD_RESPONSE') ||
            errorMessage?.includes('Bad response') ||
            errorMessage?.includes('proxy') ||
            (errorCode === 'ETIMEDOUT' && proxyConfig) // Timeout with proxy likely means proxy issue
          ) {
            // Don't retry - return false to fail immediately
            // The error will be thrown and handled by error formatter
            return false;
          }
        }
        
        // LINK ***REMOVED***vascript/blob/72fee8ad75ba7d1d5bab8489ebbbbbbaefb1c880/src/core/stack.js#L49
        if (error.response && error.response.status) {
          switch (error.response.status) {
            case 401:
            case 429:
            case 408:
            case 422:
              return true;

            default:
              return false;
          }
        }
        return false;
      },
      retryDelayOptions: {
        base: 1000,
        customBackoff: (retryCount, error) => {
          return 1;
        },
      },
      refreshToken: () => {
        return new Promise((resolve, reject) => {
          const authorisationType = configStore.get('authorisationType');
          if (authorisationType === 'BASIC') {
            // Handle basic auth 401 here
            reject('Session timed out, please login to proceed');
          } else if (authorisationType === 'OAUTH') {
            return authHandler
              .compareOAuthExpiry(true)
              .then(() => {
                resolve({
                  authorization: `Bearer ${configStore.get('oauthAccessToken')}`,
                });
              })
              .catch((error) => {
                reject(error);
              });
          } else {
            reject('You do not have permissions to perform this action, please login to proceed');
          }
        });
      },
    };

    if (proxyConfig) {
      option.proxy = proxyConfig;
    }
    if (config.endpoint) {
      option.endpoint = config.endpoint;
    }
    if (typeof config.branchName === 'string') {
      if (!option.headers) option.headers = {};
      option.headers.branch = config.branchName;
    }
    if (this.analyticsInfo) {
      if (!option.headers) option.headers = {};
      option.headers['X-CS-CLI'] = this.analyticsInfo;
    }
    if (!config.management_token) {
      const authorisationType = configStore.get('authorisationType');
      if (authorisationType === 'BASIC') {
        option.authtoken = configStore.get('authtoken');
        option.authorization = '';
      } else if (authorisationType === 'OAUTH') {
        if (!config.skipTokenValidity) {
          await authHandler.compareOAuthExpiry();
          option.authorization = `Bearer ${configStore.get('oauthAccessToken')}`;
        } else {
          option.authtoken = '';
          option.authorization = '';
        }
      } else {
        option.authtoken = '';
        option.authorization = '';
      }
    }

    const earlyAccessHeaders = configStore.get(`earlyAccessHeaders`);
    if (earlyAccessHeaders && Object.keys(earlyAccessHeaders).length > 0) {
      option.early_access = Object.values(earlyAccessHeaders);
    }

    return client(option);
  }
}

export const managementSDKInitiator = new ManagementSDKInitiator();
export default managementSDKInitiator.createAPIClient.bind(managementSDKInitiator);
export { ContentstackConfig, ContentstackClient };
