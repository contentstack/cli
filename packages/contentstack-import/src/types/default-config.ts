import { Modules } from '.';

export interface AnyProperty {
  [propName: string]: any;
}

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
    taxonomies: {
      dirName: string;
      fileName: string;
      dependencies?: Modules[];
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
  rateLimit: number;
  preserveStackVersion: boolean;
  concurrency: number;
  importConcurrency: number;
  fetchConcurrency: number;
  writeConcurrency: number;
  developerHubBaseUrl: string;
  marketplaceAppEncryptionKey: string;
  getEncryptionKeyMaxRetry: number;
  createBackupDir?: string;
  overwriteSupportedModules: string[];
  auditConfig?: {
    noLog?: boolean; // Skip logs printing on terminal
    skipConfirm?: boolean; // Skip confirmation if any
    returnResponse?: boolean; // On process completion should return config used in the command
    noTerminalOutput?: boolean; // Skip final audit table output on terminal
    config?: {
      basePath?: string;
      branch?: string;
    } & Record<string, any>; // To overwrite any build-in config. And this config is equal to --config flag.
  };
  globalModules: string[];
  skipAssetsPublish?: boolean;
  skipEntriesPublish?: boolean;
  entriesPublish: boolean,
}
