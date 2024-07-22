import { Command } from '@contentstack/cli-command';
import { cliux, configHandler, flags, FlagInput, formatError } from '@contentstack/cli-utilities';
import { BaseCommand } from '../../../base-command';

export default class TokensRemoveCommand extends BaseCommand<typeof TokensRemoveCommand> {
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

      if (selectedTokens.length === 0) {
        return;
      }
      
      selectedTokens.forEach((ele)=>{
        this.logger.info('selected tokens',ele);
      })
    
      selectedTokens.forEach((element) => {
        const selectedToken = element.split(':')[0];
        configHandler.delete(`tokens.${selectedToken}`);
        cliux.success('CLI_AUTH_TOKENS_REMOVE_SUCCESS');
        this.logger.info('Token removed successfully !!', element);
      });
    } catch (error) {
      let errorMessage = formatError(error) || 'Something went wrong while removing token. Please try again.';
      this.logger.error('Token remove error', errorMessage);
      cliux.print('CLI_AUTH_TOKENS_REMOVE_FAILED', { color: 'yellow' });
      cliux.print(errorMessage, { color: 'red' });
    }
  }
}
