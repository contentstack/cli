import path from 'path';
import { cliux } from '@contentstack/cli-utilities';
import { MergeInputOptions } from '../interfaces';
import {
  selectMergeStrategy,
  selectMergeStrategySubOptions,
  selectMergeExecution,
  prepareMergeRequestPayload,
  displayMergeSummary,
  askExportMergeSummaryPath,
  askMergeComment,
  writeFile,
  executeMerge,
} from '../utils';

export default class MergeHandler {
  private strategy: string;
  private strategySubOption: string;
  private branchCompareData: any;
  private mergeSettings: any;
  private executeOption: string;
  private displayFormat: string;
  private exportSummaryPath: string;
  private useMergeSummary: string;
  private stackAPIKey: string;

  constructor(options: MergeInputOptions) {
    this.stackAPIKey = options.stackAPIKey;
    this.strategy = options.strategy;
    this.strategySubOption = options.strategySubOption;
    this.executeOption = options.executeOption;
    this.branchCompareData = options.branchCompareData;
    this.displayFormat = options.format;
    this.exportSummaryPath = options.exportSummaryPath;
    this.useMergeSummary = options.useMergeSummary;
    this.mergeSettings = {
      baseBranch: options.baseBranch, // UID of the base branch, where the changes will be merged into
      compareBranch: options.compareBranch, // UID of the branch to merge
      mergeComment: options.mergeComment,
      mergeContent: {},
      noRevert: options.noRevert,
    };
  }

  async start() {
    await this.collectMergeSettings();
    await this.displayMergeSummary();
    if (!this.executeOption) {
      this.executeOption = await selectMergeExecution();
    }

    // Merge final process
    const mergePayload = prepareMergeRequestPayload(this.mergeSettings);
    if (this.executeOption === 'execute') {
      await this.executeMerge(mergePayload);
      // TBD implement the export queue strategy
    } else if (this.executeOption === 'export') {
      await this.exportSummary(mergePayload);
      // TBD success message
    } else {
      await this.exportSummary(mergePayload);
      await this.executeMerge(mergePayload);
      // TBD success message
    }
  }

  async collectMergeSettings() {
    if (!this.strategy) {
      this.strategy = await selectMergeStrategy();
    }
    if (!this.strategySubOption && this.strategy !== 'custom_preferences') {
      this.strategySubOption = await selectMergeStrategySubOptions();
    }
    if (this.strategy === 'custom_preferences') {
      this.mergeSettings.itemMergeStrategies = [];
      // TBD implement the table for choosing the custom merge preferences
    } else if (this.strategy === 'merge_prefer_base') {
      if (this.strategySubOption === 'new') {
        this.mergeSettings.strategy = 'merge_new_only';
      } else if (this.strategySubOption === 'modified') {
        this.mergeSettings.strategy = 'merge_modified_only_prefer_base';
      } else if (this.strategySubOption === 'both') {
        this.mergeSettings.strategy = 'merge_prefer_base';
      }
    } else if (this.strategy === 'merge_prefer_compare') {
      if (this.strategySubOption === 'new') {
        this.mergeSettings.strategy = 'merge_new_only';
      } else if (this.strategySubOption === 'modified') {
        this.mergeSettings.strategy = 'merge_modified_only_prefer_compare';
      } else if (this.strategySubOption === 'both') {
        this.mergeSettings.strategy = 'merge_prefer_compare';
      }
    } else if (this.strategy === 'overwrite_with_compare') {
      this.mergeSettings.strategy = 'overwrite_with_compare';
    }
  }

  displayMergeSummary() {
    for (let module in this.branchCompareData) {
      this.mergeSettings.mergeContent[module] = {};
      this.filterBranchCompareData(module, this.branchCompareData[module]);
    }
    displayMergeSummary({
      format: this.displayFormat,
      compareData: this.mergeSettings.mergeContent,
    });
  }

  filterBranchCompareData(module, moduleBranchCompareData) {
    const { strategy, mergeContent } = this.mergeSettings;
    switch (strategy) {
      case 'merge_prefer_base' || 'merge_prefer_compare':
        mergeContent[module].added = moduleBranchCompareData.added;
        mergeContent[module].modified = moduleBranchCompareData.modified;
        mergeContent[module].deleted = moduleBranchCompareData.deleted;
        break;
      case 'merge_new_only':
        mergeContent[module].added = moduleBranchCompareData.added;
        break;
      case 'merge_modified_only_prefer_base' || 'merge_modified_only_prefer_compare':
        mergeContent[module].modified = moduleBranchCompareData.modified;
        break;
      case 'overwrite_with_compare':
        mergeContent[module].added = moduleBranchCompareData.added;
        mergeContent[module].modified = moduleBranchCompareData.modified;
        mergeContent[module].deleted = moduleBranchCompareData.deleted;
        break;
      default:
        console.log('Invalid strategy', strategy);
    }
  }

  async exportSummary(mergePayload) {
    if (!this.exportSummaryPath) {
      this.exportSummaryPath = await askExportMergeSummaryPath();
    }
    const summary = {
      requestPayload: mergePayload,
    };
    await writeFile(path.join(this.exportSummaryPath, 'merge-summary.json'), summary);
    cliux.success('Exported the summary successfully');
  }

  async executeMerge(mergePayload) {
    try {
      if (!this.mergeSettings.mergeComment) {
        this.mergeSettings.mergeComment = await askMergeComment();
        mergePayload.merge_comment = this.mergeSettings.mergeComment;
      }
      cliux.loader('Merging the changes');
      const mergeResponse = await executeMerge(this.stackAPIKey, mergePayload);
      cliux.loader('');
      cliux.success(`Merged the changes successfully, merge uid: ${mergeResponse.uid}`);
    } catch (error) {
      cliux.error('Failed to merge the changes', error.message);
    }
  }
}
