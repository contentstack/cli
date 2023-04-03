import { client, ContentstackClient, ContentstackConfig } from '@contentstack/management';
import { Agent } from 'node:https';
import { default as configStore } from './config-handler';

class ManagementSDKInitiator {
  private analyticsInfo: string;

  constructor() {}

  init(context) {
    console.log('init sdk', this.analyticsInfo);
    this.analyticsInfo = context?.analyticsInfo;
  }

  async createAPIClient(config): Promise<ContentstackClient> {
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
        // LINK https://github.com/contentstack/contentstack-javascript/blob/72fee8ad75ba7d1d5bab8489ebbbbbbaefb1c880/src/core/stack.js#L49
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
        return Promise.reject('You do not have permissions to perform this action, please login to proceed');
      },
    };

    if (typeof config.branchName === 'string') {
      if (!option.headers) option.headers = {};
      option.headers.branch = config.branchName;
    }

    console.log('analytics info', this.analyticsInfo);
    if (this.analyticsInfo) {
      if (!option.headers) option.headers = {};
      option.headers['X-CS-CLI'] = this.analyticsInfo;
    }

    if (!config.management_token) {
      const authtoken = configStore.get('authtoken');
      if (authtoken) {
        option.authtoken = authtoken;
        option.authorization = '';
      } else {
        option.authtoken = '';
        option.authorization = '';
      }
    }

    console.log('header', option.headers);
    return client(option);
  }
}

export const managementSDKInitiator = new ManagementSDKInitiator();
export default managementSDKInitiator.createAPIClient.bind(managementSDKInitiator);
