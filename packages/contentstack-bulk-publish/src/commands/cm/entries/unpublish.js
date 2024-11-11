/* eslint-disable no-console */
/* eslint-disable node/no-extraneous-require */
const { Command } = require('@contentstack/cli-command');
const { cliux, flags } = require('@contentstack/cli-utilities');
const { start } = require('../../../producer/unpublish');
const store = require('../../../util/store.js');
const configKey = 'Unpublish';
const { prettyPrint, formatError } = require('../../../util');
const { getStack } = require('../../../util/client.js');
let config;

class UnpublishCommand extends Command {
  async run() {
    const { flags: unpublishFlags } = await this.parse(UnpublishCommand);
    unpublishFlags.retryFailed = unpublishFlags['retry-failed'] || unpublishFlags.retryFailed || false;
    unpublishFlags.bulkUnpublish = unpublishFlags['bulk-unpublish'] || unpublishFlags.bulkUnpublish;
    unpublishFlags.contentType = unpublishFlags['content-type'] || unpublishFlags.contentType || '';
    unpublishFlags.deliveryToken = unpublishFlags['delivery-token'] || unpublishFlags.deliveryToken;
    unpublishFlags.onlyAssets = false;
    unpublishFlags.onlyEntries = true;
    unpublishFlags.apiVersion = unpublishFlags['api-version'] || '3';
    unpublishFlags.includeVariants = unpublishFlags['include-variants'] || false;
    delete unpublishFlags['api-version'];
    delete unpublishFlags['retry-failed'];
    delete unpublishFlags['bulk-unpublish'];
    delete unpublishFlags['content-type'];
    delete unpublishFlags['delivery-token'];
    delete unpublishFlags['include-variants'];

    let updatedFlags;
    try {
      updatedFlags = unpublishFlags.config ? store.updateMissing(configKey, unpublishFlags) : unpublishFlags;
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
          branch: unpublishFlags.branch,
        };
        if (updatedFlags.alias) {
          try {
            this.getToken(updatedFlags.alias);
          } catch (error) {
            this.error(
              `The configured management token alias ${updatedFlags.alias} has not been added yet. Add it using 'csdx auth:tokens:add --alias ${updatedFlags.alias}'`,
              { exit: 2 },
            );
          }
        } else if (updatedFlags['stack-api-key']) {
          config.stackApiKey = updatedFlags['stack-api-key'];
        } else {
          this.error('Please use `--alias` or `--stack-api-key` to proceed.', { exit: 2 });
        }
        if (!updatedFlags.deliveryToken) {
          updatedFlags.deliveryToken = await cliux.prompt('Enter delivery token of your source environment');
        }
        updatedFlags.bulkUnpublish = updatedFlags.bulkUnpublish === 'false' ? false : true;
        stack = await getStack(config);
      }
      if (!updatedFlags.deliveryToken && updatedFlags.deliveryToken.length === 0) {
        this.error('Delivery Token is required for executing this command', { exit: 2 });
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

  validate({ environment, retryFailed, locale }) {
    let missing = [];
    if (retryFailed) {
      return true;
    }

    if (!environment) {
      missing.push('Environment');
    }

    // Locales apply to assets as well
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
    if (!data.contentType) {
      return cliux.confirm(
        'Do you want to continue with this configuration. This will unpublish all the entries from all content types? [yes or no]',
      );
    } else {
      return cliux.confirm('Do you want to continue with this configuration ? [yes or no]');
    }
  }
}

UnpublishCommand.description = `Unpublish entries from the given environment
The unpublish command is used to unpublish entries from the given environment

Note: Environment (Source Environment) and Locale are required to execute the command successfully
But, if retry-failed flag is set, then only a logfile is required`;

UnpublishCommand.flags = {
  alias: flags.string({
    char: 'a',
    description: 'Alias (name) for the management token. You must use either the --alias flag or the --stack-api-key flag.',
    description: 'Alias (name) for the management token. You must use either the --alias flag or the --stack-api-key flag.',
  }),
  'stack-api-key': flags.string({
    char: 'k',
    description: 'API key of the source stack. You must use either the --stack-api-key flag or the --alias flag.',
  }),
  environment: flags.string({
    char: 'e',
    description: 'The name of the environment from where entries/assets need to be unpublished.',
  }),
  config: flags.string({
    char: 'c',
    description: '(optional) Path to the configuration JSON file containing all options for a single run. Refer to the configure command to create a configuration file.',
  }),
  yes: flags.boolean({
    char: 'y',
    description: 'Set to true to process the command with the current configuration.',
  }),
  locale: flags.string({
    description: 'Locale from which entries/assets will be unpublished, e.g., en-us.',
  }),
  branch: flags.string({
    default: 'main',
    description: 'Specify the branch to fetch the content. If not mentioned, the main branch will be used by default.',
  }),
  'retry-failed': flags.string({
    description: '(optional) Use this option to retry unpublishing the failed entries from the logfile. Specify the name of the logfile that lists failed unpublish calls. If used, this option will override all other flags.',
  }),
  'bulk-unpublish': flags.string({
    description: "This flag is set to true by default. It indicates that Contentstack's Bulk Publish APIs will be used to unpublish the entries.",
    default: 'true',
  }),
  'api-version': flags.string({
    description: 'API version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].',
  }),
  'content-type': flags.string({
    description: 'The UID of the content type whose entries you want to unpublish in bulk.',
  }),
  'delivery-token': flags.string({
    description: 'The delivery token of the source environment.',
  }),
  'include-variants': flags.boolean({ 
    default: false, // set the default value to false
    description: 'Include Variants flag will unpublish all associated variant entries.' 
  }),
};

UnpublishCommand.examples = [
  'General Usage',
  'csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --delivery-token [DELIVERY TOKEN]',
  '',
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure --alias [ALIAS]`',
  'csdx cm:stacks:unpublish --config [PATH TO CONFIG FILE]',
  'csdx cm:stacks:unpublish -c [PATH TO CONFIG FILE]',
  '',
  'Using --retry-failed flag',
  'csdx cm:stacks:unpublish --retry-failed [LOG FILE NAME]',
  '',
  'Using --branch flag',
  'csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --delivery-token [DELIVERY TOKEN] --branch [BRANCH NAME]',
  '',
  'Using --stack-api-key flag',
  'csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --stack-api-key [STACK API KEY] --delivery-token [DELIVERY TOKEN]',
  '',
  'Using --include-variants flag',
  'csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --stack-api-key [STACK API KEY] --delivery-token [DELIVERY TOKEN] --include-variants',
];

module.exports = UnpublishCommand;
