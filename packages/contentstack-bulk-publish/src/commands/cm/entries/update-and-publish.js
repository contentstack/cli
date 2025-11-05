const { Command } = require('@contentstack/cli-command');
const { printFlagDeprecation, cliux, flags } = require('@contentstack/cli-utilities');

const store = require('../../../util/store.js');
const { getStack } = require('../../../util/client.js');
const { start } = require('../../../producer/add-fields');
const { prettyPrint, formatError } = require('../../../util');

let config;
const configKey = 'addFields';

class UpdateAndPublishCommand extends Command {
  async run() {
    const { flags: addFieldsFlags } = await this.parse(UpdateAndPublishCommand);
    addFieldsFlags.retryFailed = addFieldsFlags['retry-failed'] || addFieldsFlags.retryFailed || false;
    addFieldsFlags.contentTypes = addFieldsFlags['content-types'] || addFieldsFlags.contentTypes;
    addFieldsFlags.bulkPublish = addFieldsFlags['bulk-publish'] || addFieldsFlags.bulkPublish;
    addFieldsFlags.apiVersion = addFieldsFlags['api-version'] || '3';
    delete addFieldsFlags['api-version'];
    delete addFieldsFlags['retry-failed'];
    delete addFieldsFlags['content-types'];
    delete addFieldsFlags['bulk-publish'];

    let updatedFlags;
    try {
      updatedFlags = addFieldsFlags.config ? store.updateMissing(configKey, addFieldsFlags) : addFieldsFlags;
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
          branch: addFieldsFlags.branch,
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
          this.error('Please use `--alias` or `--stack-api-key` to proceed.', { exit: 2 });
        }
        updatedFlags.bulkPublish = updatedFlags.bulkPublish === 'false' ? false : true;

        stack = await getStack(config);
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

  validate({ contentTypes, locales, environments, retryFailed }) {
    let missing = [];
    if (retryFailed) {
      return true;
    }

    if (!contentTypes || contentTypes.length === 0) {
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

UpdateAndPublishCommand.description = `Add fields from updated content types to their respective entries
The update-and-publish command is used to update existing entries with the updated schema of the respective content type

Note: Content types, Environments and Locales are required to execute the command successfully
But, if retry-failed flag is set, then only a logfile is required
`;

UpdateAndPublishCommand.flags = {
  alias: flags.string({
    char: 'a',
    description:
      'Alias (name) of the management token. You must use either the --alias flag or the --stack-api-key flag.',
  }),
  'stack-api-key': flags.string({
    char: 'k',
    description: 'API key of the source stack. You must use either the --stack-api-key flag or the --alias flag.',
  }),
  'retry-failed': flags.string({
    description:
      'Use this option to retry publishing the failed entries from the logfile. Specify the name of the logfile that lists failed publish calls. If this option is used, it will override all other flags.',
  }),
  'bulk-publish': flags.string({
    description: 'Set this flag to use Contentstack’s Bulk Publish APIs. It is true, by default.',
    default: 'true',
  }),
  'api-version': flags.string({
    description: 'API version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].',
  }),
  'content-types': flags.string({
    description:
      'The UID of the content type ID whose entries you want to publish in bulk. In case of multiple content types, specify their IDs separated by spaces.',
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
  locales: flags.string({
    char: 'l',
    description:
      'Locales in which entries will be published, e.g., en-us. In the case of multiple locales, specify the codes separated by spaces.',
    multiple: true,
    parse: printFlagDeprecation(['-l'], ['--locales']),
  }),
  branch: flags.string({
    char: 'B',
    default: 'main',
    description:
      'The name of the branch where you want to perform the bulk publish operation. If you don’t mention the branch name, then by default the content from the main branch will be published.',
    parse: printFlagDeprecation(['-B'], ['--branch']),
  }),
  force: flags.boolean({
    default: false,
    description: 'Update and publish all entries even if no fields have been added.',
  }),

  // To be deprecated
  retryFailed: flags.string({
    char: 'r',
    description: 'Retry publishing failed entries from the logfile (optional, overrides all other flags).',
    hidden: true,
    parse: printFlagDeprecation(['-r', '--retryFailed'], ['--retry-failed']),
  }),
  bulkPublish: flags.string({
    char: 'b',
    description:
      "This flag is set to true by default. It indicates that contentstack's bulk publish API will be used to publish the entries.",
    hidden: true,
    parse: printFlagDeprecation(['-b', '--bulkPublish'], ['--bulk-publish']),
  }),
  contentTypes: flags.string({
    char: 't',
    description: 'The Contenttypes from which entries will be published.',
    multiple: true,
    parse: printFlagDeprecation(['-t', '--contentTypes'], ['--content-types']),
  }),
};

UpdateAndPublishCommand.examples = [
  'General Usage',
  'csdx cm:entries:update-and-publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]',
  '',
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:stacks:publish-configure -a [ALIAS]`',
  'csdx cm:entries:update-and-publish --config [PATH TO CONFIG FILE]',
  'csdx cm:entries:update-and-publish -c [PATH TO CONFIG FILE]',
  '',
  'Using --retry-failed',
  'csdx cm:entries:update-and-publish --retry-failed [LOG FILE NAME]',
  '',
  'Using --branch',
  'csdx cm:entries:update-and-publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME]',
  '',
  'Using --stack-api-key',
  'csdx cm:entries:update-and-publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] --stack-api-key [STACK API KEY]',
];

UpdateAndPublishCommand.aliases = ['cm:bulk-publish:add-fields'];

UpdateAndPublishCommand.usage =
  'cm:entries:update-and-publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--content-types <value>] [-t <value>] [-e <value>] [-c <value>] [-y] [--locales <value>] [--branch <value>]';

module.exports = UpdateAndPublishCommand;
