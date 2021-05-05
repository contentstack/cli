const Configstore = require('configstore')
const config = new Configstore('contentstack_cli')

const {Command} = require('@contentstack/cli-command')
const command = new Command()

module.exports = async function (data) {
  try {
    if (!config.has('tokens')) {
      this.error('No tokens have been added. Please add a token using csdx auth:tokens:add -a [ALIAS]', {exit: 2})
    }
    if (!command.getToken(data.alias)) {
      this.error(`The configured management token alias ${data.alias} has not been added yet. Add it using 'csdx auth:tokens:add -a ${data.alias}'`, {exit: 2})
    }
  } catch (error) {
    let message = error.message.split(' ')
    message.unshift(error.value)
    this.error(message.join(' '))
  }
}
