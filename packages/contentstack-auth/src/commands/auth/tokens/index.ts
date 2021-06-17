import { Command } from '@contentstack/cli-command';
import cli from 'cli-ux';
import * as Configstore from 'configstore';
import { cliux, logger, messageHandler } from '../../../utils';

const config = new Configstore('contentstack_cli');

export default class TokensListCommand extends Command {
  private readonly parse: Function;
  static run;
  static description = messageHandler.parse('CLI_AUTH_TOKENS_LIST_DESCRIPTION');
  static aliases = ['tokens'];
  static examples = ['$ csdx auth:tokens'];
  static flags = cli.table.flags(); // use the cli table flags as it displays tokens in table

  async run(): Promise<any> {
    try {
      const managementTokens = config.get('tokens');
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
      cliux.error('CLI_AUTH_TOKENS_LIST_FAILED', error.message);
    }
  }
}
