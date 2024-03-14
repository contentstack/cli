import startCase from 'lodash/startCase';
import camelCase from 'lodash/camelCase';
import path from 'path';
import { cliux, managementSDKClient } from '@contentstack/cli-utilities';
import { BranchDiffPayload, MergeSummary } from '../interfaces';
import {
  askCompareBranch,
  askStackAPIKey,
  askBaseBranch,
  getbranchConfig,
  branchDiffUtility as branchDiff,
  writeFile,
  executeMergeRequest,
  getMergeQueueStatus,
  readFile,
} from './';

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

function validateMergeSummary(mergeSummary: MergeSummary) {
  if (!mergeSummary) {
    cliux.error(`Error: Invalid merge summary`, { color: 'red' });
    process.exit(1);
  } else if (!mergeSummary.requestPayload) {
    cliux.print(`Error: Invalid merge summary, required 'requestPayload'`, { color: 'red' });
    process.exit(1);
  } else if (!mergeSummary.requestPayload.base_branch) {
    cliux.print(`Error: Invalid merge summary, required 'requestPayload.base_branch'`, { color: 'red' });
    process.exit(1);
  } else if (!mergeSummary.requestPayload.compare_branch) {
    cliux.print(`Error: Invalid merge summary, required 'requestPayload.compare_branch'`, { color: 'red' });
    process.exit(1);
  } else if (!mergeSummary.requestPayload.default_merge_strategy) {
    cliux.print(`Error: Invalid merge summary, required 'requestPayload.default_merge_strategy'`, { color: 'red' });
    process.exit(1);
  } else if (!mergeSummary.requestPayload.default_merge_strategy) {
    cliux.print(`Error: Invalid merge summary, required 'requestPayload.default_merge_strategy'`, { color: 'red' });
    process.exit(1);
  }
}

export const setupMergeInputs = async (mergeFlags) => {
  if (mergeFlags['use-merge-summary']) {
    let mergeSummary: MergeSummary = (await readFile(mergeFlags['use-merge-summary'])) as MergeSummary;
    validateMergeSummary(mergeSummary);
    mergeFlags.mergeSummary = mergeSummary;
  }

  let { requestPayload: { base_branch = null, compare_branch = null } = {} } = mergeFlags.mergeSummary || {};

  if (!mergeFlags['stack-api-key']) {
    mergeFlags['stack-api-key'] = await askStackAPIKey();
  }
  if (!mergeFlags['base-branch']) {
    if (!base_branch) {
      mergeFlags['base-branch'] = getbranchConfig(mergeFlags['stack-api-key']);
      if (!mergeFlags['base-branch']) {
        mergeFlags['base-branch'] = await askBaseBranch();
      } else {
        cliux.print(`\nBase branch: ${mergeFlags['base-branch']}\n`, { color: 'grey' });
      }
    } else {
      mergeFlags['base-branch'] = base_branch;
    }
  }
  if (!mergeFlags['compare-branch']) {
    if (!compare_branch) {
      mergeFlags['compare-branch'] = await askCompareBranch();
    } else {
      mergeFlags['compare-branch'] = compare_branch;
    }
  }

  return mergeFlags;
};

export const displayBranchStatus = async (options) => {
  const spinner = cliux.loaderV2('Loading branch differences...');
  let payload: BranchDiffPayload = {
    module: '',
    apiKey: options.stackAPIKey,
    baseBranch: options.baseBranch,
    compareBranch: options.compareBranch,
    host: options.host,
  };

  payload.spinner = spinner;
  const branchDiffData = await branchDiff.fetchBranchesDiff(payload);
  const diffData = branchDiff.filterBranchDiffDataByModule(branchDiffData);
  cliux.loaderV2('', spinner);

  let parsedResponse = {};
  for (let module in diffData) {
    const branchModuleData = diffData[module];
    payload.module = module;
    cliux.print(' ');
    cliux.print(`${startCase(camelCase(module))} Summary:`, { color: 'yellow' });
    const diffSummary = branchDiff.parseSummary(branchModuleData, options.baseBranch, options.compareBranch);
    branchDiff.printSummary(diffSummary);
    const spinner1 = cliux.loaderV2('Loading branch differences...');
    if (options.format === 'compact-text') {
      const branchTextRes = branchDiff.parseCompactText(branchModuleData);
      cliux.loaderV2('', spinner1);
      branchDiff.printCompactTextView(branchTextRes);
      parsedResponse[module] = branchTextRes;
    } else if (options.format === 'detailed-text') {
      const verboseRes = await branchDiff.parseVerbose(branchModuleData, payload);
      cliux.loaderV2('', spinner1);
      branchDiff.printVerboseTextView(verboseRes);
      parsedResponse[module] = verboseRes;
    }
  }
  return parsedResponse;
};

export const displayMergeSummary = (options) => {
  cliux.print(' ');
  cliux.print(`Merge Summary:`, { color: 'yellow' });
  for (let module in options.compareData) {
    if (options.format === 'compact-text') {
      branchDiff.printCompactTextView(options.compareData[module]);
    } else if (options.format === 'detailed-text') {
      branchDiff.printVerboseTextView(options.compareData[module]);
    }
  }
  cliux.print(' ');
};

export const executeMerge = async (apiKey, mergePayload, host): Promise<any> => {
  const stackAPIClient = await (await managementSDKClient({ host })).stack({ api_key: apiKey });
  const mergeResponse = await executeMergeRequest(stackAPIClient, { params: mergePayload });
  if (mergeResponse.merge_details?.status === 'in_progress') {
    // TBD call the queue with the id
    return await fetchMergeStatus(stackAPIClient, { uid: mergeResponse.uid });
  } else if (mergeResponse.merge_details?.status === 'complete') {
    // return the merge id success
    return mergeResponse;
  }
};

export const fetchMergeStatus = async (stackAPIClient, mergePayload): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    const mergeStatusResponse = await getMergeQueueStatus(stackAPIClient, { uid: mergePayload.uid });

    if (mergeStatusResponse?.queue?.length >= 1) {
      const mergeRequestStatusResponse = mergeStatusResponse.queue[0];
      const mergeStatus = mergeRequestStatusResponse.merge_details?.status;
      if (mergeStatus === 'complete') {
        resolve(mergeRequestStatusResponse);
      } else if (mergeStatus === 'in-progress' || mergeStatus === 'in_progress') {
        setTimeout(async () => {
          await fetchMergeStatus(stackAPIClient, mergePayload).then(resolve).catch(reject);
        }, 5000);
      } else if (mergeStatus === 'failed') {
        if (mergeRequestStatusResponse?.errors?.length > 0) {
          const errorPath = path.join(process.cwd(), 'merge-error.log');
          await writeFile(errorPath, mergeRequestStatusResponse.errors);
          cliux.print(`\nComplete error log can be found in ${path.resolve(errorPath)}`, { color: 'grey' });
        }
        return reject(`merge uid: ${mergePayload.uid}`);
      } else {
        return reject(`Invalid merge status found with merge ID ${mergePayload.uid}`);
      }
    } else {
      return reject(`No queue found with merge ID ${mergePayload.uid}`);
    }
  });
};
