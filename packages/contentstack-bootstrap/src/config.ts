import messageHandler from './messages';
export interface Configuration {
  starterApps: Array<any>;
  sampleApps: any;
  appLevelConfig: any;
}

export interface AppConfig {
  source: string;
  stack: string;
  private?: boolean;
  branch?: string;
  appConfigKey?: string;
}

const config: Configuration = {
  sampleApps: [
    { displayName: 'React JS', configKey: 'reactjs' },
    { displayName: 'Next JS', configKey: 'nextjs' },
    { displayName: 'Gatsby', configKey: 'gatsby' },
    { displayName: 'Angular', configKey: 'angular' },
  ],
  starterApps: [
    { displayName: 'React JS', configKey: 'reactjs-starter' },
    { displayName: 'Next JS', configKey: 'nextjs-starter' },
    { displayName: 'Gatsby', configKey: 'gatsby-starter' },
    { displayName: 'Angular', configKey: 'angular-starter' },
    { displayName: 'Nuxt JS', configKey: 'nuxt-starter' },
    { displayName: 'Vue JS', configKey: 'vue-starter' },
    { displayName: 'Stencil', configKey: 'stencil-starter' },
  ],
  appLevelConfig: {
    nextjs: {
      source: 'contentstack/contentstack-nextjs-react-universal-demo',
      stack: 'contentstack/stack-contentstack-nextjs-react-universal-demo',
    },
    reactjs: {
      source: 'contentstack/contentstack-reactjs-universal-sample-app',
      stack: 'contentstack/stack-contentstack-reactjs-universal-sample-app',
    },
    gatsby: {
      source: 'contentstack/gatsby-starter-contentstack',
      stack: 'contentstack/stack-gatsby-starter-contentstack',
    },
    angular: {
      source: 'contentstack/contentstack-angular-modularblock-example',
      stack: 'contentstack/stack-contentstack-angular-modularblock-example',
    },
    'nuxtjs-disabled': {
      source: 'contentstack/contentstack-nuxtjs-vue-universal-demo',
      stack: 'shafeeqd959/stack-contentstack-nuxtjs-vue-universal-demo',
    },
    'nuxt-starter': {
      source: 'contentstack/contentstack-nuxtjs-starter-app',
      stack: 'contentstack/stack-starter-app',
    },
    'reactjs-starter': {
      source: 'contentstack/contentstack-react-starter-app',
      stack: 'contentstack/stack-starter-app',
    },
    'nextjs-starter': {
      source: 'contentstack/contentstack-nextjs-starter-app',
      stack: 'contentstack/stack-starter-app',
      branch: 'master',
    },
    'gatsby-starter': {
      source: 'contentstack/contentstack-gatsby-starter-app',
      stack: 'contentstack/stack-starter-app',
    },
    'angular-starter': {
      source: 'contentstack/contentstack-angular-starter',
      stack: 'contentstack/stack-starter-app',
    },
    'vue-starter': {
      source: 'contentstack/contentstack-vuejs-starter-app',
      stack: 'contentstack/stack-starter-app',
    },
    'stencil-starter': {
      source: 'contentstack/contentstack-stencil-starter-app',
      stack: 'contentstack/stack-starter-app',
    },
  },
};
export default config;

export function getAppLevelConfigByName(appConfigKey: string): any {
  if (!config.appLevelConfig.hasOwnProperty(appConfigKey)) {
    throw new Error(messageHandler.parse('CLI_BOOTSTRAP_INVALID_APP_NAME'));
  }
  config.appLevelConfig[appConfigKey].appConfigKey = appConfigKey;
  return config.appLevelConfig[appConfigKey];
}
