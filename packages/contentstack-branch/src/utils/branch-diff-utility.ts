import forEach from 'lodash/forEach';
import { cliux, messageHandler, HttpClient } from '@contentstack/cli-utilities';
import { BranchOptions, BranchDiffRes } from '../interfaces/index';

export default class BranchDiffUtility {
  private stackAPIKey: string;
  private baseBranch: string;
  private compareBranch: string;
  private authToken: string;
  private baseUrl: string;
  private module: string;
  private filter: string;
  public branchesDiffData: BranchDiffRes[];
  public filteredUid: string[];

  constructor(params: BranchOptions) {
    this.stackAPIKey = params.stackAPIKey;
    this.baseBranch = params.baseBranch;
    this.compareBranch = params.compareBranch;
    this.authToken = params.authToken;
    this.baseUrl = 'http://dev16-branches.csnonprod.com/api/compare';
    this.module = params.module;
    this.filter = params.filter;
  }

  /**
   * @methods fetchBranchesDiff - fetch branches diff list
   * @returns {*} {Promise<void>}
   * @memberof BranchDiffUtility
   */
  async fetchBranchesDiff(): Promise<void> {
    let url = `${this.baseUrl}/${this.module}`;
    let branchDiffData = await this.apiRequest(url);
    // this.branchesDiffData = branchDiffData?.diff;
    this.branchesDiffData = [
      {
        uid: 'content_type_uid_1',
        title: 'Content Type 1 Title',
        type: 'content_type',
        status: 'compare_only',
      },
      {
        uid: 'content_type_uid_2',
        title: 'Content Type 2 Title',
        type: 'content_type',
        status: 'modified',
      },
      {
        uid: 'content_type_uid_3',
        title: 'Content Type 3 Title',
        type: 'content_type',
        status: 'base_only',
      },
    ];
    if (this.filter) {
      //handle filter
    }
  }

  /**
   * @methods getBranchesSummary - branches summary response
   * @memberof BranchDiffUtility
   */
  getBranchesSummary() {
    let baseCount: number = 0,
      compareCount: number = 0,
      modifiedCount: number = 0;

    if (this.branchesDiffData?.length) {
      forEach(this.branchesDiffData, (diff: BranchDiffRes) => {
        if (this.filteredUid && !this.filteredUid.includes(diff.uid)) {
          return;
        } else {
          if (diff.status === 'compare_only') compareCount++;
          else if (diff.status === 'base_only') baseCount++;
          else if (diff.status === 'modified') modifiedCount++;
        }
      });
    }
    return { baseCount, compareCount, modifiedCount };
  }

  /**
   * @methods getBranchesCompactText - branches summary compact text response
   * @memberof BranchDiffUtility
   */
  getBranchesCompactText() {
    let listOfModified: BranchDiffRes[] = [],
      listOfAdded: BranchDiffRes[] = [],
      listOfDeleted: BranchDiffRes[] = [];

    if (this.branchesDiffData?.length) {
      forEach(this.branchesDiffData, (diff: BranchDiffRes) => {
        if (this.filteredUid && !this.filteredUid.includes(diff.uid)) {
          return;
        } else {
          if (diff.status === 'compare_only') listOfAdded.push(diff);
          else if (diff.status === 'base_only') listOfDeleted.push(diff);
          else if (diff.status === 'modified') listOfModified.push(diff);
        }
      });
    }
    return { listOfAdded, listOfModified, listOfDeleted };
  }

  /**
   * @methods apiRequest - branch compare api request
   * @memberof BranchDiffUtility
   * @param {string} url string
   * @returns {*} {Promise<any>}
   */
  async apiRequest(url: string): Promise<any> {
    const headers = {
      authToken: this.authToken,
      api_key: this.stackAPIKey,
      'Content-Type': 'application/json',
    };
    const params = {
      base_branch: this.baseBranch,
      compare_branch: this.compareBranch,
    };
    const result = await new HttpClient()
      .headers(headers)
      .queryParams(params)
      .get(url)
      .then(({ data }) => data)
      .catch((err) => {
        cliux.error(messageHandler.parse('CLI_BRANCH_API_FAILED'));
        process.exit(1);
      });
    return result;
  }
}
