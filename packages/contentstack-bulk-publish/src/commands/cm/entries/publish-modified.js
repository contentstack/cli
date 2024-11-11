const { Command } = require('@contentstack/cli-command');
const { printFlagDeprecation, flags } = require('@contentstack/cli-utilities');
const { start } = require('../../../producer/publish-edits');
const store = require('../../../util/store.js');
// eslint-disable-next-line node/no-extraneous-require
const { cliux } = require('@contentstack/cli-utilities');
const configKey = 'publish_edits_on_env';
const { prettyPrint, formatError } = require('../../../util');
const { getStack } = require('../../../util/client.js');
let config;

class PublishModifiedCommand extends Command {
  async run() {
    const { flags: entryEditsFlags } = await this.parse(PublishModifiedCommand);
    entryEditsFlags.retryFailed = entryEditsFlags['retry-failed'] || entryEditsFlags.retryFailed || false;
    entryEditsFlags.contentTypes = entryEditsFlags['content-types'] || entryEditsFlags.contentTypes;
    entryEditsFlags.bulkPublish = entryEditsFlags['bulk-publish'] || entryEditsFlags.bulkPublish;
    entryEditsFlags.sourceEnv = entryEditsFlags['source-env'] || entryEditsFlags.sourceEnv;
    entryEditsFlags.apiVersion = entryEditsFlags['api-version'] || '3';
    delete entryEditsFlags['api-version']
    delete entryEditsFlags['retry-failed'];
    delete entryEditsFlags['content-types'];
    delete entryEditsFlags['bulk-publish'];
    delete entryEditsFlags['source-env'];

    let updatedFlags;
    try {
      updatedFlags = entryEditsFlags.config ? store.updateMissing(configKey, entryEditsFlags) : entryEditsFlags;
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
          branch: entryEditsFlags.branch,
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

  validate({ contentTypes, environments, sourceEnv, locales, retryFailed }) {
    let missing = [];
    if (retryFailed) {
      return true;
    }

    if (!contentTypes || contentTypes.length === 0) {
      missing.push('Content Types');
    }

    if (!sourceEnv || sourceEnv.length === 0) {
      missing.push('SourceEnv');
    }

    if (!environments || environments.length === 0) {
      missing.push('Environments');
    }

    if (!locales || locales.length === 0) {
      missing.push('Locales');
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

PublishModifiedCommand.description = `Publish edited entries from a specified content type to the given locales and environments
The publish-modified command is used to publish entries from the specified content types, to the
specified environments and locales

Note: Content type(s), Source Environment, Destination Environment(s) and Locale(s) are required to execute the command successfully
But, if retry-failed flag is set, then only a logfile is required
`;

PublishModifiedCommand.flags = {
  alias: flags.string({ char: 'a', description: 'Alias (name) of the management token. You must use either the --alias flag or the --stack-api-key flag.' }),
  'stack-api-key': flags.string({
    char: 'k',
    description: 'API key of the source stack. You must use either the --stack-api-key flag or the --alias flag.',
    required: false,
  }),
  retryFailed: flags.string({
    char: 'r',
    description: '(optional) Use this option to retry publishing the failed entries/assets from the logfile. Specify the name of the logfile that lists failed publish calls. If this option is used, it will override all other flags',
    hidden: true,
    parse: printFlagDeprecation(['-r', '--retryFailed'], ['--retry-failed']),
  }),
  'retry-failed': flags.string({
    description: '(optional) Use this option to retry publishing the failed entries/assets from the logfile. Specify the name of the logfile that lists failed publish calls. If this option is used, it will override all other flags',
  }),
  bulkPublish: flags.string({
    char: 'b',
    description:
      "Set this flag to use Contentstack\'s Bulk Publish APIs. It is true, by default.",
    hidden: true,
    parse: printFlagDeprecation(['-b', '--bulkPublish'], ['--bulk-publish']),
  }),
  'bulk-publish': flags.string({
    description:
      "Set this flag to use Contentstack\'s Bulk Publish APIs. It is true, by default.",
    default: 'true',
  }),
  'api-version': flags.string({
    description : "API version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].",
  }),
  sourceEnv: flags.string({
    char: 's',
    description: 'The name of the source environment where the entries were initially published.',
    hidden: true,
    parse: printFlagDeprecation(['-s', '--sourceEnv'], ['--source-env']),
  }),
  'source-env': flags.string({
    description: 'The name of the source environment where the entries were initially published.',
  }),
  contentTypes: flags.string({
    char: 't',
    description: 'The UID of the content type(s) whose edited entries you want to publish in bulk. In case of multiple content types, specify the IDs separated by spaces.',
    multiple: true,
    parse: printFlagDeprecation(['-t', '--contentTypes'], ['--content-types']),
    hidden: true,
  }),
  'content-types': flags.string({
    description: 'The UID of the content type(s) whose edited entries you want to publish in bulk. In case of multiple content types, specify the IDs separated by spaces.',
    multiple: true,
  }),
  locales: flags.string({
    char: 'l',
    description: 'Locales in which entries will be published, e.g., en-us. In the case of multiple locales, specify the codes separated by spaces.',
    multiple: true,
    parse: printFlagDeprecation(['-l'], ['--locales']),
  }),
  environments: flags.string({ char: 'e', description: 'The name of the environment(s) on which the entries will be published. In case of multiple environments, specify their names separated by spaces.', multiple: true }),
  config: flags.string({ char: 'c', description: '(optional) The path of the optional configuration JSON file containing all the options for a single run. Refer to the configure command to create a configuration file.' }),
  yes: flags.boolean({ char: 'y', description: 'Set it to true to process the command with the current configuration.' }),
  branch: flags.string({
    char: 'B',
    default: 'main',
    description: 'The name of the branch where you want to perform the bulk publish operation. If you don\'t mention the branch name, then by default the entries from main branch will be published.',
    parse: printFlagDeprecation(['-B'], ['--branch']),
  }),
};

PublishModifiedCommand.examples = [
  'General Usage',
  'csdx cm:entries:publish-modified --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --source-env [SOURCE_ENV] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]',
  '',
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:stacks:publish-configure -a [ALIAS]`',
  'csdx cm:entries:publish-modified --config [PATH TO CONFIG FILE]',
  'csdx cm:entries:publish-modified -c [PATH TO CONFIG FILE]',
  '',
  'Using --retry-failed',
  'csdx cm:entries:publish-modified --retry-failed [LOG FILE NAME]',
  'csdx cm:entries:publish-modified -r [LOG FILE NAME]',
  '',
  'Using --branch',
  'csdx cm:entries:publish-modified --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --source-env [SOURCE_ENV] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME]',
  '',
  'Using --stack-api-key',
  'csdx cm:entries:publish-modified --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --source-env [SOURCE_ENV] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -stack-api-key [STACK API KEY]',
];

PublishModifiedCommand.aliases = ['cm:bulk-publish:entry-edits'];

PublishModifiedCommand.usage =
  'cm:entries:publish-modified [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env <value>] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]';

module.exports = PublishModifiedCommand;
