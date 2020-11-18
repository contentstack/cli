const {Command, flags} = require('@oclif/command')
const {cli} = require('cli-ux')
const chalk = require('chalk')

class RateLimitCommand extends Command {
  async run() {
    const {flags} = this.parse(RateLimitCommand)
    const {limit}  = flags
    
    // Custom flag will get first priority over region argument
    if (limit) {
      try {
        let customRateLimit = this.config.userConfig.setCustomRateLimit(limit)
        cli.log(chalk.green(`Custom rateLimit has been set to ${customRateLimit}`))
      } catch (error) {
        if (error.name && error.name === 'TypeError') {
          cli.log(chalk.red(error.message))
        } else {
          cli.log(chalk.red(`Failed to set ratelimit due to: ${error.message}`))
        }
      }
    }
  }
}

RateLimitCommand.description = `set the rate limit
`

RateLimitCommand.examples =  [
  '$ csdx config:set:rate-limit --limit "value"',
  '$ csdx config:set:rate-limit --limit="value"',
]

RateLimitCommand.flags = {
  limit: flags.string({
    char: 'r',
    description: '',
  }),
}

module.exports = RateLimitCommand
