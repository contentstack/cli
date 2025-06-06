/* eslint-disable no-console */
/* eslint-disable node/no-extraneous-require */
const { Command } = require('@contentstack/cli-command');
const { cliux, flags, isAuthenticated } = require('@contentstack/cli-utilities');
const { start } = require('../../../producer/unpublish');
const store = require('../../../util/store.js');
const configKey = 'Unpublish';
const { prettyPrint, formatError } = require('../../../util');
const { getStack } = require('../../../util/client.js');
let config;

class UnpublishCommand extends Command {
  async run() {
    const { flags: unpublishFlags } = await this.parse(UnpublishCommand);
    unpublishFlags.retryFailed = unpublishFlags['retry-failed'] || unpublishFlags.retryFailed || false;
    unpublishFlags.bulkUnpublish = unpublishFlags['bulk-unpublish'] || unpublishFlags.bulkUnpublish;
    unpublishFlags.deliveryToken = unpublishFlags['delivery-token'] || unpublishFlags.deliveryToken;
    unpublishFlags.apiVersion = unpublishFlags['api-version'] || '3';
    unpublishFlags.onlyAssets = true;
    unpublishFlags.onlyEntries = false;
    delete unpublishFlags['api-version'];
    delete unpublishFlags['retry-failed'];
    delete unpublishFlags['bulk-unpublish'];
    delete unpublishFlags['delivery-token'];

    let updatedFlags;
    try {
      updatedFlags = unpublishFlags.config ? store.updateMissing(configKey, unpublishFlags) : unpublishFlags;
    } catch (error) {
      this.error(error.message, { exit: 2 });
    }

    if (this.validate(updatedFlags)) {
      let stack;
      if (!updatedFlags.retryFailed) {
        config = {
          host: this.cmaHost,
          cda: this.cdaHost,
          branch: unpublishFlags.branch,
        };
        if (updatedFlags.alias) {
          // Validate management token alias.
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
        updatedFlags.bulkUnpublish = updatedFlags.bulkUnpublish === 'false' ? false : true;
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

  validate({ environment, retryFailed, locale }) {
    let missing = [];
    if (retryFailed) {
      return true;
    }

    if (!environment) {
      missing.push('Environment');
    }

    // Adding !onlyAssets because if, onlyAssets is set to true, that means only assets are going to be unpublished.
    // Then locale won't be necessary (turns out that this is not the case)
    // if (!locale && !onlyAssets) {
    //   missing.push('Locale')
    // }

    // Locales apply to assets as well
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

    return await cliux.confirm('Do you want to continue with this configuration ? [yes or no]');
  }
}

UnpublishCommand.description = `Unpublish assets from given environment
The unpublish command is used for unpublishing assets from the given environment

Note: Environment (Source Environment) and Locale are required to execute the command successfully
But, if retry-failed flag is set, then only a logfile is required`;

UnpublishCommand.flags = {
  alias: flags.string({
    char: 'a',
    description:
      'Alias (name) of the management token. You must use either the --alias flag or the --stack-api-key flag.',
  }),
  'stack-api-key': flags.string({
    char: 'k',
    description: 'API key of the source stack. You must use either the --stack-api-key flag or the --alias flag.',
    required: false,
  }),
  environment: flags.string({
    char: 'e',
    description: 'The name of the environment from where entries/assets need to be unpublished.',
  }),
  config: flags.string({
    char: 'c',
    description:
      '(optional) Path of an optional configuration JSON file containing all the options for a single run. Refer to the configure command to create a configuration file.',
  }),
  yes: flags.boolean({
    char: 'y',
    description: 'Set it to true to process the command with the current configuration.',
  }),
  locale: flags.string({
    description: 'Locale from which entries/assets will be unpublished, e.g., en-us.',
  }),
  branch: flags.string({
    default: 'main',
    description:
      'The name of the branch where you want to perform the bulk unpublish operation. If you don’t mention the branch name, then by default the content from the main branch will be unpublished.',
  }),
  'retry-failed': flags.string({
    description:
      '(optional) Use this option to retry unpublishing the failed entries from the logfile. Specify the name of the logfile that lists failed unpublish calls. If this option is used, it will override all other flags.',
  }),
  'bulk-unpublish': flags.string({
    description: 'Set this flag to use Contentstack’s Bulk Publish APIs. It is true, by default.',
    default: 'true',
  }),
  'api-version': flags.string({
    description: 'API version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].',
  }),
  'delivery-token': flags.string({
    description: 'The delivery token of the source environment.',
  }),
};

UnpublishCommand.examples = [
  'General Usage',
  'csdx cm:assets:unpublish --bulk-unpublish --environment [SOURCE ENV] --locale [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --delivery-token [DELIVERY TOKEN]',
  '',
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure --alias [ALIAS]`',
  'csdx cm:assets:unpublish --config [PATH TO CONFIG FILE]',
  'csdx cm:assets:unpublish -c [PATH TO CONFIG FILE]',
  '',
  'Using --retry-failed flag',
  'csdx cm:assets:unpublish --retry-failed [LOG FILE NAME]',
  '',
  'Using --branch flag',
  'csdx cm:assets:unpublish --bulk-unpublish --environment [SOURCE ENV] --locale [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --delivery-token [DELIVERY TOKEN] --branch [BRANCH NAME]',
  '',
  'Using --stack-api-key flag',
  'csdx cm:assets:unpublish --bulk-unpublish --environment [SOURCE ENV] --locale [LOCALE] --stack-api-key [STACK API KEY] --delivery-token [DELIVERY TOKEN]',
];

module.exports = UnpublishCommand;
