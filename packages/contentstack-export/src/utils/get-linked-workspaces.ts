import { log, handleAndLogError } from '@contentstack/cli-utilities';
import type { LinkedWorkspace } from '@contentstack/cli-asset-management';

/** Stack client with branch().fetch() for CMA branch details */
type StackWithBranch = { branch: (name: string) => { fetch: (params?: Record<string, unknown>) => Promise<unknown> } };

/**
 * Fetch branch details with include_settings: true and return linked workspaces (am_v2).
 * Reused by stack export (included in settings.json) and asset-management module.
 */
export async function getLinkedWorkspacesForBranch(
  stack: StackWithBranch,
  branchName: string,
  context?: Record<string, unknown>,
): Promise<LinkedWorkspace[]> {
  log.debug(`Fetching branch details for: ${branchName}`, context);
  try {
    const branch = await stack.branch(branchName).fetch({ include_settings: true } as Record<string, unknown>);
    const linked = (branch as any)?.settings?.am_v2?.linked_workspaces;
    if (!Array.isArray(linked)) {
      log.debug('No linked_workspaces in branch settings', context);
      return [];
    }
    log.info(
      `Found ${linked.length} linked workspace(s) for branch ${branchName}`,
      context,
    );
    return linked as LinkedWorkspace[];
  } catch (error) {
    handleAndLogError(error as Error, context as any, 'Failed to fetch branch settings');
    return [];
  }
}
