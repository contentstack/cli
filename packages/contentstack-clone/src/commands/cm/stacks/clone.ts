import { Command } from '@contentstack/cli-command';
import {
  configHandler,
  flags,
  isAuthenticated,
  managementSDKClient,
  log,
  handleAndLogError,
} from '@contentstack/cli-utilities';
import { CloneHandler } from '../../../core/util/clone-handler';
import * as path from 'path';
import { rimraf } from 'rimraf';
import merge from 'merge';
import { readFileSync, promises as fsPromises } from 'fs';
import { CloneConfig } from '../../../types/clone-config';
import { CloneContext } from '../../../types/clone-context';

// Resolve path to package root (works in both src and lib contexts)
const packageRoot = __dirname.includes('/src/') ? __dirname.split('/src/')[0] : __dirname.split('/lib/')[0];
const pathdir = path.join(packageRoot, 'contents');
let config: CloneConfig = {};

export default class StackCloneCommand extends Command {
  static description = `Clone data (structure/content or both) of a stack into another stack
Use this plugin to automate the process of cloning a stack in few steps.
`;

  static examples: string[] = [
    'csdx cm:stacks:clone',
    'csdx cm:stacks:clone --source-branch <source-branch-name> --target-branch <target-branch-name> --yes',
    'csdx cm:stacks:clone --source-stack-api-key <apiKey> --destination-stack-api-key <apiKey>',
    'csdx cm:stacks:clone --source-management-token-alias <management token alias> --destination-management-token-alias <management token alias>',
    'csdx cm:stacks:clone --source-branch --target-branch --source-management-token-alias <management token alias> --destination-management-token-alias <management token alias>',
    'csdx cm:stacks:clone --source-branch --target-branch --source-management-token-alias <management token alias> --destination-management-token-alias <management token alias> --type <value a or b>',
  ];

  static aliases: string[] = ['cm:stack-clone'];

