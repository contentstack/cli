/* eslint-disable node/no-extraneous-require */
const { Command, flags } = require('@oclif/command');
const { cliux } = require('@contentstack/cli-utilities');
const { start } = require('../../../producer/cross-publish');
const store = require('../../../util/store.js');
const configKey = 'cross_env_publish';
const { prettyPrint, formatError } = require('../../../util');
const { getStack } = require('../../../util/client.js');
let config;

class CrossPublishCommand extends Command {
  async run() {
    const crossPublishFlags = this.parse(CrossPublishCommand).flags;
    let updatedFlags;
    try {
      updatedFlags = crossPublishFlags.config ? store.updateMissing(configKey, crossPublishFlags) : crossPublishFlags;
    } catch (error) {
      this.error(error.message, { exit: 2 });
    }

    if (this.validate(updatedFlags)) {
      let stack;
      if (!updatedFlags.retryFailed) {
        if (!updatedFlags.alias) {
          updatedFlags.alias = await cliux.prompt('Please enter the management token alias to be used');
        }
        if (!updatedFlags.deliveryToken) {
          updatedFlags.deliveryToken = await cliux.prompt('Enter delivery token of your source environment');
        }
        updatedFlags.bulkPublish = updatedFlags.bulkPublish === 'false' ? false : true;
        // Validate management token alias.
        try {
          this.getToken(updatedFlags.alias);
        } catch (error) {
          this.error(`The configured management token alias ${updatedFlags.alias} has not been added yet. Add it using 'csdx auth:tokens:add -a ${updatedFlags.alias}'`, {exit: 2})
        }
        config = {
          alias: updatedFlags.alias,
          host: this.region.cma,
          cda: this.region.cda,
          branch: crossPublishFlags.branch,
        };
        stack = getStack(config);
      }

      if (!updatedFlags.deliveryToken && updatedFlags.deliveryToken.length === 0) {
        this.error('Delivery Token is required for executing this command', { exit: 2 });
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

  validate({ environment, retryFailed, destEnv, onlyAssets, contentType, onlyEntries, locale }) {
    let missing = [];
    if (retryFailed) {
      return true;
    }

    if (onlyAssets && onlyEntries) {
      this.error(
        `The flags onlyAssets and onlyEntries need not be used at the same time. Unpublish command unpublishes entries and assts at the same time by default`,
      );
    }

    if (onlyAssets && contentType) {
      this.error(
        `Specifying content-type and onlyAssets together will have unexpected results. Please do not use these 2 flags together. Thank you.`,
      );
    }

    if (!environment) {
      missing.push('Environment');
    }

    if (!destEnv) {
      missing.push('Destination Environment');
    }

    if (!locale) {
      missing.push('Locale');
    }

    if (missing.length > 0) {
      this.error(
        `${missing.join(', ')} is required for processing this command. Please check --help for more details`,
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

CrossPublishCommand.description = `Publish entries and assets from one environment to other environments
The cross-publish command is used for publishing entries and assets from one evironment to other environments

Content Type, Environment, Destination Environment(s) and Locale are required for executing the command successfully
But, if retryFailed flag is set, then only a logfile is required
`;

CrossPublishCommand.flags = {
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
  contentType: flags.string({ char: 't', description: 'Content-Type filter' }),
  locale: flags.string({ char: 'l', description: 'Locale filter' }),
  environment: flags.string({ char: 'e', description: 'Source Environment' }),
  deliveryToken: flags.string({ char: 'x', description: 'Delivery Token for source environment' }),
  destEnv: flags.string({ char: 'd', description: 'Destination Environments', multiple: true }),
  config: flags.string({ char: 'c', description: 'Path to config file to be used' }),
  yes: flags.boolean({ char: 'y', description: 'Agree to process the command with the current configuration' }),
  branch: flags.string({
    char: 'B',
    default: 'main',
    description: 'Specify the branch to fetch the content from (default is main branch)',
  }),
  onlyAssets: flags.boolean({ description: 'Unpublish only assets', default: false }),
  onlyEntries: flags.boolean({ description: 'Unpublish only entries', default: false }),
};

CrossPublishCommand.examples = [
  'General Usage',
  'csdx cm:bulk-publish:cross-publish -t [CONTENT TYPE] -e [SOURCE ENV] -d [DESTINATION ENVIRONMENT] -l [LOCALE] -a [MANAGEMENT TOKEN ALIAS] -x [DELIVERY TOKEN]',
  '',
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`',
  'csdx cm:bulk-publish:cross-publish --config [PATH TO CONFIG FILE]',
  'csdx cm:bulk-publish:cross-publish -c [PATH TO CONFIG FILE]',
  '',
  'Using --retryFailed or -r flag',
  'csdx cm:bulk-publish:cross-publish --retryFailed [LOG FILE NAME]',
  'csdx cm:bulk-publish:cross-publish -r [LOG FILE NAME]',
  '',
  'Using --branch or -B flag',
  'csdx cm:bulk-publish:cross-publish -t [CONTENT TYPE] -e [SOURCE ENV] -d [DESTINATION ENVIRONMENT] -l [LOCALE] -a [MANAGEMENT TOKEN ALIAS] -x [DELIVERY TOKEN] -B [BRANCH NAME]',
];

module.exports = CrossPublishCommand;
