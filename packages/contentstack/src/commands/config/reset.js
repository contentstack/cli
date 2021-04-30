const {Command, flags} = require('@oclif/command')

class ResetCommand extends Command {
  async run() {
    const {flags} = this.parse(ResetCommand)
    const name = flags.name || 'world'
    this.log(`hello ${name} from /home/abhinav/Documents/contentstack/cli/packages/contentstack/src/commands/reset.js`)
  }
}

ResetCommand.description = `Describe the command here
...
Extra documentation goes here
`

ResetCommand.flags = {
  name: flags.string({char: 'n', description: 'name to print'}),
}

module.exports = ResetCommand
