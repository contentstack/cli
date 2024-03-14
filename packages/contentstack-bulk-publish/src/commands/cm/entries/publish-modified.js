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
  alias: flags.string({ char: 'a', description: 'Alias(name) for the management token' }),
  'stack-api-key': flags.string({
    char: 'k',
    description: 'Stack api key to be used',
    required: false,
  }),
  retryFailed: flags.string({
    char: 'r',
    description: 'Retry publishing failed entries from the logfile (optional, overrides all other flags)',
    hidden: true,
    parse: printFlagDeprecation(['-r', '--retryFailed'], ['--retry-failed']),
  }),
  'retry-failed': flags.string({
    description: 'Retry publishing failed entries from the logfile (optional, overrides all other flags)',
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
  sourceEnv: flags.string({
    char: 's',
    description: 'Environment from which edited entries will be published',
    hidden: true,
    parse: printFlagDeprecation(['-s', '--sourceEnv'], ['--source-env']),
  }),
  'source-env': flags.string({
    description: 'Environment from which edited entries will be published',
  }),
  contentTypes: flags.string({
    char: 't',
    description: 'The Content-Types which will be checked for edited entries',
    multiple: true,
    parse: printFlagDeprecation(['-t', '--contentTypes'], ['--content-types']),
    hidden: true,
  }),
  'content-types': flags.string({
    description: 'The Contenttypes which will be checked for edited entries',
    multiple: true,
  }),
  locales: flags.string({
    char: 'l',
    description: 'Locales where edited entries will be published',
    multiple: true,
    parse: printFlagDeprecation(['-l'], ['--locales']),
  }),
  environments: flags.string({ char: 'e', description: 'Destination environments', multiple: true }),
  config: flags.string({ char: 'c', description: 'Path to the config file' }),
  yes: flags.boolean({ char: 'y', description: 'Agree to process the command with the current configuration' }),
  branch: flags.string({
    char: 'B',
    default: 'main',
    description: 'Specify the branch to fetch the content (by default the main branch is selected)',
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
