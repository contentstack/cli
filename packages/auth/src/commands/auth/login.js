const chalk = require('chalk')
const {Command, flags} = require('@contentstack/cli-command')
const {cli} = require('cli-ux')
const {AuthHandler} = require('../../util/auth-handler')
const Configstore  = require('configstore')
const config = new Configstore('contentstack_cli')
const Messages = require('../../util/messages')
const messages = new Messages('login').msgs
const debug  = require('debug')('csdx:auth:login')

class LoginCommand extends Command {
  async run() {
    const opts = {
      contentstackClient: this.managementAPIClient, // get client added in 'this' context via cli plugin init hook
    }

    const authHandler = new AuthHandler(opts)
    const loginCommandFlags = this.parse(LoginCommand).flags
    let username = loginCommandFlags.username ? loginCommandFlags.username : await cli.prompt(messages.promptEmailAddress)

    const password = await cli.prompt(messages.promptPassword, {type: 'hide'})
    try {
      const user = await authHandler.login(username, password)
      debug('User object ', user)
      config.set('authtoken', user.authtoken)
      config.set('email', user.email)
      cli.log(chalk.green(messages.msgLoginSuccess))
    } catch (error) {
      debug('Error occurred: ', error)
      if (error.message) {
        try {
          let res = JSON.parse(error.message)
          cli.log(chalk.red(res.errorMessage))
        } catch (e) {
          cli.log(chalk.red(error.message))
        }
      }
    }
  }
}

LoginCommand.description = messages.commandDescription

LoginCommand.flags = {
  username: flags.string({char: 'u', description: messages.flagUsernameDescription}),
}

LoginCommand.aliases = ['login']

module.exports = LoginCommand
