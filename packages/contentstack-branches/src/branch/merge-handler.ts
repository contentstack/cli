import path from 'path';
import forEach from 'lodash/forEach';
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
  generateMergeScripts,
  selectCustomPreferences,
} from '../utils';

const enableEntryExp = false;

export default class MergeHandler {
  private strategy: string;
  private strategySubOption?: string;
  private branchCompareData: any;
  private mergeSettings: any;
  private executeOption?: string;
  private displayFormat: string;
  private exportSummaryPath: string;
  private useMergeSummary: string;
  private stackAPIKey: string;
  private userInputs: MergeInputOptions;
  private host: string;
  private enableEntryExp: boolean;

  constructor(options: MergeInputOptions) {
    this.stackAPIKey = options.stackAPIKey;
    this.strategy = options.strategy;
    this.strategySubOption = options.strategySubOption;
    this.executeOption = options.executeOption;
    this.branchCompareData = options.branchCompareData;
    this.displayFormat = options.format;
    this.exportSummaryPath = options.exportSummaryPath || path.resolve(process.cwd());
    this.useMergeSummary = options.useMergeSummary;
    this.userInputs = options;
    this.mergeSettings = {
      baseBranch: options.baseBranch, // UID of the base branch, where the changes will be merged into
      compareBranch: options.compareBranch, // UID of the branch to merge
      mergeComment: options.mergeComment,
      mergeContent: {},
      noRevert: options.noRevert,
    };
    this.host = options.host;
    this.enableEntryExp = options.enableEntryExp;
  }

  async start() {
    await this.collectMergeSettings();

    // Merge final process
    const mergePayload = prepareMergeRequestPayload(this.mergeSettings);
    if (this.executeOption === 'execute') {
      await this.executeMerge(mergePayload);
    } else if (this.executeOption === 'export') {
      await this.exportSummary(mergePayload);
    } else {
      await this.exportSummary(mergePayload);
      await this.executeMerge(mergePayload);
    }
  }

  async collectMergeSettings() {
    if (!this.strategy) {
      this.strategy = await selectMergeStrategy();
    }
    if (
      !this.strategySubOption &&
      this.strategy !== 'custom_preferences' &&
      this.strategy !== 'overwrite_with_compare'
    ) {
      const strategyResponse = await selectMergeStrategySubOptions();
      if (strategyResponse === 'previous') {
        this.strategy = null;
        return await this.collectMergeSettings();
      } else if (strategyResponse === 'restart') {
        return await this.restartMergeProcess();
      } else {
        this.strategySubOption = strategyResponse;
      }
    }
    if (this.strategy === 'custom_preferences') {
      this.mergeSettings.itemMergeStrategies = [];
      for (let module in this.branchCompareData) {
        this.mergeSettings.mergeContent[module] = {
          added: [],
          modified: [],
          deleted: [],
        };
        const selectedItems = await selectCustomPreferences(module, this.branchCompareData[module]);
        forEach(selectedItems, (item) => {
          this.mergeSettings.mergeContent[module][item.status].push(item.value);
          this.mergeSettings.itemMergeStrategies.push(item.value);
        });
        this.mergeSettings.strategy = 'ignore';
      }
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

    await this.displayMergeSummary();

    if (!this.executeOption) {
      const executionResponse = await selectMergeExecution();
      if (executionResponse === 'previous') {
        if (this.strategy !== 'custom_preferences' && this.strategy !== 'overwrite_with_compare') {
          this.strategySubOption = null;
          return await this.collectMergeSettings();
        } else {
          return await this.restartMergeProcess();
        }
      } else if (executionResponse === 'restart') {
        return await this.restartMergeProcess();
      } else {
        this.executeOption = executionResponse;
      }
    }
  }

  displayMergeSummary() {
    if (this.mergeSettings.strategy !== 'ignore') {
      for (let module in this.branchCompareData) {
        this.mergeSettings.mergeContent[module] = {};
        this.filterBranchCompareData(module, this.branchCompareData[module]);
      }
    }
    displayMergeSummary({
      format: this.displayFormat,
      compareData: this.mergeSettings.mergeContent,
    });
  }

  filterBranchCompareData(module, moduleBranchCompareData) {
    const { strategy, mergeContent } = this.mergeSettings;
    switch (strategy) {
      case 'merge_prefer_base':
        mergeContent[module].added = moduleBranchCompareData.added;
        mergeContent[module].modified = moduleBranchCompareData.modified;
        mergeContent[module].deleted = moduleBranchCompareData.deleted;
        break;
      case 'merge_prefer_compare':
        mergeContent[module].added = moduleBranchCompareData.added;
        mergeContent[module].modified = moduleBranchCompareData.modified;
        mergeContent[module].deleted = moduleBranchCompareData.deleted;
        break;
      case 'merge_new_only':
        mergeContent[module].added = moduleBranchCompareData.added;
        break;
      case 'merge_modified_only_prefer_base':
        mergeContent[module].modified = moduleBranchCompareData.modified;
        break;
      case 'merge_modified_only_prefer_compare':
        mergeContent[module].modified = moduleBranchCompareData.modified;
        break;
      case 'merge_modified_only_prefer_compare':
        mergeContent[module].modified = moduleBranchCompareData.modified;
        break;
      case 'overwrite_with_compare':
        mergeContent[module].added = moduleBranchCompareData.added;
        mergeContent[module].modified = moduleBranchCompareData.modified;
        mergeContent[module].deleted = moduleBranchCompareData.deleted;
        break;
      default:
        cliux.error(`error: Invalid strategy ${strategy}`);
        process.exit(1);
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
    let spinner;
    try {
      if (!this.mergeSettings.mergeComment) {
        this.mergeSettings.mergeComment = await askMergeComment();
        mergePayload.merge_comment = this.mergeSettings.mergeComment;
      }

      spinner = cliux.loaderV2('Merging the changes...');
      const mergeResponse = await executeMerge(this.stackAPIKey, mergePayload, this.host);
      cliux.loaderV2('', spinner);
      cliux.success(`Merged the changes successfully. Merge UID: ${mergeResponse.uid}`);

      if (this.enableEntryExp) {
        this.executeEntryExpFlow(mergeResponse.uid, mergePayload);
      }
    } catch (error) {
      cliux.loaderV2('', spinner);
      cliux.error('Failed to merge the changes', error.message || error);
    }
  }

  executeEntryExpFlow(mergeJobUID: string, mergePayload) {
    let scriptFolderPath = generateMergeScripts(this.mergeSettings.mergeContent, mergeJobUID);

    if (scriptFolderPath !== undefined) {
      cliux.success(`\nSuccess! We have generated entry migration files in the folder ${scriptFolderPath}`);

      cliux.print(
        `\nKindly follow the steps in the guide "https://www.contentstack.com/docs/developers/cli/migrate-branch-entries" to update the migration scripts, and then run the command \n\ncsdx cm:stacks:migration --multiple --file-path ./${scriptFolderPath} --config compare-branch:${mergePayload.compare_branch} --branch ${mergePayload.base_branch} --stack-api-key ${this.stackAPIKey}`,
        { color: 'blue' },
      );
    }
  }

  async restartMergeProcess() {
    if (!this.userInputs.strategy) {
      this.strategy = null;
    }
    if (!this.userInputs.strategySubOption) {
      this.strategySubOption = null;
    }
    if (!this.userInputs.executeOption) {
      this.executeOption = null;
    }
    if (!this.userInputs.executeOption) {
      this.executeOption = null;
    }
    this.mergeSettings.strategy = null;
    this.mergeSettings.itemMergeStrategies = [];

    await this.start();
  }
}
