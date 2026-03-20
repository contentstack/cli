import startCase from 'lodash/startCase';
import camelCase from 'lodash/camelCase';
import path from 'path';
import { cliux, managementSDKClient } from '@contentstack/cli-utilities';
import { BranchCompareCacheRef, BranchDiffPayload, MergeSummary } from '../interfaces';
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
import { readAllJsonLines } from './cache-manager';

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
  const fetchResult = await branchDiff.fetchBranchesDiff(payload);
  cliux.loaderV2('', spinner);

  const parsedResponse: Record<string, unknown> = {};

  if (branchDiff.isBranchCompareCacheRef(fetchResult)) {
    const cacheRef = fetchResult as BranchCompareCacheRef;
    for (const module of ['content_types', 'global_fields'] as const) {
      payload.module = module;
      const modulePath = cacheRef.paths[module];
      cliux.print(' ');
      cliux.print(`${startCase(camelCase(module))} Summary:`, { color: 'yellow' });
      const diffSummary = await branchDiff.parseSummaryFromJsonlPath(
        modulePath,
        options.baseBranch,
        options.compareBranch,
      );
      branchDiff.printSummary(diffSummary);
      const spinner1 = cliux.loaderV2('Loading branch differences...');
      if (options.format === 'compact-text') {
        cliux.loaderV2('', spinner1);
        await branchDiff.printCompactTextViewFromJsonlModulePath(modulePath);
      } else if (options.format === 'detailed-text') {
        const branchModuleData = await readAllJsonLines(modulePath);
        const verboseRes = await branchDiff.parseVerbose(branchModuleData, payload);
        cliux.loaderV2('', spinner1);
        branchDiff.printVerboseTextView(verboseRes);
        if (verboseRes.verboseCacheSessionId) {
          const { cleanupSession } = await import('./cache-manager');
          await cleanupSession(verboseRes.verboseCacheSessionId);
        }
      }
    }
    return cacheRef;
  }

  if (branchDiff.isInlineBranchCompareResult(fetchResult)) {
    for (const module of ['content_types', 'global_fields'] as const) {
      const branchTextRes = fetchResult[module];
      payload.module = module;
      cliux.print(' ');
      cliux.print(`${startCase(camelCase(module))} Summary:`, { color: 'yellow' });
      const diffSummary = branchDiff.summaryFromCompact(branchTextRes, options.baseBranch, options.compareBranch);
      branchDiff.printSummary(diffSummary);
      const spinner1 = cliux.loaderV2('Loading branch differences...');
      if (options.format === 'compact-text') {
        cliux.loaderV2('', spinner1);
        branchDiff.printCompactTextView(branchTextRes);
        parsedResponse[module] = branchTextRes;
      } else if (options.format === 'detailed-text') {
        const branchModuleData = branchDiff.flatCompactToRawArray(branchTextRes);
        const verboseRes = await branchDiff.parseVerbose(branchModuleData, payload);
        cliux.loaderV2('', spinner1);
        branchDiff.printVerboseTextView(verboseRes);
        parsedResponse[module] = verboseRes;
        if (verboseRes.verboseCacheSessionId) {
          const { cleanupSession } = await import('./cache-manager');
          await cleanupSession(verboseRes.verboseCacheSessionId);
        }
      }
    }
    return { content_types: parsedResponse.content_types, global_fields: parsedResponse.global_fields };
  }

  const branchDiffData = fetchResult;
  const diffData = branchDiff.filterBranchDiffDataByModule(branchDiffData);

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
      if (verboseRes.verboseCacheSessionId) {
        const { cleanupSession } = await import('./cache-manager');
        await cleanupSession(verboseRes.verboseCacheSessionId);
      }
    }
  }
  return parsedResponse;
};

export const displayMergeSummary = async (options: {
  format: string;
  compareData: Record<string, any>;
  branchCompareCache?: BranchCompareCacheRef;
}) => {
  cliux.print(' ');
  cliux.print(`Merge Summary:`, { color: 'yellow' });
  if (options.branchCompareCache) {
    for (const module of ['content_types', 'global_fields'] as const) {
      const p = options.branchCompareCache.paths[module];
      if (options.format === 'compact-text') {
        await branchDiff.printCompactTextViewFromJsonlModulePath(p);
      }
    }
  } else {
    for (let module in options.compareData) {
      if (options.format === 'compact-text') {
        branchDiff.printCompactTextView(options.compareData[module]);
      } else if (options.format === 'detailed-text') {
        branchDiff.printVerboseTextView(options.compareData[module]);
      }
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

export const fetchMergeStatus = async (stackAPIClient, mergePayload, delay = 5000): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    const mergeStatusResponse = await getMergeQueueStatus(stackAPIClient, { uid: mergePayload.uid });

    if (mergeStatusResponse?.queue?.length >= 1) {
      const mergeRequestStatusResponse = mergeStatusResponse.queue[0];
      const mergeStatus = mergeRequestStatusResponse.merge_details?.status;
      if (mergeStatus === 'complete') {
        resolve(mergeRequestStatusResponse);
      } else if (mergeStatus === 'in-progress' || mergeStatus === 'in_progress') {
        setTimeout(async () => {
          await fetchMergeStatus(stackAPIClient, mergePayload, delay).then(resolve).catch(reject);
        }, delay);
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
