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
    entriesFlags.includeVariants = entriesFlags['include-variants'] || entriesFlags.includeVariants || false;
    entriesFlags.entryUid = entriesFlags['entry-uid'] || entriesFlags.entryUid;

    if (entriesFlags.entryUid === undefined) {
      delete entriesFlags['entryUid'];
    }
    delete entriesFlags['api-version'];
    delete entriesFlags['retry-failed'];
    delete entriesFlags['content-types'];
    delete entriesFlags['bulk-publish'];
    delete entriesFlags['publish-all-content-types'];
    delete entriesFlags['include-variants'];
    delete entriesFlags['entry-uid'];

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
          delayMs: updatedFlags.delayMs,
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
          this.error('Use the `--alias` or `--stack-api-key` flag to proceed.', { exit: 2 });
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
            if(Array.isArray(updatedFlags.contentTypes) && updatedFlags.contentTypes.length > 0){
              for (const contentType of updatedFlags.contentTypes) {
                updatedFlags.contentType = contentType;
                if (Array.isArray(updatedFlags.locales)) {
                  for (const locale of updatedFlags.locales) {
                    updatedFlags.locale = locale;
                    console.log(`Bulk publish started for content type \x1b[36m${updatedFlags.contentType}\x1b[0m and locale is \x1b[36m${updatedFlags.locale}\x1b[0m`);
                    await publishFunction(startCrossPublish);
                  }
                } else {
                  updatedFlags.locale = updatedFlags.locales;
                  publishFunction(startCrossPublish);
                }
              }
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
      this.error('Specify the source environment delivery token. Run --help for more details.', { exit: 2 });
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

    return await cliux.confirm('Do you want to continue with this configuration ? [yes or no]');
  }
}

PublishEntriesCommand.description = `Publish entries from multiple contenttypes to multiple environments and locales
The publish command is used to publish entries from the specified content types, to the
specified environments and locales

Note: Content Types, Environments and Locales are required to execute the command successfully
But, if retry-failed flag is set, then only a logfile is required
`;

PublishEntriesCommand.flags = {
  alias: flags.string({
    char: 'a',
    description:
      'Alias (name) of the management token. You must use either the --alias flag or the --stack-api-key flag.',
  }),
  'stack-api-key': flags.string({
    char: 'k',
    description: 'API key of the source stack. You must use either the --stack-api-key flag or the --alias flag.',
  }),
  retryFailed: flags.string({
    char: 'r',
    description:
      '(optional) Use this option to retry publishing the failed entries/ assets from the logfile. Specify the name of the logfile that lists failed publish calls. If this option is used, it will override all other flags.',
    hidden: true,
    parse: printFlagDeprecation(['-r', '--retryFailed'], ['--retry-failed']),
  }),
  'retry-failed': flags.string({
    description:
      '(optional) Use this option to retry publishing the failed entries/ assets from the logfile. Specify the name of the logfile that lists failed publish calls. If this option is used, it will override all other flags.',
  }),
  bulkPublish: flags.string({
    char: 'b',
    description: `Set this flag to use Contentstack\'s Bulk Publish APIs. This flag is set to true, by default.`,
    hidden: true,
    parse: printFlagDeprecation(['-b', '--bulkPublish'], ['--bulk-publish']),
  }),
  'bulk-publish': flags.string({
    description: `Set this flag to use Contentstack\'s Bulk Publish APIs. This flag is set to true, by default.`,
    default: 'true',
  }),
  'api-version': flags.string({
    description: 'API version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].',
  }),
  'publish-all-content-types': flags.boolean({
    description:
      '(optional) Set it to true to bulk publish entries from all content types. If the --content-types option is already used, then you cannot use this option.',
  }),
  publishAllContentTypes: flags.boolean({
    char: 'o',
    description:
      '(optional) Set it to true to bulk publish entries from all content types. If the --content-types option is already used, then you cannot use this option.',
    hidden: true,
    parse: printFlagDeprecation(['-o', '--publishAllContentTypes'], ['--publish-all-content-types']),
  }),
  'content-types': flags.string({
    description:
      'The UID of the content type(s) whose entries you want to publish in bulk. In case of multiple content types, specify the IDs separated by spaces.',
    multiple: true,
  }),
  contentTypes: flags.string({
    char: 't',
    description:
      'The UID of the content type(s) whose entries you want to publish in bulk. In case of multiple content types, specify the IDs separated by spaces.',
    multiple: true,
    parse: printFlagDeprecation(['-t', '--contentTypes'], ['--content-types']),
    hidden: true,
  }),
  locales: flags.string({
    char: 'l',
    description:
      ' Locales in which entries will be published, e.g., en-us. In the case of multiple locales, specify the codes separated by spaces.',
    multiple: true,
    parse: printFlagDeprecation(['-l'], ['--locales']),
  }),
  environments: flags.string({
    char: 'e',
    description:
      'The name of the environment on which entries will be published. In case of multiple environments, specify their names separated by spaces.',
    multiple: true,
  }),
  config: flags.string({
    char: 'c',
    description:
      '(optional) The path of the optional configuration JSON file containing all the options for a single run. Refer to the configure command to create a configuration file.',
  }),
  yes: flags.boolean({
    char: 'y',
    description: 'Set it to true to process the command with the current configuration.',
  }),
  branch: flags.string({
    char: 'B',
    default: 'main',
    description:
      'The name of the branch where you want to perform the bulk publish operation. If you don’t mention the branch name, then by default the content from main branch will be published.',
    parse: printFlagDeprecation(['-B'], ['--branch']),
  }),
  'delivery-token': flags.string({ description: 'The delivery token of the source environment.' }),
  'source-env': flags.string({ description: 'Source environment' }),
  'entry-uid': flags.string({ description: 'Entry Uid for publish all associated variant entries.' }),
  'include-variants': flags.boolean({
    default: false, // set the default value to false
    description: 'Include Variants flag will publish all associated variant entries with base entry.',
  }),
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
  '',
  'Using --include-variants',
  'csdx cm:entries:publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] --stack-api-key [STACK API KEY] --source-env [SOURCE ENVIRONMENT] --delivery-token [DELIVERY TOKEN] [--include-variants]',
  '',
  'Using --entry-uid and --include-variants',
  'csdx cm:entries:publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] --stack-api-key [STACK API KEY] --source-env [SOURCE ENVIRONMENT] --delivery-token [DELIVERY TOKEN] --entry-uid [ENTRY UID] [--include-variants]',
];

PublishEntriesCommand.aliases = ['cm:bulk-publish:entries'];

PublishEntriesCommand.usage =
  'cm:entries:publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--publish-all-content-types] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>] [--delivery-token <value>] [--source-env <value>] [--entry-uid <value>] [--include-variants]';

module.exports = PublishEntriesCommand;
