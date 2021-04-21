export interface Configuration {
    starterApps: Array<any>;
    appLevelConfig: any;
}

export interface AppConfig {
    source: string;
    stack: string;
    appConfigKey?: string;
}

const config: Configuration = {
    starterApps: [
        { displayName: 'React JS', configKey: 'reactjs' },
        { displayName: 'Next JS', configKey: 'nextjs' },
        { displayName: 'Gatsby', configKey: 'gatsby' },
        { displayName: 'Angular', configKey: 'angular' },
        { displayName: 'Nuxt JS', configKey: 'nuxtjs' },
        { displayName: 'React test', configKey: 'reacttest' },
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
    },
}
export default config

export function getAppLevelConfigByName(name: string): any {
    const selectedApp = config.starterApps.filter(app => app.displayName === name)
    const appConfigKey = Array.isArray(selectedApp) && selectedApp.length > 0 && selectedApp[0].configKey
    config.appLevelConfig[appConfigKey].appConfigKey = appConfigKey
    return config.appLevelConfig[appConfigKey]
}
