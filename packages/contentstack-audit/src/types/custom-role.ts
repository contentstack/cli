export interface CustomRole {
  name: string;
  description: string;
  rules: Rule[];
  users: string[];
  uid: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  owner: string;
  stack: Stack;
  permissions: Permissions;
  SYS_ACL: Record<string, unknown>;
  fixStatus?: string;
  missingRefs?: any;
}

export interface Rule {
  branch_aliases: any;
  module: string;
  environments?: string[];
  locales?: string[];
  branches?: string[];
  acl: ACL;
}

interface ACL {
  read: boolean;
}

interface Stack {
  created_at: string;
  updated_at: string;
  uid: string;
  name: string;
  org_uid: string;
  api_key: string;
  master_locale: string;
  is_asset_download_public: boolean;
  owner_uid: string;
  user_uids: string[];
  settings: Settings;
  master_key: string;
}

interface Settings {
  version: string;
  rte_version: number;
  blockAuthQueryParams: boolean;
  allowedCDNTokens: string[];
  branches: boolean;
  localesOptimization: boolean;
  webhook_enabled: boolean;
  stack_variables: Record<string, unknown>;
  live_preview: Record<string, unknown>;
  discrete_variables: DiscreteVariables;
  language_fallback: boolean;
}

interface DiscreteVariables {
  cms: boolean;
  _version: number;
  secret_key: string;
}

interface Permissions {
  content_types: ContentType[];
  environments: string[];
  locales: Locale[];
}

interface ContentType {
  uid: string;
  SYS_ACL: SysACL;
}

interface SysACL {
  sub_acl: Record<string, unknown>;
}

interface Locale {
  uid: string;
  SYS_ACL: ACL;
}