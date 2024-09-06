import { cliux, configHandler } from '@contentstack/cli-utilities';
import { limitNamesConfig } from '../utils/common-utilities';

let client: any;

export class RateLimitHandler {
  setClient(managementSDKClient) {
    client = managementSDKClient;
  }

  async setRateLimit(config) {
    const rateLimit = configHandler.get('rateLimit');

    if (!rateLimit[config.org]) {
      rateLimit[config.org] = { ...rateLimit.default };
    }

    let flagLimitNames = Array.isArray(config['limit-name'])
      ? config['limit-name'][0].split(',').map((name) => name.trim())
      : [];

    try {
      const organizations = await client.organization(config.org).fetch({ include_plan: true });
      const features = organizations.plan?.features || [];

      const limitsToUpdate = { ...rateLimit.default };
      for (const limitName of limitNamesConfig) {
        const feature = features.find((f: { uid: string }) => f.uid === limitName);
        if (feature) {
          limitsToUpdate[limitName] = {
            value: feature.limit,
            utilize: config.utilize,
          };
        }
      }

      for (const limitName of flagLimitNames) {
        if (limitNamesConfig.includes(limitName)) {
          limitsToUpdate[limitName] = {
            ...limitsToUpdate[limitName],
            utilize: config.utilize,
          };
        }
      }
      rateLimit[config.org] = limitsToUpdate;
      configHandler.set('rateLimit', rateLimit);
      cliux.success(`Rate limit has been set successfully for org: ${config.org}`);
    } catch (error) {
      cliux.error(`Error : Unable to set the rate limit`, error?.errorMessage || error?.message || error);
    }
  }
}
