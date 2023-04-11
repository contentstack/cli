import startCase from 'lodash/startCase';
import camelCase from 'lodash/camelCase';
import { cliux } from '@contentstack/cli-utilities';
import { BranchOptions, BranchDiffRes, BranchDiffPayload } from '../interfaces/index';
import { askBaseBranch, askCompareBranch, askStackAPIKey, selectModule } from '../utils/interactive';
import {
  fetchBranchesDiff,
  parseSummary,
  printSummary,
  parseCompactText,
  printCompactTextView,
  parseVerbose,
  printVerboseTextView,
} from '../utils/branch-diff-utility';

export default class BranchDiff {
  private options: BranchOptions;
  public branchesDiffData: BranchDiffRes[];

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
    if (!this.options.stackAPIKey) {
      this.options.stackAPIKey = await askStackAPIKey();
    }

    if (!this.options.baseBranch) {
      this.options.baseBranch = await askBaseBranch();
    }

    if (!this.options.compareBranch) {
      this.options.compareBranch = await askCompareBranch();
    }
    if (!this.options.module) {
      this.options.module = await selectModule();
    }
  }

  /**
   * @methods initBranchDiffUtility - call utility function to load data and display it
   * @returns {*} {Promise<void>}
   * @memberof BranchDiff
   */
  async initBranchDiffUtility(): Promise<void> {
    cliux.loader('Loading branch differences...');
    let payload: BranchDiffPayload = {
      module: '',
      apiKey: this.options.stackAPIKey,
      baseBranch: this.options.baseBranch,
      compareBranch: this.options.compareBranch,
      filter: this.options.filter,
    };
    if (['content_types', 'both'].includes(this.options.module)) {
      payload.module = 'content_types';
      const branchDiffData = await fetchBranchesDiff(payload);
      this.displaySummary(branchDiffData, payload.module);
      await this.displayBranchDiffTextAndVerbose(branchDiffData, payload);
    }

    if (['global_fields', 'both'].includes(this.options.module)) {
      payload.module = 'global_fields';
      const branchDiffData = await fetchBranchesDiff(payload);
      this.displaySummary(branchDiffData, payload.module);
      await this.displayBranchDiffTextAndVerbose(branchDiffData, payload);
    }
  }

  /**
   * @methods displaySummary - show branches summary on CLI
   * @returns {*} {void}
   * @memberof BranchDiff
   */
  displaySummary(branchDiffData: any[], module: string): void {
    cliux.print(' ');
    cliux.print(`${startCase(camelCase(module))} Summary:`, { color: 'yellow' });
    const diffSummary = parseSummary(branchDiffData, this.options.baseBranch, this.options.compareBranch);
    printSummary(diffSummary);
  }

  /**
   * @methods displayBranchDiffTextAndVerbose - show branch differences in compact text or verbose format
   * @returns {*} {void}
   * @memberof BranchDiff
   */
  async displayBranchDiffTextAndVerbose(branchDiffData: any[], payload: BranchDiffPayload): Promise<void> {
    cliux.print(' ');
    cliux.print(`Differences in '${this.options.compareBranch}' compared to '${this.options.baseBranch}':`);
    if (this.options.format === 'text') {
      const branchTextRes = parseCompactText(branchDiffData);
      printCompactTextView(branchTextRes, payload.module);
    } else if (this.options.format === 'verbose') {
      const verboseRes = await parseVerbose(branchDiffData, payload);
      printVerboseTextView(verboseRes, payload.module);
    }
  }
}
