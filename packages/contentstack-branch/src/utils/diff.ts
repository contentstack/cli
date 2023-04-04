import forEach from "lodash/forEach";
import { cliux, messageHandler, HttpClient } from "@contentstack/cli-utilities";
import {
  BranchOptions,
  BranchDiffRes,
  BranchDiffSummary,
  BranchCompactTextRes
} from "../interfaces/index";


export default class BranchDiffUtility {
  private stackAPIKey: string;
  private baseBranch: string;
  private compareBranch: string;
  private authToken: string;
  private baseUrl: string;
  private module: string;
  private format: string;
  public branchesDiffData: BranchDiffRes[];

  constructor(params: BranchOptions) {
    this.stackAPIKey = params.stackAPIKey;
    this.baseBranch = params.baseBranch;
    this.compareBranch = params.compareBranch;
    this.authToken = params.authToken;
    this.baseUrl = params.baseUrl;
    this.module = params.module;
    this.format = params.format;
  }

  async run(): Promise<any> {
    await this.fetchBranchesDiff();
  }

  async fetchBranchesDiff() {
    let url = `${this.baseUrl}/${this.module}`;
    let branchDiffData = await this.apiRequest(url);
    this.branchesDiffData = branchDiffData?.diff;
    this.branchesCompactTextView();
  }

  branchSummary(): BranchDiffSummary {
    let baseCount: number = 0,
      compareCount: number = 0,
      modifiedCount: number = 0;

    if (this.branchesDiffData?.length) {
      forEach(this.branchesDiffData, (diff: BranchDiffRes) => {
        if (diff.status === "compare_only") compareCount++;
        else if (diff.status === "base_only") baseCount++;
        else if (diff.status === "modified") modifiedCount++;
      })
    }

    const diffSummary: BranchDiffSummary = {
      base: this.baseBranch,
      compare: this.compareBranch,
      base_only: baseCount,
      compare_only: compareCount,
      modified: modifiedCount
    }
    return diffSummary;
  }

  branchesCompactTextView(): BranchCompactTextRes {
    let listOfModified: string[] = [],
      listOfAdded: string[] = [],
      listOfDeleted: string[] = [];

    if (this.branchesDiffData?.length) {
      forEach(this.branchesDiffData, (diff: BranchDiffRes) => {
        if (diff.status === "compare_only") listOfAdded.push(diff.uid);
        else if (diff.status === "base_only")
          listOfDeleted.push(diff.uid);
        else if (diff.status === "modified")
          listOfModified.push(diff.uid);
      });
    }

    const resp: BranchCompactTextRes = {
      modified: listOfModified,
      added: listOfAdded,
      deleted: listOfDeleted
    }
    return resp;
  }

  async apiRequest(url: string) {
    const headers = {
      authToken: this.authToken,
      "api_key": this.stackAPIKey,
      "Content-Type": "application/json"
    };
    const params = {
      "base_branch": this.baseBranch,
      "compare_branch": this.compareBranch
    };
    const result = await new HttpClient()
      .headers(headers)
      .queryParams(params)
      .get(url)
      .then(({ data }) => data)
      .catch(err => {
        cliux.error(messageHandler.parse('CLI_BRANCH_API_FAILED'))
        process.exit(1);
      });
    return result;
  }
}


