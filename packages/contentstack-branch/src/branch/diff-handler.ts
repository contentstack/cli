import startCase from 'lodash/startCase';
import camelCase from 'lodash/camelCase';
import { cliux } from '@contentstack/cli-utilities';
import { getbranchConfig } from '../utils';
import { BranchOptions, BranchDiffRes, BranchDiffPayload } from '../interfaces';
import { askBaseBranch, askCompareBranch, askStackAPIKey, selectModule } from '../utils/interactive';
import {
  fetchBranchesDiff,
  parseSummary,
  printSummary,
  parseCompactText,
  printCompactTextView,
  parseVerbose,
  printVerboseTextView,
  filterBranchDiffDataByModule,
} from '../utils/branch-diff-utility';

export default class BranchDiffHandler {
  private options: BranchOptions;

  constructor(params: BranchOptions) {
    this.options = params;
  }

  async run(): Promise<any> {
    await this.validateMandatoryFlags();
    await this.initBranchDiffUtility();
  }

  /**
   * @methods validateMandatoryFlags - validate flags and prompt to select required flags
   * @returns {*} {Promise<void>}
   * @memberof BranchDiff
   */
  async validateMandatoryFlags(): Promise<void> {
    let baseBranch: string;
    if (!this.options.stackAPIKey) {
      this.options.stackAPIKey = await askStackAPIKey();
    }

    if (!this.options.baseBranch) {
       baseBranch = getbranchConfig(this.options.stackAPIKey);
      if (!baseBranch) {
        this.options.baseBranch = await askBaseBranch();
      } else {
        this.options.baseBranch = baseBranch;
      }
    }

    if (!this.options.compareBranch) {
      this.options.compareBranch = await askCompareBranch();
    }

    if (!this.options.module) {
      this.options.module = await selectModule();
    }

    if(baseBranch){
      cliux.print(`\nBase branch: ${baseBranch}`, { color: 'grey' });
    }
  }

  /**
   * @methods initBranchDiffUtility - call utility function to load data and display it
   * @returns {*} {Promise<void>}
   * @memberof BranchDiff
   */
  async initBranchDiffUtility(): Promise<void> {
    cliux.loader('Loading branch differences...');
    const payload: BranchDiffPayload = {
      module: '',
      apiKey: this.options.stackAPIKey,
      baseBranch: this.options.baseBranch,
      compareBranch: this.options.compareBranch,
    };

    if (this.options.module === 'content_types') {
      payload.module = 'content_types';
    } else if (this.options.module === 'global_fields') {
      payload.module = 'global_fields';
    }

    const branchDiffData = await fetchBranchesDiff(payload);
    const diffData = filterBranchDiffDataByModule(branchDiffData);
   
    for (let module in diffData) {
      const branchDiff = diffData[module];
      if(branchDiff.length){
        payload.module = module;
        this.displaySummary(branchDiff, module);
        await this.displayBranchDiffTextAndVerbose(branchDiff, payload);
      }
    }
    cliux.loader(' ');
  }

  /**
   * @methods displaySummary - show branches summary on CLI
   * @returns {*} {void}
   * @memberof BranchDiff
   */
  displaySummary(branchDiffData: any[], module: string): void {
    cliux.print(`\n${startCase(camelCase(module))} Summary:`, { color: 'yellow' });
    const diffSummary = parseSummary(branchDiffData, this.options.baseBranch, this.options.compareBranch);
    printSummary(diffSummary);
  }

  /**
   * @methods displayBranchDiffTextAndVerbose - to show branch differences in compactText or detailText format
   * @returns {*} {void}
   * @memberof BranchDiff
   */
  async displayBranchDiffTextAndVerbose(branchDiffData: any[], payload: BranchDiffPayload): Promise<void> {
    if (this.options.format === 'compactText') {
      const branchTextRes = parseCompactText(branchDiffData);
      printCompactTextView(branchTextRes, payload.module);
    } else if (this.options.format === 'detailedText') {
      const verboseRes = await parseVerbose(branchDiffData, payload);
      printVerboseTextView(verboseRes, payload.module);
    }
  }
}
