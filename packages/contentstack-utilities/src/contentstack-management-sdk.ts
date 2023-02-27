import { Agent } from 'node:https';
import { client, ContentstackClient, ContentstackConfig } from '@contentstack/management';
import authHandler from './auth-handler';
import configStore from './config-handler';

export default async (config): Promise<ContentstackClient> => {
  try {
    const option: ContentstackConfig = {
      host: config.host,
      maxContentLength: 100000000,
      maxBodyLength: 1000000000,
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
          switch (error.status) {
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
            reject('Your session is timed out, please login to proceed');
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
    if (typeof config.branchName === 'string') {
      option.headers = { branch: config.branchName };
    }

    if (!config.management_token) {
      const authorisationType = configStore.get('authorisationType');
      if (authorisationType === 'BASIC') {
        option['authtoken'] = configStore.get('authtoken');
      } else if (authorisationType === 'OAUTH') {
        await authHandler.compareOAuthExpiry();
        option['authorization'] = `Bearer ${configStore.get('oauthAccessToken')}`;
      } else {
        option.authtoken = '';
        option.authorization = '';
      }
    }

    return client(option);
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};
