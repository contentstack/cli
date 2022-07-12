const { HttpClient } = require('@contentstack/cli-utilities');

const getInstalledExtensions = (config) => {
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
      const headers = {
        api_key,
        authtoken: config.auth_token
      }
      const httpClient = new HttpClient().headers(headers);
      httpClient.get(`${config.extensionHost}/api/v3/extensions/?include_marketplace_extensions=true`)
        .then(({ data: { extensions } }) => resolve(extensions))
    } else {
      resolve([])
    }
  })
}

module.exports = { getInstalledExtensions }