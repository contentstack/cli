import { cliux, configHandler } from '@contentstack/cli-utilities';

const requiredLimitsArray = ['getLimit', 'limit', 'bulkLimit'];
const rateLimit = configHandler.get('rateLimit');

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

    try {
      const organizations = await client.organization(config.org).fetch({ include_plan: true });
      const features = organizations.plan?.features || [];

      const limitsToUpdate = { ...rateLimit.default };

      for (const limitName of requiredLimitsArray) {
        const feature = features.find((f: { uid: string }) => f.uid === limitName);
        if (feature) {
          limitsToUpdate[limitName] = {
            value: feature.limit,
            utilize: config.utilize,
          };
        }
      }

      for (const limitName of limitNames) {
        if (requiredLimitsArray.includes(limitName)) {
          limitsToUpdate[limitName] = {
            ...limitsToUpdate[limitName],
            utilize: config.utilize,
          };
        }
      }
      rateLimit[config.org] = limitsToUpdate;
      configHandler.set('rateLimit', rateLimit);
      cliux.success('Rate limit has been set successfully');
    } catch (error) {
      cliux.error(`Error: Couldn't set the rate limit. ${error.message}`);
    }
  }
}

export { client };
