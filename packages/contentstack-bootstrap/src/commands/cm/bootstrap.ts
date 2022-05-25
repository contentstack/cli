import { Command, flags } from '@contentstack/cli-command';
const ContentstackManagementSDK = require('@contentstack/management');
import Bootstrap, { BootstrapOptions } from '../../bootstrap';
import {
  inquireCloneDirectory,
  inquireApp,
  inquireGithubAccessToken,
  inquireAppType,
} from '../../bootstrap/interactive';
import { printFlagDeprecation } from '@contentstack/cli-utilities';
import config, { getAppLevelConfigByName, AppConfig } from '../../config';
import messageHandler from '../../messages';
export default class BootstrapCommand extends Command {
  private bootstrapManagementAPIClient: any;

  static description = 'Bootstrap contentstack apps';

  static examples = [
    '$ csdx cm:bootstrap',
    '$ csdx cm:bootstrap --project-dir <path/to/setup/the/app>',
    '$ csdx cm:bootstrap --access-token <github access token>',
    '$ csdx cm:bootstrap --app-name "reactjs-starter" --project-dir <path/to/setup/the/app>',
  ];

  static flags = {
    'app-name': flags.string({
      description: 'App name, reactjs-starter, nextjs-starter, gatsby-starter, angular-starter, nuxt-starter',
      multiple: false,
      required: false,
    }),
    'project-dir': flags.string({
      description:
        'Directory to setup the project. If directory name has a space then provide the path as a string or escap the space using back slash eg: "../../test space" or ../../test\\ space',
      multiple: false,
      required: false,
    }),
    'access-token': flags.string({
      description: 'Access token for private github repo',
      multiple: false,
      required: false,
    }),
    'app-type': flags.string({
      description: 'Sample or Starter app',
      multiple: false,
      required: false,
      hidden: true,
    }),

    // To be deprecated
    appName: flags.string({
      char: 'a',
      description: 'App name, reactjs-starter, nextjs-starter, gatsby-starter, angular-starter, nuxt-starter',
      multiple: false,
      required: false,
      hidden: true,
      parse: printFlagDeprecation(['-a', '--appName'], ['--app-name']),
    }),
    directory: flags.string({
      char: 'd',
      description:
        'Directory to setup the project. If directory name has a space then provide the path as a string or escap the space using back slash eg: "../../test space" or ../../test\\ space',
      multiple: false,
      required: false,
      hidden: true,
      parse: printFlagDeprecation(['-d', '--directory'], ['--project-dir']),
    }),
    accessToken: flags.string({
      char: 't',
      description: 'Access token for private github repo',
      multiple: false,
      required: false,
      hidden: true,
      parse: printFlagDeprecation(['-t', '--accessToken'], ['--access-token']),
    }),
    appType: flags.string({
      char: 's',
      description: 'Sample or Starter app',
      multiple: false,
      required: false,
      hidden: true,
      parse: printFlagDeprecation(['-s', '--appType'], ['--app-type']),
    }),
  };

  get managementAPIClient() {
    this.bootstrapManagementAPIClient = ContentstackManagementSDK.client({
      host: this.cmaHost,
      authtoken: this.authToken,
    });

    return this.bootstrapManagementAPIClient;
  }

  async run() {
    const bootstrapCommandFlags = this.parse(BootstrapCommand).flags;

    try {
      if (!this.authToken) {
        this.error(messageHandler.parse('CLI_BOOTSTRAP_LOGIN_FAILED'), {
          exit: 2,
          suggestions: ['https://www.contentstack.com/docs/developers/cli/authentication/'],
        });
      }

      // inquire user inputs
      let appType = (bootstrapCommandFlags.appType as string) || 'starterapp';
      if (!appType) {
        appType = await inquireAppType();
      }

      const selectedAppName = bootstrapCommandFlags.appName as string;
      let selectedApp;
      if (!selectedAppName) {
        if (appType === 'sampleapp') {
          selectedApp = await inquireApp(config.sampleApps);
        } else if (appType === 'starterapp') {
          selectedApp = await inquireApp(config.starterApps);
        } else {
          this.error('Invalid app type provided ' + appType, { exit: 1 });
        }
      }

      if (!selectedAppName && !selectedApp) {
        this.error(messageHandler.parse('CLI_BOOTSTRAP_INVALID_APP_NAME'), {
          exit: 1,
        });
      }

      const appConfig: AppConfig = getAppLevelConfigByName(selectedAppName || selectedApp.configKey);

      let cloneDirectory = bootstrapCommandFlags.directory as string;
      if (!cloneDirectory) {
        cloneDirectory = await inquireCloneDirectory();
      }

      // Check the access token
      let accessToken = bootstrapCommandFlags.accessToken as string;
      if (appConfig.private && !accessToken) {
        accessToken = await inquireGithubAccessToken();
      }

      // initiate bootstrsourceap
      const options: BootstrapOptions = {
        appConfig,
        cloneDirectory,
        managementAPIClient: this.managementAPIClient,
        region: this.region,
        accessToken,
        appType,
      };
      const bootstrap = new Bootstrap(options);
      await bootstrap.run();
    } catch (error) {
      const errorObj: any = error;
      this.error(errorObj, { exit: 1, suggestions: errorObj.suggestions });
    }
  }
}
