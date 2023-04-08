import chalk from 'chalk';
import forEach from 'lodash/forEach';
import startCase from 'lodash/startCase';
import camelCase from 'lodash/camelCase';
import { cliux, configHandler } from '@contentstack/cli-utilities';
import {
  BranchOptions,
  BranchDiffRes,
  BranchDiffSummary,
  BranchCompactTextRes,
  BranchDiffVerboseRes,
  BranchModifiedDetails,
  ModifiedFieldsInput,
  ModifiedFieldsType,
} from '../interfaces/index';
import BranchDiffUtility from '../utils/branch-diff-utility';
import { askBaseBranch, askCompareBranch, askStackAPIKey, selectModule } from '../utils/interactive';
import { getbranchConfig } from '../utils';

export default class BranchDiff {
  private options: BranchOptions;
  public branchUtilityInstance: BranchDiffUtility;
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
      const baseBranch = getbranchConfig(this.options.stackAPIKey);
      if (baseBranch) {
        this.options.baseBranch = baseBranch;
      } else {
        this.options.baseBranch = await askBaseBranch();
      }
    }

    if (!this.options.compareBranch) {
      this.options.compareBranch = await askCompareBranch();
    }
    if (!this.options.module) {
      this.options.module = await selectModule();
    }
    this.options.authToken = configHandler.get('authtoken');
    console.log('AUthtoken:-', this.options.authToken);
  }

  /**
   * @methods initBranchDiffUtility - call utility function to load data. Display it
   * @returns {*} {Promise<void>}
   * @memberof BranchDiff
   */
  async initBranchDiffUtility(): Promise<void> {
    this.branchUtilityInstance = new BranchDiffUtility(this.options);
    cliux.loader('Loading branch differences...');

    if (['content_types', 'both'].includes(this.options.module)) {
      this.branchUtilityInstance.module = 'content_types';
      await this.branchUtilityInstance.fetchBranchesDiff();
      this.displaySummary();
      await this.displayBranchDiffTextAndVerbose();
    }

    if (['global_fields', 'both'].includes(this.options.module)) {
      this.branchUtilityInstance.module = 'global_fields';
      await this.branchUtilityInstance.fetchBranchesDiff();
      this.displaySummary();
      await this.displayBranchDiffTextAndVerbose();
    }
  }

  /**
   * @methods displaySummary - show branches summary on CLI
   * @returns {*} {void}
   * @memberof BranchDiff
   */
  displaySummary(): void {
    cliux.print(' ');
    cliux.print(`${startCase(camelCase(this.branchUtilityInstance.module))} Summary:`, { color: 'yellow' });
    const diffSummary = this.parseSummary();
    this.printSummary(diffSummary);
  }

  /**
   * @methods parseSummary - parse branch summary json response
   * @returns {*} {BranchDiffSummary}
   * @memberof BranchDiff
   */
  parseSummary(): BranchDiffSummary {
    const { baseCount, compareCount, modifiedCount } = this.branchUtilityInstance.getBranchesSummary();
    const branchSummary: BranchDiffSummary = {
      base: this.options.baseBranch,
      compare: this.options.compareBranch,
      base_only: baseCount,
      compare_only: compareCount,
      modified: modifiedCount,
    };
    return branchSummary;
  }

  /**
   * @methods printSummary - print branches summary
   * @returns {*} {void}
   * @memberof BranchDiff
   */
  printSummary(diffSummary: BranchDiffSummary): void {
    forEach(diffSummary, (value, key) => {
      cliux.print(`${startCase(camelCase(key))}:  ${value}`);
    });
  }

  /**
   * @methods displayBranchDiffTextAndVerbose - show branch differences in compact text or verbose format
   * @returns {*} {void}
   * @memberof BranchDiff
   */
  async displayBranchDiffTextAndVerbose(): Promise<void> {
    cliux.print(' ');
    cliux.print(`Differences in '${this.options.compareBranch}' compared to '${this.options.baseBranch}'`);
    if (this.options.format === 'text') {
      const branchTextRes = this.parseCompactText();
      this.printCompactTextView(branchTextRes);
    } else if (this.options.format === 'verbose') {
      const verboseRes = await this.parseVerbose();
      this.printVerboseTextView(verboseRes);
    }
  }

  /**
   * @methods parseSummary - parse compact text json response
   * @returns {*} {void}
   * @memberof BranchDiff
   */
  parseCompactText(): BranchCompactTextRes {
    const { listOfAdded, listOfDeleted, listOfModified } = this.branchUtilityInstance.getBrancheCompactData();

    const branchTextRes: BranchCompactTextRes = {
      modified: listOfModified,
      added: listOfAdded,
      deleted: listOfDeleted,
    };
    return branchTextRes;
  }

  /**
   * @methods printCompactTextView - print diff in compact text format
   * @returns {*} {void}
   * @memberof BranchDiff
   * @param {BranchCompactTextRes} branchTextRes BranchCompactTextRes
   */
  printCompactTextView(branchTextRes: BranchCompactTextRes): void {
    if (branchTextRes.modified?.length || branchTextRes.added?.length || branchTextRes.deleted?.length) {
      forEach(branchTextRes.added, (diff: BranchDiffRes) => {
        cliux.print(
          `${chalk.green('+ Added:')}     '${diff.title}' ${startCase(camelCase(this.branchUtilityInstance.module))}`,
        );
      });

      forEach(branchTextRes.modified, (diff: BranchDiffRes) => {
        cliux.print(
          `${chalk.blue('± Modified:')}  '${diff.title}' ${startCase(camelCase(this.branchUtilityInstance.module))}`,
        );
      });

      forEach(branchTextRes.deleted, (diff: BranchDiffRes) => {
        cliux.print(
          `${chalk.red('- Deleted:')}   '${diff.title}' ${startCase(camelCase(this.branchUtilityInstance.module))}`,
        );
      });
    } else {
      cliux.print('No differences discovered.', { color: 'red' });
    }
  }

  /**
   * @methods parseSummary - parse verbose json response
   * @returns {*} {Promise<BranchDiffVerboseRes> }
   * @memberof BranchDiff
   */
  async parseVerbose(): Promise<BranchDiffVerboseRes> {
    const { listOfAdded, listOfDeleted, detailListOfModified } =
      await this.branchUtilityInstance.getBranchVerboseData();

    const verboseRes: BranchDiffVerboseRes = {
      modified: detailListOfModified,
      added: listOfAdded,
      deleted: listOfDeleted,
    };
    return verboseRes;
  }

  /**
   * @methods printVerboseTextView - print branches diff in detail format
   * @returns {*} {void}
   * @memberof BranchDiff
   * @param {BranchDiffVerboseRes} branchTextRes BranchDiffVerboseRes
   */
  printVerboseTextView(branchTextRes: BranchDiffVerboseRes): void {
    if (branchTextRes.modified?.length || branchTextRes.added?.length || branchTextRes.deleted?.length) {
      forEach(branchTextRes.added, (diff: BranchDiffRes) => {
        cliux.print(
          `${chalk.green('+ Added:')}    '${diff.title}' ${startCase(camelCase(this.branchUtilityInstance.module))}`,
        );
      });

      forEach(branchTextRes.modified, (diff: BranchModifiedDetails) => {
        cliux.print(
          `${chalk.blue('± Modified:')} '${diff.moduleDetails.title}' ${startCase(
            camelCase(this.branchUtilityInstance.module),
          )}`,
        );
        this.printModifiedFields(diff.modifiedFields);
      });

      forEach(branchTextRes.deleted, (diff: BranchDiffRes) => {
        cliux.print(
          `${chalk.red('- Deleted:')}  '${diff.title}' ${startCase(camelCase(this.branchUtilityInstance.module))}`,
        );
      });
    } else {
      cliux.print('No differences discovered.', { color: 'red' });
    }
  }

  /**
   * @methods printModifiedFields - print modified fields 
   * @returns {*} {void}
   * @memberof BranchDiff
   * @param {ModifiedFieldsInput} modfiedFields ModifiedFieldsInput
   */
  printModifiedFields(modfiedFields: ModifiedFieldsInput): void {
    if (modfiedFields.modified?.length || modfiedFields.added?.length || modfiedFields.deleted?.length) {
      forEach(modfiedFields.added, (diff: ModifiedFieldsType) => {
        const title: string = diff.displayName ? diff.displayName : diff.path;
        cliux.print(`   ${chalk.green('+ Added:')}     '${title}' ${startCase(camelCase(diff.fieldType))}`);
      });

      forEach(modfiedFields.modified, (diff: ModifiedFieldsType) => {
        cliux.print(`   ${chalk.blue('± Modified:')}  '${diff.path}' ${startCase(camelCase(diff.fieldType))}`);
      });

      forEach(modfiedFields.deleted, (diff: ModifiedFieldsType) => {
        const title: string = diff.displayName ? diff.displayName : diff.path;
        cliux.print(`   ${chalk.red('- Deleted:')}   '${title}' ${startCase(camelCase(diff.fieldType))}`);
      });
    }
  }
}
