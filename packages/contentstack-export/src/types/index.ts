import { ContentstackClient } from '@contentstack/cli-utilities';
import ExportConfig from './export-config';

// eslint-disable-next-line @typescript-eslint/no-redeclare
export interface AuthOptions {
  contentstackClient: any;
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

export interface Region {
  name: string;
  cma: string;
  cda: string;
  uiHost: string;
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
  | 'taxonomies'
  | 'personalize'
  | 'composable-studio';

export type ModuleClassParams = {
  stackAPIClient: ReturnType<ContentstackClient['stack']>;
  exportConfig: ExportConfig;
  moduleName: Modules;
};

export interface ExternalConfig extends ExportConfig {
  master_locale: {
    name: string;
    code: string;
  };
  source_stack?: string;
  data: string;
  branchName: string;
  moduleName: Modules;
  fetchConcurrency: number;
  writeConcurrency: number;
  securedAssets: boolean;
  email?: string;
  password?: string;
}

export interface ExtensionsConfig {
  dirName: string;
  fileName: string;
  dependencies?: Modules[];
  limit?: number;
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
  limit?: number;
}

export interface LabelConfig {
  dirName: string;
  fileName: string;
  invalidKeys: string[];
  dependencies?: Modules[];
  limit?: number;
}

export interface WebhookConfig {
  dirName: string;
  fileName: string;
  dependencies?: Modules[];
  limit?: number;
}

export interface WorkflowConfig {
  dirName: string;
  fileName: string;
  invalidKeys: string[];
  dependencies?: Modules[];
  limit?: number;
}

export interface CustomRoleConfig {
  dirName: string;
  fileName: string;
  customRolesLocalesFileName: string;
  dependencies?: Modules[];
}

export interface StackConfig {
  dirName: string;
  fileName: string;
  dependencies?: Modules[];
  limit?: number;
}

export interface ComposableStudioConfig {
  dirName: string;
  fileName: string;
  apiBaseUrl: string;
}

export interface ComposableStudioProject {
  name: string;
  description: string;
  canvasUrl: string;
  connectedStackApiKey: string;
  contentTypeUid: string;
  organizationUid: string;
  settings: {
    configuration: {
      environment: string;
      locale: string;
    };
  };
  createdBy: string;
  updatedBy: string;
  deletedAt: boolean;
  createdAt: string;
  updatedAt: string;
  uid: string;
}
export interface Context {
  command: string;
  module: string;
  userId: string | undefined;
  email: string | undefined;
  sessionId: string | undefined;
  clientId?: string | undefined;
  apiKey: string;
  orgId: string;
  authenticationMethod?: string;
}

export { default as DefaultConfig } from './default-config';
export { default as ExportConfig } from './export-config';
export * from './marketplace-app';
