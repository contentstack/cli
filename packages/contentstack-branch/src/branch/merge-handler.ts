import {} from '@contentstack/cli-utilities';
import { MergeInputOptions, branchConfig } from '../interfaces';
import { selectMergeStrategy, selectMergeStrategySubOptions } from './interactive';

export default class MergeHandler {
  private compareBranch: string;
  private strategy: string;
  private strategySubOption: string;
  private branchConfig: branchConfig;
  private branchDiffData: any;
  private mergeSettings: any;

  constructor(options: MergeInputOptions) {
    this.strategy = options.strategy;
    this.strategySubOption = options.strategySubOption;
    this.branchConfig = options.branchConfig;
    this.branchDiffData = options.branchCompareData;
    this.mergeSettings = {
      baseBranch: this.branchConfig.branchName, // UID of the base branch, where the changes will be merged into
      compareBranch: options.compareBranch, // UID of the branch to merge
      mergeComment: options.mergeComment,
    };
  }

  async run() {
    /**
     * collectMergeSettings
     * displayMergeSummary()
     * execute / export summary
     *
     */

    await this.collectMergeSettings();
    await this.displayMergeSummary();
    this.prepareRequestPayload();
    if(this.)
  }

  async collectMergeSettings() {
    /**
     * check and ask for compare branch
     * check and ask for the strategy
     * check and ask for the sub option if strategy is not custom
     * prepare the settings
     */

    if (!this.strategy) {
      this.strategy = await selectMergeStrategy();
    }
    if (!this.strategySubOption && this.strategy !== 'custom_preferences') {
      this.strategySubOption = await selectMergeStrategySubOptions();
    }
    if (this.strategy === 'custom_preferences') {
      this.mergeSettings.itemMergeStrategies = [];
    } else if (this.strategy === 'merge_prefer_base') {
      if (this.strategySubOption === 'new') {
        this.mergeSettings.strategy = 'merge_new_only';
      } else if (this.strategySubOption === 'modified') {
        this.mergeSettings.strategy = 'merge_modified_only_prefer_base';
      }
    } else if (this.strategy === 'merge_prefer_compare') {
      if (this.strategySubOption === 'new') {
        this.mergeSettings.strategy = 'merge_new_only';
      } else if (this.strategySubOption === 'modified') {
        this.mergeSettings.strategy = 'merge_modified_only_prefer_compare';
      }
    } else if (this.strategy === 'overwrite_with_compare') {
      this.mergeSettings.strategy = 'overwrite_with_compare';
    }
    //   merge_prefer_base: Adds all changes from the compare branch to the base branch. If there are conflicts, the base branch's changes are kept.
    //   merge_prefer_compare: Adds all changes from the compare branch to the base branch. If there are conflicts, the compare branch's changes are kept.
    //   overwrite_with_compare: Replaces base branch with compare branch. Anything in the base branch that is not in the compare branch is lost.
    //   merge_new_only: Adds only new items from the compare branch to the base branch. Modified items are ignored.
    //   merge_modified_only_prefer_base: Adds only modified items from the compare branch to the base branch. New items are ignored. If there are conflicts, the base branch's changes are kept.
    //   merge_modified_only_prefer_compare: Adds only modified items from the compare branch to the base branch. New items are ignored. If there are conflicts, the compare branch's changes are kept.
    //   ignore: Ignores all changes from the compare branch. The base branch is unchanged. Used when user wants to select item merge strategy individually.
  }

  filterBranchCompareData() {
    /**
     * filter the branch compare data based on the mergeSettings
     */
  }

  displayMergeSummary() {
    /**
     *  Invoke print summary utility with branch text data
     */
  }

  prepareRequestPayload() {}

  exportSummary() {
    /**
     * export the summary with request payload
     */
  }

  executeMerge() {}
}
