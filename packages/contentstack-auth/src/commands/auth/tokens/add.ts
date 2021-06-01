import { Command, flags } from '@contentstack/cli-command';
import * as ContentstackManagementSDK from '@contentstack/management';

import * as Configstore from 'configstore';
import { logger, cliux, tokenValidation } from '../../../utils';

const config = new Configstore('contentstack_cli');
export default class TokensAddCommand extends Command {
  private readonly _managementAPIClient: any;

  static description = `Adds management/delivery tokens to your session to use it with further CLI command
  by default it adds management token if either of management or delivery flags are not set`;

  static examples = ['$ csdx auth:tokens:add'];

  static flags = {
    alias: flags.string({ char: 'a', description: '' }),
    delivery: flags.boolean({
      char: 'd',
      description: 'Set this while saving delivery token',
      exclusive: ['management'],
    }),
    management: flags.boolean({
      char: 'm',
      description: 'Set this while saving management token',
      exclusive: ['delivery', 'environment'],
    }),
    environment: flags.string({
      char: 'e',
      description: 'Environment name for delivery token',
      exclusive: ['management'],
    }),
    'api-key': flags.string({ char: 'k', description: '' }),
    force: flags.boolean({ char: 'f', description: '' }),
    token: flags.string({ char: 't', description: '', env: 'TOKEN' }),
  };

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

    logger.debug(`adding ${type} token`);

    try {
      if (!alias) {
        alias = await cliux.inquire({ type: 'input', message: 'Provide alias to store token', name: 'alias' });
      }
      isReplace = Boolean(config.get(`${configKeyTokens}.${alias}`)); // get to Check if alias already present

      if (isReplace && !forced) {
        isReplace = true;
        const confirm = await cliux.inquire({
          type: 'confirm',
          message: 'Alias with "%s" is already exists, do you want to replace?',
          name: 'confirm',
        });
        if (!confirm) {
          this.exit();
        }
      }

      if (!apiKey) {
        apiKey = await cliux.inquire({ type: 'input', message: 'enter api key', name: 'apiKey' });
        const validationResult = await tokenValidation.validateAPIKey(this.managementAPIClient, apiKey);
        if (!validationResult.valid) {
          logger.error('Invalid api key');
          this.exit();
        }
      }
      if (!token) {
        token = await cliux.inquire({ type: 'input', message: 'enter the token', name: 'token' });
        let validationResult;
        if (type === 'delivery') {
          validationResult = await tokenValidation.validateDeliveryToken(this.managementAPIClient, apiKey, token);
        } else if (type === 'management') {
          validationResult = await tokenValidation.validateManagementToken(this.managementAPIClient, apiKey, token);
        }
        if (!validationResult.valid) {
          logger.error('Invalid token provided');
          this.exit();
        }
      }
      if (isDelivery && !environment) {
        environment = await cliux.inquire({ type: 'input', message: 'enter the env', name: 'env' });
      }

      if (isManagement) {
        config.set(`${configKeyTokens}.${alias}`, { token, apiKey, type });
      } else {
        config.set(`${configKeyTokens}.${alias}`, { token, apiKey, environment, type });
      }

      if (isReplace) {
        cliux.success('Successfully replaced the token');
      } else {
        cliux.success('Successfully added the token');
      }
    } catch (error) {
      logger.error(error.message);
    }
  }
}
