import { Command, flags } from '@contentstack/cli-command';
import { tokenValidation } from '../../../utils';
import {
  logger,
  cliux,
  messageHandler,
  CLIError,
  configHandler,
  printFlagDeprecation,
} from '@contentstack/cli-utilities';
export default class TokensAddCommand extends Command {
  managementAPIClient: any;
  private readonly parse: Function;
  private cmaHost: string;
  authToken: string;
  private exit: Function;
  static run;

  static description = 'Adds management/delivery tokens to your session to use it with further CLI commands';

  static examples = [
    '$ csdx auth:tokens:add',
    '$ csdx auth:tokens:add -a <alias>',
    '$ csdx auth:tokens:add -k <stack api key>',
    '$ csdx auth:tokens:add --delivery',
    '$ csdx auth:tokens:add --management',
    '$ csdx auth:tokens:add -e <environment>',
    '$ csdx auth:tokens:add --token <token>',
    '$ csdx auth:tokens:add -a <alias> -k <stack api key> --management --token <management token>',
    '$ csdx auth:tokens:add -a <alias> -k <stack api key> --delivery -e <environment> --token <delivery token>',
    '$ csdx auth:tokens:add --alias <alias> --stack-api-key <stack api key> --management --token <management token>',
    '$ csdx auth:tokens:add --alias <alias> --stack-api-key <stack api key> --delivery -e <environment> --token <delivery token>',
  ];

  static flags = {
    alias: flags.string({ char: 'a', description: 'Name of the token alias' }),
    delivery: flags.boolean({
      char: 'd',
      description: messageHandler.parse('CLI_AUTH_TOKENS_ADD_FLAG__DELIVERY_TOKEN'),
      exclusive: ['management'],
      parse: printFlagDeprecation(['-d'], ['--delivery']),
    }),
    management: flags.boolean({
      char: 'm',
      description: messageHandler.parse('CLI_AUTH_TOKENS_ADD_FLAG_MANAGEMENT_TOKEN'),
      exclusive: ['delivery', 'environment'],
      parse: printFlagDeprecation(['-m'], ['--management']),
    }),
    environment: flags.string({
      char: 'e',
      description: messageHandler.parse('CLI_AUTH_TOKENS_ADD_FLAG_ENVIRONMENT_NAME'),
      exclusive: ['management'],
    }),
    'stack-api-key': flags.string({ char: 'k', description: 'Stack API Key' }),
    yes: flags.boolean({ char: 'y', description: 'Skipping confirmation' }),
    token: flags.string({
      char: 't',
      description: 'Token',
      env: 'TOKEN',
      parse: printFlagDeprecation(['-t'], ['--token']),
    }),

    //To be deprecated
    'api-key': flags.string({
      description: 'API Key',
      hidden: true,
      parse: printFlagDeprecation(['api-key'], ['-k', 'stack-api-key']),
    }),
    force: flags.boolean({
      char: 'f',
      hidden: true,
      description: 'Force adding',
      parse: printFlagDeprecation(['-f', '--force'], ['-y', '--yes']),
    }),
  };

  async run(): Promise<any> {
    this.managementAPIClient = { host: this.cmaHost, authtoken: this.authToken };
    const { flags: addTokenFlags } = this.parse(TokensAddCommand);
    let isAliasExist = false;
    const skipAliasReplaceConfirmation = addTokenFlags.force || addTokenFlags.yes;
    let alias = addTokenFlags.alias;
    let apiKey = addTokenFlags['api-key'] || addTokenFlags['stack-api-key'];
    let token = addTokenFlags.token;
    const isDelivery = addTokenFlags.delivery;
    const isManagement = addTokenFlags.management;
    let environment = addTokenFlags.environment;
    const configKeyTokens = 'tokens';
    const type = isDelivery || Boolean(environment) ? 'delivery' : 'management';

    logger.info(`adding ${type} token`);

    try {
      if (!alias) {
        alias = await cliux.inquire({ type: 'input', message: 'CLI_AUTH_TOKENS_ADD_ASK_TOKEN_ALIAS', name: 'alias' });
      }
      isAliasExist = Boolean(configHandler.get(`${configKeyTokens}.${alias}`)); // get to Check if alias already present
      if (isAliasExist && !skipAliasReplaceConfirmation) {
        const shouldAliasReplace = await cliux.inquire({
          type: 'confirm',
          message: `CLI_AUTH_TOKENS_ADD_CONFIRM_ALIAS_REPLACE`,
          name: 'confirm',
        });
        if (!shouldAliasReplace) {
          logger.info('Exiting from the process of replacing the token');
          cliux.print('CLI_AUTH_EXIT_PROCESS');
          return;
        }
      }
      if (!apiKey) {
        apiKey = await cliux.inquire({ type: 'input', message: 'CLI_AUTH_TOKENS_ADD_ENTER_API_KEY', name: 'apiKey' });
      }

      const apiKeyValidationResult = await tokenValidation.validateAPIKey(this.managementAPIClient, apiKey);
      if (!apiKeyValidationResult.valid) {
        throw new CLIError({ message: apiKeyValidationResult.message });
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
        throw new CLIError(tokenValidationResult.message);
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
          throw new CLIError(envValidationResult.message);
        }
      }

      if (isManagement) {
        configHandler.set(`${configKeyTokens}.${alias}`, { token, apiKey, type });
      } else {
        configHandler.set(`${configKeyTokens}.${alias}`, { token, apiKey, environment, type });
      }

      if (isAliasExist) {
        cliux.success('CLI_AUTH_TOKENS_ADD_REPLACE_SUCCESS');
      } else {
        cliux.success('CLI_AUTH_TOKENS_ADD_SUCCESS');
      }
    } catch (error) {
      logger.error('token add error', error.message);
      cliux.print('CLI_AUTH_TOKENS_ADD_FAILED', { color: 'yellow' });
      cliux.print(error.message, { color: 'red' });
    }
  }
}
