const { managementSDKClient } = require('@contentstack/cli-utilities');
const { Command } = require('@contentstack/cli-command');
const command = new Command();

async function getStack(data) {
  const tokenDetails = command.getToken(data.alias);
  const managementClient = await managementSDKClient({ host: data.host, branchName: data.branch });
  const stack = managementClient.stack({ api_key: tokenDetails.apiKey, management_token: tokenDetails.token });
  stack.alias = data.alias;
  stack.host = data.host;
  return stack;
}

module.exports = {
  getStack,
};
