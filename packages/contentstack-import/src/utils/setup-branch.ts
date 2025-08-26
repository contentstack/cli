import { ContentstackClient, getBranchFromAlias, log } from '@contentstack/cli-utilities';
import { ImportConfig } from 'src/types';

export const setupBranchConfig = async (
  config: ImportConfig,
  managementAPIClient: ContentstackClient,
): Promise<void> => {
  const stack = managementAPIClient.stack({ api_key: config.apiKey });

  if (config.branchName) {
    return;
  }

  if (config.branchAlias) {
    config.branchName = await getBranchFromAlias(stack, config.branchAlias);
    return;
  }

  try {
    const branches = await stack
      .branch()
      .query()
      .find()
      .then(({ items }) => items);
    if (branches.length) {
      log.debug(`Stack is branch Enabled and Branch is not passed by default import will be done in main branch`);
    }
  } catch (error) {
    // Here the stack is not branch enabled or any network issue
    log.debug('Failed to fetch branches', { error });
  }
};
