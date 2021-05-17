const {Command, flags} = require('@oclif/command')
const Configstore = require('configstore')
const {cli} = require('cli-ux')
const chalk = require('chalk')

class ResetCommand extends Command {
  async run() {
    // const {flags} = this.parse(ResetCommand)
    const config = new Configstore('contentstack_cli')
    const confirmation = await cli.confirm('Do you want to reset the configuration to default? Region will be set to EU and everything else will be deleted (y/n)')
    if (confirmation) {
      const currentConfig = config.all
      const defaultConfig = {
        uuid: currentConfig.uuid,
      }
      config.all = defaultConfig
      let regionDetails = this.config.userConfig.setRegion('EU')
      // const {flags} = this.parse(ResetCommand)
      // const name = flags.name || 'world'
      cli.log(chalk.green('Region has been set to EU'))
      cli.log(chalk.green(`CDA HOST: ${regionDetails.cda}`))
      cli.log(chalk.green(`CMA HOST: ${regionDetails.cma}`))
    }
  }
}

ResetCommand.description = `Reset the global cli config
...
`

// ResetCommand.flags = {
//   backup: flags.boolean({char: 'b', description: 'Creates a backup of the original config'}),
//   'reset-all': flags.boolean({char: 'r', description: 'Reset all the configuration from the global config'}),
//   plugin: flags.string({char: 'p', description: 'Reset configuration for a particular plugin'}),
//   key: flags.string({char: 'k', description: 'Reset configuration for a particular key'}),
// }

module.exports = ResetCommand
