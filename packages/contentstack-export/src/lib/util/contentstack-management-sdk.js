const contentstacksdk = require('@contentstack/management')

exports.Client = function (config) {
  const option = {
    host: config.host,
    authtoken: config.auth_token,
    api_key: config.source_stack,
    logHandler: (level, data) => {},
  }

  const client = contentstacksdk.client(option)
  return client
}
