/* eslint-disable no-console */
/* eslint-disable node/no-extraneous-require */
const { Command } = require('@contentstack/cli-command');
const { printFlagDeprecation, flags } = require('@contentstack/cli-utilities');
const { start: startPublish } = require('../../../producer/publish-entries');
const { start: startCrossPublish } = require('../../../producer/cross-publish');
const store = require('../../../util/store.js');
const { cliux } = require('@contentstack/cli-utilities');
const configKey = 'publish_entries';
const configKeyCrossEnv = 'cross_env_publish';
const { prettyPrint, formatError } = require('../../../util');
const { getStack } = require('../../../util/client.js');
let config;

class PublishEntriesCommand extends Command {
  async run() {
    const { flags: entriesFlags } = await this.parse(PublishEntriesCommand);
    entriesFlags.retryFailed = entriesFlags['retry-failed'] || entriesFlags.retryFailed || false;
    entriesFlags.contentTypes = entriesFlags['content-types'] || entriesFlags.contentTypes;
    entriesFlags.bulkPublish = entriesFlags['bulk-publish'] || entriesFlags.bulkPublish;
    entriesFlags.publishAllContentTypes =
      entriesFlags['publish-all-content-types'] || entriesFlags.publishAllContentTypes || false;
    entriesFlags.apiVersion = entriesFlags['api-version'] || '3';
    delete entriesFlags['api-version'];
    delete entriesFlags['retry-failed'];
    delete entriesFlags['content-types'];
    delete entriesFlags['bulk-publish'];
    delete entriesFlags['publish-all-content-types'];

    let updatedFlags;
    try {
      const storeConfigKey = entriesFlags['source-env'] ? configKeyCrossEnv : configKey;
      updatedFlags = entriesFlags.config ? store.updateMissing(storeConfigKey, entriesFlags) : entriesFlags;
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
          branch: entriesFlags.branch,
        };
        if (updatedFlags.alias) {
          try {
            this.getToken(updatedFlags.alias);
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
        updatedFlags.bulkPublish = updatedFlags.bulkPublish !== 'false';
        stack = await getStack(config);
      }
      if (await this.confirmFlags(updatedFlags)) {
        try {
          if (process.env.NODE_ENV === 'test') {
            return;
          }
          const publishFunction = async (func) => {
            // eslint-disable-next-line no-negated-condition
            if (!updatedFlags.retryFailed) {
              await func(updatedFlags, stack, config);
            } else {
              await func(updatedFlags);
            }
          };

          if (updatedFlags['source-env']) {
            updatedFlags.deliveryToken = updatedFlags['delivery-token'];
            updatedFlags.destEnv = updatedFlags.environments;
            updatedFlags.environment = updatedFlags['source-env'];
            updatedFlags.onlyEntries = true;
            if (updatedFlags.locales instanceof Array) {
              updatedFlags.locales.forEach((locale) => {
                updatedFlags.locale = locale;
                publishFunction(startCrossPublish);
              });
            } else {
              updatedFlags.locale = locales;
              publishFunction(startCrossPublish);
            }
          } else {
            publishFunction(startPublish);
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

  validate({
    contentTypes,
    locales,
    environments,
    retryFailed,
    publishAllContentTypes,
    'source-env': sourceEnv,
    'delivery-token': deliveryToken,
  }) {
    let missing = [];
    if (retryFailed) {
      return true;
    }

    if (sourceEnv && !deliveryToken) {
      this.error('Specify source environment delivery token. Please check --help for more details', { exit: 2 });
    }

    if (publishAllContentTypes && contentTypes && contentTypes.length > 0) {
      this.error(
        'Do not specify contentTypes when publishAllContentTypes flag is set. Please check --help for more details',
        { exit: 2 },
      );
    }

    if ((!contentTypes || contentTypes.length === 0) && !publishAllContentTypes) {
      missing.push('Content Types');
    }

    if (!locales || locales.length === 0) {
      missing.push('Locales');
    }

    if (!environments || environments.length === 0) {
      missing.push('Environments');
    }

    if (missing.length > 0) {
      this.error(
        `${missing.join(', ')} are required for processing this command. Please check --help for more details`,
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

PublishEntriesCommand.description = `Publish entries from multiple contenttypes to multiple environments and locales
The publish command is used to publish entries from the specified content types, to the
specified environments and locales

Note: Content Types, Environments and Locales are required to execute the command successfully
But, if retry-failed flag is set, then only a logfile is required
`;

PublishEntriesCommand.flags = {
  alias: flags.string({ char: 'a', description: 'Alias(name) for the management token' }),
  'stack-api-key': flags.string({
    char: 'k',
    description: 'Stack api key to be used',
  }),
  retryFailed: flags.string({
    char: 'r',
    description:
      'Retry failed entries from the logfile (optional, overrides all other flags) This flag is used to retry publishing entries that failed to publish in a previous attempt. A log file for the previous session will be required for processing the failed entries',
    hidden: true,
    parse: printFlagDeprecation(['-r', '--retryFailed'], ['--retry-failed']),
  }),
  'retry-failed': flags.string({
    description:
      '(optional) Retry failed entries from the logfile (overrides all other flags) This flag is used to retry publishing entries that failed to publish in a previous attempt. A log file for the previous session will be required for processing the failed entries',
  }),
  bulkPublish: flags.string({
    char: 'b',
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used to publish the entries",
    hidden: true,
    parse: printFlagDeprecation(['-b', '--bulkPublish'], ['--bulk-publish']),
  }),
  'bulk-publish': flags.string({
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used to publish the entries",
    default: 'true',
  }),
  'api-version': flags.string({
    description : "API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].",
  }),
  'publish-all-content-types': flags.boolean({
    description: '(optional) Publish all contenttypes (cannot be set when contentTypes flag is set)',
  }),
  publishAllContentTypes: flags.boolean({
    char: 'o',
    description: 'Publish all content-types (optional, cannot be set when contentTypes flag is set)',
    hidden: true,
    parse: printFlagDeprecation(['-o', '--publishAllContentTypes'], ['--publish-all-content-types']),
  }),
  'content-types': flags.string({
    description: 'The Contenttypes from which entries need to be published',
    multiple: true,
  }),
  contentTypes: flags.string({
    char: 't',
    description: 'The Contenttypes from which entries will be published',
    multiple: true,
    parse: printFlagDeprecation(['-t', '--contentTypes'], ['--content-types']),
    hidden: true,
  }),
  locales: flags.string({
    char: 'l',
    description: 'Locales where entries will be published',
    multiple: true,
    parse: printFlagDeprecation(['-l'], ['--locales']),
  }),
  environments: flags.string({
    char: 'e',
    description: 'Environments where entries will be published',
    multiple: true,
  }),
  config: flags.string({
    char: 'c',
    description:
      'Path for the external config file (A new config file can be generated at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`)',
  }),
  yes: flags.boolean({ char: 'y', description: 'Agree to process the command with the current configuration' }),
  branch: flags.string({
    char: 'B',
    default: 'main',
    description: 'Specify the branch to fetch the content (by default the main branch is selected)',
    parse: printFlagDeprecation(['-B'], ['--branch']),
  }),
  'delivery-token': flags.string({ description: 'Delivery token for source environment' }),
  'source-env': flags.string({ description: 'Source environment' }),
};

PublishEntriesCommand.examples = [
  'General Usage',
  'csdx cm:entries:publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]',
  '',
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:stacks:publish-configure -a [ALIAS]`',
  'csdx cm:entries:publish --config [PATH TO CONFIG FILE]',
  'csdx cm:entries:publish -c [PATH TO CONFIG FILE]',
  '',
  'Using --retry-failed',
  'csdx cm:entries:publish --retry-failed [LOG FILE NAME]',
  'csdx cm:entries:publish -r [LOG FILE NAME]',
  '',
  'Using --branch',
  'csdx cm:entries:publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME]',
  '',
  'Using --source-env',
  'csdx cm:entries:publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] --source-env [SOURCE ENVIRONMENT] --delivery-token [DELIVERY TOKEN]',
  '',
  'Using --stack-api-key',
  'csdx cm:entries:publish -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] --stack-api-key [STACK API KEY] --source-env [SOURCE ENVIRONMENT] --delivery-token [DELIVERY TOKEN]',
];

PublishEntriesCommand.aliases = ['cm:bulk-publish:entries'];

PublishEntriesCommand.usage =
  'cm:entries:publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--publish-all-content-types] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>] [--delivery-token <value>] [--source-env <value>]';

module.exports = PublishEntriesCommand;
