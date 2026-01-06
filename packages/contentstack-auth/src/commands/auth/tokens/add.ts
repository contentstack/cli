import {
  cliux,
  configHandler,
  flags,
  FlagInput,
  HttpClient,
  messageHandler,
  Flags,
  log,
  handleAndLogError,
} from '@contentstack/cli-utilities';
import { BaseCommand } from '../../../base-command';
import { askTokenType } from '../../../utils/interactive';

export default class TokensAddCommand extends BaseCommand<typeof TokensAddCommand> {
  static description = 'Adds management/delivery tokens to your session to use it with other CLI commands';

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

  static flags: FlagInput = {
    alias: Flags.string({ char: 'a', description: 'Alias (name) you want to assign to the token' }),
    delivery: flags.boolean({
      description: 'Set this flag to save delivery token',
      exclusive: ['management'],
    }),
    management: flags.boolean({
      description: 'Set this flag to save management token',
      exclusive: ['delivery', 'environment'],
    }),
    environment: flags.string({
      char: 'e',
      description: 'Environment name for delivery token',
      exclusive: ['management'],
    }),
    'stack-api-key': flags.string({ char: 'k', description: 'Stack API Key' }),
    yes: flags.boolean({ char: 'y', description: 'Use this flag to skip confirmation' }),
    token: flags.string({
      description: 'Add the token name',
      env: 'TOKEN',
    }),
    branch: flags.string({
      required: false,
      multiple: false,
      description: 'Branch name',
      hidden: true,
    }),
  };

  static usage =
    'auth:tokens:add [-a <value>] [--delivery] [--management] [-e <value>] [-k <value>] [-y] [--token <value>]';

