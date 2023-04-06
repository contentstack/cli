/**
 * Command specific utilities can be written here
 */
import { cliux, configHandler } from '@contentstack/cli-utilities';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

export const getbranchesList = (branchResult) => {
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

  return branches;
};

export const getbranchConfig = () => {
  const localConfigPath = path.join(process.cwd(), '/branch-config.json');
  let config;

  if (existsSync(localConfigPath)) {
    let data = JSON.parse(readFileSync(localConfigPath, 'utf-8'));
    config = data['base-branch'];
  } else if (Boolean(configHandler.get(`base-branch`))) {
    config = configHandler.get(`base-branch`);
  } else {
    cliux.print('Please set the config using branch:config command', { color: 'yellow' });
  }

  return config;
};

export const refreshbranchConfig = (branchName) => {
  const localConfigPath = path.join(process.cwd(), '/branch-config.json');

  let config = getbranchConfig();

  if (config.baseBranch === branchName) {
    let data = JSON.parse(readFileSync(localConfigPath, 'utf-8'));
    data['base-branch'].baseBranch = 'main';

    writeFileSync(localConfigPath, JSON.stringify(data));
  }
};
