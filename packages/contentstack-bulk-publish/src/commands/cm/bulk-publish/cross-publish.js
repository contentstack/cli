/* eslint-disable node/no-extraneous-require */
const { Command } = require('@contentstack/cli-command');
const { cliux, printFlagDeprecation, flags, isAuthenticated } = require('@contentstack/cli-utilities');
const { start } = require('../../../producer/cross-publish');
const store = require('../../../util/store.js');
const configKey = 'cross_env_publish';
const { prettyPrint, formatError } = require('../../../util');
const { getStack } = require('../../../util/client.js');
let config;

class CrossPublishCommand extends Command {
  async run() {
    const { flags: _flags } = await this.parse(CrossPublishCommand);
    const crossPublishFlags = this.flagsAdapter(_flags || {});
    let updatedFlags;
    try {
      updatedFlags = crossPublishFlags.config ? store.updateMissing(configKey, crossPublishFlags) : crossPublishFlags;
    } catch (error) {
      this.error(error.message, { exit: 2 });
    }

    if (this.validate(updatedFlags)) {
      let stack;
      if (!updatedFlags.retryFailed) {
        config = {
          host: this.cmaHost,
          cda: this.cdaHost,
          branch: crossPublishFlags.branch,
        };
        if (updatedFlags.alias) {
          try {
            this.getToken(updatedFlags.alias);
            config.alias = updatedFlags.alias;
          } catch (error) {
            this.error(
              `The configured management token alias ${updatedFlags.alias} has not been added yet. Add it using 'csdx auth:tokens:add -a ${updatedFlags.alias}'`,
              { exit: 2 },
            );
          }
        } else if (updatedFlags['stack-api-key']) {
          config.stackApiKey = updatedFlags['stack-api-key'];
        } else {
          this.error('Please use `--alias` or `--stack-api-key` to proceed.', { exit: 2 });
        }
        if (!updatedFlags.deliveryToken) {
          updatedFlags.deliveryToken = await cliux.prompt('Enter delivery token of your source environment');
        }
        updatedFlags.bulkPublish = updatedFlags.bulkPublish === 'false' ? false : true;

        stack = await getStack(config);
      }

      if (!updatedFlags.deliveryToken && updatedFlags.deliveryToken.length === 0) {
        this.error('Delivery Token is required for executing this command', { exit: 2 });
      }

      if (await this.confirmFlags(updatedFlags)) {
        try {
          if (process.env.NODE_ENV === 'test') {
            return;
          }
          if (!updatedFlags.retryFailed) {
            await start(updatedFlags, stack, config);
          } else {
            await start(updatedFlags);
          }
        } catch (error) {
          let message = formatError(error);
          this.error(message, { exit: 2 });
        }
      } else {
        this.exit(0);
      }
    }
  }

  validate({ environment, retryFailed, destEnv, onlyAssets, contentType, onlyEntries, locale }) {
    let missing = [];
    if (retryFailed) {
      return true;
    }

    if (onlyAssets && onlyEntries) {
      this.error(
        `The flags onlyAssets and onlyEntries need not be used at the same time. Unpublish command unpublishes entries and assts at the same time by default`,
      );
    }

    if (onlyAssets && contentType) {
      this.error(
        `Specifying content-type and onlyAssets together will have unexpected results. Please do not use these 2 flags together. Thank you.`,
      );
    }

    if (!environment) {
      missing.push('Environment');
    }

    if (!destEnv) {
      missing.push('Destination Environment');
    }

    if (!locale) {
      missing.push('Locale');
    }

    if (missing.length > 0) {
      this.error(
        `${missing.join(', ')} is required for processing this command. Please check --help for more details`,
        { exit: 2 },
      );
    } else {
      return true;
    }
  }

  async confirmFlags(data) {
    prettyPrint(data);
    if (data.yes) {
      return true;
    }
    return cliux.confirm('Do you want to continue with this configuration ? [yes or no]');
  }

  flagsAdapter(_flags) {
    if ('content-type' in _flags) {
      _flags.contentTypes = _flags['content-type'];
      delete _flags['content-type'];
    }
    if ('locales' in _flags) {
      _flags.locale = _flags.locales;
      delete _flags['locales'];
    }
    if ('retry-failed' in _flags) {
      _flags.retryFailed = _flags['retry-failed'];
      delete _flags['retry-failed'];
    }
    if ('bulk-publish' in _flags) {
      _flags.bulkPublish = _flags['bulk-publish'];
      delete _flags['bulk-publish'];
    }
    if ('api-version' in _flags) {
      _flags.apiVersion = _flags['api-version'] || '3';
      delete _flags['api-version'];
    }
    if ('source-env' in _flags) {
      _flags.environment = _flags['source-env'];
      delete _flags['source-env'];
    }
    if ('environments' in _flags) {
      _flags.destEnv = _flags['environments'];
      delete _flags['environments'];
    }
    if ('delivery-token' in _flags) {
      _flags.deliveryToken = _flags['delivery-token'];
      delete _flags['delivery-token'];
    }
    return _flags;
  }
}

