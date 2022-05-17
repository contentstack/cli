const contentstackSdk = require('@contentstack/management');
const { Command } = require('@contentstack/cli-command');
const command = new Command();

const { formatHostname } = require('../util');

function getStack(data) {
  const tokenDetails = command.getToken(data.alias);
  const client = contentstackSdk.client({
    headers: {
      branch: data.branch,
    },
    host: formatHostname(data.host),
    // eslint-disable-next-line no-unused-vars
    logHandler: (level) => {},
  });
  const stack = client.stack({ api_key: tokenDetails.apiKey, management_token: tokenDetails.token });
  stack.alias = data.alias;
  stack.host = data.host;
  return stack;
}

module.exports = {
  getStack,
};
