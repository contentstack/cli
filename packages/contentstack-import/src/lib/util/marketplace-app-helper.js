let config = require('../../config/default');
const sdk = require('./contentstack-management-sdk');
const { cliux, HttpClient, configHandler } = require('@contentstack/cli-utilities');

const getInstalledExtensions = (config) => {
  const client = sdk.Client(config)

  return new Promise((resolve, reject) => {
    const queryRequestOptions = {
      include_marketplace_extensions: true
    }
    const { target_stack: api_key, management_token, auth_token } = config || {}

    if (api_key && management_token) {
      return client
        .stack({ api_key, management_token })
        .extension()
        .query(queryRequestOptions)
        .find()
        .then(({ items }) => resolve(items))
        .catch(reject)
    } else if (api_key && auth_token) {
      const { cma } = configHandler.get('region') || {};
      const headers = {
        api_key,
        authtoken: auth_token
      }
      const httpClient = new HttpClient().headers(headers);
      httpClient.get(`${cma}/v3/extensions/?include_marketplace_extensions=true`)
        .then(({ data: { extensions } }) => resolve(extensions))
    } else {
      resolve([])
    }
  })
}

const getDeveloperHubUrl = async () => {
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
}

module.exports = { getInstalledExtensions, getDeveloperHubUrl }