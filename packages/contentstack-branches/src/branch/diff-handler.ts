import startCase from 'lodash/startCase';
import camelCase from 'lodash/camelCase';
import { cliux } from '@contentstack/cli-utilities';
import { getbranchConfig, cleanupSession } from '../utils';
import { BranchCompareCacheRef, BranchOptions, BranchCompactTextRes, BranchDiffPayload } from '../interfaces';
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
  isBranchCompareCacheRef,
  isInlineBranchCompareResult,
  summaryFromCompact,
  flatCompactToRawArray,
  parseSummaryFromJsonlPath,
  printCompactTextViewFromJsonlModulePath,
} from '../utils/branch-diff-utility';
import { readAllJsonLines } from '../utils/cache-manager';
import { exportCSVReport } from '../utils/csv-utility';

export default class BranchDiffHandler {
  private options: BranchOptions;

  constructor(params: BranchOptions) {
    this.options = params;
  }

  async run(): Promise<any> {
    let cacheRef: BranchCompareCacheRef | undefined;
    try {
      await this.validateMandatoryFlags();
      cacheRef = await this.initBranchDiffUtility();
    } finally {
      if (cacheRef?.kind === 'cache') {
        await cleanupSession(cacheRef.sessionId).catch(() => undefined);
      }
    }
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

    if (this.options.format === 'detailed-text' && !this.options.csvPath) {
      this.options.csvPath = process.cwd();
    }

    if (baseBranch) {
      cliux.print(`\nBase branch: ${baseBranch}`, { color: 'grey' });
    }
  }

  /**
   * @methods initBranchDiffUtility - call utility function to load data and display it
   * @returns {*} {Promise<BranchCompareCacheRef | undefined>}
   * @memberof BranchDiff
   */
  async initBranchDiffUtility(): Promise<BranchCompareCacheRef | undefined> {
    const spinner = cliux.loaderV2('Loading branch differences...');
    const payload: BranchDiffPayload = {
      module: '',
      apiKey: this.options.stackAPIKey,
      baseBranch: this.options.baseBranch,
      compareBranch: this.options.compareBranch,
      host: this.options.host,
    };

    if (this.options.module === 'content-types') {
      payload.module = 'content_types';
    } else if (this.options.module === 'global-fields') {
      payload.module = 'global_fields';
    }
    payload.spinner = spinner;
    const fetchResult = await fetchBranchesDiff(payload);
    cliux.loaderV2('', spinner);

    if (isBranchCompareCacheRef(fetchResult)) {
      await this.displayFromCacheRef(fetchResult, payload);
      return fetchResult;
    }

    if (isInlineBranchCompareResult(fetchResult)) {
      await this.displayFromInlineResult(fetchResult, payload);
      return undefined;
    }

    const branchDiffData = fetchResult;
    const diffData = filterBranchDiffDataByModule(branchDiffData);

    if (this.options.module === 'all') {
      for (const module in diffData) {
        const branchDiff = diffData[module];
        payload.module = module;
        this.displaySummary(branchDiff, module);
        await this.displayBranchDiffTextAndVerbose(branchDiff, payload);
      }
    } else {
      const branchDiff = diffData[payload.module];
      this.displaySummary(branchDiff, this.options.module);
      await this.displayBranchDiffTextAndVerbose(branchDiff, payload);
    }
    return undefined;
  }

  private async displayFromCacheRef(cacheRef: BranchCompareCacheRef, payload: BranchDiffPayload): Promise<void> {
    const modulesToShow =
      this.options.module === 'all'
        ? (['content_types', 'global_fields'] as const)
        : payload.module === 'content_types'
          ? (['content_types'] as const)
          : (['global_fields'] as const);

    for (const module of modulesToShow) {
      const modulePath = cacheRef.paths[module];
      const displayModule = module === 'content_types' ? 'content-types' : 'global-fields';
      payload.module = module;
      cliux.print(' ');
      cliux.print(`${startCase(camelCase(module))} Summary:`, { color: 'yellow' });
      const diffSummary = await parseSummaryFromJsonlPath(
        modulePath,
        this.options.baseBranch,
        this.options.compareBranch,
      );
      printSummary(diffSummary);
      const spinner1 = cliux.loaderV2('Loading branch differences...');
      if (this.options.format === 'compact-text') {
        cliux.loaderV2('', spinner1);
        await printCompactTextViewFromJsonlModulePath(modulePath);
      } else if (this.options.format === 'detailed-text') {
        const branchModuleData = await readAllJsonLines(modulePath);
        const verboseRes = await parseVerbose(branchModuleData, payload);
        cliux.loaderV2('', spinner1);
        printVerboseTextView(verboseRes);
        exportCSVReport(displayModule, verboseRes, this.options.csvPath);
        if (verboseRes.verboseCacheSessionId) {
          await cleanupSession(verboseRes.verboseCacheSessionId).catch(() => undefined);
        }
      }
    }
  }

  private async displayFromInlineResult(
    inline: { content_types: BranchCompactTextRes; global_fields: BranchCompactTextRes },
    payload: BranchDiffPayload,
  ): Promise<void> {
    const modulesToShow =
      this.options.module === 'all'
        ? (['content_types', 'global_fields'] as const)
        : payload.module === 'content_types'
          ? (['content_types'] as const)
          : (['global_fields'] as const);

    for (const module of modulesToShow) {
      const compact = inline[module];
      const displayModule = module === 'content_types' ? 'content-types' : 'global-fields';
      payload.module = module;
      cliux.print(' ');
      cliux.print(`${startCase(camelCase(module))} Summary:`, { color: 'yellow' });
      const diffSummary = summaryFromCompact(compact, this.options.baseBranch, this.options.compareBranch);
      printSummary(diffSummary);
      const spinner1 = cliux.loaderV2('Loading branch differences...');
      if (this.options.format === 'compact-text') {
        cliux.loaderV2('', spinner1);
        printCompactTextView(compact);
      } else if (this.options.format === 'detailed-text') {
        const branchModuleData = flatCompactToRawArray(compact);
        const verboseRes = await parseVerbose(branchModuleData, payload);
        cliux.loaderV2('', spinner1);
        printVerboseTextView(verboseRes);
        exportCSVReport(displayModule, verboseRes, this.options.csvPath);
        if (verboseRes.verboseCacheSessionId) {
          await cleanupSession(verboseRes.verboseCacheSessionId).catch(() => undefined);
        }
      }
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
   * @methods displayBranchDiffTextAndVerbose - to show branch differences in compactText or detailText format
   * @returns {*} {void}
   * @memberof BranchDiff
   */
  async displayBranchDiffTextAndVerbose(branchDiffData: any[], payload: BranchDiffPayload): Promise<void> {
    const spinner = cliux.loaderV2('Loading branch differences...');
    if (this.options.format === 'compact-text') {
      const branchTextRes = parseCompactText(branchDiffData);
      cliux.loaderV2('', spinner);
      printCompactTextView(branchTextRes);
    } else if (this.options.format === 'detailed-text') {
      const verboseRes = await parseVerbose(branchDiffData, payload);
      cliux.loaderV2('', spinner);
      printVerboseTextView(verboseRes);

      exportCSVReport(payload.module, verboseRes, this.options.csvPath);
      if (verboseRes.verboseCacheSessionId) {
        await cleanupSession(verboseRes.verboseCacheSessionId).catch(() => undefined);
      }
    }
  }
}
