import { cliux, configHandler, formatError } from '@contentstack/cli-utilities';
import { limitNamesConfig, defaultRalteLimitConfig } from '../utils/common-utilities';
import { Limit } from '../interfaces';

let client: any;

export class RateLimitHandler {
  setClient(managementSDKClient) {
    client = managementSDKClient;
  }

  async setRateLimit(config) {
    const rateLimit = configHandler.get('rateLimit');
    rateLimit.default = { ...defaultRalteLimitConfig };

    if (config.default) {
      rateLimit[config.org] = { ...rateLimit.default };
      configHandler.set('rateLimit', rateLimit);
      cliux.success(`Rate limit reset to default for org: ${config.org}`);
      return;
    }

    if (!rateLimit[config.org]) {
      rateLimit[config.org] = { ...rateLimit.default };
    }
    const limitNames = Array.isArray(config['limit-name']) ? config['limit-name'] : [];
    const utilizeValues = Array.isArray(config.utilize) ? config.utilize.map((v) => Number(v)) : [];
    const unavailableLimits = [];

    try {
      const organizations = await client.organization(config.org).fetch({ include_plan: true });
      const features = organizations.plan?.features || [];

      const limitsToUpdate: { [key: string]: Limit } = { ...rateLimit[config.org] };
      const utilizationMap = {};
      limitNames.forEach((name, index) => {
        if (utilizeValues[index] !== undefined) {
          utilizationMap[name] = utilizeValues[index];
        }
      });

      limitNamesConfig.forEach((limitName) => {
        const feature = features.find((f: { uid: string }) => f.uid === limitName);
        if (feature) {
          limitsToUpdate[limitName] = {
            value: feature.limit || rateLimit[config.org][limitName]?.value || rateLimit.default[limitName]?.value,
            utilize: utilizationMap[limitName] || defaultRalteLimitConfig[limitName]?.utilize,
          };
        } else {
          unavailableLimits.push(limitName);
        }
      });

      if (unavailableLimits.length > 0) {
        cliux.print(`You have not subscribed to these limits: ${unavailableLimits.join(', ')}`, {
          color: 'yellow',
        });
      }
      rateLimit[config.org] = limitsToUpdate;
      configHandler.set('rateLimit', rateLimit);
      cliux.success(`Rate limit has been set successfully for org: ${config.org}`);

      Object.entries(limitsToUpdate).forEach(([limit, { value, utilize }]) => {
        if (!unavailableLimits.includes(limit)) {
          cliux.success(`${limit}: ${value}(${utilize}%)`);
        }
      });
    } catch (error) {
      throw new Error(error);
    }
  }
}
