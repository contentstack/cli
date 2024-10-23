import { ContentstackClient } from '@contentstack/cli-utilities';
import ImportConfig from './import-config';

export type ModuleClassParams = {
  stackAPIClient: ReturnType<ContentstackClient['stack']>;
  config: ImportConfig;
  dependencies: Modules;
};
// eslint-disable-next-line @typescript-eslint/no-redeclare
export interface AuthOptions {
  contentstackClient: ContentstackClient;
}

export interface ContentStackManagementClient {
  contentstackClient: object;
}

export interface PrintOptions {
  color?: string;
}

export interface InquirePayload {
  type: string;
  name: string;
  message: string;
  choices?: Array<any>;
  transformer?: Function;
}

export interface User {
  email: string;
  authtoken: string;
}

export type Modules =
  | 'stack'
  | 'assets'
  | 'locales'
  | 'environments'
  | 'extensions'
  | 'webhooks'
  | 'global-fields'
  | 'entries'
  | 'content-types'
  | 'custom-roles'
  | 'workflows'
  | 'labels'
  | 'marketplace-apps'
  | 'taxonomies';

export interface ExtensionsRecord {
  title: string;
  uid: string;
}

export interface MarketplaceAppsConfig {
  dirName: string;
  fileName: string;
  dependencies?: Modules[];
}

export interface EnvironmentConfig {
  dirName: string;
  fileName: string;
  dependencies?: Modules[];
}

export interface LabelConfig {
  dirName: string;
  fileName: string;
}

export interface WebhookConfig {
  dirName: string;
  fileName: string;
}

export interface WorkflowConfig {
  dirName: string;
  fileName: string;
  invalidKeys: string[];
}

export interface CustomRoleConfig {
  dirName: string;
  fileName: string;
  customRolesLocalesFileName: string;
}

export interface TaxonomiesConfig {
  dirName: string;
  fileName: string;
  dependencies?: Modules[];
}
export { default as DefaultConfig } from './default-config';
export { default as ImportConfig } from './import-config';

export type ExtensionType = {
  uid: string;
  scope: Record<string, unknown>;
  title: string;
};

export type TaxonomyQueryParams = {
  include_count: boolean;
  limit: number;
  skip: number;
  depth?: number;
};
