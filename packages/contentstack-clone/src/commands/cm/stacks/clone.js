const { Command } = require('@contentstack/cli-command');
const { configHandler, flags, isAuthenticated, managementSDKClient } = require('@contentstack/cli-utilities');
const { CloneHandler } = require('../../../lib/util/clone-handler');
const path = require('path');
const { rimraf } = require('rimraf');
const merge = require('merge');
let pathdir = path.join(__dirname.split('src')[0], 'contents');
const { readdirSync, readFileSync } = require('fs');
let config = {};

class StackCloneCommand extends Command {
  async run() {
    try {
      let self = this;
      const { flags: cloneCommandFlags } = await self.parse(StackCloneCommand);
      const {
        yes,
        type: cloneType,
        'stack-name': stackName,
        'source-branch': sourceStackBranch,
        'target-branch': targetStackBranch,
        'source-stack-api-key': sourceStackApiKey,
        'destination-stack-api-key': destinationStackApiKey,
        'source-management-token-alias': sourceManagementTokenAlias,
        'destination-management-token-alias': destinationManagementTokenAlias,
        'import-webhook-status': importWebhookStatus,
        config: externalConfigPath,
      } = cloneCommandFlags;

      const handleClone = async () => {
        const listOfTokens = configHandler.get('tokens');

        if (externalConfigPath) {
          let externalConfig = readFileSync(externalConfigPath, 'utf-8');
          externalConfig = JSON.parse(externalConfig);
          config = merge.recursive(config, externalConfig);
        }
        config.forceStopMarketplaceAppsPrompt = yes;
        config.skipAudit = cloneCommandFlags['skip-audit'];

        if (cloneType) {
          config.cloneType = cloneType;
        }
        if (stackName) {
          config.stackName = stackName;
        }
        if (sourceStackBranch) {
          config.sourceStackBranch = sourceStackBranch;
        }
        if (targetStackBranch) {
          config.targetStackBranch = targetStackBranch;
        }
        if (sourceStackApiKey) {
          config.source_stack = sourceStackApiKey;
        }
        if (destinationStackApiKey) {
          config.target_stack = destinationStackApiKey;
        }
        if (sourceManagementTokenAlias && listOfTokens[sourceManagementTokenAlias]) {
          config.source_alias = sourceManagementTokenAlias;
          config.source_stack = listOfTokens[sourceManagementTokenAlias].apiKey;
        } else if (sourceManagementTokenAlias) {
          console.log(`Provided source token alias (${sourceManagementTokenAlias}) not found in your config.!`);
        }
        if (destinationManagementTokenAlias && listOfTokens[destinationManagementTokenAlias]) {
          config.destination_alias = destinationManagementTokenAlias;
          config.target_stack = listOfTokens[destinationManagementTokenAlias].apiKey;
        } else if (destinationManagementTokenAlias) {
          console.log(
            `Provided destination token alias (${destinationManagementTokenAlias}) not found in your config.!`,
          );
        }
        if (importWebhookStatus) {
          config.importWebhookStatus = importWebhookStatus;
        }

        await this.removeContentDirIfNotEmptyBeforeClone(pathdir); // NOTE remove if folder not empty before clone
        this.registerCleanupOnInterrupt(pathdir);

        config.auth_token = configHandler.get('authtoken');
        config.host = this.cmaHost;
        config.cdn = this.cdaHost;
        config.pathDir = pathdir;
        const cloneHandler = new CloneHandler(config);
        const managementAPIClient = await managementSDKClient(config);
        cloneHandler.setClient(managementAPIClient);
        cloneHandler.execute().catch((error) => {
          console.log(error);
        });
      };

      if (sourceManagementTokenAlias && destinationManagementTokenAlias) {
        if (sourceStackBranch || targetStackBranch) {
          if (isAuthenticated()) {
            handleClone();
          } else {
            console.log('Please login to execute this command, csdx auth:login');
            this.exit(1);
          }
        } else {
          handleClone();
        }
      } else if (isAuthenticated()) {
        handleClone();
      } else {
        console.log('Please login to execute this command, csdx auth:login');
        this.exit(1);
      }
    } catch (error) {
      if (error) {
        await this.cleanUp(pathdir);
        // eslint-disable-next-line no-console
        console.log(error.message || error);
      }
    }
  }

  async removeContentDirIfNotEmptyBeforeClone(dir) {
    try {
      const dirNotEmpty = readdirSync(dir).length;

      if (dirNotEmpty) {
        await this.cleanUp(dir);
      }
    } catch (error) {
      const omit = ['ENOENT']; // NOTE add emittable error codes in the array

      if (!omit.includes(error.code)) {
        console.log(error.message);
      }
    }
  }

