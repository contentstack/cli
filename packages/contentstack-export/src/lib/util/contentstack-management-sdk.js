const contentstacksdk = require('@contentstack/management')

exports.Client = function (config) {
  // console.log("manament stack", config);
  const option = {
    host: config.host,
    authtoken: config.auth_token,
    api_key: config.source_stack,
  }

  const client = contentstacksdk.client(option)
  return client
}