  async run(): Promise<any> {
    log.debug('TokensAddCommand run method started.', this.contextDetails);
    this.contextDetails.module = 'tokens-add';

    const { flags: addTokenFlags } = await this.parse(TokensAddCommand);
    log.debug('Token add flags parsed.', { ...this.contextDetails, flags: addTokenFlags });

    let isAliasExist = false;
    const skipAliasReplaceConfirmation = addTokenFlags.yes;
    let alias = addTokenFlags.alias;
    let apiKey = addTokenFlags['stack-api-key'];
    let token = addTokenFlags.token;
    let isDelivery = addTokenFlags.delivery;
    let isManagement = addTokenFlags.management;
    let environment = addTokenFlags.environment;
    const configKeyTokens = 'tokens';

    log.debug('Initial token parameters', {
      ...this.contextDetails,
      alias,
      hasApiKey: !!apiKey,
      hasToken: !!token,
      isDelivery,
      isManagement,
      environment,
      skipAliasReplaceConfirmation,
    });

    if (!isDelivery && !isManagement && !Boolean(environment)) {
      log.debug('No token type specified, requesting user input', this.contextDetails);
      let tokenType = await askTokenType();
      isDelivery = tokenType === 'delivery';
      isManagement = tokenType === 'management';
      log.debug(`Token type selected: ${tokenType}`, this.contextDetails);
    }

    const type = isDelivery || Boolean(environment) ? 'delivery' : 'management';
    log.debug(`Final token type determined: ${type}`, this.contextDetails);

    try {
      if (!alias) {
        log.debug('No alias provided, requesting user input', this.contextDetails);
        alias = await cliux.inquire({ type: 'input', message: 'CLI_AUTH_TOKENS_ADD_ASK_TOKEN_ALIAS', name: 'alias' });
        log.debug(`Alias obtained: ${alias}`, this.contextDetails);
      }

      isAliasExist = Boolean(configHandler.get(`${configKeyTokens}.${alias}`)); // get to Check if alias already present
      log.debug(`Checking if alias exists: ${isAliasExist}`, { ...this.contextDetails, alias });

      if (isAliasExist && !skipAliasReplaceConfirmation) {
        log.debug('Alias exists and confirmation required, requesting user input', this.contextDetails);
        const shouldAliasReplace = await cliux.inquire({
          type: 'confirm',
          message: `CLI_AUTH_TOKENS_ADD_CONFIRM_ALIAS_REPLACE`,
          name: 'confirm',
        });
        log.debug(`Alias replace confirmation: ${shouldAliasReplace}`, this.contextDetails);

        if (!shouldAliasReplace) {
          log.debug('User declined alias replacement, exiting', this.contextDetails);
          log.info('Exiting the token replacement process.', this.contextDetails);
          cliux.print('CLI_AUTH_EXIT_PROCESS');
          return;
        }
      }

      if (!apiKey) {
        log.debug('No API key provided, requesting user input', this.contextDetails);
        apiKey = await cliux.inquire({ type: 'input', message: 'CLI_AUTH_TOKENS_ADD_ENTER_API_KEY', name: 'apiKey' });
        log.debug('API key obtained.', { ...this.contextDetails, hasApiKey: !!apiKey });
      }

      if (!token) {
        log.debug('No token provided, requesting user input', this.contextDetails);
        token = await cliux.inquire({ type: 'input', message: 'CLI_AUTH_TOKENS_ADD_ENTER_TOKEN', name: 'token' });
        log.debug('Token obtained.', { ...this.contextDetails, hasToken: !!token });
      }

      if (isDelivery && !environment) {
        log.debug('Delivery token requires environment, requesting user input', this.contextDetails);
        environment = await cliux.inquire({
          type: 'input',
          message: 'CLI_AUTH_TOKENS_ADD_ENTER_ENVIRONMENT',
          name: 'env',
        });
        log.debug(`Environment obtained: ${environment}`, this.contextDetails);
      }

      let msg = `Adding ${type} token with alias: ${alias}, apiKey: ${apiKey}`;
      if (environment) {
        msg += `, environment: ${environment}`;
      }
      log.info(msg, this.contextDetails);

      if (type === 'management') {
        log.debug('Validating management token', {
          ...this.contextDetails,
          apiKeyStatus: apiKey ? 'provided' : 'not-provided',
        });
        // FIXME - Once the SDK refresh token issue is resolved, need to revert this back to SDK call
        const httpClient = new HttpClient({ headers: { api_key: apiKey, authorization: token } });

        log.debug('Making management token validation API call.', this.contextDetails);
        const response = (await httpClient.get(`https://${this.cmaHost}/v3/environments?limit=1`)).data;
        log.debug('Management token validation response received.', { ...this.contextDetails, response });

        if (response?.error_code === 105) {
          log.debug('Management token validation failed: invalid token.', this.contextDetails);
          throw new Error(messageHandler.parse('CLI_AUTH_TOKENS_VALIDATION_INVALID_MANAGEMENT_TOKEN'));
        } else if (response?.error_message) {
          log.debug('Management token validation failed with error message', {
            ...this.contextDetails,
            errorMessage: response.error_message,
          });
          throw new Error(response.error_message);
        }
        log.debug('Management token validation successful.', this.contextDetails);
      }

      log.debug('Saving token to configuration', {
        ...this.contextDetails,
        alias,
        type,
        hasEnvironment: !!environment,
      });
      if (isManagement) {
        configHandler.set(`${configKeyTokens}.${alias}`, { token, apiKey, type });
        log.debug('Management token saved to configuration.', this.contextDetails);
      } else {
        configHandler.set(`${configKeyTokens}.${alias}`, { token, apiKey, environment, type });
        log.debug('Delivery token saved to configuration.', this.contextDetails);
      }

      if (isAliasExist) {
        log.debug('Token replaced successfully.', this.contextDetails);
        cliux.success('CLI_AUTH_TOKENS_ADD_REPLACE_SUCCESS');
      } else {
        log.debug('Token added successfully.', this.contextDetails);
        cliux.success('CLI_AUTH_TOKENS_ADD_SUCCESS');
      }

      log.debug('Token addition process completed successfully.', this.contextDetails);
    } catch (error) {
      log.debug('Token addition process failed.', { ...this.contextDetails, error });
      cliux.print('CLI_AUTH_TOKENS_ADD_FAILED', { color: 'yellow' });
      handleAndLogError(error, { ...this.contextDetails });
    }
  }
}
