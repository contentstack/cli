const {Command} = require('@contentstack/cli-command')
const {cli} = require('cli-ux')
const chalk = require('chalk')

class RateLimitCommand extends Command {
  async run() {
    let currentRateLimit = this.rateLimit
    cli.log(chalk.green(`Currently using ${currentRateLimit} ratelimit`))
  }
}

RateLimitCommand.description = `Get current rateLimit set for CLI
`

module.exports = RateLimitCommand
