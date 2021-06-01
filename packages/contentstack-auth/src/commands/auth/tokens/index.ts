import { Command } from '@contentstack/cli-command';
import cli from 'cli-ux';
import * as Configstore from 'configstore';
import { cliux, logger } from '../../../utils';

const config = new Configstore('contentstack_cli');

export default class TokensListCommand extends Command {
  static description = `Lists all existing tokens added to the session 
  `;
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
            printLine: this.log,
            ...flags, // parsed flags
          },
        );
      } else {
        cliux.print('No tokens are added. Use auth:tokens:add command to add tokens.');
      }
    } catch (error) {
      logger.error(error.message);
    }
  }
}
