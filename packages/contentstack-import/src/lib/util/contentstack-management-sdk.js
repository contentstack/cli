const contentstacksdk = require('@contentstack/management')


exports.Client = function (config) {  
console.log("dncjcndjncdj", config)
  const option = {
    host: config.host,
    authtoken: config.auth_token,
    // api_key: config.target_stack,
    // maxContentLength: 100000000,
    // maxBodyLength: 1000000000,
    // logHandler: (level, data) => {}
  }
  const client = contentstacksdk.client()
  console.log("line no 15>>>>>>", client)
  return client
}
