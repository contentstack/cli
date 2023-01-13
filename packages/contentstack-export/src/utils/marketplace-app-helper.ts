import config from '../config';
import { InquirePayload } from '@contentstack/cli-utilities/types/interfaces';
import { cliux, HttpClient, configHandler, managementSDKClient } from '@contentstack/cli-utilities';

export const getInstalledExtensions = (config) => {
  return new Promise((resolve, reject) => {
    managementSDKClient(config)
      .then((APIClient) => {
        const queryRequestOptions = {
          include_marketplace_extensions: true,
        };
        const {
          management_token_data: { apiKey: api_key, token: management_token = null } = { apiKey: config.source_stack },
          auth_token,
        } = config || { management_token_data: {} };
        if (api_key && management_token) {
          const stackAPIClient = APIClient.stack({ api_key, management_token });
          stackAPIClient
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

export const getDeveloperHubUrl = async () => {
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
      message: `Enter the developer-hub base URL for the ${name} region - `,
    } as InquirePayload);
  }

  return developerHubBaseUrl.startsWith('http') ? developerHubBaseUrl : `https://${developerHubBaseUrl}`;
};
