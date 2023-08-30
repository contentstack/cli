const { Command } = require('@contentstack/cli-command');
const { start } = require('../../../producer/nonlocalized-field-changes');
const store = require('../../../util/store.js');
const { cliux } = require('@contentstack/cli-utilities');
const configKey = 'nonlocalized_field_changes';
const { prettyPrint, formatError } = require('../../../util');
const { getStack } = require('../../../util/client.js');
const { printFlagDeprecation, flags } = require('@contentstack/cli-utilities');
let config;

class NonlocalizedFieldChangesCommand extends Command {
  async run() {
    const { flags: nonlocalizedFieldChangesFlags } = await this.parse(NonlocalizedFieldChangesCommand);
    nonlocalizedFieldChangesFlags.retryFailed =
      nonlocalizedFieldChangesFlags['retry-failed'] || nonlocalizedFieldChangesFlags.retryFailed || false;
    nonlocalizedFieldChangesFlags.bulkPublish =
      nonlocalizedFieldChangesFlags['bulk-publish'] || nonlocalizedFieldChangesFlags.bulkPublish;
    nonlocalizedFieldChangesFlags.sourceEnv =
      nonlocalizedFieldChangesFlags['source-env'] || nonlocalizedFieldChangesFlags.sourceEnv;
    nonlocalizedFieldChangesFlags.contentTypes =
      nonlocalizedFieldChangesFlags['content-types'] || nonlocalizedFieldChangesFlags.contentTypes;
      nonlocalizedFieldChangesFlags.apiVersion = nonlocalizedFieldChangesFlags['api-version'] || '3';
      
    delete nonlocalizedFieldChangesFlags['api-version']
    delete nonlocalizedFieldChangesFlags['retry-failed'];
    delete nonlocalizedFieldChangesFlags['bulk-publish'];
    delete nonlocalizedFieldChangesFlags['source-env'];
    delete nonlocalizedFieldChangesFlags['content-types'];

    let updatedFlags;
    try {
      updatedFlags = nonlocalizedFieldChangesFlags.config
        ? store.updateMissing(configKey, nonlocalizedFieldChangesFlags)
        : nonlocalizedFieldChangesFlags;
    } catch (error) {
      this.error(error.message, { exit: 2 });
    }

    if (this.validate(updatedFlags)) {
      let stack;
      if (!updatedFlags.retryFailed) {
        updatedFlags.bulkPublish = updatedFlags.bulkPublish === 'false' ? false : true;
        config = {
          alias: updatedFlags.alias,
          host: this.cmaHost,
          cda: this.cdaHost,
          branch: nonlocalizedFieldChangesFlags.branch,
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
        stack = await getStack(config);
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

  validate({ contentTypes, environments, sourceEnv, retryFailed }) {
    let missing = [];
    if (retryFailed) {
      return true;
    }

    if (!contentTypes || contentTypes.length === 0) {
      missing.push('Content Types');
    }

    if (!sourceEnv) {
      missing.push('SourceEnv');
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

NonlocalizedFieldChangesCommand.description = `Publish non-localized fields for the given content types, from a particular source environment to the specified environments
The non-localized field changes command is used to publish non-localized field changes from the given content types to the specified environments

Note: Content types, Environments and Source Environment are required to execute this command successfully.
But, if retryFailed flag is set, then only a logfile is required`;

NonlocalizedFieldChangesCommand.flags = {
  alias: flags.string({
    char: 'a',
    description: 'Alias(name) for the management token',
  }),
  'stack-api-key': flags.string({
    char: 'k',
    description: 'Stack api key to be used',
    required: false,
  }),
  'retry-failed': flags.string({
    description: 'Retry publishing failed entries from the logfile',
  }),
  'bulk-publish': flags.string({
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used to publish the entries",
    default: 'true',
  }),
  'source-env': flags.string({
    description: 'Source Environment',
  }),
  'content-types': flags.string({
    description: 'The Contenttypes from which entries will be published',
    multiple: true,
  }),
  environments: flags.string({
    char: 'e',
    description: 'Destination environments',
    multiple: true,
  }),
  config: flags.string({
    char: 'c',
    description: 'Path to the config file',
  }),
  yes: flags.boolean({
    char: 'y',
    description: 'Agree to process the command with the current configuration',
  }),
  branch: flags.string({
    char: 'B',
    default: 'main',
    description: 'Specify the branch to fetch the content (by default the main branch is selected)',
    parse: printFlagDeprecation(['-B'], ['--branch']),
  }),

  // To be deprecated
  retryFailed: flags.string({
    char: 'r',
    description: 'Retry publishing failed entries from the logfile',
    hidden: true,
    parse: printFlagDeprecation(['-r', '--retryFailed'], ['--retry-failed']),
  }),
  bulkPublish: flags.string({
    char: 'b',
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used to publish the entries",
    default: 'true',
    hidden: true,
    parse: printFlagDeprecation(['-b', '--bulkPublish'], ['--bulk-publish']),
  }),
  'api-version': flags.string({
    description : "API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].",
  }),
  sourceEnv: flags.string({
    char: 's',
    description: 'Source Environment',
    hidden: true,
    parse: printFlagDeprecation(['-s', '--sourceEnv'], ['--source-env']),
  }),
  contentTypes: flags.string({
    char: 't',
    description: 'The contenttypes from which entries will be published',
    multiple: true,
    hidden: true,
    parse: printFlagDeprecation(['-t', '--contentTypes'], ['--content-types']),
  }),
};

NonlocalizedFieldChangesCommand.examples = [
  'General Usage',
  'csdx cm:entries:publish-non-localized-fields --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --alias [MANAGEMENT TOKEN ALIAS] --source-env [SOURCE ENV]',
  '',
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`',
  'csdx cm:entries:publish-non-localized-fields --config [PATH TO CONFIG FILE]',
  'csdx cm:entries:publish-non-localized-fields -c [PATH TO CONFIG FILE]',
  '',
  'Using --retry-failed flag',
  'csdx cm:entries:publish-non-localized-fields --retry-failed [LOG FILE NAME]',
  '',
  'Using --branch flag',
  'csdx cm:entries:publish-non-localized-fields --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --alias [MANAGEMENT TOKEN ALIAS] --source-env [SOURCE ENV] --branch [BRANCH NAME]',
  '',
  'Using --stack-api-key flag',
  'csdx cm:entries:publish-non-localized-fields --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --stack-api-key [STACK API KEY] --source-env [SOURCE ENV]',
];

NonlocalizedFieldChangesCommand.aliases = ['cm:bulk-publish:nonlocalized-field-changes'];

NonlocalizedFieldChangesCommand.usage =
  'cm:entries:publish-non-localized-fields [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env <value>] [--content-types <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]';

module.exports = NonlocalizedFieldChangesCommand;
