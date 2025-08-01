const managementSDKClient = require('@contentstack/cli-utilities');
let config = {
  source_stack: process.env.STACK_API_KEY || 'asdf',
  management_token: process.env.MANAGEMENT_TOKEN || 'asdf',
}

const getStack = async (data = {}) => {
  const client = await managementSDKClient(config);
  return client.stack({
    source_stack: data.STACK_API_KEY || config.source_stack,
    management_token: data.MANAGEMENT_TOKEN || config.management_token,
  });
};

module.exports = { getStack };
