const {Command, flags} = require('@oclif/command')
const Configstore = require('configstore')
const config = new Configstore('contentstack_cli')

class SetCommand extends Command {
  async run() {
    const {flags} = this.parse(SetCommand)
    const key = flags.key
    const value = flags.value
    const plugin = flags.plugin
    let resultStatement
    try {
      let globalConfig = config.all
      if (plugin) {
        if (!globalConfig[plugin]) {
          globalConfig[plugin] = {}
        }
        debugger
        globalConfig[plugin][key] = value
        config.all = globalConfig
        resultStatement = `${key} has been set to ${value} to ${plugin}'s config`
      } else {
        resultStatement = `${key} has been set to ${value} in the global config`
        config.set(key, value)
      }
      this.log(resultStatement)
    } catch (error) {
      this.error(error)
    }
  }
}

SetCommand.description = `Set a property in global config
...
Extra documentation goes here
`

SetCommand.flags = {
  value: flags.string({char: 'v', description: 'Specify the value'}),
  key: flags.string({char: 'k', description: 'Specify the key'}),
  plugin: flags.string({char: 'p', description: 'Specify the plugin for which the config is to be written'}),
}

module.exports = SetCommand
