/**
 * Command specific utilities can be written here
 */
import { configHandler } from '@contentstack/cli-utilities';

export const getbranchesList = (branchResult, baseBranch) => {
  const branches: Record<string, unknown>[] = [];

  branchResult.items.map((item) => {
    branches.push({
      Branch: item.uid,
      Source: item.source,
      Aliases: item.alias,
      Created: new Date(item.created_at).toLocaleDateString(),
      Updated: new Date(item.updated_at).toLocaleDateString(),
    });
  });

  const currentBranch = branches.filter((branch) => branch.Branch === baseBranch);
  const otherBranches = branches.filter((branch) => branch.Branch !== baseBranch);

  return { currentBranch, otherBranches, branches };
};

export const getbranchConfig = (stackApiKey: string) => {
  let baseBranch = configHandler.get(`baseBranch.${stackApiKey}`);

  return baseBranch ? baseBranch : 'main';
};

export const refreshbranchConfig = (branchName) => {};

export * as interactive from "./interactive";
