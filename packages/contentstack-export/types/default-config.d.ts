export default interface DefaultConfig {
  versioning: boolean;
  host: string;
  developerHubUrls: any;
  // use below hosts for eu region
  // host:'https://eu-api.contentstack.com/v3',
  // use below hosts for azure-na region
  // host:'https://azure-na-api.contentstack.com/v3',
  modules: {
    types: string[];
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
      invalidKeys: string[];
    };
    webhooks: {
      dirName: string;
      fileName: string;
    };
    releases: {
      dirName: string;
      fileName: string;
      releasesList: string;
      invalidKeys: string[];
    };
    workflows: {
      dirName: string;
      fileName: string;
      invalidKeys: string[];
    };
    globalfields: {
      dirName: string;
      fileName: string;
      validKeys: string[];
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
    };
    content_types: {
      dirName: string;
      fileName: string;
      validKeys: string[];
      // total no of content types fetched in each 'get content types' call
      limit: number;
    };
    entries: {
      dirName: string;
      fileName: string;
      invalidKeys: string[];
      batchLimit: number;
      downloadLimit: number;
      // total no of entries fetched in each content type in a single call
      limit: number;
      dependencies: string[];
    };
    extensions: {
      dirName: string;
      fileName: string;
    };
    stack: {
      dirName: string;
      fileName: string;
    };
    dependency: {
      entries: string[];
    };
    marketplace_apps: {
      dirName: string;
      fileName: string;
    };
  };
  languagesCode: string[];
  updatedModules: string[];
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
  useNewModuleStructure: boolean;
}
