import { flags, isAuthenticated, FlagInput, managementSDKClient, cliux } from '@contentstack/cli-utilities';
import { RateLimitHandler } from '../../../utils/rate-limit-handler';
import { BaseCommand } from '../../../base-command';
import { askOrgID } from '../../../utils/interactive';
import { SetRateLimitConfig } from '../../../interfaces';
import { limitNamesConfig } from '../../../utils/common-utilities';


export default class RateLimitSetCommand extends BaseCommand<typeof RateLimitSetCommand> {
  static description = 'Set rate-limit for CLI';

  static flags: FlagInput = {
    org: flags.string({
      description: 'Provide the organization UID',
    }),

    utilize: flags.string({
      description: 'Provide the utilization percentage for rate limit',
      default: '50%',
    }),

    'limit-name': flags.string({
      description: '[Optional] Provide the limit names separated by comma (,) []',
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
    let { org, utilize, 'limit-name': limitName } = flags;
    const config: SetRateLimitConfig = { org: '', limitName: limitNamesConfig};

    if (!org) {
      org = await askOrgID();
    }
    config.org = org;

    if (limitName) {
      config['limit-name'] = limitName;
    }
    if (utilize) {
      config.utilize = Number(utilize.replace('%', ''));
    }

    const limitHandler = new RateLimitHandler();
    const managementAPIClient = await managementSDKClient(config);
    limitHandler.setClient(managementAPIClient);

    try {
      await limitHandler.setRateLimit(config);
    } catch (error) {
      cliux.error(`Error : Something went wrong while setting rate limit for org: ${org}`, error);
    }
  }
}
