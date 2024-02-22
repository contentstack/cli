export interface Workflow {
  uid: string;
  name: string;
  content_types: string[];
  org_uid?: string;
  api_key?: string;
  workflow_stages?: Record<string, unknown>;
  admin_users?: any;
  enabled?: boolean;
  deleted_at?: any;
}

export interface WorkflowErrorReturnType {
  name: string;
  uid: string;
  content_types: string[];
}
