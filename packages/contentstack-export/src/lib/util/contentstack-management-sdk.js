const contentstacksdk = require('@contentstack/management');
const https = require('https');

const { addlogs } = require('./log');

exports.Client = function (config) {
  const option = {
    host: config.host,
    authtoken: config.auth_token,
    api_key: config.source_stack,
    maxRequests: 10,
    retryOnError: true,
    retryLimit: 5,
    timeout: 1200000,
    httpsAgent: new https.Agent({
      maxSockets: 100,
      maxFreeSockets: 10,
      keepAlive: true,
      timeout: 60000, // active socket keepalive for 60 seconds
      freeSocketTimeout: 30000, // free socket keepalive for 30 seconds
    }),
    retryDelay: Math.floor(Math.random() * (5000 - 3000 + 1) + 3000),
    retryDelayOptions: {
      base: 1500,
    },
    logHandler: (level, data) => {},
    retryCondition: (error) => {
      if (error.response.status === 408) {
        addlogs({ data: error.response }, 'Timeout error', 'error');
        return true;
      }
      if (error.response.status === 429) {
        addlogs({ data: error.response }, 'Rate limit excedded', 'error');
        return true;
      }
      return false;
    },
  };

  if (typeof config.branchName === 'string') {
    option.headers = {
      branch: config.branchName,
    };
  }

  return contentstacksdk.client(option);
};
