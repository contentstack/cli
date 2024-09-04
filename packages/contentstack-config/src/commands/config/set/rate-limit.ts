import { flags, isAuthenticated, FlagInput, managementSDKClient, cliux } from '@contentstack/cli-utilities';

import { RateLimitHandler } from '../../../utils/rate-limit-handler';
import { BaseCommand } from '../../../base-command';
import { askOrgID } from '../../../utils/interactive';

interface RateLimitConfig {
  org?: string;
  utilize?: number;
  limitName?: string[];
  default?: boolean;
  auth_token?: string;
}

export default class RateLimitSetCommand extends BaseCommand<typeof RateLimitSetCommand> {
  static description = 'Set rate-limit for CLI';

  static flags: FlagInput = {
    org: flags.string({
      description: 'Provide the organization UID',
    }),

    utilize: flags.string({
      description: 'Provide the utilization percentage',
      default: '50',
    }),

    'limit-name': flags.string({
      description: '[Optional] Provide the limit names separated by comma',
      multiple: true,
    }),

    default: flags.boolean({
      default: false,
      description: 'Reset to default rate limit',
    }),
  };

  static examples = [
    '$ csdx config:set:rate-limit --org <<org_uid>>',
    '$ csdx config:set:rate-limit --org <<org_uid>> --utilize 80',
    '$ csdx config:set:rate-limit --org <<org_uid>> --limit-name getLimit,limit',
    '$ csdx config:set:rate-limit --org <<org_uid>> --default',
  ];

  public async run(): Promise<void> {
    if (!isAuthenticated()) {
      const err = { errorMessage: 'You are not logged in. Please login with command $ csdx auth:login' };
      cliux.print(err.errorMessage, { color: 'red' });
    }

    const { flags } = await this.parse(RateLimitSetCommand);
    const config: RateLimitConfig = {};

    let { org, utilize, 'limit-name': limitName, default: isDefault } = flags;
    if (!org) {
      org = await askOrgID();
    }
    if (isDefault) {
      config.org = org;
      config.utilize = 50;
      config.limitName = ['getLimit', 'limit', 'bulkLimit'];
    } else {
      config.org = org;
      config.utilize = Number(utilize.replace('%', '')) || 50; // Handle percentage input
      config.limitName = ['getLimit', 'limit', 'bulkLimit'];
    }

    const limitHandler = new RateLimitHandler();
    const managementAPIClient = await managementSDKClient(config);
    limitHandler.setClient(managementAPIClient);

    try {
      await limitHandler.setRateLimit(config);
    } catch (error) {
      this.log('Unable to set the rate limits', error instanceof Error ? error.message : error);
    }
  }
}
