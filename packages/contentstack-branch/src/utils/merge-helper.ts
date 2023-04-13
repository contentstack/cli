import startCase from 'lodash/startCase';
import camelCase from 'lodash/camelCase';
import { cliux } from '@contentstack/cli-utilities';
import { BranchDiffPayload } from '../interfaces/index';
import {
  askCompareBranch,
  askStackAPIKey,
  askBaseBranch,
  getbranchConfig,
  branchDiffUtility as branchDiff,
  apiPostRequest,
  apiGetRequest,
} from './';

import config from '../config';

export const prepareMergeRequestPayload = (options) => {
  return {
    base_branch: options.baseBranch, // UID of the base branch, where the changes will be merged into
    compare_branch: options.compareBranch, // UID of the branch to merge
    default_merge_strategy: options.strategy,
    item_merge_strategies: options.itemMergeStrategies,
    merge_comment: options.mergeComment,
    no_revert: options.noRevert,
  };
};

export const setupMergeInputs = async (mergeFlags) => {
  if (!mergeFlags['stack-api-key']) {
    mergeFlags['stack-api-key'] = await askStackAPIKey();
  }
  if (!mergeFlags['compare-branch']) {
    mergeFlags['compare-branch'] = await askCompareBranch();
  }
  if (!mergeFlags['base-branch']) {
    mergeFlags['base-branch'] = getbranchConfig(mergeFlags['stack-api-key']);
    if (!mergeFlags['base-branch']) {
      mergeFlags['base-branch'] = await askBaseBranch();
    }
  }

  return mergeFlags;
};

export const displayBranchStatus = async (options) => {
  let payload: BranchDiffPayload = {
    module: '',
    apiKey: options.stackAPIKey,
    baseBranch: options.baseBranch,
    compareBranch: options.compareBranch,
  };

  const branchDiffData = await branchDiff.fetchBranchesDiff(payload);
  const diffData = branchDiff.filterBranchDiffDataByModule(branchDiffData);

  let parsedResponse = {};
  for (let module in diffData) {
    const branchModuleData = diffData[module];
    payload.module = module;
    cliux.print(' ');
    cliux.print(`${startCase(camelCase(module))} Summary:`, { color: 'yellow' });
    const diffSummary = branchDiff.parseSummary(branchModuleData, options.baseBranch, options.compareBranch);
    branchDiff.printSummary(diffSummary);
    cliux.print(' ');
    cliux.print(`Differences in '${options.compareBranch}' compared to '${options.baseBranch}':`);
    if (options.format === 'text') {
      const branchTextRes = branchDiff.parseCompactText(branchModuleData);
      branchDiff.printCompactTextView(branchTextRes, payload.module);
      parsedResponse[module] = branchTextRes;
    } else if (options.format === 'verbose') {
      const verboseRes = await branchDiff.parseVerbose(branchModuleData, payload);
      branchDiff.printVerboseTextView(verboseRes, payload.module);
      parsedResponse[module] = verboseRes;
    }
  }
  return parsedResponse;
};

export const displayMergeSummary = (options) => {
  cliux.print(' ');
  cliux.print(`Merge Summary:`, { color: 'yellow' });
  cliux.print(' ');
  for (let module in options.compareData) {
    if (options.format === 'text') {
      branchDiff.printCompactTextView(options.compareData[module], module);
    } else if (options.format === 'verbose') {
      branchDiff.printVerboseTextView(options.compareData[module], module);
    }
  }
};

export const executeMerge = async (apiKey, mergePayload): Promise<any> => {
  const mergeResponse = await apiPostRequest({
    apiKey: apiKey,
    url: config.mergeUrl,
    params: mergePayload,
  });

  if (mergeResponse.merge_details?.status === 'in_progress') {
    // TBD call the queue with the id
    return await fetchMergeStatus({ apiKey, uid: mergeResponse.uid });
  } else if (mergeResponse.merge_details?.status === 'complete') {
    // return the merge id success
    return mergeResponse;
  }
};

const fetchMergeStatus = async (mergePayload): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    const mergeStatusResponse = await apiGetRequest({
      apiKey: mergePayload.apiKey,
      url: `${config.mergeQueueUrl}/${mergePayload.uid}`,
      params: {},
    });

    if (mergeStatusResponse?.queue?.length >= 1) {
      const mergeRequestStatusResponse = mergeStatusResponse.queue[0];
      const mergeStatus = mergeRequestStatusResponse.merge_details?.status;
      if (mergeStatus === 'complete') {
        resolve(mergeRequestStatusResponse);
      } else if (mergeStatus === 'in-progress') {
        setTimeout(async () => {
          await fetchMergeStatus(mergePayload).then(resolve).catch(reject);
        }, 5000);
      } else if (mergeStatus === 'failed') {
        return reject(`merge uid: ${mergePayload.uid}`);
      } else {
        return reject(`Invalid merge status found with merge id ${mergePayload.uid}`);
      }
    } else {
      return reject(`No queue found with merge id ${mergePayload.uid}`);
    }
  });
};
