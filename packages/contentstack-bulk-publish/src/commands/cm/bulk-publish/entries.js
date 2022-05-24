/* eslint-disable no-console */
/* eslint-disable node/no-extraneous-require */
const { Command, flags } = require('@contentstack/cli-command');
const { start } = require('../../../producer/publish-entries');
const store = require('../../../util/store.js');
const { ux: cli } = require('@contentstack/cli-utilities');
const configKey = 'publish_entries';
const { prettyPrint, formatError } = require('../../../util');
const { getStack } = require('../../../util/client.js');
let config;

class EntriesCommand extends Command {
  async run() {
    const entriesFlags = this.parse(EntriesCommand).flags;
    let updatedFlags;
    try {
      updatedFlags = entriesFlags.config ? store.updateMissing(configKey, entriesFlags) : entriesFlags;
    } catch (error) {
      this.error(error.message, { exit: 2 });
    }
    if (this.validate(updatedFlags)) {
      let stack;
      if (!updatedFlags.retryFailed) {
        if (!updatedFlags.alias) {
          updatedFlags.alias = await cli.prompt('Provide the alias of the management token to use');
        }
        updatedFlags.bulkPublish = updatedFlags.bulkPublish !== 'false';
        // Validate management token alias.
        try {
          this.getToken(updatedFlags.alias);
        } catch (error) {
          this.error(`The configured management token alias ${updatedFlags.alias} has not been added yet. Add it using 'csdx auth:tokens:add -a ${updatedFlags.alias}'`, {exit: 2})
        }
        config = {
          alias: updatedFlags.alias,
          host: this.region.cma,
          branch: entriesFlags.branch,
        };
        stack = getStack(config);
      }
      if (await this.confirmFlags(updatedFlags)) {
        try {
          // eslint-disable-next-line no-negated-condition
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

  validate({ contentTypes, locales, environments, retryFailed, publishAllContentTypes }) {
    let missing = [];
    if (retryFailed) {
      return true;
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
    const confirmation = await cli.confirm('Do you want to continue with this configuration ? [yes or no]');
    return confirmation;
  }
}

EntriesCommand.description = `Publish entries from multiple content-types to multiple environments and locales
The entries command is used for publishing entries from the specified content types, to the
specified environments and locales 

Content Types, Environments and Locales are required for executing the command successfully
But, if retryFailed flag is set, then only a logfile is required
`;

EntriesCommand.flags = {
  alias: flags.string({ char: 'a', description: 'Alias for the management token to be used' }),
  retryFailed: flags.string({
    char: 'r',
    description:
      'Retry failed entries from the logfile (optional, overrides all other flags) This flag is used to retry publishing entries that failed to publish in a previous attempt. A log file for the previous session will be required for processing the failed entries',
  }),
  bulkPublish: flags.string({
    char: 'b',
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used for publishing the entries",
    default: 'true',
  }),
  publishAllContentTypes: flags.boolean({
    char: 'o',
    description: 'Publish all content-types (optional, cannot be set when contentTypes flag is set)',
  }),
  contentTypes: flags.string({
    char: 't',
    description: 'The Content-types from which entries need to be published',
    multiple: true,
  }),
  locales: flags.string({ char: 'l', description: 'Locales to which entries need to be published', multiple: true }),
  environments: flags.string({
    char: 'e',
    description: 'Environments to which entries need to be published',
    multiple: true,
  }),
  config: flags.string({
    char: 'c',
    description:
      'Path for the external config file to be used (A new config file can be generated at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`)',
  }),
  yes: flags.boolean({ char: 'y', description: 'Agree to process the command with the current configuration' }),
  branch: flags.string({
    char: 'B',
    default: 'main',
    description: 'Specify the branch to fetch the content from (default is main branch)',
  }),
};

EntriesCommand.examples = [
  'General Usage',
  'csdx cm:bulk-publish:entries -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]',
  '',
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`',
  'csdx cm:bulk-publish:entries --config [PATH TO CONFIG FILE]',
  'csdx cm:bulk-publish:entries -c [PATH TO CONFIG FILE]',
  '',
  'Using --retryFailed or -r flag',
  'csdx cm:bulk-publish:entries --retryFailed [LOG FILE NAME]',
  'csdx cm:bulk-publish:entries -r [LOG FILE NAME]',
  '',
  'Using --branch or -B flag',
  'csdx cm:bulk-publish:entries -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] -B [BRANCH NAME]',
];

module.exports = EntriesCommand;
