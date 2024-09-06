import { cliux, configHandler } from '@contentstack/cli-utilities';

const rateLimit = {
  default: {
    getLimit: { value: 10, utilize: 50 },
    limit: { value: 10, utilize: 50 },
    bulkLimit: { value: 1, utilize: 50 },
  },
};

const requiredLimitsArray = ['getLimit', 'limit', 'bulkLimit'];

let client: any = {};

export class RateLimitHandler {
  setClient(managementSDKClient) {
    client = managementSDKClient;
  }

  async setRateLimit(config) {
    if (!rateLimit[config.org]) {
      rateLimit[config.org] = { ...rateLimit.default };
    }

    let limitNames = Array.isArray(config['limit-name'])
      ? config['limit-name'][0].split(',').map((name) => name.trim())
      : [];

    const organizations = await client.organization(config.org).fetch({ include_plan: true });
    const features = organizations.plan?.features || [];

    for (const limitName of limitNames) {
      if (requiredLimitsArray.includes(limitName)) {
        const feature = features.find((f: { uid: string }) => f.uid === limitName);
        if (feature) {
          rateLimit[config.org][limitName] = {
            value: feature.limit,
            utilize: config.utilize,
          };
        }
      }
    }

    for (const limitName of requiredLimitsArray) {
      if (!rateLimit[config.org][limitName]) {
        rateLimit[config.org][limitName] = {
          value: limitName === 'bulkLimit' ? 1 : 10,
          utilize: config.utilize,
        };
      }
    }

    configHandler.set('rateLimit', rateLimit);
    console.log("🚀 ~ RateLimitHandler ~ setRateLimit ~ rateLimit:", rateLimit)
    cliux.print(`Rate limit has been set successfully`, { color: 'green' });
  }
}

export { client };
