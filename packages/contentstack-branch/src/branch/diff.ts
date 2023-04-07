import chalk from "chalk";
import forEach from "lodash/forEach";
import startCase from "lodash/startCase";
import camelCase from "lodash/camelCase";
import { cliux, configHandler } from "@contentstack/cli-utilities";
import {
  BranchOptions,
  BranchDiffRes,
  BranchDiffSummary,
  BranchCompactTextRes,
} from "../interfaces/index";
import BranchDiffUtility from '../utils/branch-diff-utility';
import {
  askCompareBranch,
  askStackAPIKey,
  selectModule
} from "../utils/interactive";
import { getbranchConfig } from "../utils";


export default class BranchDiff {
  private options: BranchOptions;
  public branchUtilityInstance: BranchDiffUtility;
  public branchesDiffData: BranchDiffRes[];
  public branchSummary: BranchDiffSummary;

  constructor(params: BranchOptions) {
    this.options = params;
  }

  async run(): Promise<any> {
    await this.validateMandatoryFlags();
    await this.utilityInstance();
    this.displaySummary();
    this.displayBranchDiffTextAndVerbose();
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

    if (this.options.stackAPIKey) {
      const baseBranch = getbranchConfig(this.options.stackAPIKey);
      this.options.baseBranch = baseBranch;
    }

    if (!this.options.compareBranch) {
      this.options.compareBranch = await askCompareBranch();
    }
    if (!this.options.module) {
      this.options.module = await selectModule();
    }
    this.options.authToken = configHandler.get('authtoken');
  }

  /**
   * @methods utilityInstance - create instance of utility and call method
   * @returns {*} {Promise<void>}
   * @memberof BranchDiff
   */
  async utilityInstance(): Promise<void> {
    this.branchUtilityInstance = new BranchDiffUtility(this.options);
    cliux.loader("Loading branch differences...");
    await this.branchUtilityInstance.fetchBranchesDiff();
  }

  /**
   * @methods displaySummary - show branches summary on CLI
   * @returns {*} {void}
   * @memberof BranchDiff
   */
  displaySummary(): void {
    this.parseSummary();
    this.printSummary();
  }

  /**
   * @methods parseSummary - parse branch summary json response
   * @returns {*} {void}
   * @memberof BranchDiff
   */
  parseSummary(): void {
    const { baseCount, compareCount, modifiedCount } = this.branchUtilityInstance.getBranchesSummary();
    this.branchSummary = {
      base: this.options.baseBranch,
      compare: this.options.compareBranch,
      base_only: baseCount,
      compare_only: compareCount,
      modified: modifiedCount
    }
  }

  /**
   * @methods printSummary - print branches summary
   * @returns {*} {void}
   * @memberof BranchDiff
   */
  printSummary(): void {
    cliux.print("Summary:", { "color": "yellow" });
    forEach(this.branchSummary, (value, key) => {
      cliux.print(`${startCase(camelCase(key))}:  ${value}`)
    })
  }

  /**
   * @methods displayBranchDiffTextAndVerbose - show branch differences in compact text or verbose format
   * @returns {*} {void}
   * @memberof BranchDiff
   */
  displayBranchDiffTextAndVerbose(): void {
    if (this.options.format === "text") {
      const branchTextRes = this.parseCompactText();
      this.printCompactTextView(branchTextRes);
    } else if (this.options.format === "verbose") {
      //call verbose method
    }
  }

  /**
   * @methods parseSummary - parse compact text json response
   * @returns {*} {void}
   * @memberof BranchDiff
   */
  parseCompactText(): BranchCompactTextRes {
    const { listOfAdded, listOfDeleted, listOfModified } = this.branchUtilityInstance.getBranchesCompactText();

    const branchTextRes: BranchCompactTextRes = {
      modified: listOfModified,
      added: listOfAdded,
      deleted: listOfDeleted
    }
    return branchTextRes;
  }

  /**
   * @methods printCompactTextView - print diff in compact text format
   * @returns {*} {void}
   * @memberof BranchDiff
   * @param {BranchCompactTextRes} branchTextRes BranchCompactTextRes
   */
  printCompactTextView(branchTextRes: BranchCompactTextRes): void {
    cliux.print(" ");
    cliux.print(`Differences in '${this.options.compareBranch}' compared to '${this.options.baseBranch}'`);

    if (this.branchSummary.base_only || this.branchSummary.modified || this.branchSummary.compare_only) {
      forEach(branchTextRes.modified, (diff: BranchDiffRes) => {
        cliux.print(`${chalk.blue("± Modified:")}  '${diff.title}' ${startCase(camelCase(this.options.module))}`)
      });

      forEach(branchTextRes.added, (diff: BranchDiffRes) => {
        cliux.print(`${chalk.green("+ Added:")}  '${diff.title}' ${startCase(camelCase(this.options.module))}`)
      });

      forEach(branchTextRes.deleted, (diff: BranchDiffRes) => {
        cliux.print(`${chalk.red("- Deleted:")}  '${diff.title}' ${startCase(camelCase(this.options.module))}`)
      });
    } else {
      cliux.print("No differences discovered.", { "color": "red" });
    }
  }
}

