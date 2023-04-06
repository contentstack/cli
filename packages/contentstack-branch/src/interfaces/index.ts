import { ContentstackClient } from "@contentstack/management";

export interface BranchOptions {
  baseBranch: string;
  compareBranch: string;
  stackAPIKey: string;
  authToken: string;
  module: string;
  format: string;
  filter?: string;
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
  modified: BranchDiffRes[];
  added: BranchDiffRes[];
  deleted: BranchDiffRes[];
}
