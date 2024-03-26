/**
 * NOTE: Accessing ExportConfig from the export package is not possible
 * because it will create a circular dependency and cause the prepack/build command to fail.
 * Therefore, we are duplicating the following types from the export.
 */
import { AnyProperty } from "./utils";

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
  | 'marketplace-apps'
  | 'taxonomies';

export type branch = {
  uid: string;
  source: string;
};

export type masterLocale = {
  code: string;
};

export interface DefaultConfig {
  contentVersion: number;
  versioning: boolean;
  host: string;
  cdn?: string;
  developerHubUrls: any;
  modules: {
    types: Modules[];
    locales: {
      dirName: string;
      fileName: string;
      requiredKeys: string[];
      dependencies?: Modules[];
    };
    customRoles: {
      dirName: string;
      fileName: string;
      customRolesLocalesFileName: string;
      dependencies?: Modules[];
    };
    'custom-roles': {
      dirName: string;
      fileName: string;
      customRolesLocalesFileName: string;
      dependencies?: Modules[];
    };
    environments: {
      dirName: string;
      fileName: string;
      dependencies?: Modules[];
    };
    labels: {
      dirName: string;
      fileName: string;
      invalidKeys: string[];
      dependencies?: Modules[];
    };
    webhooks: {
      dirName: string;
      fileName: string;
      dependencies?: Modules[];
    };
    releases: {
      dirName: string;
      fileName: string;
      releasesList: string;
      invalidKeys: string[];
      dependencies?: Modules[];
    };
    workflows: {
      dirName: string;
      fileName: string;
      invalidKeys: string[];
      dependencies?: Modules[];
    };
    globalfields: {
      dirName: string;
      fileName: string;
      validKeys: string[];
      dependencies?: Modules[];
    };
    'global-fields': {
      dirName: string;
      fileName: string;
      validKeys: string[];
      dependencies?: Modules[];
    };
    assets: {
      dirName: string;
      fileName: string;
      // This is the total no. of asset objects fetched in each 'get assets' call
      batchLimit: number;
      host: string;
      invalidKeys: string[];
      // no of asset version files (of a single asset) that'll be downloaded parallel
      chunkFileSize: number; // measured on Megabits (5mb)
      downloadLimit: number;
      fetchConcurrency: number;
      assetsMetaKeys: string[]; // Default keys ['uid', 'url', 'filename']
      securedAssets: boolean;
      displayExecutionTime: boolean;
      enableDownloadStatus: boolean;
      includeVersionedAssets: boolean;
      dependencies?: Modules[];
    };
    content_types: {
      dirName: string;
      fileName: string;
      validKeys: string[];
      // total no of content types fetched in each 'get content types' call
      limit: number;
      dependencies?: Modules[];
    };
    'content-types': {
      dirName: string;
      fileName: string;
      validKeys: string[];
      // total no of content types fetched in each 'get content types' call
      limit: number;
      dependencies?: Modules[];
    };
    entries: {
      dirName: string;
      fileName: string;
      invalidKeys: string[];
      batchLimit: number;
      downloadLimit: number;
      // total no of entries fetched in each content type in a single call
      limit: number;
      dependencies?: Modules[];
      exportVersions: boolean;
    };
    variantEntry: {
      dirName: string;
      fileName: string;
      chunkFileSize: number;
      query: {
        skip: number;
        limit: number;
        locale: string;
        include_variant: boolean;
      } & AnyProperty;
    } & AnyProperty;
    extensions: {
      dirName: string;
      fileName: string;
      dependencies?: Modules[];
    };
    stack: {
      dirName: string;
      fileName: string;
      dependencies?: Modules[];
    };
    dependency: {
      entries: string[];
    };
    marketplace_apps: {
      dirName: string;
      fileName: string;
      dependencies?: Modules[];
    };
    'marketplace-apps': {
      dirName: string;
      fileName: string;
      dependencies?: Modules[];
    };
    masterLocale: {
      dirName: string;
      fileName: string;
      requiredKeys: string[];
    };
    taxonomies: {
      dirName: string;
      fileName: string;
      invalidKeys: string[];
      dependencies?: Modules[];
    };
  };
  languagesCode: string[];
  apis: {
    userSession: string;
    globalfields: string;
    locales: string;
    labels: string;
    environments: string;
    assets: string;
    content_types: string;
    entries: string;
    users: string;
    extension: string;
    webhooks: string;
    stacks: string;
  };
  preserveStackVersion: boolean;
  fetchConcurrency: number;
  writeConcurrency: number;
  developerHubBaseUrl: string;
  marketplaceAppEncryptionKey: string;
  onlyTSModules: string[];
}

export interface ExportConfig extends DefaultConfig {
  exportDir: string;
  data: string;
  management_token?: string;
  apiKey: string;
  forceStopMarketplaceAppsPrompt: boolean;
  auth_token?: string;
  branchName?: string;
  securedAssets?: boolean;
  contentTypes?: string[];
  branches?: branch[];
  branchEnabled?: boolean;
  branchDir?: string;
  singleModuleExport?: boolean;
  moduleName?: Modules;
  master_locale: masterLocale;

  headers?: {
    api_key: string;
    access_token?: string;
    authtoken?: string;
    'X-User-Agent': string;
  };
  access_token?: string;
  org_uid?: string;
  source_stack?: string;
  sourceStackName?: string;
}