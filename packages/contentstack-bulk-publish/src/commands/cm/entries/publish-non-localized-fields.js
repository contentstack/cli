const { Command } = require('@contentstack/cli-command');
const { start } = require('../../../producer/nonlocalized-field-changes');
const store = require('../../../util/store.js');
const { cliux } = require('@contentstack/cli-utilities');
const configKey = 'nonlocalized_field_changes';
const { prettyPrint, formatError } = require('../../../util');
const { getStack } = require('../../../util/client.js');
const { flags } = require('@contentstack/cli-utilities');
let config;

class NonlocalizedFieldChangesCommand extends Command {
  async run() {
    const { flags: nonlocalizedFieldChangesFlags } = await this.parse(NonlocalizedFieldChangesCommand);
    nonlocalizedFieldChangesFlags.retryFailed =
      nonlocalizedFieldChangesFlags['retry-failed'] || false;
    nonlocalizedFieldChangesFlags.bulkPublish =
      nonlocalizedFieldChangesFlags['bulk-publish'];
    nonlocalizedFieldChangesFlags.sourceEnv =
      nonlocalizedFieldChangesFlags['source-env'];
    nonlocalizedFieldChangesFlags.contentTypes =
      nonlocalizedFieldChangesFlags['content-types'];
    nonlocalizedFieldChangesFlags.apiVersion = nonlocalizedFieldChangesFlags['api-version'] || '3';

    delete nonlocalizedFieldChangesFlags['api-version'];
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
          delayMs: updatedFlags.delayMs,
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
          this.error('Use the `--alias` or `--stack-api-key` flag to proceed.', { exit: 2 });
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
    return await cliux.confirm('Do you want to continue with this configuration ? [yes or no]');
  }
}

NonlocalizedFieldChangesCommand.description = `Publish non-localized fields for the given content types, from a particular source environment to the specified environments
The non-localized field changes command is used to publish non-localized field changes from the given content types to the specified environments

Note: Content types, Environments and Source Environment are required to execute this command successfully.
But, if retryFailed flag is set, then only a logfile is required`;

NonlocalizedFieldChangesCommand.flags = {
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
  'retry-failed': flags.string({
    description:
      'Use this option to retry publishing the failed entries from the logfile. Specify the name of the logfile that lists failed publish calls. If this option is used, it will override all other flags.',
  }),
  'bulk-publish': flags.string({
    description: 'Set this flag to use Contentstack’s Bulk Publish APIs. It is true, by default.',
    default: 'true',
  }),
  'source-env': flags.string({
    description: 'The name of the source environment.',
  }),
  'content-types': flags.string({
    description:
      'The UID of the content type whose entries you want to publish in bulk. In case of multiple content types, specify their IDs separated by spaces.',
    multiple: true,
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
    default: 'main',
    description:
      "The name of the branch where you want to perform the bulk publish operation. If you don't mention the branch name, then by default the content from the main branch will be published.",
  }),

  'api-version': flags.string({
    description: 'API version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].',
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
