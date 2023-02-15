import * as ContentstackManagementSDK from '@contentstack/management';
const https = require('https');
import { default as configStore } from './config-handler';

export default async (config) => {
  try {
    let managementAPIClient: ContentstackManagementSDK.ContentstackClient;
    const option = {
      host: config.host,
      management_token: config.management_token,
      api_key: config.stack_api_key,
      maxContentLength: 100000000,
      maxBodyLength: 1000000000,
      maxRequests: 10,
      retryLimit: 3,
      timeout: 60000,
      httpsAgent: new https.Agent({
        maxSockets: 100,
        maxFreeSockets: 10,
        keepAlive: true,
        timeout: 60000, // active socket keepalive for 60 seconds
        freeSocketTimeout: 30000, // free socket keepalive for 30 seconds
      }),
      retryDelay: Math.floor(Math.random() * (8000 - 3000 + 1) + 3000),
      logHandler: (level, data) => {},
      retryCondition: (error) => {
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
          reject('You do not have permissions to perform this action, please login to proceed');
        });
      },
    };
    if (typeof config.branchName === 'string') {
      option['headers'] = {
        branch: config.branchName,
      };
    }

    if (!config.management_token) {
      const authtoken = configStore.get('authtoken');
      if (authtoken) {
        option['authtoken'] = configStore.get('authtoken');
        option['authorization'] = '';
      } else {
        option['authtoken'] = '';
        option['authorization'] = '';
      }
    }

    managementAPIClient = ContentstackManagementSDK.client(option);
    return managementAPIClient;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};
