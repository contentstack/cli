import { AnyProperty } from "./utils";


export interface ImportDefaultConfig extends AnyProperty {
  personalizationHost: string;
  modules: {
    personalization: {
      dirName: string;
      importData: boolean;
      importOrder: string[];
      projects: {
        dirName: string;
        fileName: string;
      };
      attributes: {
        dirName: string;
        fileName: string;
      };
    }
  };
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
  contentVersion: number;
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
