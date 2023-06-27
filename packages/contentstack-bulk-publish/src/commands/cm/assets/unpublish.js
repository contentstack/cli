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
    delete unpublishFlags['api-version']
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

    return cliux.confirm('Do you want to continue with this configuration ? [yes or no]');
  }
}

UnpublishCommand.description = `Unpublish assets from given environment
The unpublish command is used for unpublishing assets from the given environment

Note: Environment (Source Environment) and Locale are required to execute the command successfully
But, if retry-failed flag is set, then only a logfile is required`;

UnpublishCommand.flags = {
  alias: flags.string({
    char: 'a',
    description: 'Alias(name) for the management token',
  }),
  'stack-api-key': flags.string({
    description: 'Stack api key to be used',
    required: false,
  }),
  environment: flags.string({
    char: 'e',
    description: 'Source Environment',
  }),
  config: flags.string({
    char: 'c',
    description: 'Path to the config file',
  }),
  yes: flags.boolean({
    char: 'y',
    description: 'Agree to process the command with the current configuration',
  }),
  locale: flags.string({
    description: 'Locale filter',
  }),
  branch: flags.string({
    default: 'main',
    description: 'Specify the branch to fetch the content (by default the main branch is selected)',
  }),
  'retry-failed': flags.string({
    description: 'Retry unpublishing failed assets from the logfile',
  }),
  'bulk-unpublish': flags.string({
    description:
      "By default this flag is set as true. It indicates that contentstack's bulkpublish API will be used to unpublish the assets",
    default: 'true',
  }),
  'api-version': flags.string({
    description : "API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].",
  }),
  'delivery-token': flags.string({
    description: 'Delivery Token for source environment',
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
];

module.exports = UnpublishCommand;
