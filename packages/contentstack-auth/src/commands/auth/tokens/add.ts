import { Command } from '@contentstack/cli-command';
import {
  logger,
  cliux,
  CLIError,
  configHandler,
  printFlagDeprecation,
  flags,
  managementSDKClient,
  FlagInput,
} from '@contentstack/cli-utilities';
import { askTokenType } from '../../../utils/interactive';
import { tokenValidation } from '../../../utils';
export default class TokensAddCommand extends Command {
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
    alias: flags.string({ char: 'a', description: 'Name of the token alias' }),
    delivery: flags.boolean({
      char: 'd',
      description: 'Set this flag to save delivery token',
      exclusive: ['management'],
      parse: printFlagDeprecation(['-d'], ['--delivery']),
    }),
    management: flags.boolean({
      char: 'm',
      description: 'Set this flag to save management token',
      exclusive: ['delivery', 'environment'],
      parse: printFlagDeprecation(['-m'], ['--management']),
    }),
    environment: flags.string({
      char: 'e',
      description: 'Environment name for delivery token',
      exclusive: ['management'],
    }),
    'stack-api-key': flags.string({ char: 'k', description: 'Stack API Key' }),
    yes: flags.boolean({ char: 'y', description: 'Use this flag to skip confirmation' }),
    token: flags.string({
      char: 't',
      description: 'Add the token name',
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
    // @ts-ignore
    const { flags: addTokenFlags } = await this.parse(TokensAddCommand);
    let isAliasExist = false;
    const skipAliasReplaceConfirmation = addTokenFlags.force || addTokenFlags.yes;
    let alias = addTokenFlags.alias;
    let apiKey = addTokenFlags['api-key'] || addTokenFlags['stack-api-key'];
    let token = addTokenFlags.token;
    let isDelivery = addTokenFlags.delivery;
    let isManagement = addTokenFlags.management;
    let environment = addTokenFlags.environment;
    let branch = addTokenFlags.branch;
    const configKeyTokens = 'tokens';

    if (!isDelivery && !isManagement && !Boolean(environment)) {
      let tokenType = await askTokenType();
      isDelivery = tokenType === 'delivery';
      isManagement = tokenType === 'management';
    }

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

      if (!token) {
        token = await cliux.inquire({ type: 'input', message: 'CLI_AUTH_TOKENS_ADD_ENTER_TOKEN', name: 'token' });
      }

      if (isDelivery && !environment) {
        environment = await cliux.inquire({
          type: 'input',
          message: 'CLI_AUTH_TOKENS_ADD_ENTER_ENVIRONMENT',
          name: 'env',
        });
      }

      let tokenValidationResult;

      if (type === 'delivery') {
        branch = branch || 'main';
        tokenValidationResult = await tokenValidation.validateDeliveryToken(
          this.deliveryAPIClient,
          apiKey,
          token,
          environment,
          this.region.name,
          this.cdaHost,
          branch,
        );
      } else if (type === 'management') {
        const managementAPIClient = await managementSDKClient({ host: this.cmaHost });
        tokenValidationResult = await managementAPIClient
          .stack({ api_key: apiKey, management_token: token })
          .environment()
          .query()
          .findOne();
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
      cliux.error(error.errorMessage ? error.errorMessage : error.message);
    }
  }
}
