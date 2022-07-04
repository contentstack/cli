const {Command} = require('@oclif/command')
const yeoman = require('yeoman-environment')

const env = yeoman.createEnv()
env.register(require.resolve('../../generators/plugin.js'), 'plugins:create')

class CreateCommand extends Command {
  async run() {
    await new Promise((resolve, reject) => {
      env.run('plugins:create', {}).then((results) => {
        resolve(results)
      })
      .catch((error) => {
        reject(error)
      })
    })
  }
}

CreateCommand.description = `generate plugin starter code
`

module.exports = CreateCommand
