import chalk from "chalk";
import forEach from "lodash/forEach";
import startCase from "lodash/startCase";
import camelCase from "lodash/camelCase";
import { cliux } from "@contentstack/cli-utilities";
import {
  BranchOptions,
  BranchDiffRes,
  BranchDiffSummary,
  BranchCompactTextRes,
} from "../interfaces/index";
import BranchDiffUtility from '../utils/diff';
import {
  askCompareBranch,
  askBaseBranch,
  askStackAPIKey,
  selectModule
} from "./interactive";


export default class BranchDiff {
  private options: BranchOptions;
  public branchUtilityInstance: BranchDiffUtility;
  public branchesDiffData: BranchDiffRes[];
  public branchSummary: BranchDiffSummary;
  public branchCompactTextRes: BranchCompactTextRes;

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
    if (!this.options.baseBranch) {
      this.options.baseBranch = await askBaseBranch();
    }
    if (!this.options.compareBranch) {
      this.options.compareBranch = await askCompareBranch();
    }
    if (!this.options.module) {
      this.options.module = await selectModule();
    }
    if (!this.options.stackAPIKey) {
      this.options.stackAPIKey = await askStackAPIKey();
    }
  }

  /**
   * @methods utilityInstance - create instance of utility and call method
   * @returns {*} {Promise<void>}
   * @memberof BranchDiff
   */
  async utilityInstance(): Promise<void> {
    this.branchUtilityInstance = new BranchDiffUtility(this.options);
    //cliux.loader("Loading branch differences...");
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
      this.parseCompactText();
      this.printCompactTextView();
    } else if (this.options.format === "verbose") {
      //call verbose method
    }
  }

  /**
   * @methods parseSummary - parse compact text json response
   * @returns {*} {void}
   * @memberof BranchDiff
   */
  parseCompactText(): void {
    const { listOfAdded, listOfDeleted, listOfModified } = this.branchUtilityInstance.getBranchesCompactText();
    this.branchCompactTextRes = {
      modified: listOfModified,
      added: listOfAdded,
      deleted: listOfDeleted
    }
  }

  /**
   * @methods printCompactTextView - print diff in compact text format
   * @returns {*} {void}
   * @memberof BranchDiff
   */
  printCompactTextView(): void {
    cliux.print(" ");
    cliux.print(`Differences in '${this.options.compareBranch}' compared to '${this.options.baseBranch}'`);

    if (this.branchCompactTextRes.modified?.length) {
      forEach(this.branchCompactTextRes.modified, (diff: BranchDiffRes) => {
        cliux.print(`${chalk.blue("± Modified:")}  '${diff.title}' ${startCase(camelCase(this.options.module))}`)
      });
    }

    if (this.branchCompactTextRes.added?.length) {
      forEach(this.branchCompactTextRes.added, (diff: BranchDiffRes) => {
        cliux.print(`${chalk.green("+ Added:")}  '${diff.title}' ${startCase(camelCase(this.options.module))}`)
      });
    }

    if (this.branchCompactTextRes.deleted?.length) {
      forEach(this.branchCompactTextRes.deleted, (diff: BranchDiffRes) => {
        cliux.print(`${chalk.red("- Deleted:")}  '${diff.title}' ${startCase(camelCase(this.options.module))}`)
      });
    }
  }
}
