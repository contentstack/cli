const contentstacksdk = require('@contentstack/management')


exports.Client = function (config) {  

  const option = {
    host: config.host,
    authtoken: config.auth_token,
    api_key: config.target_stack,
    maxContentLength: 100000000,
    maxBodyLength: 1000000000,
    timeout: 60000,
    logHandler: (level, data) => {}
  }
  const client = contentstacksdk.client(option)
  return client
}
