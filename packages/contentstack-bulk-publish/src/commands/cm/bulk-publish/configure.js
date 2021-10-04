const {Command, flags} = require('@oclif/command')
const {cli} = require('cli-ux')
const fs = require('fs')
const path = require('path')
let config = require('../../../config/index.js')

class ConfigureCommand extends Command {

  async run() {
    const {flags} = this.parse(ConfigureCommand)

    if (!flags.alias) {
      flags.alias = await cli.prompt('Please enter the management token alias to be used')
    }

    await this.config.runHook('validateManagementTokenAlias', {alias: flags.alias})
    this.setConfig(flags)
    this.log('The configuration has been saved successfully.')
  }

  setConfig({apikey, alias}) {
    if (alias)
      config.alias = alias
    fs.writeFileSync(path.join(process.cwd(), 'config.js'), `module.exports = ${JSON.stringify(config, null, 2)}`)
  }
}

ConfigureCommand.description = `Generate configuration template
The configure command is used for generating a configuration file for bulk-publish script.

Here is a detailed description for all the available flags

-----------------------------------------------------------------------------------------------------------
--alias or -a : Management token Alias for the stack in use.

EXAMPLE : cm:bulk-publish:configure --alias [MANAGEMENT TOKEN Alias]
EXAMPLE : cm:bulk-publish:configure -a [MANAGEMENT TOKEN Alias]
`

ConfigureCommand.flags = {
  alias: flags.string({char: 'a', description: 'Management token alias for the stack'}),
}

module.exports = ConfigureCommand