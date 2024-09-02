import { configHandler } from '@contentstack/cli-utilities';
import * as lodash from 'lodash';

const rateLimits = {
  rateLimit: {
    default: {
      getLimit: { value: 10, utilize: 50 },
      limit: { value: 10, utilize: 50 },
      bulkLimit: { value: 1, utilize: 50 },
    },
  },
};

const requiredLimitsArray = ['getLimit', 'limit', 'bulkLimit'];

let client: any = {};

// let config;

export class RateLimitHandler {
  setClient(managementSDKClient) {
    client = managementSDKClient;
  }
  async setRateLimit(config) {
    console.log('🚀 ~ RateLimitHandler ~ setRateLimit ~ config:', config);
    if (!rateLimits.rateLimit[config.org]) {
      rateLimits.rateLimit[config.org] = {};
    }

    let utilizeValue = config.utilize ? config.utilize : 50;

    let organizations = await client.organization(config.org).fetch();

    if (config['limitName']) {
      if (lodash.isEmpty(lodash.xor(config['limitName'], requiredLimitsArray))) {
        for (const limitList of Object.values(organizations?.plan?.features)) {
          if (requiredLimitsArray.includes((limitList as { uid: string })?.uid)) {
            rateLimits.rateLimit[config.org][(limitList as { uid: string })?.uid] = {
              value: (limitList as { limit: number }).limit,
              utilize: utilizeValue,
            }; // adding the required limit
          }
        }
      } else {
        const differenceLimit = requiredLimitsArray.filter((limit) => !config['limitName'].includes(limit));

        const commonLimit = requiredLimitsArray.filter((limit) => config['limitName'].includes(limit));

        for (const limitName of differenceLimit) {
          if (!rateLimits.rateLimit[config.org][limitName]) {
            if (limitName === 'bulkLimit') {
              rateLimits.rateLimit[config.org][limitName] = { value: 1, utilize: utilizeValue };
            } else {
              rateLimits.rateLimit[config.org][limitName] = { value: 10, utilize: utilizeValue };
            }
          }
        }

        for (const listName of commonLimit) {
          for (const limitList of Object.values(organizations?.plan?.features)) {
            rateLimits.rateLimit[config.org][listName] = {
              value: (limitList as { limit: number }).limit,
              utilize: utilizeValue,
            }; // adding the required limit
          }
        }
      }
    } else {
      rateLimits.rateLimit[config.org] = {
        getLimit: { value: 10, utilize: utilizeValue },
        limit: { value: 10, utilize: utilizeValue },
        bulkLimit: { value: 1, utilize: utilizeValue },
      };
    }

    configHandler.set('rateLimits', rateLimits);
  }
}

export { client };
