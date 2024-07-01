import { Modules } from '.';
import DefaultConfig from './default-config';

export interface ExternalConfig {
  source_stack?: string;
  data: string;
  fetchConcurrency: number;
  writeConcurrency: number;
  email?: string;
  password?: string;
}

export default interface ImportConfig extends DefaultConfig, ExternalConfig {
  cliLogsPath: string;
  canCreatePrivateApp: boolean;
  contentDir: string;
  data: string;
  management_token?: string;
  apiKey: string;
  forceStopMarketplaceAppsPrompt: boolean;
  skipPrivateAppRecreationIfExist: boolean;
  auth_token?: string;
  branchName?: string;
  securedAssets?: boolean;
  contentTypes?: string[];
  branches?: branch[];
  branchEnabled?: boolean;
  branchDir?: string;
  moduleName?: Modules;
  master_locale: masterLocale;
  headers?: {
    api_key: string;
    access_token?: string;
    authtoken?: string;
    'X-User-Agent': string;
  };
  access_token?: string;
  isAuthenticated?: boolean;
  importWebhookStatus?: string;
  target_stack?: string;
  singleModuleImport?: boolean;
  useBackedupDir?: string;
  masterLocale: masterLocale;
  backupDir: string;
  backupConcurrency?: number;
  authtoken?: string;
  destinationStackName?: string;
  org_uid?: string;
  contentVersion: number;
  replaceExisting?: boolean;
  skipExisting?: boolean;
  skipAudit?: boolean;
  stackName?: string;
  'exclude-global-modules': false;
}

type branch = {
  uid: string;
  source: string;
};

type masterLocale = {
  code: string;
};
