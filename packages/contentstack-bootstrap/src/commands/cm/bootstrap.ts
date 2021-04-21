import { Command } from '@contentstack/cli-command'
const ContentstackManagementSDK = require('@contentstack/management')
import Bootstrap, { BootstrapOptions } from '../../bootstrap'
import { inquireCloneDirectory, inquireStarterApp } from '../../bootstrap/interactive'
import config, { getAppLevelConfigByName, AppConfig } from '../../config'

export default class BootstrapCommand extends Command {
  private _managementAPIClient: any;

  static description = 'Bootstrap contentstack apps';

  static examples = [
    '$ csdx cm:bootstrap',
  ];

  get managementAPIClient() {
    this._managementAPIClient = ContentstackManagementSDK.client({ host: this.cmaHost, authtoken: this.authToken })
    return this._managementAPIClient
  }

  async run() {
    try {
      if (!this.authToken) {
        this.error('You need to login, first. See: auth:login --help', { exit: 2, suggestions: ['https://www.contentstack.com/docs/developers/cli/authentication/'] })
      }

      // inquire user inputs
      const selectedAppName = await inquireStarterApp(config.starterApps)
      const appConfig: AppConfig = getAppLevelConfigByName(selectedAppName)
      const cloneDirectory = await inquireCloneDirectory()

      // initiate bootstrsourceap
      const options: BootstrapOptions = {
        appConfig,
        cloneDirectory,
        managementAPIClient: this.managementAPIClient,
        region: this.region,
      }
      const bootstrap = new Bootstrap(options)
      await bootstrap.run()
    } catch (error) {
      this.error(error, { exit: 1, suggestions: error.suggestions })
    }
  }
}
