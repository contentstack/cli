const { Command } = require('@contentstack/cli-command');
const { configHandler, flags, isAuthenticated, managementSDKClient, log } = require('@contentstack/cli-utilities');
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
        'source-branch-alias': sourceStackBranchAlias,
        'target-branch': targetStackBranch,
        'target-branch-alias': targetStackBranchAlias,
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
        if (sourceStackBranchAlias) {
          config.sourceStackBranchAlias = sourceStackBranchAlias;
        }
        if (targetStackBranch) {
          config.targetStackBranch = targetStackBranch;
        }
         if (targetStackBranchAlias) {
          config.targetStackBranchAlias = targetStackBranchAlias;
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
          log.warn(`Provided source token alias (${sourceManagementTokenAlias}) not found in your config.!`);
        }
        if (destinationManagementTokenAlias && listOfTokens[destinationManagementTokenAlias]) {
          config.destination_alias = destinationManagementTokenAlias;
          config.target_stack = listOfTokens[destinationManagementTokenAlias].apiKey;
        } else if (destinationManagementTokenAlias) {
          log.warn(
            `Provided destination token alias (${destinationManagementTokenAlias}) not found in your config.!`,
          );
        }
        if (importWebhookStatus) {
          config.importWebhookStatus = importWebhookStatus;
        }

        const managementAPIClient = await managementSDKClient(config);

        await this.removeContentDirIfNotEmptyBeforeClone(pathdir); // NOTE remove if folder not empty before clone
        this.registerCleanupOnInterrupt(pathdir);

        config.auth_token = configHandler.get('authtoken');
        config.host = this.cmaHost;
        config.cdn = this.cdaHost;
        config.pathDir = pathdir;
        const cloneHandler = new CloneHandler(config);
        cloneHandler.setClient(managementAPIClient);
        log.debug('Starting clone operation', { sourceStack: config.source_stack, targetStack: config.target_stack });
        cloneHandler.execute().catch((error) => {
          log.error('Clone operation failed', { error });
        });
      };

      if (sourceManagementTokenAlias && destinationManagementTokenAlias) {
        if (sourceStackBranch || targetStackBranch) {
          if (isAuthenticated()) {
            handleClone();
          } else {
            log.warn('Please login to execute this command, csdx auth:login');
            this.exit(1);
          }
        } else {
          handleClone();
        }
      } else if (isAuthenticated()) {
        handleClone();
      } else {
        log.warn('Please login to execute this command, csdx auth:login');
        this.exit(1);
      }
    } catch (error) {
      if (error) {
        await this.cleanUp(pathdir);
        log.error('Stack clone command failed', { error: error.message || error });
      }
    }
  }



  async removeContentDirIfNotEmptyBeforeClone(dir) {
    try {
      log.debug('Checking if content directory is empty', { dir });
      const dirNotEmpty = readdirSync(dir).length;

      if (dirNotEmpty) {
        log.debug('Content directory is not empty, cleaning up', { dir });
        await this.cleanUp(dir);
      }
    } catch (error) {
      const omit = ['ENOENT']; // NOTE add emittable error codes in the array

      if (!omit.includes(error.code)) {
        log.error('Error checking content directory', { error: error.message, code: error.code });
      }
    }
  }

  async cleanUp(pathDir, message) {
    try {
      log.debug('Starting cleanup', { pathDir });
      await rimraf(pathDir);
      if (message) {
        log.info(message);
      }
      log.debug('Cleanup completed', { pathDir });
    } catch (err) {
      if (err) {
        log.debug('Cleaning up');
        const skipCodeArr = ['ENOENT', 'EBUSY', 'EPERM', 'EMFILE', 'ENOTEMPTY'];

        if (skipCodeArr.includes(err.code)) {
          log.debug('Cleanup error code is in skip list, exiting', { code: err.code });
          process.exit();
        } else {
          log.error('Cleanup failed', { error: err.message, code: err.code });
        }
      }
    }
  }

  registerCleanupOnInterrupt(pathDir) {
    const interrupt = ['SIGINT', 'SIGQUIT', 'SIGTERM'];
    const exceptions = ['unhandledRejection', 'uncaughtException'];

    const cleanUp = async (exitOrError) => {
      if (exitOrError) {
        log.debug('Cleaning up on interrupt');
        await this.cleanUp(pathDir);
        log.info('Cleanup done');

        if (exitOrError instanceof Promise) {
          exitOrError.catch((error) => {
            log.error('Error during cleanup', { error: (error && error.message) || '' });
          });
        } else if (exitOrError.message) {
          log.error('Cleanup error', { error: exitOrError.message });
        } else if (exitOrError.errorMessage) {
          log.error('Cleanup error', { error: exitOrError.message });
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
    exclusive: ['source-branch-alias']
  }),
  'source-branch-alias': flags.string({
    required: false,
    multiple: false,
    description: 'Alias of Branch of the source stack.',
    exclusive: ['source-branch']
  }),
  'target-branch': flags.string({
    required: false,
    multiple: false,
    description: 'Branch of the target stack.',
    exclusive: ['target-branch-alias']
  }),
  'target-branch-alias': flags.string({
    required: false,
    multiple: false,
    description: 'Alias of Branch of the target stack.',
    exclusive: ['target-branch']
  }),
  'source-management-token-alias': flags.string({
    required: false,
    multiple: false,
    description: 'Source management token alias.',
  }),
  'destination-management-token-alias': flags.string({
    required: false,
    multiple: false,
    description: 'Destination management token alias.',
  }),
  'stack-name': flags.string({
    char: 'n',
    required: false,
    multiple: false,
    description: 'Provide a name for the new stack to store the cloned content.',
  }),
  type: flags.string({
    required: false,
    multiple: false,
    options: ['a', 'b'],
    description: ` Type of data to clone. You can select option a or b.
      a) Structure (all modules except entries & assets).
      b) Structure with content (all modules including entries & assets).
    `,
  }),
  'source-stack-api-key': flags.string({
    description: 'Source stack API key',
  }),
  'destination-stack-api-key': flags.string({
    description: 'Destination stack API key',
  }),
  'import-webhook-status': flags.string({
    description: '[default: disable] (optional) The status of the import webhook. <options: disable|current>',
    options: ['disable', 'current'],
    required: false,
    default: 'disable',
  }),
  yes: flags.boolean({
    char: 'y',
    required: false,
    description: 'Force override all Marketplace prompts.',
  }),
  'skip-audit': flags.boolean({
    description: ' (optional) Skips the audit fix that occurs during an import operation.',
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
