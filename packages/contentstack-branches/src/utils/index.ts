/**
 * Command specific utilities can be written here
 */
import fs from 'fs';
import path from 'path';
import forEach from 'lodash/forEach'
import { configHandler, cliux, messageHandler, sanitizePath } from '@contentstack/cli-utilities';
import { MergeParams } from '../interfaces';

export const getbranchesList = (branchResult, baseBranch: string) => {
  const branches: Record<string, unknown>[] = [];

  branchResult.map((item) => {
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
  return configHandler.get(`baseBranch.${stackApiKey}`);
};

export const refreshbranchConfig = async (apiKey, branchUid) => {
  const branchConfig = configHandler.get(`baseBranch.${apiKey}`);
  if (branchConfig === branchUid) {
    await configHandler.set(`baseBranch.${apiKey}`, 'main');
  }
};

export const writeFile = (filePath, data) => {
  return new Promise((resolve, reject) => {
    data = typeof data === 'object' ? JSON.stringify(data, null, 2) : data || '{}';
    fs.writeFile(path.resolve(sanitizePath(filePath)), data, (error) => {
      if (error) {
        return reject(error);
      }
      resolve('done');
    });
  });
};

// by default file type is json
export const readFile = (filePath, options = { type: 'json' }) => {
  return new Promise((resolve, reject) => {
    filePath = path.resolve(sanitizePath(filePath));
    fs.readFile(filePath, 'utf-8', (error, data) => {
      if (error) {
        reject(error);
      } else {
        if (options.type !== 'json') {
          return resolve(data);
        }
        resolve(JSON.parse(data));
      }
    });
  });
};

export async function getMergeQueueStatus(stackAPIClient, payload): Promise<any> {
  const mergeJobUID: string = payload.uid;
  return await stackAPIClient
    .branch()
    .mergeQueue(mergeJobUID)
    .fetch()
    .then((data) => data)
    .catch((err) => handleErrorMsg(err));
}

export async function executeMergeRequest(stackAPIClient, payload): Promise<any> {
  const {
    host,
    apiKey,
    params: { base_branch, compare_branch, default_merge_strategy, item_merge_strategies, merge_comment, no_revert },
  } = payload;
  const queryParams: MergeParams = {
    base_branch,
    compare_branch,
    default_merge_strategy,
    merge_comment,
    no_revert,
  };

  const itemMergeStrategies = default_merge_strategy === 'ignore' ? { item_merge_strategies } : {};
  return await stackAPIClient
    .branch()
    .merge(itemMergeStrategies, queryParams)
    .then((data) => data)
    .catch((err) => handleErrorMsg(err));
}

export function handleErrorMsg(err) {
  if (err?.errorMessage) {
    cliux.print(`Error: ${err.errorMessage}`, { color: 'red' });
  } else if (err?.message) {
    cliux.print(`Error: ${err.message}`, { color: 'red' });
  } else {
    console.log(err);
    cliux.print(`Error: ${messageHandler.parse('CLI_BRANCH_API_FAILED')}`, { color: 'red' });
  }
  process.exit(1);
}

export function validateCompareData(branchCompareData) {
  let validCompareData = false;
  if (branchCompareData.content_types) {
    forEach(branchCompareData.content_types, (value, key) => {
      if (value?.length > 0) {
        validCompareData = true;
       }
    });
  }

  if (branchCompareData.global_fields) {
    forEach(branchCompareData.global_fields, (value, key) => {
      if (value?.length > 0) {
        validCompareData = true;
       }
    });
  }

  return validCompareData;
}

export * from './interactive';
export * from './merge-helper';
export * from './create-merge-scripts';
export * from './entry-update-script';
export * from './entry-create-script';
export * as interactive from './interactive';
export * as branchDiffUtility from './branch-diff-utility';
export * as deleteBranchUtility from './delete-branch';
