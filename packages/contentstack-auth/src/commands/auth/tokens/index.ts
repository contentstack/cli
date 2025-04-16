import { Command } from '@contentstack/cli-command';
import { cliux, configHandler, formatError, CLITable, TableFlags, FlagInput } from '@contentstack/cli-utilities';
import { BaseCommand } from '../../../base-command';
export default class TokensListCommand extends BaseCommand<typeof TokensListCommand> {
  static aliases = ['tokens'];
  static examples = ['$ csdx auth:tokens'];
  static description = 'Lists all existing tokens added to the session';
  static flags: FlagInput = CLITable.getTableFlags([
    'columns',
    'sort',
    'filter',
    'csv',
    'no-truncate',
    'no-header',
    'output',
  ]); // use the cli table flags as it displays tokens in table

  async run(): Promise<any> {
    try {
      const managementTokens = configHandler.get('tokens');
      const tokens: Record<string, unknown>[] = [];
      if (managementTokens && Object.keys(managementTokens).length > 0) {
        Object.keys(managementTokens).forEach(function (item) {
          tokens.push({
            alias: item,
            token: managementTokens[item].token,
            apiKey: managementTokens[item].apiKey,
            environment: managementTokens[item].environment ? managementTokens[item].environment : '-',
            type: managementTokens[item].type,
          });
        });

        const { flags } = await this.parse(TokensListCommand);

        const headers = [
          {
            value: 'alias',
          },
          {
            value: 'token',
          },
          {
            value: 'apiKey',
          },
          {
            value: 'environment',
          },
          {
            value: 'type',
          },
        ];

        cliux.table(headers, tokens, flags as TableFlags);
      } else {
        cliux.print('CLI_AUTH_TOKENS_LIST_NO_TOKENS');
      }
    } catch (error) {
      let errorMessage = formatError(error) || 'Something went wrong while fetching tokens. Please try again.';
      this.logger.error('Token list error', errorMessage);
      cliux.print('CLI_AUTH_TOKENS_LIST_FAILED', { color: 'yellow' });
      cliux.print(errorMessage, { color: 'red' });
    }
  }
}
