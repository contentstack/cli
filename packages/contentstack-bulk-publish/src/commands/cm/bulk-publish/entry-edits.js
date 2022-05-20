const { Command, flags } = require('@contentstack/cli-command');
const { start } = require('../../../producer/publish-edits');
const store = require('../../../util/store.js');
// eslint-disable-next-line node/no-extraneous-require
const { cli } = require('cli-ux');
const configKey = 'publish_edits_on_env';
const { prettyPrint, formatError } = require('../../../util');
const { getStack } = require('../../../util/client.js');
let config;

class EntryEditsCommand extends Command {
  async run() {
    const entryEditsFlags = this.parse(EntryEditsCommand).flags;
    let updatedFlags;
    try {
      updatedFlags = entryEditsFlags.config ? store.updateMissing(configKey, entryEditsFlags) : entryEditsFlags;
    } catch (error) {
      this.error(error.message, { exit: 2 });
    }
    if (this.validate(updatedFlags)) {
      let stack;
      if (!updatedFlags.retryFailed) {
        if (!updatedFlags.alias) {
          updatedFlags.alias = await cli.prompt('Please enter the management token alias to be used');
        }
        updatedFlags.bulkPublish = updatedFlags.bulkPublish !== 'false';
        await this.config.runHook('validateManagementTokenAlias', { alias: updatedFlags.alias });
        config = {
          alias: updatedFlags.alias,
          host: this.region.cma,
          branch: entryEditsFlags.branch,
        };
        stack = getStack(config);
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
    const confirmation = await cli.confirm('Do you want to continue with this configuration ? [yes or no]');
    return confirmation;
  }
}

EntryEditsCommand.description = `Publish edited entries from a specified Content Type to given locales and environments
The entry-edits command is used for publishing entries from the specified content types, to the
specified environments and locales

Content Type(s), Source Environment, Destination Environment(s) and Locale(s) are required for executing the command successfully
But, if retryFailed flag is set, then only a logfile is required
`;

EntryEditsCommand.flags = {
  alias: flags.string({ char: 'a', description: 'Alias for the management token to be used' }),
  retryFailed: flags.string({
    char: 'r',
    description: 'Retry publishing failed entries from the logfile (optional, overrides all other flags)',
  }),
  bulkPublish: flags.string({
    char: 'b',
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used for publishing the entries",
    default: 'true',
  }),
  sourceEnv: flags.string({ char: 's', description: 'Environment from which edited entries will be published' }),
  contentTypes: flags.string({
    char: 't',
    description: 'The Content-Types which will be checked for edited entries',
    multiple: true,
  }),
  locales: flags.string({
    char: 'l',
    description: 'Locales to which edited entries need to be published',
    multiple: true,
  }),
  environments: flags.string({ char: 'e', description: 'Destination environments', multiple: true }),
  config: flags.string({ char: 'c', description: 'Path to config file to be used' }),
  yes: flags.boolean({ char: 'y', description: 'Agree to process the command with the current configuration' }),
  branch: flags.string({
    char: 'B',
    default: 'main',
    description: 'Specify the branch to fetch the content from (default is main branch)',
  }),
};

EntryEditsCommand.examples = [
  'General Usage',
  'csdx cm:bulk-publish:entry-edits -t [CONTENT TYPE 1] [CONTENT TYPE 2] -s [SOURCE_ENV] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]',
  '',
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`',
  'csdx cm:bulk-publish:entry-edits --config [PATH TO CONFIG FILE]',
  'csdx cm:bulk-publish:entry-edits -c [PATH TO CONFIG FILE]',
  '',
  'Using --retryFailed or -r flag',
  'csdx cm:bulk-publish:entry-edits --retryFailed [LOG FILE NAME]',
  'csdx cm:bulk-publish:entry-edits -r [LOG FILE NAME]',
  '',
  'Using --branch or -B flag',
  'csdx cm:bulk-publish:entry-edits -t [CONTENT TYPE 1] [CONTENT TYPE 2] -s [SOURCE_ENV] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] -B [BRANCH NAME]',
];

module.exports = EntryEditsCommand;
