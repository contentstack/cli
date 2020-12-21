const {Command, flags} = require('@oclif/command')
const yeoman = require('yeoman-environment')

const env = yeoman.createEnv()
env.register(require.resolve('../../generators/extension.js'), `extensions:create`)

class CreateCommand extends Command {
  async run() {
    const {flags} = this.parse(CreateCommand)
    const path = flags.path
    const options = {
      path: path
    }
    // this.log(`create ${name} from ./src/commands/create.js`)

    await new Promise((resolve, reject) => {
    	env.run(`extensions:create`, options, (error, results) => {
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
  path: flags.string({char: 'p', description: 'name of the folder in which plugin will be generated'}),
}

module.exports = CreateCommand
