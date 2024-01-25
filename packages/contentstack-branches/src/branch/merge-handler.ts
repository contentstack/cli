import os from 'os';
import path from 'path';
import forEach from 'lodash/forEach';
import { cliux } from '@contentstack/cli-utilities';
import { MergeInputOptions, MergeSummary } from '../interfaces';
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
  selectContentMergePreference,
  selectContentMergeCustomPreferences,
} from '../utils';

export default class MergeHandler {
  private strategy: string;
  private strategySubOption?: string;
  private branchCompareData: any;
  private mergeSettings: any;
  private executeOption?: string;
  private displayFormat: string;
  private exportSummaryPath: string;
  private mergeSummary: MergeSummary;
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
    this.mergeSummary = options.mergeSummary;
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
    if (this.mergeSummary) {
      this.loadMergeSettings();
      await this.displayMergeSummary();
      return await this.executeMerge(this.mergeSummary.requestPayload);
    }
    await this.collectMergeSettings();
    const mergePayload = prepareMergeRequestPayload(this.mergeSettings);
    if (this.executeOption === 'execute') {
      await this.exportSummary(mergePayload);
      await this.executeMerge(mergePayload);
    } else if (this.executeOption === 'export') {
      await this.exportSummary(mergePayload);
    } else if (this.executeOption === 'merge_n_scripts') {
      this.enableEntryExp = true;
      await this.executeMerge(mergePayload);
    } else if (this.executeOption === 'summary_n_scripts') {
      this.enableEntryExp = true;
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
    const summary: MergeSummary = {
      requestPayload: mergePayload,
    };
    await writeFile(path.join(this.exportSummaryPath, 'merge-summary.json'), summary);
    cliux.success('Exported the summary successfully');

    if (this.enableEntryExp) {
      this.executeEntryExpFlow(this.stackAPIKey, mergePayload);
    }
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

  async executeEntryExpFlow(mergeJobUID: string, mergePayload) {
    const { mergeContent } = this.mergeSettings;
    let mergePreference = await selectContentMergePreference();

    const updateEntryMergeStrategy = (items, mergeStrategy) => {
      items &&
        items.forEach((item) => {
          item.entry_merge_strategy = mergeStrategy;
        });
    };

    const mergePreferencesMap = {
      'existing_new': 'merge_existing_new',
      'new': 'merge_new',
      'existing': 'merge_existing',
      'ask_preference': 'custom',
    };
    const selectedMergePreference = mergePreferencesMap[mergePreference];

    if (selectedMergePreference) {
      if (selectedMergePreference === 'custom') {
        const selectedMergeItems = await selectContentMergeCustomPreferences(mergeContent.content_types);
        mergeContent.content_types = {
          added: [],
          modified: [],
          deleted: [],
        };

        selectedMergeItems?.forEach((item) => {
          mergeContent.content_types[item.status].push(item.value);
        });
      } else {
        updateEntryMergeStrategy(mergeContent.content_types.added, selectedMergePreference);
        updateEntryMergeStrategy(mergeContent.content_types.modified, selectedMergePreference);
      }
    } else {
      cliux.error(`error: Invalid preference ${mergePreference}`);
      process.exit(1);
    }

    let scriptFolderPath = generateMergeScripts(mergeContent.content_types, mergeJobUID);

    if (scriptFolderPath !== undefined) {
      cliux.success(`\nSuccess! We have generated entry migration files in the folder ${scriptFolderPath}`);
      cliux.print('\nWARNING!!! Migration is not intended to be run more than once. Migrated(entries/assets) will be duplicated if run more than once', { color: 'yellow' });

      let migrationCommand: string;
      if (os.platform() === 'win32') {
        migrationCommand = `csdx cm:stacks:migration --multiple --file-path ./${scriptFolderPath} --config compare-branch:${mergePayload.compare_branch} file-path:./${scriptFolderPath} --branch ${mergePayload.base_branch} --stack-api-key ${this.stackAPIKey}`;
      } else {
        migrationCommand = `csdx cm:stacks:migration --multiple --file-path ./${scriptFolderPath} --config {compare-branch:${mergePayload.compare_branch},file-path:./${scriptFolderPath}} --branch ${mergePayload.base_branch} --stack-api-key ${this.stackAPIKey}`;
      }

      cliux.print(
        `\nKindly follow the steps in the guide "https://www.contentstack.com/docs/developers/cli/entry-migration" to update the migration scripts, and then run the command:\n\n${migrationCommand}`,
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

  loadMergeSettings() {
    this.mergeSettings.baseBranch = this.mergeSummary.requestPayload.base_branch;
    this.mergeSettings.compareBranch = this.mergeSummary.requestPayload.compare_branch;
    this.mergeSettings.strategy = this.mergeSummary.requestPayload.default_merge_strategy;
    this.mergeSettings.itemMergeStrategies = this.mergeSummary.requestPayload.item_merge_strategies;
    this.mergeSettings.noRevert = this.mergeSummary.requestPayload.no_revert;
    this.mergeSettings.mergeComment = this.mergeSummary.requestPayload.merge_comment;
  }
}
