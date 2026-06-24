import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command';
import { CLITable, FlagInput, configHandler, cliux, log, handleAndLogError, TableFlags } from '@contentstack/cli-utilities';

export default class TokensCommand extends BaseCommand<typeof TokensCommand> {
  static description = 'Manage authentication tokens for API access';

  static examples = [
    '$ csdx tokens:list',
    '$ csdx tokens:add --alias mytoken',
    '$ csdx tokens:remove --alias mytoken',
  ];

  static flags: FlagInput = CLITable.getTableFlags([
    'columns',
    'sort',
    'filter',
    'csv',
    'no-truncate',
    'no-header',
    'output',
  ]);

  async run(): Promise<any> {
    const { flags } = await this.parse(TokensCommand);

    log.debug('TokensCommand run method started.', this.contextDetails);
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
        this.log('No tokens found. Add one using "csdx tokens:add"');
      }

      log.debug('Token list command completed successfully.', this.contextDetails);
    } catch (error) {
      log.debug('Token list command failed.', {...this.contextDetails, error });
      this.log('Failed to list tokens');
      handleAndLogError(error, { ...this.contextDetails });
    }
  }
}
