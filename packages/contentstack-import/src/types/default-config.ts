import { Modules } from '.';

export default interface DefaultConfig {
  versioning: boolean;
  host: string;
  extensionHost: string;
  developerHubUrls: Record<string, string>;
  modules: {
    apiConcurrency: number;
    types: Modules[];
    locales: {
      dirName: string;
      fileName: string;
      requiredKeys: string[];
    };
    customRoles: {
      dirName: string;
      fileName: string;
      customRolesLocalesFileName: string;
    };
    environments: {
      dirName: string;
      fileName: string;
    };
    labels: {
      dirName: string;
      fileName: string;
    };
    extensions: {
      dirName: string;
      fileName: string;
      validKeys: string[];
    };
    webhooks: {
      dirName: string;
      fileName: string;
    };
    releases: {
      dirName: string;
      fileName: string;
      invalidKeys: string[];
    };
    workflows: {
      dirName: string;
      fileName: string;
      invalidKeys: string[];
    };
    assets: {
      dirName: string;
      assetBatchLimit: number;
      publishAssets: boolean;
      fileName: string;
      importSameStructure: boolean;
      uploadAssetsConcurrency: number;
      displayExecutionTime: boolean;
      importFoldersConcurrency: number;
      includeVersionedAssets: boolean;
      host: string;
      folderValidKeys: string[];
      validKeys: string[];
    };
    'assets-old': {
      dirName: string;
      fileName: string;
      limit: number;
      host: string;
      validKeys: string[];
      assetBatchLimit: number;
      uploadAssetsConcurrency: number;
      importFoldersConcurrency: number;
    };
    content_types: {
      dirName: string;
      fileName: string;
      validKeys: string[];
      limit: number;
    };
    'content-types': {
      dirName: string;
      fileName: string;
      validKeys: string[];
      limit: number;
    };
    entries: {
      dirName: string;
      fileName: string;
      invalidKeys: string[];
      limit: number;
      assetBatchLimit: number;
    };
    globalfields: {
      dirName: string;
      fileName: string;
      validKeys: string[];
      limit: number;
    };
    'global-fields': {
      dirName: string;
      fileName: string;
      validKeys: string[];
      limit: number;
    };
    stack: {
      dirName: string;
      fileName: string;
    };
    marketplace_apps: {
      dirName: string;
      fileName: string;
    };
    masterLocale: {
      dirName: string;
      fileName: string;
      requiredKeys: string[];
    };
  };
  languagesCode: string[];
  apis: {
    userSession: string;
    locales: string;
    environments: string;
    assets: string;
    content_types: string;
    entries: string;
    extensions: string;
    webhooks: string;
    globalfields: string;
    folders: string;
    stacks: string;
    labels: string;
  };
  updatedModules: string[];
  rateLimit: number;
  preserveStackVersion: boolean;
  entriesPublish: boolean;
  concurrency: number;
  importConcurrency: number;
  fetchConcurrency: number;
  writeConcurrency: number;
  developerHubBaseUrl: string;
  marketplaceAppEncryptionKey: string;
  getEncryptionKeyMaxRetry: number;
  useNewModuleStructure: boolean;
  createBackupDir?: string;
}
