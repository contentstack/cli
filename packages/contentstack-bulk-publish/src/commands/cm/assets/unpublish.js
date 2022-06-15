/* eslint-disable no-console */
/* eslint-disable node/no-extraneous-require */
const { Command, flags } = require('@contentstack/cli-command');
const { cli } = require('cli-ux');
const { start } = require('../../../producer/unpublish');
const store = require('../../../util/store.js');
const configKey = 'Unpublish';
const { prettyPrint, formatError } = require('../../../util');
const { getStack } = require('../../../util/client.js');
let config;

class UnpublishCommand extends Command {
  async run() {
    const unpublishFlags = this.parse(UnpublishCommand).flags;
    unpublishFlags.retryFailed = unpublishFlags['retry-failed'] || unpublishFlags.retryFailed || false;
    unpublishFlags.bulkUnpublish = unpublishFlags['bulk-unpublish'] || unpublishFlags.bulkUnpublish;
    unpublishFlags.deliveryToken = unpublishFlags['delivery-token'] || unpublishFlags.deliveryToken;
    unpublishFlags.onlyAssets = true;
    unpublishFlags.onlyEntries = false;
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
        if (!updatedFlags.alias) {
          updatedFlags.alias = await cli.prompt('Please enter the management token alias to be used');
        }
        if (!updatedFlags.deliveryToken) {
          updatedFlags.deliveryToken = await cli.prompt('Enter delivery token of your source environment');
        }
        updatedFlags.bulkUnpublish = updatedFlags.bulkUnpublish === 'false' ? false : true;
        // Validate management token alias.
        try {
          this.getToken(updatedFlags.alias);
        } catch (error) {
          this.error(
            `The configured management token alias ${updatedFlags.alias} has not been added yet. Add it using 'csdx auth:tokens:add --alias ${updatedFlags.alias}'`,
            { exit: 2 },
          );
        }
        config = {
          alias: updatedFlags.alias,
          host: this.region.cma,
          cda: this.region.cda,
          branch: unpublishFlags.branch,
        };
        stack = getStack(config);
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

    return cli.confirm('Do you want to continue with this configuration ? [yes or no]');
  }
}

UnpublishCommand.description = `Unpublish assets from given environment
The unpublish command is used for unpublishing assets from given environment

Environment (Source Environment) and Locale are required for executing the command successfully
But, if retry-failed flag is set, then only a logfile is required`;

UnpublishCommand.flags = {
  alias: flags.string({
    char: 'a',
    description: 'Alias for the management token to be used',
  }),
  environment: flags.string({
    char: 'e',
    description: 'Source Environment',
  }),
  config: flags.string({
    char: 'c',
    description: 'Path to config file to be used',
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
    description: 'Specify the branch to fetch the content from (default is main branch)',
  }),
  'retry-failed': flags.string({
    description: 'Retry publishing failed entries from the logfile',
  }),
  'bulk-unpublish': flags.string({
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used for publishing the entries",
    default: 'true',
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
