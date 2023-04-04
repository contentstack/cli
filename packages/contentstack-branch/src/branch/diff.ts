import fs from 'fs';
import forEach from "lodash/forEach";
import startCase from "lodash/startCase";
import camelCase from "lodash/camelCase";
import { cliux } from "@contentstack/cli-utilities";
import { BranchOptions, BranchDiffRes, } from "../interfaces/index";
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

  constructor(params: BranchOptions) {
    this.options = params;
  }

  async run(): Promise<any> {
    await this.preCheckAndUtility();
  }

  async preCheckAndUtility(): Promise<void> {
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
    this.branchUtilityInstance = new BranchDiffUtility(this.options);
    cliux.loader("Loading branch differences...");
    await this.branchUtilityInstance.fetchBranchesDiff();
    this.displayBranchSummary();
    if (this.options.format === "text") {
      this.displayCompactView();
    }
  }

  displayBranchSummary(): void {
    const diffSummary = this.branchUtilityInstance.branchSummary();
    cliux.print("Summary:", { "color": "yellow" });

    forEach(diffSummary, (value, key) => {
      cliux.print(`${startCase(camelCase(key))}:  ${value}`)
    })
  }

  displayCompactView(): void {
    const resp = this.branchUtilityInstance.branchesCompactTextView();

    if (!this.options?.ignoreDisplay) {
      cliux.print(" ");
      cliux.print(`Differences in '${this.options.compareBranch}' compared to '${this.options.baseBranch}'`);

      if (resp.modified?.length) {
        forEach(resp.modified, (title) => {
          cliux.print(`± Modified:  ${title} ${startCase(camelCase(this.options.module))}`, { "color": "blue" })
        });
      }

      if (resp.added?.length) {
        forEach(resp.added, (title) => {
          cliux.print(`+ Added:  ${title} ${startCase(camelCase(this.options.module))}`, { "color": "green" })
        });
      }

      if (resp.deleted?.length) {
        forEach(resp.deleted, (title) => {
          cliux.print(`- Deleted:  ${title} ${startCase(camelCase(this.options.module))}`, { "color": "red" })
        });
      }
    } else {
      const directoryExists = fs.existsSync(this.options.sourcePath);
      if (!directoryExists) {
        cliux.error("Directory not exists!.", "error");
        process.exit(1);
      }
      fs.writeFileSync(this.options.sourcePath, JSON.stringify(resp), 'utf-8');
    }
  }
}
