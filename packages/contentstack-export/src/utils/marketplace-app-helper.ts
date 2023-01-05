let config = require('../../config/default');
const { cliux, HttpClient, configHandler, managementSDKClient } = require('@contentstack/cli-utilities');

<<<<<<< HEAD:packages/contentstack-export/src/utils/marketplace-app-helper.ts
export const getInstalledExtensions = (config): Promise<any> => {
  const client = sdk.Client(config);

  return new Promise((resolve, reject) => {
    const queryRequestOptions = {
      include_marketplace_extensions: true,
    };
    const {
      management_token_data: { apiKey: api_key, token: management_token = null } = { apiKey: config.source_stack },
      auth_token,
    } = config || { management_token_data: {} };

    if (api_key && management_token) {
      client
        .stack({ api_key, management_token })
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
=======
const getInstalledExtensions = (config) => {
  return new Promise((resolve, reject) => {
    managementSDKClient(config)
      .then((APIClient) => {
        const queryRequestOptions = {
          include_marketplace_extensions: true,
        };
        const {
          management_token_data: { apiKey: api_key, token: management_token } = { apiKey: config.source_stack },
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
>>>>>>> 0fcdc710a734c31fa3f88b523265f7f15fbf079f:packages/contentstack-export/src/lib/util/marketplace-app-helper.js
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
    });
  }

  return developerHubBaseUrl.startsWith('http') ? developerHubBaseUrl : `https://${developerHubBaseUrl}`;
};
<<<<<<< HEAD:packages/contentstack-export/src/utils/marketplace-app-helper.ts
=======

module.exports = { getInstalledExtensions, getDeveloperHubUrl };
>>>>>>> 0fcdc710a734c31fa3f88b523265f7f15fbf079f:packages/contentstack-export/src/lib/util/marketplace-app-helper.js
