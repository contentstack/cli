import { Command, flags } from '@contentstack/cli-command';
import { logger, cliux, CLIError, configHandler } from '@contentstack/cli-utilities';

import { User } from '../../interfaces';
import { authHandler, interactive } from '../../utils';
export default class LoginCommand extends Command {
  static run; // to fix the test issue
  static description = 'User sessions login';

  static examples = [
    '$ csdx auth:login',
    '$ csdx auth:login -u <username>',
    '$ csdx auth:login -u <username> -p <password>',
    '$ csdx auth:login --username <username>',
    '$ csdx auth:login --username <username> --password <password>',
  ];

  static flags = {
    username: flags.string({
      char: 'u',
      description: 'User name',
      multiple: false,
      required: false,
    }),
    password: flags.string({
      char: 'p',
      description: 'Password',
      multiple: false,
      required: false,
    }),
  };

  static aliases = ['login'];

  async run(): Promise<any> {
    const { flags: loginFlags } = this.parse(LoginCommand);
    authHandler.client = this.managementAPIClient;

    try {
      const username = loginFlags?.username || (await interactive.askUsername());
      const password = loginFlags?.password || (await interactive.askPassword());
      logger.debug('username', username);
      await this.login(username, password);
    } catch (error) {
      logger.error('login  failed', error.message);
      cliux.print('CLI_AUTH_LOGIN_FAILED', { color: 'yellow' });
      cliux.print(error.message.message ? error.message.message : error.message, { color: 'red' });
    }
  }

  async login(username: string, password: string): Promise<void> {
    const user: User = await authHandler.login(username, password);
    if (typeof user !== 'object' || !user.authtoken || !user.email) {
      throw new CLIError('Failed to login - invalid response');
    }
    configHandler.set('authtoken', user.authtoken);
    configHandler.set('email', user.email);
    logger.info('successfully logged in');
    cliux.success('CLI_AUTH_LOGIN_SUCCESS');
  }
}
