import { Modules, Context } from '.';
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
  context?: Context;
  cliLogsPath?: string;
  contentDir: string;
  data: string;
  management_token?: string;
  apiKey: string;
  forceStopMarketplaceAppsPrompt: boolean;
  auth_token?: string;
  contentTypes?: string[];
  branches?: branch[];
  branchEnabled?: boolean;
  branchDir?: string;
  branchAlias?: string;
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
  target_stack?: string;
  masterLocale: masterLocale;
  backupConcurrency?: number;
  authtoken?: string;
  destinationStackName?: string;
  org_uid?: string;
  stackName?: string;
  branchName: string;
  selectedModules: Modules[];
  useBackedupDir?: string;
  backupDir: string;
  createBackupDir?: string;
  region: any;
  authenticationMethod?: string;
}

type branch = {
  uid: string;
  source: string;
};

type masterLocale = {
  code: string;
};
