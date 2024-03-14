const { managementSDKClient, isAuthenticated } = require('@contentstack/cli-utilities');
const { Command } = require('@contentstack/cli-command');
const command = new Command();

async function getStack(data) {
  const options = {
    host: data.host,
    branchName: data.branch,
  };
  const stackOptions = {};
  if (data.alias) {
    const tokenDetails = command.getToken(data.alias);
    options.management_token = tokenDetails.token;
    stackOptions.management_token = tokenDetails.token;
    stackOptions.api_key = tokenDetails.apiKey;
  } else if (data.stackApiKey) {
    if (!isAuthenticated()) {
      throw new Error('Please login to proceed further. Or use `--alias` instead of `--stack-api-key` to proceed without logging in.')
    }
    stackOptions.api_key = data.stackApiKey;
  }
  const managementClient = await managementSDKClient(options);
  const stack = managementClient.stack(stackOptions);
  stack.alias = data.alias;
  stack.host = data.host;
  return stack;
}

module.exports = {
  getStack,
};
