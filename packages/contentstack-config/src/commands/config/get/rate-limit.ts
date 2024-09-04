import { cliux, configHandler, messageHandler } from '@contentstack/cli-utilities';
import { Command } from '@contentstack/cli-command';
import { RateLimitConfig } from '../../../interfaces';

export default class RateLimitGetCommand extends Command {
  static description: string = messageHandler.parse('Get rate-limit of organizations');
  static examples = ['$ csdx config:get:rate-limit'];

  async run() {
    try {
      const rateLimit = configHandler.get('rateLimit') || {};
      const rateLimitData: RateLimitConfig = rateLimit || {};

      const tableData = Object.entries(rateLimitData).map(([org, limits]) => ({
        Org: org === 'default' ? 'default' : org,
        'Get Limit': limits.getLimit ? `${limits.getLimit.value}(${limits.getLimit.utilize}%)` : '0',
        Limit: limits.limit ? `${limits.limit.value}(${limits.limit.utilize}%)` : '0',
        'Bulk Limit': limits.bulkLimit ? `${limits.bulkLimit.value}(${limits.bulkLimit.utilize}%)` : '0',
        'Download Limit': limits.downloadLimit
          ? `${limits.downloadLimit.value}(${limits.downloadLimit.utilize}%)`
          : '0',
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
