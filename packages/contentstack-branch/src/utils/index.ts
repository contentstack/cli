/**
 * Command specific utilities can be written here
 */
import { cliux, configHandler } from '@contentstack/cli-utilities';
import { existsSync, readFileSync, writeFileSync } from 'fs';

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

export const getbranchConfig = (localConfigPath) => {
  let config;

  if (existsSync(localConfigPath)) {
    let data = JSON.parse(readFileSync(localConfigPath, 'utf-8'));
    config = data['base-branch'];
  } else if (Boolean(configHandler.get(`base-branch`))) {
    config = configHandler.get(`base-branch`);
  } else {
    cliux.print('Please set the config using branch:config command');
  }

  return config;
};

export const deletebranchConfig = (localConfigPath, branchName) => {
  let config = getbranchConfig(localConfigPath);

  if (config.baseBranch === branchName) {
    let data = JSON.parse(readFileSync(localConfigPath, 'utf-8'));
    data['base-branch'].baseBranch = 'main';

    writeFileSync(localConfigPath, JSON.stringify(data));
  }
};
