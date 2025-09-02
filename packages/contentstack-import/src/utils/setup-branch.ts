import { ContentstackClient, getBranchFromAlias, log } from '@contentstack/cli-utilities';
import { ImportConfig } from 'src/types';
import { validateBranch } from './common-helper';

export const setupBranchConfig = async (
  config: ImportConfig,
  stackAPIClient: ReturnType<ContentstackClient['stack']>,
): Promise<void> => {
  if (config.branchName) {
    await validateBranch(stackAPIClient, config, config.branchName);
    return;
  }

  if (config.branchAlias) {
    config.branchName = await getBranchFromAlias(stackAPIClient, config.branchAlias);
    return;
  }
  try {
    const branches = await stackAPIClient
      .branch()
      .query()
      .find()
      .then(({ items }) => items);
    if (branches.length) {
      log.info(`Stack is branch Enabled and Branch is not passed by default import will be done in main branch`);
    }
  } catch (error) {
    // Here the stack is not branch enabled or any network issue
    log.debug('Failed to fetch branches', { error });
  }
};
