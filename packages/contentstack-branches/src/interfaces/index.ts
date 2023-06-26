export interface BranchOptions {
  compareBranch: string;
  stackAPIKey: string;
  module: string;
  format: string;
  baseBranch?: string;
  authToken?: string;
  host?: string;
}

export interface BranchDiffRes {
  uid: string;
  title: string;
  type: string;
  status: string;
}

export interface BranchDiffSummary {
  base: string;
  compare: string;
  base_only: number;
  compare_only: number;
  modified: number;
}

export interface BranchCompactTextRes {
  modified?: BranchDiffRes[];
  added?: BranchDiffRes[];
  deleted?: BranchDiffRes[];
}

export interface MergeSummary {
  requestPayload: MergeSummaryRequestPayload;
}

type MergeSummaryRequestPayload = {
  base_branch: string;
  compare_branch: string;
  default_merge_strategy: string;
  item_merge_strategies?: any[];
  no_revert?: boolean;
  merge_comment?: string;
};
export interface MergeInputOptions {
  compareBranch: string;
  strategy: string;
  strategySubOption: string;
  branchCompareData: any;
  mergeComment?: string;
  executeOption?: string;
  noRevert?: boolean;
  baseBranch: string;
  format?: string;
  exportSummaryPath?: string;
  mergeSummary?: MergeSummary;
  stackAPIKey: string;
  host: string;
  enableEntryExp: boolean;
}

export interface ModifiedFieldsType {
  uid: string;
  displayName: string;
  path: string;
  field: string;
}

export interface ModifiedFieldsInput {
  modified?: ModifiedFieldsType[];
  added?: ModifiedFieldsType[];
  deleted?: ModifiedFieldsType[];
}

export interface BranchModifiedDetails {
  moduleDetails: BranchDiffRes;
  modifiedFields: ModifiedFieldsInput;
}

export interface BranchDiffVerboseRes {
  modified?: BranchModifiedDetails[];
  added?: BranchDiffRes[];
  deleted?: BranchDiffRes[];
}

export interface BranchDiffPayload {
  module: string;
  apiKey: string;
  baseBranch: string;
  compareBranch: string;
  filter?: string;
  host?: string;
  uid?: string;
  spinner?: any;
  url?: string;
}

export type MergeStrategy =
  | 'merge_prefer_base'
  | 'merge_prefer_compare'
  | 'overwrite_with_compare'
  | 'merge_new_only'
  | 'merge_modified_only_prefer_base'
  | 'merge_modified_only_prefer_compare'
  | 'ignore';

export interface MergeParams {
  base_branch: string;
  compare_branch: string;
  default_merge_strategy: MergeStrategy;
  merge_comment: string;
  no_revert?: boolean;
}
