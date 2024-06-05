import * as path from 'path';
import { writeFileSync, makeDirectory } from './file-helper';
import { isAuthenticated, configHandler } from '@contentstack/cli-utilities';
import { ExportConfig } from '../types';
import { sanitizePath } from '@contentstack/cli-utilities';

const setupBranches = async (config: ExportConfig, stackAPIClient: any) => {
  if (typeof config !== 'object') {
    throw new Error('Invalid config to setup the branch');
  }

  let branches = [];
  if (config.branchName) {
    // check branch exists
    const result = await stackAPIClient
      .branch(config.branchName)
      .fetch()
      .catch((_err: Error) => {});
    if (result && typeof result === 'object') {
      branches.push(result);
    } else {
      throw new Error('No branch found with the given name ' + config.branchName);
    }
  } else {
    try {
      const result = await stackAPIClient
        .branch()
        .query()
        .find()
        .catch((_err: Error) => {});
      if (result && result.items && Array.isArray(result.items) && result.items.length > 0) {
        branches = result.items;
      } else {
        return;
      }
    } catch (error) {
      // Note skips the error
      return;
    }
  }

  makeDirectory(config.exportDir);
  // create branch info file
  writeFileSync(path.join(sanitizePath(config.exportDir), 'branches.json'), branches);
  // add branches list in the
  config.branches = branches;
};

export default setupBranches;
