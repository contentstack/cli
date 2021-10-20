const contentstackSdk = require('@contentstack/management')
const {Command} = require('@contentstack/cli-command')
const command = new Command()

const Configstore = require('configstore')
const config = new Configstore('contentstack_cli')
const { formatHostname } = require('../utils')

function getStack(data) {
	const tokenDetails = command.getToken(data.alias)
	const client = contentstackSdk.client({
		host: formatHostname(data.host),
		logHandler: (level, data) => {}
	})
	const stack = client.stack({api_key: tokenDetails.apiKey, management_token: tokenDetails.token})
	stack.alias = data.alias
	stack.host = data.host
	return stack
}

module.exports = {
  getStack
}
