import { Command, flags } from '@contentstack/cli-command'
const ContentstackManagementSDK = require('@contentstack/management')
import Bootstrap, { BootstrapOptions } from '../../bootstrap'
import {
  inquireCloneDirectory,
  inquireApp,
  inquireGithubAccessToken,
  inquireAppType,
} from '../../bootstrap/interactive'
import config, { getAppLevelConfigByName, AppConfig } from '../../config'
import messageHandler from '../../messages'
export default class BootstrapCommand extends Command {
  private _managementAPIClient: any;

  static description = 'Bootstrap contentstack apps';

  static examples = [
    '$ csdx cm:bootstrap',
    '$ csdx cm:bootstrap -d <path/to/setup/the/app>',
    '$ csdx cm:bootstrap -t <github access token>',
    '$ csdx cm:bootstrap -s <sampleapp or starterapp>',
    '$ csdx cm:bootstrap -s <sampleapp or starterapp> -a <app name> -d <path/to/setup/the/app>',
  ];

  static flags = {
    appName: flags.string({
      char: 'a',
      description: 'App name, 1. sampleapp - reactjs, nextjs, gatsby, angular. 2. starterapp - reactjs-starter, nextjs-starter, gatsby-starter, angular-starter, nuxt-starter',
      multiple: false,
      required: false,
    }),
    directory: flags.string({
      char: 'd',
      description: 'Directory to setup the project. If directory name has a space then provide the path as a string or escap the space using back slash eg: "../../test space" or ../../test\\ space',
      multiple: false,
      required: false,
    }),
    accessToken: flags.string({
      char: 't',
      description: 'Access token for private github repo',
      multiple: false,
      required: false,
    }),
    appType: flags.string({
      char: 's',
      description: 'Sample or Starter app',
      multiple: false,
      required: false,
    }),
  };

  get managementAPIClient() {
    this._managementAPIClient = ContentstackManagementSDK.client({ host: this.cmaHost, authtoken: this.authToken })
    return this._managementAPIClient
  }

  async run() {
    const { flags } = this.parse(BootstrapCommand)

    try {
      if (!this.authToken) {
        this.error(messageHandler.parse('CLI_BOOTSTRAP_LOGIN_FAILED'), { exit: 2, suggestions: ['https://www.contentstack.com/docs/developers/cli/authentication/'] })
      }

      // inquire user inputs
      let appType = flags.appType as string
      if (!appType) {
        appType = await inquireAppType()
      }

      const selectedAppName = flags.appName as string
      let selectedApp
      if (!selectedAppName) {
        if (appType === 'sampleapp') {
          selectedApp = await inquireApp(config.sampleApps)
        } else if (appType === 'starterapp') {
          selectedApp = await inquireApp(config.starterApps)
        } else {
          this.error('Invalid app type provided ' + appType, { exit: 1 })
        }
      }

      if (!selectedAppName && !selectedApp) {
        this.error(messageHandler.parse('CLI_BOOTSTRAP_INVALID_APP_NAME'), { exit: 1 })
      }

      const appConfig: AppConfig = getAppLevelConfigByName(selectedAppName || selectedApp.configKey)

      let cloneDirectory = flags.directory as string
      if (!cloneDirectory) {
        cloneDirectory = await inquireCloneDirectory()
      }

      // Check the access token
      let accessToken = flags.accessToken as string
      if (appConfig.private && !accessToken) {
        accessToken = await inquireGithubAccessToken()
      }
      
      // initiate bootstrsourceap
      const options: BootstrapOptions = {
        appConfig,
        cloneDirectory,
        managementAPIClient: this.managementAPIClient,
        region: this.region,
        accessToken,
        appType,
      }
      const bootstrap = new Bootstrap(options)
      await bootstrap.run()
    } catch (error) {
      this.error(error, { exit: 1, suggestions: error.suggestions })
    }
  }
}
