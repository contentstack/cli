import { Command } from '@contentstack/cli-command';
import {
  cliux,
  CLIError,
  authHandler as oauthHandler,
  flags,
  managementSDKClient,
  FlagInput
} from '@contentstack/cli-utilities';
import { User } from '../../interfaces';
import { authHandler, interactive } from '../../utils';
import { BaseCommand } from '../../base-command';

export default class LoginCommand extends BaseCommand<typeof LoginCommand> {
  static run; // to fix the test issue
  static description = 'User sessions login';

  static examples = [
    '$ csdx auth:login',
    '$ csdx auth:login -u <username>',
    '$ csdx auth:login -u <username> -p <password>',
    '$ csdx auth:login --username <username>',
    '$ csdx auth:login --username <username> --password <password>',
  ];

  static flags: FlagInput = {
    username: flags.string({
      char: 'u',
      description: 'User name',
      multiple: false,
      required: false,
      exclusive: ['oauth'],
    }),
    password: flags.string({
      char: 'p',
      description: 'Password',
      multiple: false,
      required: false,
      exclusive: ['oauth'],
    }),
    oauth: flags.boolean({
      description: 'Enables single sign-on (SSO) in Contentstack CLI',
      required: false,
      default: false,
      exclusive: ['username', 'password'],
    }),
  };

  static aliases = ['login'];

  async run(): Promise<any> {
    try {
      const managementAPIClient = await managementSDKClient({ host: this.cmaHost, skipTokenValidity: true });
      const { flags: loginFlags } = await this.parse(LoginCommand);
      authHandler.client = managementAPIClient;
      const oauth = loginFlags?.oauth;
      if (oauth === true) {
        oauthHandler.host = this.cmaHost;
        await oauthHandler.oauth();
      } else {
        const username = loginFlags?.username || (await interactive.askUsername());
        const password = loginFlags?.password || (await interactive.askPassword());
        this.logger.debug('username', username);
        await this.login(username, password);
      }
    } catch (error) {
      let errorMessage = '';
      if (error) {
        if (error.message) {
          if (error.message.message) {
            errorMessage = error.message.message;
          } else {
            errorMessage = error.message;
          }
        } else {
          errorMessage = error;
        }
      }
      this.logger.error('login failed', errorMessage);
      cliux.error('CLI_AUTH_LOGIN_FAILED');
      cliux.error(errorMessage);
      process.exit();
    }
  }

  async login(username: string, password: string): Promise<void> {
    try {
      const user: User = await authHandler.login(username, password);
      if (typeof user !== 'object' || !user.authtoken || !user.email) {
        throw new CLIError('Failed to login - invalid response');
      }
      await oauthHandler.setConfigData('basicAuth', user);
      this.logger.info('successfully logged in');
      cliux.success('CLI_AUTH_LOGIN_SUCCESS');
    } catch (error) {
      throw error;
    }
  }
}
