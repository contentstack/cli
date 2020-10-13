const {Command, flags} = require('@contentstack/cli-command')
const {cli} = require('cli-ux')
const chalk = require('chalk')
const {AuthHandler} = require('../../util/auth-handler')
const Configstore  = require('configstore')
const Messages = require('../../util/messages')
const messages = new Messages('logout').msgs

class LogoutCommand extends Command {
  async run() {
    const {flags} = this.parse(LogoutCommand)
    let confirm = false
    confirm = flags.force ? true : await cli.confirm(messages.promptConfirmLogout)
    const opts = {
      contentstackClient: this.managementAPIClient,
    }
    const authHandler = new AuthHandler(opts)
    const config = new Configstore('contentstack_cli')
    try {
      if (confirm) {
        cli.log(messages.msgLoggingOut)
        let authtoken = this.authToken
        await authHandler.logout(authtoken)
        config.delete('authtoken')
        config.delete('email')
        cli.log(chalk.green(messages.msgLogOutSuccess))
      }
    } catch (error) {
      config.delete('authtoken')
      config.delete('email')
      cli.log(chalk.green(messages.msgLogOutSuccess))
    }
  }
}

LogoutCommand.description = messages.commandDesc

LogoutCommand.flags = {
  force: flags.boolean({char: 'f', description: messages.flagForceDesc}),
}

LogoutCommand.aliases = ['logout']

module.exports = LogoutCommand
