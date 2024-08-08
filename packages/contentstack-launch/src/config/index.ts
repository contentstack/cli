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
    GATSBY: './public',
    NEXTJS: './.next',
    CRA: './build',
    CSR: './',
    ANGULAR: './dist',
    VUEJS: './dist',
    OTHER: './',
  },
  listOfFrameWorks: [
    { name: 'Gatsby', value: 'GATSBY' },
    { name: 'NextJs', value: 'NEXTJS' },
    { name: 'CRA (Create React App)', value: 'CRA' },
    { name: 'CSR (Client-Side Rendered)', value: 'CSR' },
    { name: 'Angular', value: 'ANGULAR' },
    { name: 'VueJs', value: 'VUEJS' },
    { name: 'Other', value: 'OTHER' },
  ],
  providerMapper: {
    GITPROVIDER: 'GitHub',
    FILEUPLOAD: 'FileUpload',
  },
  launchHubUrls: '',
  launchBaseUrl: '',
  supportedAdapters: ['GitHub'],
  deploymentStatus: ['LIVE', 'FAILED', 'SKIPPED', 'DEPLOYED'],
  pollingInterval: 1000,
  variablePreparationTypeOptions: [
    'Import variables from a stack',
    'Manually add custom variables to the list',
    'Import variables from the local env file',
  ],
  variableType: '',
};

export default config;
