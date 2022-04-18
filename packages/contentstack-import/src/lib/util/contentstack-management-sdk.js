const contentstacksdk = require('@contentstack/management');

exports.Client = function (config) {
  const option = {
    host: config.host,
    authtoken: config.auth_token,
    management_token: config.management_token,
    api_key: config.target_stack,
    maxContentLength: 100000000,
    maxBodyLength: 1000000000,
    logHandler: (_level, _data) => {
      // empty handler
    },
    retryCondition: (error) => {
      // no async function should be used here
      return (error.response && (error.response.status === 429 || error.response.status === 408))
    },
    retryDelayOptions: {
      base: 1000,
    },
  };
  if (typeof config.branchName === 'string') {
    option.headers = {
      branch: config.branchName,
    };
  }
  return contentstacksdk.client(option);
};
