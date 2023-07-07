import { Command } from '@contentstack/cli-command';
import { logger, cliux, configHandler, flags, FlagInput } from '@contentstack/cli-utilities';

export default class TokensRemoveCommand extends Command {
  static description = 'Removes selected tokens';
  static examples = ['$ csdx auth:tokens:remove', '$ csdx auth:tokens:remove -a <alias>'];
  static flags: FlagInput = {
    alias: flags.string({ char: 'a', description: 'Token alias' }),
    ignore: flags.boolean({ char: 'i', description: 'Ignore' }),
  };

  async run(): Promise<any> {
    const { flags: removeTokenFlags } = await this.parse(TokensRemoveCommand);
    const alias = removeTokenFlags.alias;
    const ignore = removeTokenFlags.ignore;

    try {
      const token = configHandler.get(`tokens.${alias}`);
      const tokens = configHandler.get('tokens');
      const tokenOptions: Array<string> = [];
      if (token || ignore) {
        configHandler.delete(`tokens.${alias}`);
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
        configHandler.delete(`tokens.${selectedToken}`);
        cliux.success('CLI_AUTH_TOKENS_REMOVE_SUCCESS');
      });
    } catch (error) {
      logger.error('Token remove error', error.message);
      cliux.print('CLI_AUTH_TOKENS_REMOVE_FAILED', { color: 'yellow' });
      cliux.print(error.message, { color: 'red' });
    }
  }
}
