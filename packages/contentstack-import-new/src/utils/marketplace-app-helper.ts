import { cliux, HttpClient, configHandler, managementSDKClient } from '@contentstack/cli-utilities';
import config from '../config';
import {log} from './logger'
const { formatError } = require('.');

export const getInstalledExtensions = (config) => {
  return new Promise((resolve, reject) => {
    managementSDKClient(config)
      .then((APIClient) => {
        const queryRequestOptions = {
          include_marketplace_extensions: true,
        };
        const { target_stack: api_key, management_token, auth_token } = config || {};

        if (api_key && management_token) {
          const stackAPIClient = APIClient.stack({ api_key, management_token });
          return stackAPIClient
            .extension()
            .query(queryRequestOptions)
            .find()
            .then(({ items }) => resolve(items))
            .catch(reject);
        } else if (api_key && auth_token) {
          const { cma } = configHandler.get('region') || {};
          const headers = {
            api_key,
            authtoken: auth_token,
          };
          const httpClient = new HttpClient().headers(headers);
          httpClient
            .get(`${cma}/v3/extensions/?include_marketplace_extensions=true`)
            .then(({ data: { extensions } }) => resolve(extensions))
            .catch(reject);
        } else {
          resolve([]);
        }
      })
      .catch(reject);
  });
};

export const getAllStackSpecificApps = (developerHubBaseUrl, httpClient, config) => {
  return httpClient
    .get(`${developerHubBaseUrl}/installations?target_uids=${config.target_stack}`)
    .then(({ data }) => data.data)
    .catch((error) => log(config, `Failed to export marketplace-apps ${formatError(error)}`, 'error'));
};

export const getDeveloperHubUrl = async (config) => {
  const { cma, name } = configHandler.get('region') || {};
  let developerHubBaseUrl = config.developerHubUrls[cma];

  if (!developerHubBaseUrl) {
    developerHubBaseUrl = await cliux.inquire({
      type: 'input',
      name: 'name',
      validate: (url) => {
        if (!url) return "Developer-hub URL can't be empty.";
        return true;
      },
      message: `Enter the developer-hub base URL for the ${name} region -`,
    });
  }

  return developerHubBaseUrl.startsWith('http') ? developerHubBaseUrl : `https://${developerHubBaseUrl}`;
};