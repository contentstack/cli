/* eslint-disable no-console */
/* eslint-disable node/no-extraneous-require */
const { Command, flags } = require('@oclif/command');
const { cliux } = require('@contentstack/cli-utilities');
const { start } = require('../../../producer/unpublish');
const store = require('../../../util/store.js');
const configKey = 'Unpublish';
const { prettyPrint, formatError } = require('../../../util');
const { getStack } = require('../../../util/client.js');
let config;

class UnpublishCommand extends Command {
  async run() {
    const unpublishFlags = this.parse(UnpublishCommand).flags;
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
          updatedFlags.alias = await cliux.prompt('Please enter the management token alias to be used');
        }
        if (!updatedFlags.deliveryToken) {
          updatedFlags.deliveryToken = await cliux.prompt('Enter delivery token of your source environment');
        }
        updatedFlags.bulkUnpublish = updatedFlags.bulkUnpublish === 'false' ? false : true;
        // Validate management token alias.
        try {
          this.getToken(updatedFlags.alias);
        } catch (error) {
          this.error(`The configured management token alias ${updatedFlags.alias} has not been added yet. Add it using 'csdx auth:tokens:add -a ${updatedFlags.alias}'`, {exit: 2})
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

  validate({ environment, retryFailed, locale, contentType, onlyAssets, onlyEntries }) {
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
    let confirmation;
    prettyPrint(data);
    if (data.yes) {
      return true;
    }

    if (!data.contentType && !data.onlyAssets) {
      confirmation = await cliux.confirm(
        'Do you want to continue with this configuration. This will unpublish all the entries from all content types? [yes or no]',
      );
    } else {
      confirmation = await cliux.confirm('Do you want to continue with this configuration ? [yes or no]');
    }
    return confirmation;
  }
}

UnpublishCommand.description = `Unpublish entries of given Content Types from given environment
The unpublish command is used for unpublishing entries from given environment

Environment (Source Environment) and Locale are required for executing the command successfully
But, if retryFailed flag is set, then only a logfile is required

A Content Type can be specified for publishing entries, but if no content-type(s) is/are specified and --onlyAssets is not used,
then all entries from all content types will be unpublished from the source environment

--onlyAssets can be used to unpublish only assets and --onlyEntries can be used to unpublish only entries.
(--onlyAssets and --onlyEntries cannot be used together at the same time)
`;

UnpublishCommand.flags = {
  alias: flags.string({ char: 'a', description: 'Alias for the management token to be used' }),
  retryFailed: flags.string({ char: 'r', description: 'Retry publishing failed entries from the logfile' }),
  bulkUnpublish: flags.string({
    char: 'b',
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used for publishing the entries",
    default: 'true',
  }),
  contentType: flags.string({ char: 't', description: 'Content Type filter' }),
  locale: flags.string({ char: 'l', description: 'Locale filter' }),
  environment: flags.string({ char: 'e', description: 'Source Environment' }),
  deliveryToken: flags.string({ char: 'x', description: 'Delivery Token for source environment' }),
  config: flags.string({ char: 'c', description: 'Path to config file to be used' }),
  yes: flags.boolean({ char: 'y', description: 'Agree to process the command with the current configuration' }),
  onlyAssets: flags.boolean({ description: 'Unpublish only assets', default: false }),
  onlyEntries: flags.boolean({ description: 'Unpublish only entries', default: false }),
  branch: flags.string({
    char: 'B',
    default: 'main',
    description: 'Specify the branch to fetch the content from (default is main branch)',
  }),
};

UnpublishCommand.examples = [
  'General Usage',
  'csdx cm:bulk-publish:unpublish -b -t [CONTENT TYPE] -e [SOURCE ENV] -l [LOCALE] -a [MANAGEMENT TOKEN ALIAS] -x [DELIVERY TOKEN]',
  '',
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`',
  'csdx cm:bulk-publish:unpublish --config [PATH TO CONFIG FILE]',
  'csdx cm:bulk-publish:unpublish -c [PATH TO CONFIG FILE]',
  '',
  'Using --retryFailed or -r flag',
  'csdx cm:bulk-publish:unpublish --retryFailed [LOG FILE NAME]',
  'csdx cm:bulk-publish:unpublish -r [LOG FILE NAME]',
  '',
  'No content type',
  'csdx cm:bulk-publish:unpublish --environment [SOURCE ENV] --locale [LOCALE] (Will unpublish all entries from all content types and assets from the source environment)',
  '',
  'Using --onlyAssets',
  'csdx cm:bulk-publish:unpublish --environment [SOURCE ENV] --locale [LOCALE] --onlyAssets (Will unpublish only assets from the source environment)',
  '',
  'Using --onlyEntries',
  'csdx cm:bulk-publish:unpublish --environment [SOURCE ENV] --locale [LOCALE] --onlyEntries (Will unpublish only entries, all entries, from the source environment)',
  'csdx cm:bulk-publish:unpublish --contentType [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --onlyEntries (Will unpublish only entries, (from CONTENT TYPE) from the source environment)',
  '',
  'Using --branch or -B flag',
  'csdx cm:bulk-publish:unpublish -b -t [CONTENT TYPE] -e [SOURCE ENV] -l [LOCALE] -a [MANAGEMENT TOKEN ALIAS] -x [DELIVERY TOKEN] -B [BRANCH NAME]',
];

module.exports = UnpublishCommand;
