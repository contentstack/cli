const {Command, flags} = require('@oclif/command')
const yeoman = require('yeoman-environment')

const env = yeoman.createEnv()
env.register(require.resolve('../../generators/plugin.js'), `plugins:create`)

class CreateCommand extends Command {
  async run() {
    const {flags} = this.parse(CreateCommand)

    await new Promise((resolve, reject) => {
    	env.run(`plugins:create`, {}, (error, results) => {
    		if (error) reject(error)
    		else resolve(results)
    	})
    })
  }
}

CreateCommand.description = `Generate plugin starter code
`

CreateCommand.flags = {
}

module.exports = CreateCommand
