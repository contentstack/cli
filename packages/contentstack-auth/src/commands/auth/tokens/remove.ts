import { Command, flags } from '@contentstack/cli-command';
import * as Configstore from 'configstore';
import { cliux, logger } from '../../../utils';

const config = new Configstore('contentstack_cli');
export default class TokensRemoveCommand extends Command {
  static description = 'description';

  static examples = ['$ csdx auth:tokens:remove'];

  static flags = {
    alias: flags.string({ char: 'a', description: 'token alias' }),
    ignore: flags.boolean({ char: 'i', description: '' }),
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
        return cliux.success(`"${alias}" token removed successfully!`);
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
        return cliux.print('No tokens are added yet.');
      }

      const selectedTokens: Array<any> = await cliux.inquire({
        name: 'selectedTokens',
        message: 'Select tokens to remove.',
        type: 'checkbox',
        choices: tokenOptions,
      });

      if (selectedTokens.length === 0) {
        return;
      }
      selectedTokens.forEach((element) => {
        const selectedToken = element.split(':')[0];
        config.delete(`tokens.${selectedToken}`);
        cliux.success(`${selectedToken} removed successfully`);
      });
    } catch (error) {
      logger.error(error.message);
    }
  }
}
