const contentstacksdk = require('@contentstack/management')


exports.Client = function (config) {  

  const option = {
    host: config.host.cma,
    authtoken: config.auth_token,
    maxContentLength: 100000000,
    maxBodyLength: 1000000000,
    logHandler: (level, data) => {}
  }

  if (config.target_stack) {
    option.api_key = config.target_stack
  }
  if (config.source_stack) {
    option.api_key = config.source_stack
  }
  const client = contentstacksdk.client(option)
  return client
}
