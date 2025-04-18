const { Command } = require('@contentstack/cli-command');
const { printFlagDeprecation, flags, isAuthenticated } = require('@contentstack/cli-utilities');
const { start: startPublish } = require('../../../producer/publish-assets');
const { start: startCrossPublish } = require('../../../producer/cross-publish');
const store = require('../../../util/store.js');
const { cliux } = require('@contentstack/cli-utilities');
const { prettyPrint, formatError } = require('../../../util');
const { getStack } = require('../../../util/client.js');
let config;

class AssetsPublishCommand extends Command {
  async run() {
    const { flags: assetsFlags } = await this.parse(AssetsPublishCommand);
    assetsFlags.retryFailed = assetsFlags['retry-failed'] || assetsFlags.retryFailed || false;
    assetsFlags.folderUid = assetsFlags['folder-uid'] || assetsFlags.folderUid;
    assetsFlags.bulkPublish = assetsFlags['bulk-publish'] || assetsFlags.bulkPublish;
    assetsFlags.apiVersion = assetsFlags['api-version'] || '3'; // setting default value for apiVersion
    delete assetsFlags['api-version'];
    delete assetsFlags['retry-failed'];
    delete assetsFlags['folder-uid'];
    delete assetsFlags['bulk-publish'];

    let updatedFlags;
    try {
      const storeConfigKeyName = assetsFlags['source-env'] ? 'cross_env_publish' : 'publish_assets';
      updatedFlags = assetsFlags.config ? store.updateMissing(storeConfigKeyName, assetsFlags) : assetsFlags;
    } catch (error) {
      this.error(error.message, { exit: 2 });
    }
    if (this.validate(updatedFlags)) {
      let stack;
      if (!updatedFlags.retryFailed) {
        config = {
          host: this.cmaHost,
          cda: this.cdaHost,
          branch: assetsFlags.branch,
        };
        if (updatedFlags.alias) {
          // Validate management token alias.
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
        if (updatedFlags.folderUid === undefined) {
          // set default value for folderUid
          updatedFlags.folderUid = 'cs_root';
        }
        stack = await getStack(config);
      }
      if (await this.confirmFlags(updatedFlags)) {
        try {
          if (process.env.NODE_ENV === 'test') {
            return;
          }
          const publishFunction = async (func) => {
            if (!updatedFlags.retryFailed) {
              try {
                await func(updatedFlags, stack, config);
              } catch (error) {
                let message = formatError(error);
                this.error(message, { exit: 2 });
              }
            } else {
              try {
                await func(updatedFlags);
              } catch (error) {
                let message = formatError(error);
                this.error(message, { exit: 2 });
              }
            }
          };

          if (updatedFlags['source-env']) {
            updatedFlags.deliveryToken = updatedFlags['delivery-token'];
            updatedFlags.destEnv = updatedFlags.environments;
            updatedFlags.environment = updatedFlags['source-env'];
            updatedFlags.onlyAssets = true;
            if (updatedFlags.locales instanceof Array) {
              updatedFlags.locales.forEach((locale) => {
                updatedFlags.locale = locale;
                publishFunction(startCrossPublish);
              });
            } else {
              updatedFlags.locale = locales;
              publishFunction(startCrossPublish);
            }
          } else {
            publishFunction(startPublish);
          }
        } catch (error) {
          let message = formatError(error);
          this.error(message, { exit: 2 });
        }
      } else {
        this.error('Confirmation failed');
      }
    } else {
      this.error('Validation failed');
    }
  }

  validate({ environments, retryFailed, locales, 'source-env': sourceEnv, 'delivery-token': deliveryToken }) {
    let missing = [];
    if (retryFailed) {
      return true;
    }

    if (sourceEnv && !deliveryToken) {
      this.error('Specify source environment delivery token. Please check --help for more details', { exit: 2 });
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
    return await cliux.confirm('Do you want to continue with this configuration ? [yes or no]');
  }
}

AssetsPublishCommand.description = `Publish assets to the specified environments
The assets command is used to publish assets from the specified stack, to the specified environments

Note: Environment(s) and Locale(s) are required to execute the command successfully
But, if retryFailed flag is set, then only a logfile is required
`;

AssetsPublishCommand.flags = {
  alias: flags.string({
    char: 'a',
    description:
      'Alias (name) for the management token. You must use either the --alias flag or the --stack-api-key flag.',
  }),
  'stack-api-key': flags.string({
    char: 'k',
    description: 'API key of the source stack. You must use either the --stack-api-key flag or the --alias flag.',
    required: false,
  }),
  'retry-failed': flags.string({
    description:
      'Use this option to retry publishing the failed assets from the logfile. Specify the name of the logfile that lists failed publish calls. If this option is used, it will override all other flags.',
  }),
  environments: flags.string({
    char: 'e',
    description:
      'The name of the environment on which entries will be published. In case of multiple environments, specify their names separated by spaces.',
    multiple: true,
  }),
  'folder-uid': flags.string({
    description:
      '(optional) The UID of the Assets’ folder from which the assets need to be published. The default value is cs_root.',
    exclusive: ['source-env'],
  }),
  'bulk-publish': flags.string({
    description: 'Set this flag to use Contentstack’s Bulk Publish APIs. It is true, by default.',
    default: 'true',
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
      'Locales in which assets will be published, e.g., en-us. In the case of multiple locales, specify the codes separated by spaces.',
    multiple: true,
    parse: printFlagDeprecation(['-l'], ['--locales']),
  }),
  branch: flags.string({
    char: 'B',
    default: 'main',
    description:
      'The name of the branch where you want to perform the bulk publish operation. If you don’t mention the branch name, then by default the assets from the main branch will be published.',
    parse: printFlagDeprecation(['-B'], ['--branch']),
  }),

  // To be deprecated
  retryFailed: flags.string({
    char: 'r',
    description: 'Retry publishing failed assets from the logfile (optional, will override all other flags).',
    hidden: true,
    parse: printFlagDeprecation(['-r', '--retryFailed'], ['--retry-failed']),
  }),
  folderUid: flags.string({
    char: 'u',
    description: '(default: cs_root) Folder-uid from where the assets will be published.',
    hidden: true,
    parse: printFlagDeprecation(['-u', '--folderUid'], ['--folder-uid']),
    exclusive: ['source-env'],
  }),
  bulkPublish: flags.string({
    char: 'b',
    description:
      "By default this flag is set as true. It indicates that Contentstack's bulk publish API will be used to publish the entries.",
    default: 'true',
    hidden: true,
    parse: printFlagDeprecation(['-b', '--bulkPublish'], ['--bulk-publish']),
  }),
  'api-version': flags.string({
    description: 'API version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].',
  }),
  'delivery-token': flags.string({ description: 'The delivery token of the source environment.' }),
  'source-env': flags.string({ description: 'Source environment' }),
  'content-types': flags.string({ description: 'Content types', hidden: true, multiple: true }),
};

AssetsPublishCommand.examples = [
  'General Usage',
  'csdx cm:assets:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --alias [MANAGEMENT TOKEN ALIAS]',
  '',
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:stacks:publish-configure -a [ALIAS]`',
  'csdx cm:assets:publish --config [PATH TO CONFIG FILE]',
  'csdx cm:assets:publish -c [PATH TO CONFIG FILE]',
  '',
  'Using --retry-failed flag',
  'csdx cm:assets:publish --retry-failed [LOG FILE NAME]',
  '',
  'Using --branch flag',
  'csdx cm:assets:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME]',
  '',
  'Using --source-env',
  'csdx cm:assets:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --source-env [SOURCE ENVIRONMENT] --delivery-token [DELIVERY TOKEN]',
  '',
  'Using --stack-api-key flag',
  'csdx cm:assets:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --stack-api-key [STACK API KEY]',
];

AssetsPublishCommand.aliases = ['cm:bulk-publish:assets'];

AssetsPublishCommand.usage =
  'cm:assets:publish [-a <value>] [--retry-failed <value>] [-e <value>] [--folder-uid <value>] [--bulk-publish <value>] [-c <value>] [-y] [--locales <value>] [--branch <value>] [--delivery-token <value>] [--source-env <value>]';

module.exports = AssetsPublishCommand;
