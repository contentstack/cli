const {Command} = require('@contentstack/cli-command')
const chalk = require('chalk')

class WhoamiCommand extends Command {
  async run() {
    try {
      this.log(`You are currently logged in with email: ${chalk.yellow(this.email)}`)
    } catch (error) {
      this.log(chalk.red(error.message))
    }
  }
}

WhoamiCommand.description = `Display current users email address
`

WhoamiCommand.aliases = ['whoami']

module.exports = WhoamiCommand
