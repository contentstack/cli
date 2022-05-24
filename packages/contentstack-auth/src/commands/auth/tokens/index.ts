import { Command } from '@contentstack/cli-command';
import { logger, cliux, ux, configHandler } from '@contentstack/cli-utilities';

export default class TokensListCommand extends Command {
  private readonly parse: Function;
  static run;
  static description = 'Lists all existing tokens added to the session';
  static aliases = ['tokens'];
  static examples = ['$ csdx auth:tokens'];
  static flags = ux.table.flags(); // use the cli table flags as it displays tokens in table

  async run(): Promise<any> {
    try {
      const managementTokens = configHandler.get('tokens');
      const tokenOptions: Array<object> = [];
      if (managementTokens && Object.keys(managementTokens).length > 0) {
        Object.keys(managementTokens).forEach(function (item) {
          tokenOptions.push({
            alias: item,
            token: managementTokens[item].token,
            apiKey: managementTokens[item].apiKey,
            environment: managementTokens[item].environment ? managementTokens[item].environment : '-',
            type: managementTokens[item].type,
          });
        });
        const { flags } = this.parse(TokensListCommand);

        cliux.table(
          tokenOptions,
          {
            alias: {
              minWidth: 7,
            },
            token: {
              minWidth: 7,
            },
            apiKey: {
              minWidth: 7,
            },
            environment: {
              minWidth: 7,
            },
            type: {
              minWidth: 7,
            },
          },
          {
            printLine: cliux.print,
            ...flags, // parsed flags
          },
        );
      } else {
        cliux.print('CLI_AUTH_TOKENS_LIST_NO_TOKENS');
      }
    } catch (error) {
      logger.error('Token list error', error.message);
      cliux.print('CLI_AUTH_TOKENS_LIST_FAILED', { color: 'yellow' });
      cliux.print(error.message, { color: 'red' });
    }
  }
}
