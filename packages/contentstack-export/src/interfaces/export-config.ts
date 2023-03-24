import DefaultConfig from './default-config';

export default interface ExportConfig extends DefaultConfig {
  exportDir: string;
  data: string;
  management_token?: string;
  apiKey: string;
  forceStopMarketplaceAppsPrompt: boolean;
  auth_token?: string;
  branchName?: string;
  securedAssets?: boolean;
  contentTypes?: string[];
}
