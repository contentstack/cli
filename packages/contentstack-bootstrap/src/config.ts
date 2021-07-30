import messageHandler from './messages'
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
        { displayName: 'Nuxt JS', configKey: 'nuxtjs' },
    ],
    starterApps: [
        { displayName: 'React JS', configKey: 'reactjs-starter' },
        { displayName: 'Next JS', configKey: 'nextjs-starter' },
        { displayName: 'Gatsby', configKey: 'gatsby-starter' },
        { displayName: 'Angular', configKey: 'angular-starter' },
        { displayName: 'Nuxt JS', configKey: 'nuxt-starter' },
    ],
    appLevelConfig: {
        nextjs: {
            source: 'contentstack/contentstack-nextjs-react-universal-demo',
            stack: 'shafeeqd959/stack-contentstack-nextjs-react-universal-demo',
        },
        reactjs: {
            source: 'contentstack/contentstack-reactjs-universal-sample-app',
            stack: 'shafeeqd959/stack-contentstack-reactjs-universal-sample-app',
        },
        gatsby: {
            source: 'contentstack/gatsby-starter-contentstack',
            stack: 'shafeeqd959/stack-gatsby-starter-contentstack',
        },
        angular: {
            source: 'contentstack/contentstack-angular-modularblock-example',
            stack: 'shafeeqd959/stack-contentstack-angular-modularblock-example',
        },
        nuxtjs: {
            source: 'contentstack/contentstack-nuxtjs-vue-universal-demo',
            stack: 'shafeeqd959/stack-contentstack-nuxtjs-vue-universal-demo',
        },
        reacttest: {
            source: 'contentstack/contentstack-reactjs-universal-sample-app',
            stack: 'shafeeqd959/stack-test',
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
            stack: 'contentstack/stack-starter-app'
        },
        'angular-starter': {
            source: 'contentstack/contentstack-angular-starter',
            stack: 'contentstack/stack-starter-app',
        },
    },
}
export default config

export function getAppLevelConfigByName(appConfigKey: string): any {
    if (!config.appLevelConfig.hasOwnProperty(appConfigKey)) {
        throw new Error(messageHandler.parse('CLI_BOOTSTRAP_INVALID_APP_NAME'))
    }
    config.appLevelConfig[appConfigKey].appConfigKey = appConfigKey
    return config.appLevelConfig[appConfigKey]
}
