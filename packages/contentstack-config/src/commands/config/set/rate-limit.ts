import {
  flags as _flags,
  isAuthenticated,
  FlagInput,
  ArgInput,
  args,
  managementSDKClient,
} from '@contentstack/cli-utilities';

import { RateLimitHandler } from '../../../utils/rateLimit-handler';
import { BaseCommand } from '../../../base-command';
import { askLimitName, askOrgID } from '../../../utils/interactive';

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
    org: _flags.string({
      description: 'To add organisation uid',
    }),

    utilize: _flags.string({
      description: 'To set the utilization percentage',
      default: '50',
    }),

    'limit-name': _flags.string({
      description: 'To set the limit for getLimit, limit, bulkLimit',
      multiple: true,
    }),

    default: _flags.boolean({
      default: false,
      description: 'To reset to default rate limits',
    }),
  };

  static examples = [
    '$ csdx config:set:rate-limit --org <<org_uid>>',
    '$ csdx config:set:rate-limit --org <<org_uid>> --utilize 80',
    '$ csdx config:set:rate-limit --org <<org_uid>> --limit-name getLimit,limit',
    '$ csdx config:set:rate-limit --org <<org_uid>> --default',
  ];

  static args: ArgInput = {
    ratelimit: args.string({ description: 'Rate limit for the Organisation' }),
  };

  public async run(): Promise<void> {
    if (!isAuthenticated()) {
      console.log('Please login to execute this command, csdx auth:login');
      this.exit(1);
    }

    const { args, flags } = await this.parse(RateLimitSetCommand);
    const config: RateLimitConfig = {};

    let { org, utilize, 'limit-name': limitName, default: isDefault } = flags;
    if (isDefault) {
      if (!org) {
        org = await askOrgID(); // Prompt for organization ID if not provided
      }
      // Reset to default
      config.org = org;
      config.utilize = 50;
      config.limitName = ['getLimit', 'limit', 'bulkLimit'];
    } else {
      if (!org) {
        org = await askOrgID(); // Prompt for organization ID if not provided
      }
      if (!limitName || limitName.length === 0) {
        limitName = await askLimitName(); // Prompt for limit names if not provided
      }
      // Apply provided values or set defaults
      config.org = org;
      config.utilize = Number(utilize.replace('%', '')) || 50; // Handle percentage input
      config.limitName = limitName || ['getLimit', 'limit', 'bulkLimit'];
    }

    const limitHandler = new RateLimitHandler();
    const managementAPIClient = await managementSDKClient(config);
    limitHandler.setClient(managementAPIClient);

    try {
      await limitHandler.setRateLimit(config);
    } catch (error) {
      console.error('An error occurred while setting the rate limit:', error);
      this.exit(1);
    }
  }
}
