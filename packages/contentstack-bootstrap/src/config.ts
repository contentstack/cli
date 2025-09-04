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
  master_locale?: string;
}

const config: Configuration = {
  sampleApps: [
    { displayName: 'React JS (Deprecated)', configKey: 'reactjs' },
    { displayName: 'Next JS (Deprecated)', configKey: 'nextjs' },
    { displayName: 'Gatsby (Deprecated)', configKey: 'gatsby' },
    { displayName: 'Angular (Deprecated)', configKey: 'angular' },
  ],
  starterApps: [
    { displayName: 'Compass App', configKey: 'compass-app' },
    { displayName: 'Kickstart Next.js', configKey: 'kickstart-next' },
    { displayName: 'Kickstart Next.js SSR', configKey: 'kickstart-next-ssr' },
    { displayName: 'Kickstart Next.js SSG', configKey: 'kickstart-next-ssg' },
    { displayName: 'Kickstart Next.js GraphQL', configKey: 'kickstart-next-graphql' },
    { displayName: 'Kickstart Next.js Middleware', configKey: 'kickstart-next-middleware' },
    { displayName: 'Kickstart NuxtJS', configKey: 'kickstart-next-nuxt' },
    { displayName: 'Kickstart NuxtJS SSR', configKey: 'kickstart-next-nuxt-ssr' },

    { displayName: 'React JS (Deprecated)', configKey: 'reactjs-starter' },
    { displayName: 'Next JS (Deprecated)', configKey: 'nextjs-starter' },
    { displayName: 'Gatsby (Deprecated)', configKey: 'gatsby-starter' },
    { displayName: 'Angular (Deprecated)', configKey: 'angular-starter' },
    { displayName: 'Nuxt JS (Deprecated)', configKey: 'nuxt-starter' },
    { displayName: 'Vue JS (Deprecated)', configKey: 'vue-starter' },
    { displayName: 'Stencil (Deprecated)', configKey: 'stencil-starter' },
    { displayName: 'Nuxt3 (Deprecated)', configKey: 'nuxt3-starter' },
  ],
  appLevelConfig: {
    'kickstart-next': {
      source: 'contentstack/kickstart-next',
      stack: 'contentstack/kickstart-stack-seed',
    },

    'kickstart-next-ssr': {
      source: 'contentstack/kickstart-next-ssr',
      stack: 'contentstack/kickstart-stack-seed',
    },

    'kickstart-next-ssg': {
      source: 'contentstack/kickstart-next-ssg',
      stack: 'contentstack/kickstart-stack-seed',
    },

    'kickstart-next-graphql': {
      source: 'contentstack/kickstart-next-graphql',
      stack: 'contentstack/kickstart-stack-seed',
    },

    'kickstart-next-middleware': {
      source: 'contentstack/kickstart-next-middleware',
      stack: 'contentstack/kickstart-stack-seed',
    },

    'kickstart-next-nuxt': {
      source: 'contentstack/kickstart-next-nuxt',
      stack: 'contentstack/kickstart-stack-seed',
    },
    'kickstart-next-nuxt-ssr': {
      source: 'contentstack/kickstart-next-nuxt-ssr',
      stack: 'contentstack/kickstart-stack-seed',
    },
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
    'compass-app': {
      source: 'contentstack/compass-starter-app',
      stack: 'contentstack/compass-starter-stack',
      master_locale: 'en',
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
    'nuxt3-starter': {
      source: 'contentstack/contentstack-nuxt3-starter-app',
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
