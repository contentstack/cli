import { AnyProperty } from "./utils";

export type ImportModules =
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
  | 'projects';

export interface ImportDefaultConfig extends AnyProperty {
  versioning: boolean;
  host: string;
  personalizationHost: string;
  extensionHost: string;
  developerHubUrls: Record<string, string>;
  modules: {
    apiConcurrency: number;
    types: ImportModules[];
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
    taxonomies: {
      dirName: string;
      fileName: string;
      dependencies?: ImportModules[];
    };
    personalization: {
      dirName: string;
      projects: {
        dirName: string;
        fileName: string;
      };
    } & AnyProperty;
  } & AnyProperty;
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
  entriesPublish: boolean;
  concurrency: number;
  importConcurrency: number;
  fetchConcurrency: number;
  writeConcurrency: number;
  developerHubBaseUrl: string;
  marketplaceAppEncryptionKey: string;
  getEncryptionKeyMaxRetry: number;
  createBackupDir?: string;
  overwriteSupportedModules: string[];
  onlyTSModules: string[];
  auditConfig?: {
    noLog?: boolean; // Skip logs printing on terminal
    skipConfirm?: boolean; // Skip confirmation if any
    returnResponse?: boolean; // On process completion should return config used in the command
    noTerminalOutput?: boolean; // Skip final audit table output on terminal
    config?: {
      basePath?: string;
    } & Record<string, any>; // To overwrite any build-in config. And this config is equal to --config flag.
  };
}

export interface ExternalConfig {
  source_stack?: string;
  data: string;
  fetchConcurrency: number;
  writeConcurrency: number;
  email?: string;
  password?: string;
}

export interface ImportConfig extends ImportDefaultConfig, ExternalConfig {
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
  moduleName?: ImportModules;
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
}

type branch = {
  uid: string;
  source: string;
};

type masterLocale = {
  code: string;
};
