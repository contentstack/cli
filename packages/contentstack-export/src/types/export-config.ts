import { Context, Modules, Region } from '.';
import DefaultConfig from './default-config';

export default interface ExportConfig extends DefaultConfig {
  context: Context;
  cliLogsPath: string;
  exportDir: string;
  data: string;
  management_token?: string;
  apiKey: string;
  forceStopMarketplaceAppsPrompt: boolean;
  auth_token?: string;
  branchName?: string;
  branchAlias?: string;
  securedAssets?: boolean;
  contentTypes?: string[];
  branches?: branch[];
  branchEnabled?: boolean;
  branchDir?: string;
  singleModuleExport?: boolean;
  moduleName?: Modules;
  master_locale: masterLocale;
  query?: any; // Added query field
  headers?: {
    api_key: string;
    access_token?: string;
    authtoken?: string;
    'X-User-Agent': string;
    organization_uid?: string;
  };
  access_token?: string;
  org_uid?: string;
  source_stack?: string;
  sourceStackName?: string;
  region: Region;
  skipStackSettings?: boolean;
  skipDependencies?: boolean;
  authenticationMethod?: string;
}

type branch = {
  uid: string;
  source: string;
};

type masterLocale = {
  code: string;
};
