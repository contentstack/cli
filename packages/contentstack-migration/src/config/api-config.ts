/* eslint-disable camelcase */
const { CONTENTSTACK_API_KEY, CONTENTSTACK_AUTHTOKEN } = process.env;
const { version } = require('../../package.json');

export default {
  hostname: 'api.contentstack.io',
  version: '/v3',
  method: 'GET', // Default Http method
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': null,
    'X-User-Agent': `@contentstack-migration/v${version}`,
    authtoken: CONTENTSTACK_AUTHTOKEN,
    api_key: CONTENTSTACK_API_KEY,
    // management_token: CONTENTSTACK_MANAGEMENT_TOKEN
  },
};
