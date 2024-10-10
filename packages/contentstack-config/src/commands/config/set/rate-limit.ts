import { flags, isAuthenticated, FlagInput, managementSDKClient, cliux } from '@contentstack/cli-utilities';
import { RateLimitHandler } from '../../../utils/rate-limit-handler';
import { BaseCommand } from '../../../base-command';
import { askOrgID } from '../../../utils/interactive';
import { SetRateLimitConfig } from '../../../interfaces';
import { limitNamesConfig } from '../../../utils/common-utilities';

export default class SetRateLimitCommand extends BaseCommand<typeof SetRateLimitCommand> {
  static description = 'Set rate-limit for CLI';

  static flags: FlagInput = {
    org: flags.string({
      description: 'Provide the organization UID',
    }),

    utilize: flags.string({
      description: 'Provide the utilization percentages for rate limit, separated by commas',
      default: '50',
    }),

    'limit-name': flags.string({
      description: "[Optional] Provide the limit names separated by commas ['limit', 'getLimit', 'bulkLimit']",
      multiple: true,
    }),

    default: flags.boolean({
      default: false,
      description: 'Reset to default rate limit',
    }),
  };

  static examples = [
    '$ csdx config:set:rate-limit --org <<org_uid>>',
    '$ csdx config:set:rate-limit --org <<org_uid>> --utilize 70,80 --limit-name getLimit,limit',
    '$ csdx config:set:rate-limit --org <<org_uid>> --default',
  ];

  public async run(): Promise<void> {
    if (!isAuthenticated()) {
      const err = { errorMessage: 'You are not logged in. Please login with command $ csdx auth:login' };
      cliux.print(err.errorMessage, { color: 'red' });
      this.exit(1);
    }

    const { flags } = await this.parse(SetRateLimitCommand);
    let { org, utilize, 'limit-name': limitName } = flags;
    const config: SetRateLimitConfig = { org: '', limitName: limitNamesConfig, host: this.cmaHost };

    if (!org) {
      org = await askOrgID();
    }
    config.org = org;
    config.default = flags.default;
    if (utilize) {
      const utilizeValues = utilize?.split(',')?.map((u: string) => Number(u.trim()));
      if (utilizeValues.some((u: number) => isNaN(u) || u < 0 || u > 100)) {
        cliux.error('Utilize percentages must be numbers between 0 and 100.');
        return;
      }
      if (limitName?.length > 0 && limitName[0]?.split(',')?.length !== utilizeValues.length) {
        cliux.error('The number of utilization percentages must match the number of limit names provided.');
        return;
      } else {
        config.utilize = utilize.split(',').map((v: string) => v.trim());
      }
    }

    if (limitName) {
      const invalidLimitNames = limitName[0].split(',').map((name: string) => name.trim());

      if (invalidLimitNames.some((name: string) => !limitNamesConfig.includes(name))) {
        cliux.error(`Invalid limit names provided: ${invalidLimitNames.join(', ')}`);
        return;
      } else {
        config['limit-name'] = limitName[0].split(',').map((n) => n.trim());
      }
    }

    const limitHandler = new RateLimitHandler();
    const managementAPIClient = await managementSDKClient(config);
    limitHandler.setClient(managementAPIClient);
    try {
      await limitHandler.setRateLimit(config);
    } catch (error) {
      cliux.error(`Error: Something went wrong while setting rate limit for org: ${org}`);
      cliux.error(error);
    }
  }
}
