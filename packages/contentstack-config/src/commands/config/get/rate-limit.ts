import { cliux, configHandler } from '@contentstack/cli-utilities';
import { Command } from '@contentstack/cli-command';
import { RateLimitConfig } from '../../../interfaces';

export default class RateLimitGetCommand extends Command {
  static description: string = 'Get rate-limit of organizations';
  static examples = ['$ csdx config:get:rate-limit'];

  async run() {
    try {
      const rateLimit = configHandler.get('rateLimit') || {};
      const formatLimit = (limit) => (limit ? `${limit.value}(${limit.utilize}%)` : '0');
      const tableData = Object.entries(rateLimit).map(([org, limits]: [string, RateLimitConfig]) => ({
        Org: org === 'default' ? 'default' : org,
        'Get Limit': formatLimit(limits.getLimit),
        Limit: formatLimit(limits.limit),
        'Bulk Limit': formatLimit(limits.bulkLimit),
      }));

      const columns = {
        Org: {
          minWidth: 10,
        },
        'Get Limit': {
          minWidth: 20,
        },
        Limit: {
          minWidth: 20,
        },
        'Bulk Limit': {
          minWidth: 20,
        },
      };

      cliux.table(tableData, columns, { printLine: cliux.print });
    } catch (error) {
      this.log('Unable to retrieve the rate limits configuration', error instanceof Error ? error.message : error);
    }
  }
}