  static flags: any = {
    'source-branch': flags.string({
      required: false,
      multiple: false,
      description: 'Branch of the source stack.',
      exclusive: ['source-branch-alias'],
    }),
    'source-branch-alias': flags.string({
      required: false,
      multiple: false,
      description: 'Alias of Branch of the source stack.',
      exclusive: ['source-branch'],
    }),
    'target-branch': flags.string({
      required: false,
      multiple: false,
      description: 'Branch of the target stack.',
      exclusive: ['target-branch-alias'],
    }),
    'target-branch-alias': flags.string({
      required: false,
      multiple: false,
      description: 'Alias of Branch of the target stack.',
      exclusive: ['target-branch'],
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

  static usage: string =
    'cm:stacks:clone [--source-branch <value>] [--target-branch <value>] [--source-management-token-alias <value>] [--destination-management-token-alias <value>] [-n <value>] [--type a|b] [--source-stack-api-key <value>] [--destination-stack-api-key <value>] [--import-webhook-status disable|current]';

  /**
   * Determine authentication method based on user preference
   */
  determineAuthenticationMethod(sourceManagementTokenAlias?: string, destinationManagementTokenAlias?: string): string {
    // Track authentication method
    let authenticationMethod = 'unknown';

    // Determine authentication method based on user preference
    if (sourceManagementTokenAlias || destinationManagementTokenAlias) {
      authenticationMethod = 'Management Token';
    } else if (isAuthenticated()) {
      // Check if user is authenticated via OAuth
      const isOAuthUser = configHandler.get('authorisationType') === 'OAUTH' || false;
      if (isOAuthUser) {
        authenticationMethod = 'OAuth';
      } else {
        authenticationMethod = 'Basic Auth';
      }
    } else {
      authenticationMethod = 'Basic Auth';
    }

    return authenticationMethod;
  }

  /**
   * Create clone context object for logging
   */
  createCloneContext(authenticationMethod: string): CloneContext {
    return {
      command: this.context?.info?.command || 'cm:stacks:clone',
      module: 'clone',
      email: configHandler.get('email') || '',
      sessionId: this.context?.sessionId || '',
      authenticationMethod: authenticationMethod || 'Basic Auth',
    };
  }

  async run(): Promise<void> {
    try {
      const self = this;
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

      const handleClone = async (): Promise<void> => {
        const listOfTokens = configHandler.get('tokens');
        const authenticationMethod = this.determineAuthenticationMethod(
          sourceManagementTokenAlias,
          destinationManagementTokenAlias,
        );
        const cloneContext = this.createCloneContext(authenticationMethod);
        log.debug('Starting clone operation setup', cloneContext);

        if (externalConfigPath) {
          log.debug(`Loading external configuration from: ${externalConfigPath}`, cloneContext);
          let externalConfig = readFileSync(externalConfigPath, 'utf-8');
          externalConfig = JSON.parse(externalConfig);
          config = merge.recursive(config, externalConfig) as CloneConfig;
        }
        config.forceStopMarketplaceAppsPrompt = yes;
        config.skipAudit = cloneCommandFlags['skip-audit'];
        log.debug('Clone configuration prepared', {
          ...cloneContext,
          cloneType: config.cloneType,
          skipAudit: config.skipAudit,
          forceStopMarketplaceAppsPrompt: config.forceStopMarketplaceAppsPrompt,
        });

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
        if (sourceManagementTokenAlias && listOfTokens?.[sourceManagementTokenAlias]) {
          config.source_alias = sourceManagementTokenAlias;
          config.source_stack = listOfTokens[sourceManagementTokenAlias].apiKey;
          log.debug(`Using source token alias: ${sourceManagementTokenAlias}`, cloneContext);
        } else if (sourceManagementTokenAlias) {
          log.warn(`Provided source token alias (${sourceManagementTokenAlias}) not found in your config.!`, cloneContext);
        }
        if (destinationManagementTokenAlias && listOfTokens?.[destinationManagementTokenAlias]) {
          config.destination_alias = destinationManagementTokenAlias;
          config.target_stack = listOfTokens[destinationManagementTokenAlias].apiKey;
          log.debug(`Using destination token alias: ${destinationManagementTokenAlias}`, cloneContext);
        } else if (destinationManagementTokenAlias) {
          log.warn(
            `Provided destination token alias (${destinationManagementTokenAlias}) not found in your config.!`,
            cloneContext,
          );
        }
        if (importWebhookStatus) {
          config.importWebhookStatus = importWebhookStatus;
        }

        log.debug('Management API client initialized successfully', cloneContext);

        log.debug(`Content directory path: ${pathdir}`, cloneContext);
        await this.removeContentDirIfNotEmptyBeforeClone(pathdir, cloneContext); // NOTE remove if folder not empty before clone
        this.registerCleanupOnInterrupt(pathdir, cloneContext);

        config.auth_token = configHandler.get('authtoken');
        config.host = this.cmaHost;
        config.cdn = this.cdaHost;
        config.pathDir = pathdir;
        config.cloneContext = cloneContext;
        log.debug('Clone configuration finalized', cloneContext);
        const cloneHandler = new CloneHandler(config);
        const managementAPIClient = await managementSDKClient(config);
        cloneHandler.setClient(managementAPIClient);
        log.debug('Starting clone operation', cloneContext);
        cloneHandler.execute().catch((error: any) => {
          handleAndLogError(error, cloneContext as any);
        });
      };

      if (sourceManagementTokenAlias && destinationManagementTokenAlias) {
        if (sourceStackBranch || targetStackBranch) {
          if (isAuthenticated()) {
            handleClone();
          } else {
            log.error('Log in to execute this command,csdx auth:login', this.createCloneContext('unknown'));
            this.exit(1);
          }
        } else {
          handleClone();
        }
      } else if (isAuthenticated()) {
        handleClone();
      } else {
        log.error('Please login to execute this command, csdx auth:login', this.createCloneContext('unknown'));
        this.exit(1);
      }
    } catch (error: any) {
      if (error) {
        await this.cleanUp(pathdir, null, this.createCloneContext('unknown'));
        log.error('Stack clone command failed', { ...this.createCloneContext('unknown'), error: error?.message || error });
      }
    }
  }

  async removeContentDirIfNotEmptyBeforeClone(dir: string, cloneContext: CloneContext): Promise<void> {
    try {
      log.debug('Checking if content directory is empty', { ...cloneContext, dir });
      const files = await fsPromises.readdir(dir);

      if (files.length) {
        log.debug('Content directory is not empty, cleaning up', { ...cloneContext, dir });
        await this.cleanUp(dir, null, cloneContext);
      }
    } catch (error: any) {
      const omit = ['ENOENT']; // NOTE add emittable error codes in the array

      if (!omit.includes(error.code)) {
        log.error('Error checking content directory', { ...cloneContext, error: error?.message, code: error.code });
      }
    }
  }

  async cleanUp(pathDir: string, message: string | null, cloneContext: CloneContext): Promise<void> {
    try {
      log.debug('Starting cleanup', { ...cloneContext, pathDir });
      await rimraf(pathDir);
      if (message) {
        log.info(message, cloneContext);
      }
      log.debug('Cleanup completed', { ...cloneContext, pathDir });
    } catch (err: any) {
      if (err) {
        log.debug('Cleaning up', cloneContext);
        const skipCodeArr = ['ENOENT', 'EBUSY', 'EPERM', 'EMFILE', 'ENOTEMPTY'];

        if (skipCodeArr.includes(err.code)) {
          log.debug('Cleanup error code is in skip list, exiting', { ...cloneContext, code: err?.code });
          process.exit();
        }
      }
    }
  }

  registerCleanupOnInterrupt(pathDir: string, cloneContext: CloneContext): void {
    const interrupt = ['SIGINT', 'SIGQUIT', 'SIGTERM'];
    const exceptions = ['unhandledRejection', 'uncaughtException'];

    const cleanUp = async (exitOrError: any): Promise<void> => {
      if (exitOrError) {
        log.debug('Cleaning up on interrupt', cloneContext);
        await this.cleanUp(pathDir, null, cloneContext);
        log.info('Cleanup done', cloneContext);

        if (exitOrError instanceof Promise) {
          exitOrError.catch((error: any) => {
            log.error('Error during cleanup', { ...cloneContext, error: (error && error?.message) || '' });
          });
        } else if (exitOrError.message) {
          log.error('Cleanup error', { ...cloneContext, error: exitOrError?.message });
        } else if (exitOrError.errorMessage) {
          log.error('Cleanup error', { ...cloneContext, error: exitOrError?.errorMessage });
        }

        if (exitOrError === true) process.exit();
      }
    };

    exceptions.forEach((event) => process.on(event, cleanUp));
    interrupt.forEach((signal) => process.on(signal, () => cleanUp(true)));
  }
}
