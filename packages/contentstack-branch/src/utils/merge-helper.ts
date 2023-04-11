import { askCompareBranch, askStackAPIKey, askBaseBranch, getbranchConfig } from './';

export const prepareMergeRequestPayload = (options) => {
  return {
    base_branch: options.baseBranch, // UID of the base branch, where the changes will be merged into
    compare_branch: options.compareBranch, // UID of the branch to merge
    default_merge_strategy: options.mergeContent.strategy,
    item_merge_strategies: options.mergeContent.itemMergeStrategies,
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
