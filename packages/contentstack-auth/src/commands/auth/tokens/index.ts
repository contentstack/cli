import {
  cliux,
  configHandler,
  CLITable,
  TableFlags,
  FlagInput,
  handleAndLogError,
  log,
} from '@contentstack/cli-utilities';
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
    log.debug('TokensListCommand run method started.', this.contextDetails);
    this.contextDetails.module = 'tokens-list';
    
    try {
      log.debug('Retrieving tokens from configuration.', this.contextDetails);
      const managementTokens = configHandler.get('tokens');
      log.debug('Tokens retrieved from configuration.', {...this.contextDetails, tokenCount: managementTokens ? Object.keys(managementTokens).length : 0 });
      
      const tokens: Record<string, unknown>[] = [];
      if (managementTokens && Object.keys(managementTokens).length > 0) {
        log.debug('Processing tokens for display.', this.contextDetails);
        Object.keys(managementTokens).forEach(function (item) {
          tokens.push({
            alias: item,
            token: managementTokens[item].token,
            apiKey: managementTokens[item].apiKey,
            environment: managementTokens[item].environment ? managementTokens[item].environment : '-',
            type: managementTokens[item].type,
          });
          log.debug(`Token processed: ${item}`, {tokenType: managementTokens[item].type });
        });

        const { flags } = await this.parse(TokensListCommand);
        log.debug('Token list flags parsed.', {...this.contextDetails, flags });

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

        log.debug('Displaying token table.', {...this.contextDetails, tokenCount: tokens.length });
        cliux.table(headers, tokens, flags as TableFlags);
        log.debug('Token table displayed successfully.', this.contextDetails);
      } else {
        log.debug('No tokens found in configuration.', this.contextDetails);
        cliux.print('CLI_AUTH_TOKENS_LIST_NO_TOKENS');
      }
      
      log.debug('Token list command completed successfully.', this.contextDetails);
    } catch (error) {
      log.debug('Token list command failed.', {...this.contextDetails, error });
      cliux.print('CLI_AUTH_TOKENS_LIST_FAILED', { color: 'yellow' });
      handleAndLogError(error, { ...this.contextDetails });
    }
  }
}
