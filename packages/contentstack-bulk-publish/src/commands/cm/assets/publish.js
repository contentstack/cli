const { Command, flags } = require('@contentstack/cli-command');
const { start } = require('../../../producer/publish-assets');
const store = require('../../../util/store.js');
const { cliux } = require('@contentstack/cli-utilities');
const configKey = 'publish_assets';
const { prettyPrint, formatError } = require('../../../util');
const { getStack } = require('../../../util/client.js');
const { printFlagDeprecation } = require('@contentstack/cli-utilities');
let config;

class AssetsPublishCommand extends Command {
  async run() {
    const assetsFlags = this.parse(AssetsPublishCommand).flags;
    assetsFlags.retryFailed = assetsFlags['retry-failed'] || assetsFlags.retryFailed;
    assetsFlags.folderUid = assetsFlags['folder-uid'] || assetsFlags.folderUid;
    assetsFlags.bulkPublish = assetsFlags['bulk-publish'] || assetsFlags.bulkPublish;
    delete assetsFlags['retry-failed'];
    delete assetsFlags['folder-uid'];
    delete assetsFlags['bulk-publish'];

    let updatedFlags;
    try {
      updatedFlags = assetsFlags.config ? store.updateMissing(configKey, assetsFlags) : assetsFlags;
    } catch (error) {
      this.error(error.message, { exit: 2 });
    }
    if (this.validate(updatedFlags)) {
      let stack;
      if (!updatedFlags.retryFailed) {
        if (!updatedFlags.alias) {
          updatedFlags.alias = await cliux.prompt('Please enter the management token alias to be used');
        }
        updatedFlags.bulkPublish = updatedFlags.bulkPublish === 'false' ? false : true;
        if (updatedFlags.folderUid === undefined) {
          // set default value for folderUid
          updatedFlags.folderUid = 'cs_root';
        }
        // Validate management token alias.
        try {
          this.getToken(updatedFlags.alias);
        } catch (error) {
          this.error(`The configured management token alias ${updatedFlags.alias} has not been added yet. Add it using 'csdx auth:tokens:add -a ${updatedFlags.alias}'`, {exit: 2})
        }
        config = {
          alias: updatedFlags.alias,
          host: this.region.cma,
          branch: assetsFlags.branch,
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

  validate({ environments, retryFailed, locales }) {
    let missing = [];
    if (retryFailed) {
      return true;
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

AssetsPublishCommand.description = `Publish assets to specified environments
The assets command is used for publishing assets from the specified stack, to the specified environments

Environment(s) and Locale(s) are required for executing the command successfully
But, if retryFailed flag is set, then only a logfile is required
`;

AssetsPublishCommand.flags = {
  alias: flags.string({
    char: 'a',
    description: 'Alias for the management token to be used',
  }),
  'retry-failed': flags.string({
    description: 'Retry publishing failed assets from the logfile (optional, will override all other flags)',
  }),
  environments: flags.string({
    char: 'e',
    description: 'Environments to which assets need to be published',
    multiple: true,
  }),
  'folder-uid': flags.string({
    description: '[default: cs_root] Folder-uid from which the assets need to be published',
  }),
  'bulk-publish': flags.string({
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used for publishing the entries",
    default: 'true',
  }),
  config: flags.string({
    char: 'c',
    description: 'Path to config file to be used',
  }),
  yes: flags.boolean({
    char: 'y',
    description: 'Agree to process the command with the current configuration',
  }),
  locales: flags.string({
    char: 'l',
    description: 'Locales to which assets need to be published',
    multiple: true,
    parse: printFlagDeprecation(['-l'], ['--locales']),
  }),
  branch: flags.string({
    char: 'B',
    default: 'main',
    description: 'Specify the branch to fetch the content from (default is main branch)',
    parse: printFlagDeprecation(['-B'], ['--branch']),
  }),

  // To be deprecated
  retryFailed: flags.string({
    char: 'r',
    description: 'Retry publishing failed assets from the logfile (optional, will override all other flags)',
    hidden: true,
    parse: printFlagDeprecation(['-r', '--retryFailed'], ['--retry-failed']),
  }),
  folderUid: flags.string({
    char: 'u',
    description: '[default: cs_root] Folder-uid from which the assets need to be published',
    hidden: true,
    parse: printFlagDeprecation(['-u', '--folderUid'], ['--folder-uid']),
  }),
  bulkPublish: flags.string({
    char: 'b',
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used for publishing the entries",
    // default: 'true',
    hidden: true,
    parse: printFlagDeprecation(['-b', '--bulkPublish'], ['--bulk-publish']),
  }),
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
];

AssetsPublishCommand.aliases = ['cm:bulk-publish:assets'];

module.exports = AssetsPublishCommand;
