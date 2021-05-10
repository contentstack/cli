const {Command, flags} = require('@oclif/command')
const Configstore = require('configstore')
const config = new Configstore('contentstack_cli')

class GetCommand extends Command {
  async run() {
    const {flags} = this.parse(GetCommand)
    const key = flags.key
    const plugin = flags.plugin
    try {
      let response
      let sourceConfig = 'global'
      if (plugin) {
        sourceConfig = plugin
        let pluginConfig = config.get(plugin)
        if (!pluginConfig) {
          throw new Error(`Config doesn't exist for ${sourceConfig}`)
        }
        response = pluginConfig[key]
      } else {
        response = config.get(key)
      }
      if (!response)
        throw new Error(`${key} doesn't exist in the ${sourceConfig} config`)
      if (typeof response === 'object')
        response = JSON.stringify(response, null, 2)
      this.log(`${key} = ${response}`)
    } catch (error) {
      this.error(error)
    }
  }
}

GetCommand.description = `Get a property from global config
...
Extra documentation goes here
`

GetCommand.flags = {
  value: flags.string({char: 'v', description: 'Specify the value'}),
  key: flags.string({char: 'k', description: 'Specify the key'}),
  plugin: flags.string({char: 'p', description: 'Specify the plugin for which the config is to be fetched'})
}

module.exports = GetCommand
