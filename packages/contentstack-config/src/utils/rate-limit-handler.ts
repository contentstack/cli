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
      let index = 0;
      limitNamesConfig.forEach((limitName) => {
        const feature = features.find((f: { uid: string }) => f.uid === limitName);
        if (feature) {
          if (limitNames.includes(limitName)) {
            limitsToUpdate[limitName] = {
              value: feature.limit || rateLimit[config.org][limitName]?.value || rateLimit.default[limitName]?.value,
              utilize: utilizeValues[index] || defaultRalteLimitConfig[limitName]?.utilize,
            };
            index++;
          } else {
            limitsToUpdate[limitName] = {
              value: feature.limit,
              utilize: defaultRalteLimitConfig[limitName]?.utilize,
            };
          }
        }
      });

      rateLimit[config.org] = limitsToUpdate;
      configHandler.set('rateLimit', rateLimit);
      cliux.success(`Rate limit has been set successfully for org: ${config.org}`);
    } catch (error) {
      throw new Error(error);
    }
  }
}
