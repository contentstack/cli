import { configHandler } from '@contentstack/cli-utilities';
import * as lodash from 'lodash';

const rateLimit = {
    default: {
      getLimit: { value: 10, utilize: 50 },
      limit: { value: 10, utilize: 50 },
      bulkLimit: { value: 1, utilize: 50 },
    },
  }

const requiredLimitsArray = ['getLimit', 'limit', 'bulkLimit'];

let client: any = {};

// let config;

export class RateLimitHandler {
  setClient(managementSDKClient) {
    client = managementSDKClient;
  }

  async setRateLimit(config) {

    if (!rateLimit[config.org]) {
      rateLimit[config.org] = {};
    }

    let limitNames = Array.isArray(config['limit-name'])
      ? config['limit-name'][0].split(',').map(name => name.trim())
      : [];

    let utilizeValue = config.utilize ? config.utilize : 50;

    let organizations = await client.organization(config.org).fetch({ include_plan: true });

    let features = organizations.plan?.features;

    if (limitNames.length) {
      if (lodash.isEmpty(lodash.xor(limitNames, requiredLimitsArray))) {
        for (const limitList of Object.values(features)) {
          if (requiredLimitsArray.includes((limitList as { uid: string })?.uid)) {
            rateLimit[config.org][(limitList as { uid: string })?.uid] = {
              value: (limitList as { limit: number }).limit,
              utilize: utilizeValue,
            };
          }
        }
      } else {
        const differenceLimit = requiredLimitsArray.filter((limit) => !limitNames.includes(limit));
        const commonLimit = requiredLimitsArray.filter((limit) => limitNames.includes(limit));

        for (const limitName of differenceLimit) {
          if (!rateLimit[config.org][limitName]) {
            rateLimit[config.org][limitName] = {
              value: limitName === 'bulkLimit' ? 1 : 10,
              utilize: utilizeValue,
            };
          }
        }

        for (const listName of commonLimit) {
          for (const limitList of Object.values(features)) {
            rateLimit[config.org][listName] = {
              value: (limitList as { limit: number }).limit,
              utilize: utilizeValue,
            };
          }
        }
      }
    } else {
      rateLimit[config.org] = {
        getLimit: { value: 10, utilize: utilizeValue },
        limit: { value: 10, utilize: utilizeValue },
        bulkLimit: { value: 1, utilize: utilizeValue },
      };
    }

    configHandler.set('rateLimit', rateLimit);
  }
}

export { client };