CrossPublishCommand.description = `Publish entries and assets from one environment to other environments
The cross-publish command is used to publish entries and assets from one environment to other environments

Note: Content Type, Environment, Destination Environment(s) and Locale are required to execute the command successfully
But, if retryFailed flag is set, then only a logfile is required
`;

CrossPublishCommand.flags = {
  alias: flags.string({ char: 'a', description: 'Alias(name) for the management token' }),
  'stack-api-key': flags.string({
    char: 'k',
    description: 'Stack api key to be used',
    required: false,
  }),
  retryFailed: flags.string({
    char: 'r',
    description: '(optional) Retry publishing failed entries from the logfile (this flag overrides all other flags)',
    hidden: true,
    parse: printFlagDeprecation(['--retryFailed', '-r'], ['--retry-failed']),
  }),
  'retry-failed': flags.string({
    description: '(optional) Retry publishing failed entries from the logfile (this flag overrides all other flags)',
  }),
  bulkPublish: flags.string({
    char: 'b',
    hidden: true,
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used to publish the entries",
    default: 'true',
    parse: printFlagDeprecation(['--bulkPublish', '-b'], ['--bulk-publish']),
  }),
  'bulk-publish': flags.string({
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used to publish the entries",
    default: 'true',
  }),
  'api-version': flags.string({
    description: 'API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].',
  }),
  contentType: flags.string({
    char: 't',
    description: 'The Content-Types from which entries need to be published',
    multiple: true,
    hidden: true,
    parse: printFlagDeprecation(['--contentType', '-t'], ['--content-type']),
  }),
  'content-type': flags.string({
    description: 'The Contenttypes from which entries will be published',
    multiple: true,
  }),
  locale: flags.string({
    hidden: true,
    char: 'l',
    description: 'Source locale',
    parse: printFlagDeprecation(['-l'], ['--locales']),
  }),
  locales: flags.string({
    description: 'Source locale',
  }),
  environment: flags.string({
    char: 'e',
    description: 'Source Environment',
    hidden: true,
    parse: printFlagDeprecation(['--environment', '-e'], ['--source-env']),
  }),
  'source-env': flags.string({
    description: 'Source Env',
  }),
  destEnv: flags.string({
    char: 'd',
    description: 'Destination Environments',
    multiple: true,
    hidden: true,
    parse: printFlagDeprecation(['--destEnv'], ['--environments']),
  }),
  environments: flags.string({
    description: 'Destination Environments',
    multiple: true,
  }),
  deliveryToken: flags.string({
    char: 'x',
    description: 'Delivery token for source environment',
    hidden: true,
    parse: printFlagDeprecation(['--deliveryToken', '-x'], ['--delivery-token']),
  }),
  'delivery-token': flags.string({
    description: 'Delivery token for source environment',
  }),
  config: flags.string({ char: 'c', description: 'Path to the config file' }),
  yes: flags.boolean({ char: 'y', description: 'Agree to process the command with the current configuration' }),
  branch: flags.string({
    char: 'B',
    default: 'main',
    description: 'Specify the branch to fetch the content (by default the main branch is selected)',
    parse: printFlagDeprecation(['-B']),
  }),
  onlyAssets: flags.boolean({ description: 'Unpublish only assets', default: false }),
  onlyEntries: flags.boolean({ description: 'Unpublish only entries', default: false }),
};

CrossPublishCommand.examples = [
  'General Usage',
  'csdx cm:bulk-publish:cross-publish --content-type [CONTENT TYPE] --source-env [SOURCE ENV] --environments [DESTINATION ENVIRONMENT] --locales [LOCALE] -a [MANAGEMENT TOKEN ALIAS] --delivery-token [DELIVERY TOKEN]',
  '',
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`',
  'csdx cm:bulk-publish:cross-publish --config [PATH TO CONFIG FILE]',
  'csdx cm:bulk-publish:cross-publish -c [PATH TO CONFIG FILE]',
  '',
  'Using --retry-failed flag',
  'csdx cm:bulk-publish:cross-publish --retry-failed [LOG FILE NAME]',
  'csdx cm:bulk-publish:cross-publish -r [LOG FILE NAME]',
  '',
  'Using --branch flag',
  'csdx cm:bulk-publish:cross-publish --content-type [CONTENT TYPE] --source-env [SOURCE ENV] --environments [DESTINATION ENVIRONMENT] --locales [LOCALE] -a [MANAGEMENT TOKEN ALIAS] --delivery-token [DELIVERY TOKEN] --branch [BRANCH NAME]',
  '',
  'Using --stack-api-key flag',
  'csdx cm:bulk-publish:cross-publish --content-type [CONTENT TYPE] --source-env [SOURCE ENV] --environments [DESTINATION ENVIRONMENT] --locales [LOCALE] --stack-api-key [STACK API KEY] --delivery-token [DELIVERY TOKEN]',
  '',
];

CrossPublishCommand.usage = `cm:bulk-publish:cross-publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--content-type <value>] [--locales <value>] [--source-env <value>] [--environments <value>] [--delivery-token <value>] [-c <value>] [-y] [--branch <value>] [--onlyAssets] [--onlyEntries]`;

module.exports = CrossPublishCommand;
