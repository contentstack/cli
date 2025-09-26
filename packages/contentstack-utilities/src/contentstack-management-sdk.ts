import { client, ContentstackClient, ContentstackConfig } from '@contentstack/management';
import authHandler from './auth-handler';
import { Agent } from 'node:https';
import configHandler, { default as configStore } from './config-handler';
import { addApiDelay } from './api-delay-helper';

class ManagementSDKInitiator {
  private analyticsInfo: string;

  constructor() {}

  init(context) {
    this.analyticsInfo = context?.analyticsInfo;
  }

  async createAPIClient(config): Promise<ContentstackClient> {
    const option: ContentstackConfig = {
      host: config.host,
      maxContentLength: config.maxContentLength || 100000000,
      maxBodyLength: config.maxBodyLength || 1000000000,
      maxRequests: 10,
      retryLimit: 3,
      timeout: 60000,
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
        // LINK ***REMOVED***vascript/blob/72fee8ad75ba7d1d5bab8489ebbbbbbaefb1c880/src/core/stack.js#L49
        if (error.response && error.response.status) {
          switch (error.response.status) {
            case 401:
            case 429:
            case 408:
              return true;

            default:
              return false;
          }
        }
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

// Original function that automatically detects if delays should be applied
const originalCreateAPIClient = managementSDKInitiator.createAPIClient.bind(managementSDKInitiator);

export default async function managementSDKClient(config: any): Promise<ContentstackClient> {
  // Check if delays should be applied
  const delayMs = '10000'
  
  if (delayMs) {
    // Use the delay-enabled version
    return createManagementSDKClientWithDelay(config);
  } else {
    // Use the normal version
    return originalCreateAPIClient(config);
  }
}

export { ContentstackConfig, ContentstackClient };
/**
 * Creates a management SDK client with delay support
 * This wraps the client to add delays before API calls
 * @param config Configuration for the SDK client
 * @returns Promise that resolves to a ContentstackClient with delay support
 */
export async function createManagementSDKClientWithDelay(
  config: any
): Promise<ContentstackClient> {
  // Create the client
  const client = await managementSDKInitiator.createAPIClient(config);
  
  // Return a wrapped client that adds delays to API calls
  return wrapClientWithDelay(client);
}

/**
 * Wraps a ContentstackClient with delay functionality
 * This intercepts all method calls and adds delays before any async operation
 * @param client The original ContentstackClient
 * @returns Wrapped client with delay support
 */
function wrapClientWithDelay(client: ContentstackClient): ContentstackClient {
  return new Proxy(client, {
    get(target, prop) {
      const originalMethod = target[prop];
      
      if (typeof originalMethod === 'function') {
        return function(...args: any[]) {
          const result = originalMethod.apply(target, args);
          
          // If the result is a Promise, wrap it with delay
          if (result && typeof result.then === 'function') {
            return (async () => {
              await addApiDelay('api-call');
              return await result;
            })();
          }
          
          // If the result is an object (for method chaining), wrap it
          if (result && typeof result === 'object') {
            return wrapObjectWithDelay(result);
          }
          
          return result;
        };
      }
      
      return originalMethod;
    }
  });
}

/**
 * Wraps objects with delay functionality
 * This recursively wraps all methods to add delays before async operations
 * @param obj The object to wrap
 * @returns Wrapped object with delay support
 */
function wrapObjectWithDelay(obj: any): any {
  return new Proxy(obj, {
    get(target, prop) {
      const originalMethod = target[prop];
      
      if (typeof originalMethod === 'function') {
        return function(...args: any[]) {
          const result = originalMethod.apply(target, args);
          
          // If the result is a Promise, wrap it with delay
          if (result && typeof result.then === 'function') {
            return (async () => {
              await addApiDelay('api-call');
              return await result;
            })();
          }
          
          // If the result is an object (for method chaining), wrap it recursively
          if (result && typeof result === 'object') {
            return wrapObjectWithDelay(result);
          }
          
          return result;
        };
      }
      
      return originalMethod;
    }
  });
}
