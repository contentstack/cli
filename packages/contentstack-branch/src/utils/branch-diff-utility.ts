import forEach from 'lodash/forEach';
import unionWith from 'lodash/unionWith';
import find from 'lodash/find';
import { updatedDiff } from 'deep-object-diff';
import { flatten } from 'flat';
import { cliux, messageHandler, HttpClient } from '@contentstack/cli-utilities';
import {
  BranchOptions,
  BranchDiffRes,
  ModifiedFieldsInput,
  ModifiedFieldsType,
  BranchModifiedDetails,
} from '../interfaces/index';

export default class BranchDiffUtility {
  private stackAPIKey: string;
  private baseBranch: string;
  private compareBranch: string;
  private authToken: string;
  private baseUrl: string;
  private filter: string;
  public module: string;
  public branchesDiffData: BranchDiffRes[];
  public filteredUid: string[];
  public listOfModifiedFields: ModifiedFieldsType[];
  public listOfAddedFields: ModifiedFieldsType[];
  public listOfDeletedFields: ModifiedFieldsType[];

  constructor(params: BranchOptions) {
    this.stackAPIKey = params.stackAPIKey;
    this.baseBranch = params.baseBranch;
    this.compareBranch = params.compareBranch;
    this.authToken = params.authToken;
    this.baseUrl = 'http://dev16-branches.csnonprod.com/api/compare';
    this.filter = params.filter;
    this.module = params.module;
  }

  /**
   * @methods fetchBranchesDiff - fetch branches diff list
   * @returns {*} {Promise<void>}
   * @memberof BranchDiffUtility
   */
  async fetchBranchesDiff(): Promise<void> {
    let url = `${this.baseUrl}/${this.module}`;
    let branchDiffData = await this.apiRequest(url);
    this.branchesDiffData = [ 
      {
        "uid": "content_type_uid_1", 
        "title": "Content Type 1 Title", 
        "type": "content_type", 
        "status": "compare_only" 
      },
      {
        "uid": "content_type_uid_2", 
        "title": "Content Type 2 Title", 
        "type": "content_type", 
        "status": "modified" 
      },
      {
        "uid": "content_type_uid_3", 
        "title": "Content Type 3 Title", 
        "type": "content_type", 
        "status": "base_only" 
      }
    ]
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
   * @methods getBrancheCompactData - branches summary compact text response
   * @memberof BranchDiffUtility
   */
  getBrancheCompactData() {
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
      authToken: '***REMOVED***',
      api_key: 'blt880ba1dc5c2c3a67',
      'Content-Type': 'application/json',
    };
    const params = {
      base_branch: 'main',
      compare_branch: 'manali',
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

  async getBranchVerboseData() {
    const { listOfAdded, listOfModified, listOfDeleted } = this.getBrancheCompactData();
    let detailListOfModified: BranchModifiedDetails[] = [];

    for (let i = 0; i < listOfModified?.length; i++) {
      let diff: BranchDiffRes = listOfModified[i];
      let url = `${this.baseUrl}/${this.module}/${diff.title}`;
      let branchDiff = await this.apiRequest(url);
      if (branchDiff) {
        (this.listOfModifiedFields = []), (this.listOfAddedFields = []), (this.listOfDeletedFields = []);
        await this.prepareBranchVerboseRes(branchDiff);
        detailListOfModified.push({
          moduleDetails: diff,
          modifiedFields: {
            modified: this.listOfModifiedFields,
            deleted: this.listOfDeletedFields,
            added: this.listOfAddedFields,
          },
        });
      }
    }

    return { listOfAdded, listOfDeleted, detailListOfModified };
  }

  async prepareBranchVerboseRes(branchDiff: any) {
    let unionOfBaseAndCompareBranch: any[] = [];
    const baseBranchDiff = branchDiff?.diff?.base_branch?.differences;
    const compareBranchDiff = branchDiff?.diff?.compare_branch?.differences;

    if (baseBranchDiff && compareBranchDiff) {
      unionOfBaseAndCompareBranch = unionWith(baseBranchDiff, compareBranchDiff, this.customComparator);
    }

    if (branchDiff?.diff?.status === 'modified') {
      forEach(unionOfBaseAndCompareBranch, (diff)=>{
        const baseBranchFieldExists = find(baseBranchDiff, (item) => item.uid === diff.uid || item.path === diff.path);
        const compareBranchFieldExists = find(
          compareBranchDiff,
          (item) => item.uid === diff.uid || item.path === diff.path,
        );
        this.baseAndCompareBranchDiff({ baseBranchFieldExists, compareBranchFieldExists, diff });
      })
    }
  }

  baseAndCompareBranchDiff(params: { baseBranchFieldExists: any; compareBranchFieldExists: any; diff: any }) {
    const { baseBranchFieldExists, compareBranchFieldExists, diff } = params;
    let fieldType: string = 'Metadata Field';
    let displayName = compareBranchFieldExists?.display_name || baseBranchFieldExists?.display_name;
    if (displayName) {
      fieldType = `${displayName} Field`;
    }

    if (baseBranchFieldExists && compareBranchFieldExists) {
      const updated = updatedDiff(baseBranchFieldExists, compareBranchFieldExists);
      let flattenUpdatedObj: object = flatten(updated);
      forEach(flattenUpdatedObj, (value, key) => {
        if (key === 'value') {
          key = diff.path;
        }
        this.listOfModifiedFields.push({
          path: key,
          displayName: diff?.display_name,
          uid: diff?.uid,
          fieldType,
        });
      });
    } else if (baseBranchFieldExists && !compareBranchFieldExists) {
      this.listOfDeletedFields.push({
        path: baseBranchFieldExists?.path,
        displayName: diff?.display_name,
        uid: baseBranchFieldExists?.uid,
        fieldType,
      });
    } else if (!baseBranchFieldExists && compareBranchFieldExists) {
      this.listOfAddedFields.push({
        path: compareBranchFieldExists?.path,
        displayName: diff?.display_name,
        uid: compareBranchFieldExists?.uid,
        fieldType,
      });
    }
  }

  customComparator(a: any, b: any) {
    return a.uid === b.uid || a.path === b.path;
  }
}
