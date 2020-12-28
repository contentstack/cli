const contentstacksdk = require('@contentstack/management')

let delay = function (ms) {
  return new Promise(resolve => {
    setTimeout(() => {
      console.log(`waited for ${ms} miliseconds`)
      return resolve()
    }, ms)
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
    retryDelayOptions: {
      customBackoff: async function (retryCount, err) {
        await delay(15000)
        console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>', err.message)
        if (retryCount < 5) {
          return 3000
        }
        return -1 // returning -1 will hold next retry for request
      },
    },

  }
  const client = contentstacksdk.client(option)
  return client
}
