const contentstacksdk = require('@contentstack/management')

exports.Client = function (config) {
  const option = {
    host: config.host,
    authtoken: config.auth_token,
    api_key: config.target_stack,
    maxContentLength: 100000000,
    maxBodyLength: 1000000000,
    logHandler: (level, data) => { },
    retryCondition: error => {
      console.log('I am here in custom retry condition', error)
      if (error.response && (error.response.status === 429 || error.response.status === 422)) {
        return true
      }
      return false
    },
  }
  const client = contentstacksdk.client(option)
  return client
}
