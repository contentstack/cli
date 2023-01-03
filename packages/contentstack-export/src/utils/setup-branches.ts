import * as path from 'path';
import * as mkdirp from 'mkdirp';
import { writeFileSync, makeDirectory } from './file-helper';

const setupBranches = async (config, stackAPIClient) => {
  if (typeof config !== 'object') {
    throw new Error('Invalid config to setup the branch');
  }
  let branches = [];
  const headers = { api_key: config.source_stack };

  if (config.auth_token) {
    headers['authtoken'] = config.auth_token;
  } else if (config.management_token) {
    headers['authorization'] = config.management_token;
  }

  if (config.branchName) {
    // check branch exists
    const result = await stackAPIClient.branch(config.branchName).fetch();
    if (result && typeof result === 'object') {
      branches.push(result);
    } else {
      throw new Error('No branch found with the name ' + config.branchName);
    }
  } else {
    try {
      const result = await stackAPIClient.branch().query().find();
      if (result && result.items && Array.isArray(result.items) && result.items.length > 0) {
        branches = result.items;
      } else {
        return;
      }
    } catch (error) {
      return;
    }
  }

  makeDirectory(config.data);
  // create branch info file
  writeFileSync(path.join(config.data, 'branches.json'), branches);
  // add branches list in the
  config.branches = branches;
};

export default setupBranches;
