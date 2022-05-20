const { Command, flags } = require('@contentstack/cli-command');
const { start } = require('../../../producer/publish-unpublished-env');
const store = require('../../../util/store.js');
const { cli } = require('cli-ux');
const configKey = 'publish_unpublished_env';
const { prettyPrint, formatError } = require('../../../util');
const { getStack } = require('../../../util/client.js');
let config;

class UnpublishedEntriesCommand extends Command {
  async run() {
    const unpublishedEntriesFlags = this.parse(UnpublishedEntriesCommand).flags;
    let updatedFlags;
    try {
      updatedFlags = unpublishedEntriesFlags.config
        ? store.updateMissing(configKey, unpublishedEntriesFlags)
        : unpublishedEntriesFlags;
    } catch (error) {
      this.error(error.message, { exit: 2 });
    }
    if (this.validate(updatedFlags)) {
      let stack;
      if (!updatedFlags.retryFailed) {
        if (!updatedFlags.alias) {
          updatedFlags.alias = await cli.prompt('Please enter the management token alias to be used');
        }
        updatedFlags.bulkPublish = updatedFlags.bulkPublish === 'false' ? false : true;
        await this.config.runHook('validateManagementTokenAlias', { alias: updatedFlags.alias });
        config = {
          alias: updatedFlags.alias,
          host: this.region.cma,
          branch: unpublishedEntriesFlags.branch,
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

  validate({ contentTypes, environments, sourceEnv, locale, retryFailed }) {
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

    if (!locale) {
      missing.push('Source Locale');
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

UnpublishedEntriesCommand.description = `Publish unpublished entries from the source environment, to other environments and locales
The unpublished-entries command is used for publishing unpublished entries from the source environment, to other environments and locales

Content Type(s), Source Environment, Destination Environment(s) and Source Locale are required for executing the command successfully
But, if retryFailed flag is set, then only a logfile is required
`;

UnpublishedEntriesCommand.flags = {
  alias: flags.string({ char: 'a', description: 'Alias for the management token to be used' }),
  retryFailed: flags.string({ char: 'r', description: 'Retry publishing failed entries from the logfile' }),
  bulkPublish: flags.string({
    char: 'b',
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used for publishing the entries",
    default: 'true',
  }),
  sourceEnv: flags.string({ char: 's', description: 'Source Env' }),
  contentTypes: flags.string({
    char: 't',
    description: 'The Content-Types from which entries need to be published',
    multiple: true,
  }),
  locale: flags.string({ char: 'l', description: 'Source locale' }),
  environments: flags.string({ char: 'e', description: 'Destination environments', multiple: true }),
  config: flags.string({ char: 'c', description: 'Path to config file to be used' }),
  yes: flags.boolean({ char: 'y', description: 'Agree to process the command with the current configuration' }),
  branch: flags.string({
    char: 'B',
    default: 'main',
    description: 'Specify the branch to fetch the content from (default is main branch)',
  }),
};

UnpublishedEntriesCommand.examples = [
  'General Usage',
  'csdx cm:bulk-publish:unpublished-entries -b -t [CONTENT TYPES] -e [ENVIRONMENTS] -l LOCALE -a [MANAGEMENT TOKEN ALIAS] -s [SOURCE ENV]',
  '',
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`',
  'csdx cm:bulk-publish:unpublished-entries --config [PATH TO CONFIG FILE]',
  'csdx cm:bulk-publish:unpublished-entries -c [PATH TO CONFIG FILE]',
  '',
  'Using --retryFailed or -r flag',
  'csdx cm:bulk-publish:unpublished-entries --retryFailed [LOG FILE NAME]',
  'csdx cm:bulk-publish:unpublished-entries -r [LOG FILE NAME]',
  '',
  'Using --branch or -B flag',
  'csdx cm:bulk-publish:unpublished-entries -b -t [CONTENT TYPES] -e [ENVIRONMENTS] -l LOCALE -a [MANAGEMENT TOKEN ALIAS] -B [BRANCH NAME] -s [SOURCE ENV]',
];

module.exports = UnpublishedEntriesCommand;
