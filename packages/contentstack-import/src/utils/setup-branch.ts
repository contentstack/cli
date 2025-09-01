import { ContentstackClient, getBranchFromAlias, log } from '@contentstack/cli-utilities';
import { ImportConfig } from 'src/types';
import { validateBranch, executeImportPathLogic } from './common-helper';

export const setupBranchConfig = async (
  config: ImportConfig,
  stackAPIClient: ReturnType<ContentstackClient['stack']>,
): Promise<void> => {
  try {
    const resolvedPath = await executeImportPathLogic(config, stackAPIClient);
    log.debug(`Import path resolved to: ${resolvedPath}`);
  } catch (error) {
    log.error(`Failed to resolve import path: ${error}`);
  }

  if (config.branchName) {
    await validateBranch(stackAPIClient, config, config.branchName);
    return;
  }

  if (config.branchAlias) {
    config.branchName = await getBranchFromAlias(stackAPIClient, config.branchAlias);
    return;
  }

  if (!config.branchName) {
    try {
      const branches = await stackAPIClient
        .branch()
        .query()
        .find()
        .then(({ items }) => items);
      if (branches.length) {
        log.info(`Stack is branch enabled and branches exist. Default import will be done in main branch.`);

        config.branchName = 'main';
        log.debug(`Setting default target branch to 'main'`);
      }
    } catch (error) {
      log.debug('Failed to fetch branches', { error });
    }
  }
};