  async cleanUp(pathDir, message) {
    try {
      await rimraf(pathDir);
      if (message) {
        // eslint-disable-next-line no-console
        console.log(message);
      }
    } catch (err) {
      if (err) {
        console.log('\nCleaning up');
        const skipCodeArr = ['ENOENT', 'EBUSY', 'EPERM', 'EMFILE', 'ENOTEMPTY'];

        if (skipCodeArr.includes(err.code)) {
          process.exit();
        }
      }
    }
  }

  registerCleanupOnInterrupt(pathDir) {
    const interrupt = ['SIGINT', 'SIGQUIT', 'SIGTERM'];
    const exceptions = ['unhandledRejection', 'uncaughtException'];

    const cleanUp = async (exitOrError) => {
      if (exitOrError) {
        // eslint-disable-next-line no-console
        console.log('\nCleaning up');
        await this.cleanUp(pathDir);
        // eslint-disable-next-line no-console
        console.log('done');
        // eslint-disable-next-line no-process-exit

        if (exitOrError instanceof Promise) {
          exitOrError.catch((error) => {
            console.log((error && error.message) || '');
          });
        } else if (exitOrError.message) {
          console.log(exitOrError.message);
        } else if (exitOrError.errorMessage) {
          console.log(exitOrError.message);
        }

        if (exitOrError === true) process.exit();
      }
    };

    exceptions.forEach((event) => process.on(event, cleanUp));
    interrupt.forEach((signal) => process.on(signal, () => cleanUp(true)));
  }
}

StackCloneCommand.description = `Clone data (structure/content or both) of a stack into another stack
Use this plugin to automate the process of cloning a stack in few steps.
`;

StackCloneCommand.examples = [
  'csdx cm:stacks:clone',
  'csdx cm:stacks:clone --source-branch <source-branch-name> --target-branch <target-branch-name> --yes',
  'csdx cm:stacks:clone --source-stack-api-key <apiKey> --destination-stack-api-key <apiKey>',
  'csdx cm:stacks:clone --source-management-token-alias <management token alias> --destination-management-token-alias <management token alias>',
  'csdx cm:stacks:clone --source-branch --target-branch --source-management-token-alias <management token alias> --destination-management-token-alias <management token alias>',
  'csdx cm:stacks:clone --source-branch --target-branch --source-management-token-alias <management token alias> --destination-management-token-alias <management token alias> --type <value a or b>',
];

StackCloneCommand.aliases = ['cm:stack-clone'];

StackCloneCommand.flags = {
  'source-branch': flags.string({
    required: false,
    multiple: false,
    description: 'Branch of the source stack.',
  }),
  'target-branch': flags.string({
    required: false,
    multiple: false,
    description: 'Branch of the target stack.',
  }),
  'source-management-token-alias': flags.string({
    required: false,
    multiple: false,
    description: 'Source API key of the target stack token alias.',
  }),
  'destination-management-token-alias': flags.string({
    required: false,
    multiple: false,
    description: 'Source API key of the target stack token alias.',
  }),
  'stack-name': flags.string({
    char: 'n',
    required: false,
    multiple: false,
    description: 'Name for the new stack to store the cloned content.',
  }),
  type: flags.string({
    required: false,
    multiple: false,
    options: ['a', 'b'],
    description: `Type of data to clone
a) Structure (all modules except entries & assets)
b) Structure with content (all modules including entries & assets)
    `,
  }),
  'source-stack-api-key': flags.string({
    description: 'Source stack API Key',
  }),
  'destination-stack-api-key': flags.string({
    description: 'Destination stack API Key',
  }),
  'import-webhook-status': flags.string({
    description: '[Optional] Webhook state',
    options: ['disable', 'current'],
    required: false,
    default: 'disable',
  }),
  yes: flags.boolean({
    char: 'y',
    required: false,
    description: '[Optional] Override marketplace prompts',
  }),
  'skip-audit': flags.boolean({
    description: 'Skips the audit fix.',
  }),
  config: flags.string({
    char: 'c',
    required: false,
    description: 'Path for the external configuration',
  }),
};

StackCloneCommand.usage =
  'cm:stacks:clone [--source-branch <value>] [--target-branch <value>] [--source-management-token-alias <value>] [--destination-management-token-alias <value>] [-n <value>] [--type a|b] [--source-stack-api-key <value>] [--destination-stack-api-key <value>] [--import-webhook-status disable|current]';

module.exports = StackCloneCommand;
