import { AnyProperty } from './utils';

export interface ImportDefaultConfig extends AnyProperty {
  modules: {
    'content-types': {
      dirName: string;
      fileName: string;
      validKeys: string[];
      limit: number;
    };
    entries: {
      dirName: string;
      fileName: string;
    };
    personalize: {
      baseURL: Record<string, string>;
      dirName: string;
      importData: boolean;
      importOrder: string[];
      project_id?: string;
      projects: {
        dirName: string;
        fileName: string;
      };
      attributes: {
        dirName: string;
        fileName: string;
      };
      audiences: {
        dirName: string;
        fileName: string;
      };
      events: {
        dirName: string;
        fileName: string;
      };
      experiences: {
        dirName: string;
        fileName: string;
        thresholdTimer: number;
        checkIntervalDuration: number;
      };
    };
    variantEntry: {
      dirName: string;
      fileName: string;
      apiConcurrency: number;
      query: {
        locale: string;
      } & AnyProperty;
    } & AnyProperty;
  } & AnyProperty;
}

export interface ImportConfig extends ImportDefaultConfig, AnyProperty {
  contentDir: string;
  data: string;
  management_token?: string;
  apiKey: string;
  auth_token?: string;
  branchName?: string;
  branches?: branch[];
  branchEnabled?: boolean;
  branchDir?: string;
  master_locale: masterLocale;
  headers?: {
    api_key: string;
    access_token?: string;
    authtoken?: string;
    'X-User-Agent': string;
    'X-Project-Uid'?: string;
  };
  access_token?: string;
  isAuthenticated?: boolean;
  target_stack?: string;
  singleModuleImport?: boolean;
  masterLocale: masterLocale;
  backupDir: string;
  authtoken?: string;
  destinationStackName?: string;
  org_uid?: string;
  replaceExisting?: boolean;
  skipExisting?: boolean;
  stackName?: string;
}

type branch = {
  uid: string;
  source: string;
};

type masterLocale = {
  code: string;
};
