const contentstacksdk = require('@contentstack/management')

let delay = function (milliseconds) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      console.log(`Continuing after ${milliseconds} of delay...`)
      return resolve()
    }, milliseconds)
  })
}

exports.Client = function (config) {
  const option = {
    host: config.host,
    authtoken: config.auth_token,
    api_key: config.target_stack,
    maxContentLength: 100000000,
    maxBodyLength: 1000000000,
    logHandler: (level, data) => { },
    retryCondition: async error => {
      console.log('execute')
      await delay(500)
      console.log('I am here in custom retry condition', error.response.status)
      if (error.response && (error.response.status === 429 || error.response.status === 422)) {
        return true
      }
      return false
    },
  }
  const client = contentstacksdk.client(option)
  return client
}
