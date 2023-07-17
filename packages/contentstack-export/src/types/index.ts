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
  | 'marketplace-apps';

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

export { default as DefaultConfig } from './default-config';
export { default as ExportConfig } from './export-config';
