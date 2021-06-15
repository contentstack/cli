import { Command, flags } from '@contentstack/cli-command';
import * as Configstore from 'configstore';
import { cliux, logger, messageHandler } from '../../../utils';

const config = new Configstore('contentstack_cli');
export default class TokensRemoveCommand extends Command {
  private readonly parse: Function;
  static run;
  static description = messageHandler.parse('CLI_AUTH_TOKENS_REMOVE_DESCRIPTION');
  static examples = ['$ csdx auth:tokens:remove', '$ csdx auth:tokens:remove -a <aliase>'];
  static flags = {
    alias: flags.string({ char: 'a', description: 'Token alias' }),
    ignore: flags.boolean({ char: 'i', description: 'Ignore' }),
  };

  async run(): Promise<any> {
    const { flags } = this.parse(TokensRemoveCommand);
    const alias = flags.alias;
    const ignore = flags.ignore;

    try {
      const token = config.get(`tokens.${alias}`);
      const tokens = config.get('tokens');
      const tokenOptions: Array<string> = [];
      if (token || ignore) {
        config.delete(`tokens.${alias}`);
        return cliux.success(`CLI_AUTH_TOKENS_REMOVE_SUCCESS`);
      }

      if (tokens && Object.keys(tokens).length > 0) {
        Object.keys(tokens).forEach(function (item) {
          tokenOptions.push(
            `${item}: ${tokens[item].token} : ${tokens[item].apiKey}${
              tokens[item].environment ? ' : ' + tokens[item].environment + ' ' : ''
            }: ${tokens[item].type}`,
          );
        });
      } else {
        return cliux.print('CLI_AUTH_TOKENS_NOT_FOUND');
      }

      const selectedTokens: Array<any> = await cliux.inquire({
        name: 'selectedTokens',
        message: 'CLI_AUTH_TOKENS_REMOVE_SELECT_TOKEN',
        type: 'checkbox',
        choices: tokenOptions,
      });

      logger.debug('selected tokens', selectedTokens);
      if (selectedTokens.length === 0) {
        return;
      }
      selectedTokens.forEach((element) => {
        const selectedToken = element.split(':')[0];
        config.delete(`tokens.${selectedToken}`);
        cliux.success('CLI_AUTH_TOKENS_REMOVE_SUCCESS');
      });
    } catch (error) {
      logger.error('Token remove error');
      cliux.error('CLI_AUTH_TOKENS_REMOVE_FAILED', error.message);
    }
  }
}
