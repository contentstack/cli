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
