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
      description: 'Provide the utilization percentages for rate limit, separated by commas',
      default: '50',
    }),

    'limit-name': flags.string({
      description: '[Optional] Provide the limit names separated by commas [\'limit\', \'getLimit\', \'bulkLimit\']',
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
    }

    const { flags } = await this.parse(RateLimitSetCommand);
    let { org, utilize, 'limit-name': limitName } = flags;

    if (utilize) {
      const utilizeValues = utilize.split(',').map((utilize) => Number(utilize.trim()));
      if (utilizeValues.some((utilize) => isNaN(utilize) || utilize < 0 || utilize > 100)) {
        cliux.error('Utilize percentages must be numbers between 0 and 100.');
        return;
      }

      if (limitName && limitName.length > 0 && limitName[0].split(',').length !== utilizeValues.length) {
        cliux.error('The number of utilization percentages must match the number of limit names provided.');
        return;
      }
    }

    if (limitName) {
      const invalidLimitNames = limitName
        .flatMap((name) => name.split(','))
        .map((name) => name.trim())
        .filter((name) => !limitNamesConfig.includes(name));

      if (invalidLimitNames.length > 0) {
        cliux.error(`Invalid limit names provided: ${invalidLimitNames.join(', ')}`);
        return;
      }
    }

    const config: SetRateLimitConfig = { org: '', limitName: limitNamesConfig };

    if (!org) {
      org = await askOrgID();
    }
    config.org = org;

    if (flags.default) {
      config.default = true;
    }
    if (limitName) {
      config['limit-name'] = limitName.flatMap((name) => name.split(',').map((n) => n.trim()));
    }
    if (utilize) {
      config.utilize = utilize.split(',').map((v) => v.trim());
    }

    const limitHandler = new RateLimitHandler();
    const managementAPIClient = await managementSDKClient(config);
    limitHandler.setClient(managementAPIClient);

    try {
      await limitHandler.setRateLimit(config);
    } catch (error) {
      cliux.error(`Error: Something went wrong while setting rate limit for org: ${org}`, error);
    }
  }
}
