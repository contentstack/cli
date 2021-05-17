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
      if (plugin) {
        let pluginsConfig = config.get('plugins')
        if (!pluginsConfig) {
          config.set('plugins', {})
          pluginsConfig = {}
        }
        if (!pluginsConfig[plugin]) {
          pluginsConfig[plugin] = {}
        }
        if (key && value) {
          pluginsConfig[plugin][key] = value
        }
        config.set('plugins', pluginsConfig)
        resultStatement = `${key} has been set to ${value} to ${plugin}'s config`

        // let globalConfig = config.all
        // if (!globalConfig.plugins) {
        //   globalConfig.plugins = {}
        // }
        // if (!globalConfig.plugins[plugin]) {
        //   globalConfig.plugins[plugin] = {}
        // }
        // globalConfig.plugins[plugin][key] = value
        // if (flags.json) {
        //   try {
        //     let providedJson = require(flags.json)
        //     // eslint-disable-next-line node/no-unsupported-features/es-syntax
        //     globalConfig.plugins[plugin] = {...globalConfig.plugins[plugin], ...providedJson}
        //   } catch (error) {
        //     throw new Error('Either the provided file path for \'json\' flag isn\'t valid or the json data isn\'t valid')
        //   }
        // }
        // config.all = globalConfig
        // resultStatement = `${key} has been set to ${value} to ${plugin}'s config`
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
'csdx config:set' can be used to add a property to the global configuration file, or add a property to a plugin configuration
`

SetCommand.flags = {
  value: flags.string({char: 'v', description: 'Specify the value'}),
  key: flags.string({char: 'k', description: 'Specify the key'}),
  plugin: flags.string({char: 'p', description: 'Specify the plugin for which the config is to be written'}),
  // json: flags.string({char: 'j', description: 'Provide a json file to set '})
}

SetCommand.examples = [
  'csdx config:set --key someKey --value someValue',
  'csdx config:set --key someKey --value {\'anotherKey\': \'someValue\'}',
  'csdx config:set --key someKey --value {\'anotherKey\': \'someValue\'} --plugin somePlugin',
  // 'csdx config:set --plugin somePlugin --json <path to a json file>',
]

module.exports = SetCommand
