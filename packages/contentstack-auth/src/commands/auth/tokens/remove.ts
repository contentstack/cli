import { cliux, configHandler, flags, FlagInput, log, handleAndLogError } from '@contentstack/cli-utilities';
import { BaseCommand } from '../../../base-command';

export default class TokensRemoveCommand extends BaseCommand<typeof TokensRemoveCommand> {
  static description = 'Removes selected tokens';
  static examples = ['$ csdx auth:tokens:remove', '$ csdx auth:tokens:remove -a <alias>'];
  static flags: FlagInput = {
    alias: flags.string({ char: 'a', description: 'Alias (name) of the token to delete.' }),
    ignore: flags.boolean({ char: 'i', description: 'Ignores if the token is not present.' }),
  };

  async run(): Promise<any> {
    log.debug('TokensRemoveCommand run method started', this.contextDetails);
    this.contextDetails.module = 'tokens-remove';
    
    const { flags: removeTokenFlags } = await this.parse(TokensRemoveCommand);
    log.debug('Token removal flags parsed.', {...this.contextDetails, flags: removeTokenFlags });
    
    const alias = removeTokenFlags.alias;
    const ignore = removeTokenFlags.ignore;
    log.debug('Token removal parameters set.', {...this.contextDetails, alias, ignore });
    
    try {
      log.debug('Retrieving token from configuration.', {...this.contextDetails, alias });
      const token = configHandler.get(`tokens.${alias}`);
      log.debug('Token retrieved from configuration.', {...this.contextDetails, hasToken: !!token, tokenType: token?.type });
      
      const tokens = configHandler.get('tokens');
      log.debug('All tokens retrieved from configuration.', {...this.contextDetails, tokenCount: tokens ? Object.keys(tokens).length : 0 });
      
      const tokenOptions: Array<string> = [];
      
      if (token || ignore) {
        log.debug('Token found, or ignore flag set.', {...this.contextDetails, hasToken: !!token, ignore });
        configHandler.delete(`tokens.${alias}`);
        log.debug('Token removed from configuration.', {...this.contextDetails, alias });
        return cliux.success(`CLI_AUTH_TOKENS_REMOVE_SUCCESS`);
      }

      if (tokens && Object.keys(tokens).length > 0) {
        log.debug('Building token options for user selection.', this.contextDetails);
        Object.keys(tokens).forEach(function (item) {
          const tokenOption = `${item}: ${tokens[item].token} : ${tokens[item].apiKey}${
            tokens[item].environment ? ' : ' + tokens[item].environment + ' ' : ''
          }: ${tokens[item].type}`;
          tokenOptions.push(tokenOption);
          log.debug(`Token option added: ${item}`, {tokenType: tokens[item].type });
        });
        log.debug(`Token options built: ${tokenOptions.length} options`, this.contextDetails);
      } else {
        log.debug('No tokens found in configuration.', this.contextDetails);
        return cliux.print('CLI_AUTH_TOKENS_NOT_FOUND');
      }

      log.debug('Requesting user to select tokens for removal.', this.contextDetails);
      const selectedTokens: Array<any> = await cliux.inquire({
        name: 'selectedTokens',
        message: 'CLI_AUTH_TOKENS_REMOVE_SELECT_TOKEN',
        type: 'checkbox',
        choices: tokenOptions,
      });
      log.debug(`User selected ${selectedTokens.length} tokens for removal`, {...this.contextDetails, selectedTokens });

      if (selectedTokens.length === 0) {
        log.debug('No tokens selected for removal.', this.contextDetails);
        return;
      }
      
      selectedTokens.forEach((ele)=>{
        log.info(`Selected token: ${ele}`, this.contextDetails);
      })
    
      log.debug('Removing selected tokens from configuration.', this.contextDetails);
      selectedTokens.forEach((element) => {
        const selectedToken = element.split(':')[0];
        log.debug(`Removing token: ${selectedToken}`, this.contextDetails);
        configHandler.delete(`tokens.${selectedToken}`);
        cliux.success('CLI_AUTH_TOKENS_REMOVE_SUCCESS');
        log.info(`Token removed: ${selectedToken}`, this.contextDetails);
      });
      
      log.debug('Token removal completed successfully.', this.contextDetails);
    } catch (error) {
      log.debug('Token removal failed.', {...this.contextDetails, error });
      cliux.print('CLI_AUTH_TOKENS_REMOVE_FAILED', { color: 'yellow' });
      handleAndLogError(error, {...this.contextDetails} )
    }
  }
}
