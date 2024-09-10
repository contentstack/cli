import { cliux, configHandler } from '@contentstack/cli-utilities';
import { limitNamesConfig, defaultRalteLimitConfig } from '../utils/common-utilities';

let client: any;

export class RateLimitHandler {
  setClient(managementSDKClient) {
    client = managementSDKClient;
  }

  async setRateLimit(config) {
    const rateLimit = configHandler.get('rateLimit');
    rateLimit.default = { ...defaultRalteLimitConfig };

    if (config.default) {
      rateLimit[config.org] = { ...defaultRalteLimitConfig };
      configHandler.set('rateLimit', rateLimit);
      cliux.success(`Rate limit reset to default for org: ${config.org}`);
      return;
    }

    if (!rateLimit[config.org]) {
      rateLimit[config.org] = { ...rateLimit.default };
    }
    const limitNames = Array.isArray(config['limit-name']) ? config['limit-name'] : [];
    const utilizeValues = Array.isArray(config.utilize) ? config.utilize.map((v) => Number(v)) : [];

    try {
      const organizations = await client.organization(config.org).fetch({ include_plan: true });
      const features = organizations.plan?.features || [];

      const limitsToUpdate = { ...rateLimit[config.org] };

      limitNames.forEach((limitName, index) => {
        if (limitNamesConfig.includes(limitName)) {
          const feature = features.find((f: { uid: string }) => f.uid === limitName);
          if (feature) {
            limitsToUpdate[limitName] = {
              value: rateLimit[config.org][limitName]?.value || rateLimit.default[limitName]?.value,
              utilize: utilizeValues[index] || Number(config.utilize[0]),
            };
          }
        }
      });

      rateLimit[config.org] = limitsToUpdate;
      configHandler.set('rateLimit', rateLimit);
    } catch (error) {
      cliux.error(`Error: Unable to set the rate limit`, error?.errorMessage || error?.message || error);
    }
  }
}
