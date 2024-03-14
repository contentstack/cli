import { Agent } from 'node:https';
import { App, AppData } from '@contentstack/marketplace-sdk/types/marketplace/app';
import { client, ContentstackConfig, ContentstackClient, ContentstackToken } from '@contentstack/marketplace-sdk';

import authHandler from './auth-handler';
import configStore from './config-handler';
import { Installation } from '@contentstack/marketplace-sdk/types/marketplace/installation';

type ConfigType = Pick<ContentstackConfig, 'host' | 'endpoint' | 'retryDelay' | 'retryLimit'> & {
  skipTokenValidity?: string;
};
type ContentstackMarketplaceConfig = ContentstackConfig;
type ContentstackMarketplaceClient = ContentstackClient;

class MarketplaceSDKInitiator {
  private analyticsInfo: string;

  /**
   * The function returns a default configuration object for Contentstack API requests in TypeScript.
   * @returns a default configuration object of type `ContentstackConfig`.
   */
  get defaultOptions(): ContentstackConfig {
    return {
      headers: {},
      retryLimit: 3,
      timeout: 60000,
      maxRequests: 10,
      authtoken: '',
      authorization: '',
      // host: 'api.contentstack.io',
      maxContentLength: 100000000,
      maxBodyLength: 1000000000,
      httpsAgent: new Agent({
        timeout: 60000, // active socket keepalive for 60 seconds
        maxSockets: 100,
        keepAlive: true,
        maxFreeSockets: 10,
      }),
      retryDelay: Math.floor(Math.random() * (8000 - 3000 + 1) + 3000),
      retryCondition: (error: any): boolean => {
        if (error?.response?.status) {
          if ([408].includes(error.response.status)) {
            return true;
          } else {
            return false;
          }
        }
      },
      retryDelayOptions: {
        base: 1000,
        customBackoff: () => 1,
      },
    };
  }

  init(context) {
    this.analyticsInfo = context?.analyticsInfo;
  }

  /**
   * The function `refreshTokenHandler` returns a promise that resolves with a `ContentstackToken`
   * object based on the `authorizationType` parameter.
   * @param {string} authorizationType - The `authorizationType` parameter is a string that specifies
   * the type of authorization being used. It can have one of the following values:
   * @returns The refreshTokenHandler function returns a function that returns a Promise of type
   * ContentstackToken.
   */
  refreshTokenHandler(authorizationType: string) {
    return (): Promise<ContentstackToken> => {
      return new Promise((resolve, reject) => {
        if (authorizationType === 'BASIC') {
          // NOTE Handle basic auth 401 here
          reject(new Error('Session timed out, please login to proceed'));
        } else if (authorizationType === 'OAUTH') {
          authHandler
            .compareOAuthExpiry(true)
            .then(() => resolve({ authorization: `Bearer ${configStore.get('oauthAccessToken')}` }))
            .catch(reject);
        } else {
          reject(new Error('You do not have permissions to perform this action, please login to proceed'));
        }
      });
    };
  }

  /**
   * The function creates a Contentstack SDK client with the provided configuration.
   * @param config - The `config` parameter is an object that contains the following properties:
   * @returns a Promise that resolves to a ContentstackClient object.
   */
  async createAppSDKClient(config?: ConfigType): Promise<ContentstackClient> {
    const authorizationType = configStore.get('authorisationType');

    const option = this.defaultOptions;
    option.refreshToken = this.refreshTokenHandler(authorizationType);

    if (config.host) {
      option.host = config.host;
    }

    if (config.endpoint) {
      option.endpoint = config.endpoint;
    }

    if (config.retryLimit) {
      option.retryLimit = config.retryLimit;
    }

    if (config.retryDelay) {
      option.retryDelay = config.retryDelay;
    }

    if (this.analyticsInfo) {
      option.headers['X-CS-CLI'] = this.analyticsInfo;
    }

    if (authorizationType === 'BASIC') {
      option.authtoken = configStore.get('authtoken');
    } else if (authorizationType === 'OAUTH') {
      if (!config.skipTokenValidity) {
        await authHandler.compareOAuthExpiry();
        option.authorization = `Bearer ${configStore.get('oauthAccessToken')}`;
      }
    }

    return client(option);
  }
}

export const marketplaceSDKInitiator = new MarketplaceSDKInitiator();
const marketplaceSDKClient: typeof marketplaceSDKInitiator.createAppSDKClient =
  marketplaceSDKInitiator.createAppSDKClient.bind(marketplaceSDKInitiator);
export {
  App,
  AppData,
  Installation,
  MarketplaceSDKInitiator,
  ContentstackMarketplaceConfig,
  ContentstackMarketplaceClient,
};

export default marketplaceSDKClient;
