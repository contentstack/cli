export const testFlags = {
  noProjOrg: { uid: '***REMOVED***xx' },
  invalidOrg: { name: 'Invalid Org', uid: 'abcd' },
  invalidProj: 'abcd',
};

export const launchMockData = {
  flags: {
    type: 'GitHub',
    framework: 'Gatsby',
    org: '***REMOVED***xx',
    name: 'Test project',
    environment: 'dev',
    branch: 'dev',
    'build-command': 'npm run build',
    'out-dir': './',
    'show-variables': true,
  },
};

export const logsMockData = {
  flags: {
    type: 'd',
    environment: 'dev',
    deployment: 'test',
  },
};

export const githubAdapterMockData = {
  userconnection: {
    __typename: 'UserConnection',
    userUid: '***REMOVED***xx',
    provider: 'GitHub',
  },
  adapterConstructorInputs: {
    config: {
      currentConfig: {},
      // flags: {
      //   'data-dir': '/Users/shrutika.almeida/Downloads/React-Starter',
      //   init: true,
      //   'show-variables': false,
      // },
      host: 'api.contentstack.io',
      config: '/Users/shrutika.almeida/Downloads/React-Starter/.cs-launch.json',
      projectBasePath: '/Users/shrutika.almeida/Downloads/React-Starter',
      authtoken: '***REMOVED***xx',
      authType: 'BASIC',
      authorization: undefined,
      logsApiBaseUrl: 'https://launch-api.contentstack.com/logs/graphql',
      manageApiBaseUrl: 'https://launch-api.contentstack.com/manage/graphql',
      isExistingProject: false,
      // provider: 'GitHub',
    },
  },
};
