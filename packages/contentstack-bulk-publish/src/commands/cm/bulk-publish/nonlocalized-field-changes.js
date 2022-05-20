const { Command, flags } = require('@contentstack/cli-command');
const { start } = require('../../../producer/nonlocalized-field-changes');
const store = require('../../../util/store.js');
const { cli } = require('cli-ux');
const configKey = 'nonlocalized_field_changes';
const { prettyPrint, formatError } = require('../../../util');
const { getStack } = require('../../../util/client.js');
let config;

class NonlocalizedFieldChangesCommand extends Command {
  async run() {
    const nonlocalizedFieldChangesFlags = this.parse(NonlocalizedFieldChangesCommand).flags;
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
        await this.config.runHook('validateManagementTokenAlias', { alias: updatedFlags.alias });
        config = {
          alias: updatedFlags.alias,
          host: this.region.cma,
          branch: nonlocalizedFieldChangesFlags.branch,
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
    const confirmation = await cli.confirm('Do you want to continue with this configuration ? [yes or no]');
    return confirmation;
  }
}

NonlocalizedFieldChangesCommand.description = `Publish non-localized-fields for given Content Types, from a particular source environment to specified environments
The nonlocalized-field-changes command is used for publishing nonlocalized field changes from the given Content Types to
the specified Environments

Content Types, Environments and Source Environment are required for executing this command successfully.
But, if retryFailed flag is set, then only a logfile is required
`;

NonlocalizedFieldChangesCommand.flags = {
  alias: flags.string({ char: 'a', description: 'Alias for the management token to be used' }),
  retryFailed: flags.string({ char: 'r', description: 'Retry publishing failed entries from the logfile' }),
  bulkPublish: flags.string({
    char: 'b',
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used for publishing the entries",
    default: 'true',
  }),
  sourceEnv: flags.string({ char: 's', description: 'Source Environment' }),
  contentTypes: flags.string({
    char: 't',
    description: 'The Content-Types from which entries need to be published',
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

NonlocalizedFieldChangesCommand.examples = [
  'General Usage',
  'csdx cm:bulk-publish:nonlocalized-field-changes -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] -s [SOURCE ENV]',
  '',
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`',
  'csdx cm:bulk-publish:nonlocalized-field-changes --config [PATH TO CONFIG FILE]',
  'csdx cm:bulk-publish:nonlocalized-field-changes -c [PATH TO CONFIG FILE]',
  '',
  'Using --retryFailed or -r flag',
  'csdx cm:bulk-publish:nonlocalized-field-changes --retryFailed [LOG FILE NAME]',
  'csdx cm:bulk-publish:nonlocalized-field-changes -r [LOG FILE NAME]',
  '',
  'Using --branch or -B flag',
  'csdx cm:bulk-publish:nonlocalized-field-changes -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] -B [BRANCH NAME] -s [SOURCE ENV]',
];

module.exports = NonlocalizedFieldChangesCommand;
