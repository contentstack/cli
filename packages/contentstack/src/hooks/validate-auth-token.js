const Configstore = require('configstore')
const config = new Configstore('contentstack_cli')

module.exports = async function () {
  if (!config.has('authtoken'))
    this.error('Authtoken is not configured. Please configure the authtoken using \'csdx auth:login\'', {exit: 2})
}
