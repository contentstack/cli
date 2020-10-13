const {AuthHandler} = require('../util/auth-handler')
const LoginCommand = require('../commands/auth/login')
const {cli} = require('cli-ux')

module.exports = async function () {
  try {
    let authtoken = this.authToken
    const opts = {
      contentstackClient: this.contentstackClient,
    }
    const authHandler = new AuthHandler(opts)
    await authHandler.validateAuthtoken(authtoken)
  } catch (error) {
    let confirm = await cli.confirm('Your authtoken is expired or not valid. Do you want to login again?')
    if (confirm) {
      await LoginCommand.run()
    }
  }
}
