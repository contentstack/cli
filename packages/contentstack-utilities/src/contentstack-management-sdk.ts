import { client, ContentstackClient, ContentstackConfig } from '@contentstack/management';
import authHandler from './auth-handler';
import { Agent } from 'node:https';
import configHandler, { default as configStore } from './config-handler';

class ManagementSDKInitiator {
  private analyticsInfo: string;

  constructor() {}

  init(context) {
    this.analyticsInfo = context?.analyticsInfo;
  }

  async createAPIClient(config): Promise<ContentstackClient> {
    // Get proxy configuration with priority: config.proxy > configStore.proxy > HTTPS_PROXY > HTTP_PROXY
    let proxyConfig = config.proxy;
    
    // Check global config store if not provided in config
    if (!proxyConfig) {
      proxyConfig = configStore.get('proxy');
    }
    
    // Check environment variables if still not found
    if (!proxyConfig) {
      const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
      if (proxyUrl) {
        // Parse URL string into proxy object format (SDK expects object with host, port, protocol)
        try {
          const url = new URL(proxyUrl);
          const parsedProxy: any = {
            protocol: url.protocol.replace(':', '') as 'http' | 'https',
            host: url.hostname,
            port: Number.parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
          };
          // Include auth if present in URL
          if (url.username || url.password) {
            parsedProxy.auth = {
              username: url.username,
              password: url.password,
            };
          }
          proxyConfig = parsedProxy;
        } catch (error) {
          // If URL parsing fails, ignore proxy config
          if (process.env.DEBUG_PROXY === 'true') {
            console.log('[PROXY] Failed to parse proxy URL:', error instanceof Error ? error.message : String(error));
          }
          proxyConfig = undefined;
        }
      }
    }

    const option: ContentstackConfig = {
      host: config.host,
      maxContentLength: config.maxContentLength || 100000000,
      maxBodyLength: config.maxBodyLength || 1000000000,
      maxRequests: 10,
      retryLimit: 3,
      // Reduce timeout when proxy is configured to fail faster on invalid proxy
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

    // Set proxy configuration if found
    if (proxyConfig) {
      if (typeof proxyConfig === 'object') {
        option.proxy = proxyConfig;
        // Log proxy configuration for debugging (enable with DEBUG_PROXY=true)
        if (process.env.DEBUG_PROXY === 'true') {
          // Only log non-sensitive proxy information
          const safeProxyConfig: any = {
            protocol: proxyConfig.protocol,
            port: proxyConfig.port,
            // Host is redacted as it may contain sensitive internal network information
            host: proxyConfig.host ? 'REDACTED' : undefined,
            // Auth information is always redacted
            auth: proxyConfig.auth ? {
              username: proxyConfig.auth.username ? 'REDACTED' : undefined,
              password: proxyConfig.auth.password ? 'REDACTED' : undefined,
            } : undefined,
          };
          console.log('[PROXY] Using proxy:', JSON.stringify(safeProxyConfig));
        }
      } else if (typeof proxyConfig === 'string') {
        // If proxy is provided as string URL, parse it to object format
        try {
          const url = new URL(proxyConfig);
          const parsedProxy: any = {
            protocol: url.protocol.replace(':', '') as 'http' | 'https',
            host: url.hostname,
            port: Number.parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
          };
          if (url.username || url.password) {
            parsedProxy.auth = {
              username: url.username,
              password: url.password,
            };
          }
          option.proxy = parsedProxy;
        } catch {
          // If URL parsing fails, ignore proxy config
        }
      }
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
