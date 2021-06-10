import { Command, flags } from '@contentstack/cli-command';
import * as ContentstackManagementSDK from '@contentstack/management';

import * as Configstore from 'configstore';
import { logger, cliux, tokenValidation, messageHandler } from '../../../utils';

const config = new Configstore('contentstack_cli');
export default class TokensAddCommand extends Command {
  private _managementAPIClient: any;
  private readonly parse: Function;
  private cmaHost: string;
  private authToken: string;
  private exit: Function;
  static run;

  static description = messageHandler.parse('CLI_AUTH_TOKENS_ADD_DESCRIPTION');

  static examples = ['$ csdx auth:tokens:add']; // TBD

  static flags = {
    alias: flags.string({ char: 'a', description: '' }),
    delivery: flags.boolean({
      char: 'd',
      description: messageHandler.parse('CLI_AUTH_TOKENS_ADD_FLAG__DELIVERY_TOKEN'),
      exclusive: ['management'],
    }),
    management: flags.boolean({
      char: 'm',
      description: messageHandler.parse('CLI_AUTH_TOKENS_ADD_FLAG_MANAGEMENT_TOKEN'),
      exclusive: ['delivery', 'environment'],
    }),
    environment: flags.string({
      char: 'e',
      description: messageHandler.parse('CLI_AUTH_TOKENS_ADD_FLAG_ENVIRONMENT_NAME'),
      exclusive: ['management'],
    }),
    'api-key': flags.string({ char: 'k', description: 'API Key' }),
    force: flags.boolean({ char: 'f', description: 'Force adding' }),
    token: flags.string({ char: 't', description: 'Token', env: 'TOKEN' }),
  };

  // TBD use the base class client
  get managementAPIClient(): any {
    this._managementAPIClient = ContentstackManagementSDK.client({ host: this.cmaHost, authtoken: this.authToken });
    return this._managementAPIClient;
  }

  async run(): Promise<any> {
    const { flags } = this.parse(TokensAddCommand);
    let isReplace = false;
    const forced = flags.force;
    let alias = flags.alias;
    let apiKey = flags['api-key'];
    let token = flags.token;
    const isDelivery = flags.delivery;
    const isManagement = flags.management;
    let environment = flags.environment;
    const configKeyTokens = 'tokens';
    const type = isDelivery || Boolean(environment) ? 'delivery' : 'management';

    logger.info(`adding ${type} token`);

    try {
      if (!alias) {
        alias = await cliux.inquire({ type: 'input', message: 'CLI_AUTH_TOKENS_ADD_ASK_TOKEN_ALIAS', name: 'alias' });
      }
      isReplace = Boolean(config.get(`${configKeyTokens}.${alias}`)); // get to Check if alias already present

      if (isReplace && !forced) {
        // TBD change the naming
        isReplace = true;
        const confirm = await cliux.inquire({
          type: 'confirm',
          message: `CLI_AUTH_TOKENS_ADD_CONFIRM_ALIAS_REPLACE`,
          name: 'confirm',
        });
        if (!confirm) {
          logger.info('Exiting from the process of replacing the token');
          this.exit();
        }
      }

      if (!apiKey) {
        apiKey = await cliux.inquire({ type: 'input', message: 'CLI_AUTH_TOKENS_ADD_ENTER_API_KEY', name: 'apiKey' });
      }

      const apiKeyValidationResult = await tokenValidation.validateAPIKey(this.managementAPIClient, apiKey);
      if (!apiKeyValidationResult.valid) {
        cliux.error(apiKeyValidationResult.message);
        logger.error('Invalid api key', apiKeyValidationResult);
        this.exit();
      }

      if (!token) {
        token = await cliux.inquire({ type: 'input', message: 'CLI_AUTH_TOKENS_ADD_ENTER_TOKEN', name: 'token' });
      }

      let tokenValidationResult;
      if (type === 'delivery') {
        tokenValidationResult = await tokenValidation.validateDeliveryToken(this.managementAPIClient, apiKey, token);
      } else if (type === 'management') {
        tokenValidationResult = await tokenValidation.validateManagementToken(this.managementAPIClient, apiKey, token);
      }
      if (!tokenValidationResult.valid) {
        cliux.error(tokenValidationResult.message);
        logger.error('Invalid token provided', tokenValidationResult);
        this.exit();
      }

      if (isDelivery && !environment) {
        environment = await cliux.inquire({
          type: 'input',
          message: 'CLI_AUTH_TOKENS_ADD_ENTER_ENVIRONMENT',
          name: 'env',
        });
      }

      if (environment) {
        const envValidationResult = await tokenValidation.validateEnvironment(
          this.managementAPIClient,
          apiKey,
          environment,
        );
        if (!envValidationResult.valid) {
          cliux.error(envValidationResult.message);
          logger.error('Invalid environment provided');
          this.exit();
        }
      }

      if (isManagement) {
        config.set(`${configKeyTokens}.${alias}`, { token, apiKey, type });
      } else {
        config.set(`${configKeyTokens}.${alias}`, { token, apiKey, environment, type });
      }

      if (isReplace) {
        cliux.success('CLI_AUTH_TOKENS_ADD_REPLACE_SUCCESS');
      } else {
        cliux.success('CLI_AUTH_TOKENS_ADD_SUCCESS');
      }
    } catch (error) {
      logger.error('token add error', error);
      cliux.error('CLI_AUTH_TOKENS_ADD_FAILED', error.message);
    }
  }
}
