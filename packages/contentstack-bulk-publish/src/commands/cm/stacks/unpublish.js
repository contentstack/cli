/* eslint-disable no-console */
/* eslint-disable node/no-extraneous-require */
const { Command } = require('@contentstack/cli-command');
const { printFlagDeprecation, cliux, flags } = require('@contentstack/cli-utilities');
const { start } = require('../../../producer/unpublish');
const store = require('../../../util/store.js');
const configKey = 'Unpublish';
const { prettyPrint, formatError } = require('../../../util');
const { getStack } = require('../../../util/client.js');
let config;

class UnpublishCommand extends Command {
  async run() {
    const { flags: unpublishFlags } = await this.parse(UnpublishCommand);
    unpublishFlags.retryFailed = unpublishFlags['retry-failed'] || unpublishFlags.retryFailed;
    unpublishFlags.bulkUnpublish = unpublishFlags['bulk-unpublish'] || unpublishFlags.bulkUnpublish;
    unpublishFlags.contentType = unpublishFlags['content-type'] || unpublishFlags.contentType;
    unpublishFlags.deliveryToken = unpublishFlags['delivery-token'] || unpublishFlags.deliveryToken;
    unpublishFlags.onlyAssets = unpublishFlags['only-assets'] || unpublishFlags.onlyAssets;
    unpublishFlags.onlyEntries = unpublishFlags['only-entries'] || unpublishFlags.onlyEntries;
    unpublishFlags.apiVersion = unpublishFlags['api-version'] || '3';
    delete unpublishFlags['api-version'];
    delete unpublishFlags['retry-failed'];
    delete unpublishFlags['bulk-unpublish'];
    delete unpublishFlags['content-type'];
    delete unpublishFlags['delivery-token'];
    delete unpublishFlags['only-assets'];
    delete unpublishFlags['only-entries'];

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
          alias: updatedFlags.alias,
          host: this.cmaHost,
          cda: this.cdaHost,
          branch: unpublishFlags.branch,
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

UnpublishCommand.description = `Unpublish entries or assets of given content types from the specified environment
The unpublish command is used to unpublish entries or assets from given environment

Environment (Source Environment) and Locale are required to execute the command successfully
But, if retry-failed flag is set, then only a logfile is required

A content type can be specified for unpublishing entries, but if no content-type(s) is/are specified and --only-assets is not used,
then all entries from all content types will be unpublished from the source environment

Note: --only-assets can be used to unpublish only assets and --only-entries can be used to unpublish only entries.
(--only-assets and --only-entries cannot be used together at the same time)
`;

UnpublishCommand.flags = {
  alias: flags.string({
    char: 'a',
    description: 'Alias(name) for the management token',
  }),
  'stack-api-key': flags.string({
    char: 'k',
    description: 'Stack api key to be used',
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
    char: 'l',
    description: 'Locale filter',
    parse: printFlagDeprecation(['-l'], ['--locale']),
  }),
  branch: flags.string({
    char: 'B',
    default: 'main',
    description: 'Specify the branch to fetch the content from (default is main branch)',
    parse: printFlagDeprecation(['-B'], ['--branch']),
  }),
  'retry-failed': flags.string({
    description: 'Retry publishing failed entries from the logfile (optional, overrides all other flags)',
  }),
  'bulk-unpublish': flags.string({
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used to unpublish the entries and assets",
    default: 'true',
  }),
  'api-version': flags.string({
    description : "API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].",
  }),
  'content-type': flags.string({
    description: 'Content type filter',
  }),
  'delivery-token': flags.string({
    description: 'Delivery token for source environment',
  }),
  'only-assets': flags.boolean({
    description: 'Unpublish only assets',
    default: false,
    hidden: true,
  }),
  'only-entries': flags.boolean({
    description: 'Unpublish only entries',
    default: false,
    hidden: true,
  }),

  // To be deprecated
  retryFailed: flags.string({
    char: 'r',
    description: 'Retry publishing failed entries from the logfile',
    hidden: true,
    parse: printFlagDeprecation(['-r', '--retryFailed'], ['--retry-failed']),
  }),
  bulkUnpublish: flags.string({
    char: 'b',
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used for publishing the entries",
    default: 'true',
    hidden: true,
    parse: printFlagDeprecation(['-b', '--bulkUnpublish'], ['--bulk-unpublish']),
  }),
  contentType: flags.string({
    char: 't',
    description: 'Content Type filter',
    hidden: true,
    parse: printFlagDeprecation(['-t', '--contentType'], ['--content-type']),
  }),
  deliveryToken: flags.string({
    char: 'x',
    description: 'Delivery Token for source environment',
    hidden: true,
    parse: printFlagDeprecation(['-x', '--deliveryToken'], ['--delivery-token']),
  }),
  onlyAssets: flags.boolean({
    description: 'Unpublish only assets',
    default: false,
    hidden: true,
    parse: printFlagDeprecation(['--onlyAssets'], ['--only-assets']),
  }),
  onlyEntries: flags.boolean({
    description: 'Unpublish only entries',
    default: false,
    hidden: true,
    parse: printFlagDeprecation(['--onlyEntries'], ['--only-entries']),
  }),
};

UnpublishCommand.examples = [
  'General Usage',
  'csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] ----delivery-token [DELIVERY TOKEN]',
  '',
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure --alias [ALIAS]`',
  'csdx cm:stacks:unpublish --config [PATH TO CONFIG FILE]',
  'csdx cm:stacks:unpublish -c [PATH TO CONFIG FILE]',
  '',
  'Using --retry-failed flag',
  'csdx cm:stacks:unpublish --retry-failed [LOG FILE NAME]',
  '',
  'No content type',
  'csdx cm:stacks:unpublish --environment [SOURCE ENV] --locale [LOCALE] (Will unpublish all entries from all content types and assets from the source environment)',
  '',
  'Using --only-assets',
  'csdx cm:stacks:unpublish --environment [SOURCE ENV] --locale [LOCALE] --only-assets (Will unpublish only assets from the source environment)',
  '',
  'Using --only-entries',
  'csdx cm:stacks:unpublish --environment [SOURCE ENV] --locale [LOCALE] --only-entries (Will unpublish only entries, all entries, from the source environment)',
  'csdx cm:stacks:unpublish --contentType [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --only-entries (Will unpublish only entries, (from CONTENT TYPE) from the source environment)',
  '',
  'Using --branch flag',
  'csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --delivery-token [DELIVERY TOKEN] --branch [BRANCH NAME]',
  '',
  'Using --stack-api-key flag',
  'csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --stack-api-key [STACK API KEY] --delivery-token [DELIVERY TOKEN]',
];

UnpublishCommand.aliases = ['cm:bulk-publish:unpublish'];

UnpublishCommand.usage =
  'csdx cm:stacks:unpublish [-a <value>] [-e <value>] [-c <value>] [-y] [--locale <value>] [--branch <value>] [--retry-failed <value>] [--bulk-unpublish <value>] [--content-type <value>] [--delivery-token <value>] [--only-assets] [--only-entries]';

module.exports = UnpublishCommand;
