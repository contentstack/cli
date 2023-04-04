import { ContentstackClient } from "@contentstack/management";

export interface BranchOptions {
  baseBranch: string;
  compareBranch: string;
  stackAPIKey: string;
  authToken: string;
  baseUrl: string;
  module: string;
  format: string;
  filter?: string;
  managementAPIClient?: ContentstackClient;
  ignoreDisplay?: boolean;
  sourcePath?: string;
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
  modified: string[];
  added: string[];
  deleted: string[];
}
