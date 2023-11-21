const config = {
  maxRetryCount: 3,
  configName: '.cs-launch.json',
  logsApiEndpoint: 'logs/graphql',
  manageApiEndpoint: 'manage/graphql',
  projectCreationRetryMaxCount: 3,
  fileUploadConfig: {
    exclude: ['logs', '.next', 'node_modules', '.cs-launch.json'],
  },
  outputDirectories: {
    OTHER: './',
    NEXTJS: './.next',
    GATSBY: './public',
  },
  listOfFrameWorks: [
    { name: 'Gatsby', value: 'GATSBY' },
    { name: 'NextJs', value: 'NEXTJS' },
    { name: 'Other', value: 'OTHER' },
  ],
  providerMapper: {
    GITPROVIDER: 'GitHub',
    FILEUPLOAD: 'FileUpload',
  },
  launchHubUrls: {
    // NOTE CMA url used as launch url mapper to avoid conflict if user used any custom name
    'https://api.contentstack.io': 'https://launch-api.contentstack.com',
    'https://eu-api.contentstack.com': '',
    'https://azure-na-api.contentstack.com': '',
    'https://azure-eu-api.contentstack.com': '',
  },
  supportedAdapters: ['GitHub'],
  deploymentStatus: ['LIVE', 'FAILED', 'SKIPPED', 'DEPLOYED'],
  pollingInterval: 1000,
};

export default config