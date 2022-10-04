const sdk = require('./contentstack-management-sdk');
const { HttpClient } = require('@contentstack/cli-utilities');

const getInstalledExtensions = (config) => {
  const client = sdk.Client(config)

  return new Promise((resolve, reject) => {
    const queryRequestOptions = {
      include_marketplace_extensions: true
    }
    const {
      management_token_data: { apiKey: api_key, token: management_token } = { apiKey: config.source_stack },
      auth_token
    } = config || { management_token_data: {} }

    if (api_key && management_token) {
      client
        .stack({ api_key, management_token })
        .extension()
        .query(queryRequestOptions)
        .find()
        .then(({ items }) => resolve(items))
        .catch(reject)
    } else if (api_key && auth_token) {
      const headers = {
        api_key,
        authtoken: auth_token
      }
      const httpClient = new HttpClient().headers(headers);
      const baseUrl = config.host.startsWith('http')
        ? config.host
        : `https://${config.host}/v3`;
      httpClient.get(`${baseUrl}/extensions/?include_marketplace_extensions=true`)
        .then(({ data: { extensions } }) => resolve(extensions))
        .catch(reject)
    } else {
      resolve([])
    }
  })
}

module.exports = { getInstalledExtensions }