const contentstacksdk = require('@contentstack/management')

let delay = function (ms) {
  return new Promise(function (resolve, reject) {
    setTimeout(() => {
      console.log(`waited for ${ms} milliseconds`)
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
    retryCondition: async error => {
      await delay(15000)
      console.log('retrying...............', error.response.status)
      if (error.response && error.response.status === 429) {
        return true
      }
      return false
    },
    retryDelayOptions: {
      base: 3000,
      // customBackoff: async function (retryCount, err) {
      // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>', err.message)
      // await delay(15000)
      // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>', err.message)
      // if (retryCount < 5) {
      // return 15000
      // }
      // return -1 // returning -1 will hold next retry for request
      // },
    },
  }
  const client = contentstacksdk.client(option)
  return client
}
