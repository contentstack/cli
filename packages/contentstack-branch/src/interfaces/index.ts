export interface BranchOptions {
  compareBranch: string;
  stackAPIKey: string;
  module: string;
  format: string;
  filter?: string;
  baseBranch?: string;
  authToken?: string;
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

export interface MergeInputOptions {
  compareBranch: string;
  strategy: string;
  strategySubOption: string;
  branchCompareData: any;
  mergeComment?: string;
  executeOption?: string;
  noRevert?: boolean;
  baseBranch: string;
}

export type branchConfig = {
  branchName: string;
  apiKey: string;
};
export interface ModifiedFieldsType {
  uid: string;
  displayName: string;
  path: string;
  fieldType: string;
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
  url?: string;
}
