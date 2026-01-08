import { ContentstackClient } from '@contentstack/cli-utilities';
import ImportConfig from './import-config';

export type ModuleClassParams = {
  stackAPIClient: ReturnType<ContentstackClient['stack']>;
  config: ImportConfig;
  dependencies: Modules[];
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

export type AdditionalKeys = {
  backupDir: string;
};

export type ApiModuleType = 'fetch-assets';

export type ApiOptions = {
  uid?: string;
  url?: string;
  entity: ApiModuleType;
  apiData?: Record<any, any> | any;
  resolve: (value: any) => Promise<void> | void;
  reject: (error: any) => Promise<void> | void;
  additionalInfo?: Record<any, any>;
  includeParamOnCompletion?: boolean;
  serializeData?: (input: ApiOptions) => any;
};

export type EnvType = {
  processName: string;
  totalCount?: number;
  indexerCount?: number;
  currentIndexer?: number;
  apiParams?: ApiOptions;
  concurrencyLimit?: number;
  apiContent: Record<string, any>[];
};

export type CustomPromiseHandlerInput = {
  index: number;
  batchIndex: number;
  element?: Record<string, unknown>;
  apiParams?: ApiOptions;
  isLastRequest: boolean;
};

export type CustomPromiseHandler = (input: CustomPromiseHandlerInput) => Promise<any>;

export interface InquirePayload {
  type: string;
  name: string;
  message: string;
  choices?: Array<any>;
  transformer?: (...args: any[]) => any;
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

export type AssetRecord = {
  uid: string;
  url: string;
  title: string;
};

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
  locale?: string;
};

export interface Context {
  command: string;
  module: string;
  userId: string | undefined;
  email: string | undefined;
  sessionId: string | undefined;
  apiKey: string;
  orgId: string;
  authenticationMethod?: string;
}
