const {Command, flags} = require('@oclif/command')
const yeoman = require('yeoman-environment')

const env = yeoman.createEnv()
env.register(require.resolve('../../generators/plugin.js'), `plugins:create`)

class CreateCommand extends Command {
  async run() {
    const {flags} = this.parse(CreateCommand)
    const name = flags.name || 'world'
    // this.log(`create ${name} from ./src/commands/create.js`)

    await new Promise((resolve, reject) => {
    	env.run(`plugins:create`, {}, (error, results) => {
    		if (error) reject(error)
    		else resolve(results)
    	})
    })
  }
}

CreateCommand.description = `Describe the command here
...
Extra documentation goes here
`

CreateCommand.flags = {
  name: flags.string({char: 'n', description: 'name to print'}),
}

module.exports = CreateCommand
