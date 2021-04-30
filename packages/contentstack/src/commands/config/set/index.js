const {Command, flags} = require('@oclif/command')
const Configstore = require('configstore')
const config = new Configstore('contentstack_cli')

class SetCommand extends Command {
  async run() {
    const {flags} = this.parse(SetCommand)
    const key = flags.key
    const value = flags.value
    try {
      config.set(key, value)
      this.log(`${key} has been set to ${value} in the global config`)
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
}

module.exports = SetCommand
