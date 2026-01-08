import { Command } from '@contentstack/cli-command';
import { resolve } from 'path';
import Bootstrap, { BootstrapOptions, SeedParams } from '../../bootstrap';
import {
  inquireCloneDirectory,
  inquireApp,
  inquireAppType,
  inquireLivePreviewSupport,
  inquireRunDevServer,
} from '../../bootstrap/interactive';
import { managementSDKClient, flags, isAuthenticated, FlagInput, configHandler } from '@contentstack/cli-utilities';
import config, { getAppLevelConfigByName, AppConfig } from '../../config';
import messageHandler from '../../messages';

export const DEFAULT_MASTER_LOCALE = 'en-us';
export default class BootstrapCommand extends Command {
  private bootstrapManagementAPIClient: any;

  static description = 'Bootstrap contentstack apps';

  static examples = [
    '$ csdx cm:bootstrap',
    '$ csdx cm:bootstrap --project-dir <path/to/setup/the/app>',
    '$ csdx cm:bootstrap --app-name "kickstart-next" --project-dir <path/to/setup/the/app>',
    '$ csdx cm:bootstrap --app-name "kickstart-next" --project-dir <path/to/setup/the/app> --stack-api-key "stack-api-key"',
    '$ csdx cm:bootstrap --app-name "kickstart-next" --project-dir <path/to/setup/the/app> --org "your-org-uid" --stack-name "stack-name"',
    '$ csdx cm:bootstrap --app-name "kickstart-next" --project-dir <path/to/setup/the/app> --run-dev-server',
  ];

  static flags: FlagInput = {
    'app-name': flags.string({
      description:
        'App name, kickstart-next, kickstart-next-ssr, kickstart-next-ssg, kickstart-next-graphql, kickstart-next-middleware, kickstart-nuxt, kickstart-nuxt-ssr',
      multiple: false,
      required: false,
    }),
    'project-dir': flags.string({
      description:
        'Directory to setup the project. If directory name has a space then provide the path as a string or escap the space using back slash eg: "../../test space" or ../../test\\ space',
      multiple: false,
      required: false,
    }),
    'app-type': flags.string({
      description: 'Sample or Starter app',
      multiple: false,
      required: false,
      hidden: true,
    }),
    'stack-api-key': flags.string({
      char: 'k',
      description: 'Provide stack API key to seed content',
      multiple: false,
      required: false,
      exclusive: ['org', 'stack-name'],
    }),
    org: flags.string({
      description: 'Provide organization UID to create a new stack',
      multiple: false,
      required: false,
      exclusive: ['stack-api-key'],
    }),
    'stack-name': flags.string({
      char: 'n',
      description: 'Name of the new stack that will be created.',
      multiple: false,
      required: false,
      exclusive: ['stack-api-key'],
    }),
    yes: flags.string({
      description: '[Optional] Skip stack confirmation',
      char: 'y',
      required: false,
    }),
    'run-dev-server': flags.boolean({
      description: 'Automatically start the development server after setup',
      required: false,
      default: false,
    }),
    alias: flags.string({
      char: 'a',
      description: 'Alias of the management token',
    }),
  };

  async run() {
    const { flags: bootstrapCommandFlags } = await this.parse(BootstrapCommand);
    const managementTokenAlias = bootstrapCommandFlags.alias;
    try {
      if (!isAuthenticated() && !managementTokenAlias) {
        this.error(messageHandler.parse('CLI_BOOTSTRAP_LOGIN_FAILED'), {
          exit: 2,
          suggestions: ['https://www.contentstack.com/docs/developers/cli/authentication/'],
        });
      }

      this.bootstrapManagementAPIClient = await managementSDKClient({
        host: this.cmaHost,
      });

      // inquire user inputs
      let appType =
        (bootstrapCommandFlags.appType as string) || (bootstrapCommandFlags['app-type'] as string) || 'starterapp';
      if (!appType) {
        appType = await inquireAppType();
      }

      const selectedAppName =
        (bootstrapCommandFlags.appName as string) || (bootstrapCommandFlags['app-name'] as string);
      let selectedApp;
      if (!selectedAppName) {
        if (appType === 'sampleapp') {
          selectedApp = await inquireApp(config.sampleApps);
        } else if (appType === 'starterapp') {
          selectedApp = await inquireApp(config.starterApps);
        } else {
          this.error('Invalid app type provided: ' + appType, { exit: 1 });
        }
      }

      if (!selectedAppName && !selectedApp) {
        this.error(messageHandler.parse('CLI_BOOTSTRAP_INVALID_APP_NAME'), {
          exit: 1,
        });
      }

      const yes = bootstrapCommandFlags.yes as string;

      const appConfig: AppConfig = getAppLevelConfigByName(selectedAppName || selectedApp.configKey);
      const master_locale = appConfig.master_locale || DEFAULT_MASTER_LOCALE;

      let cloneDirectory =
        (bootstrapCommandFlags.directory as string) || (bootstrapCommandFlags['project-dir'] as string);
      if (!cloneDirectory) {
        cloneDirectory = await inquireCloneDirectory();
      }

      cloneDirectory = resolve(cloneDirectory);

      const livePreviewEnabled = bootstrapCommandFlags.yes ? true : await inquireLivePreviewSupport();
      const runDevServer =
        bootstrapCommandFlags['run-dev-server'] || (bootstrapCommandFlags.yes ? false : await inquireRunDevServer());

      const seedParams: SeedParams = {};
      const stackAPIKey = bootstrapCommandFlags['stack-api-key'];
      const org = bootstrapCommandFlags.org;
      const stackName = bootstrapCommandFlags['stack-name'];
      if (stackAPIKey) seedParams.stackAPIKey = stackAPIKey;
      if (org) seedParams.org = org;
      if (stackName) seedParams.stackName = stackName;
      if (yes) seedParams.yes = yes;
      if (managementTokenAlias) {
        seedParams.managementTokenAlias = managementTokenAlias;
        const listOfTokens = configHandler.get('tokens');
        const managementToken = listOfTokens[managementTokenAlias].token;
        seedParams.managementToken = managementToken;
      }

      // initiate bootstrsourceap
      const options: BootstrapOptions = {
        appConfig,
        seedParams,
        cloneDirectory,
        managementAPIClient: this.bootstrapManagementAPIClient,
        region: this.region,
        appType,
        livePreviewEnabled,
        runDevServer,
        master_locale,
      };
      const bootstrap = new Bootstrap(options);
      await bootstrap.run();
    } catch (error: any) {
      this.error(error, { exit: 1, suggestions: error.suggestions });
    }
  }
}
