import { Command, flags } from '@contentstack/cli-command';
import * as Configstore from 'configstore';
import { logger, authHandler, cliux, interactive, messageHandler, CLIError } from '../../utils';
import { User } from '../../interfaces';

const config = new Configstore('contentstack_cli');

export default class LoginCommand extends Command {
  private readonly parse: Function;
  managementAPIClient: any;
  static run; // to fix the test issue
  static description = messageHandler.parse('CLI_AUTH_LOGIN_DESCRIPTION');

  static examples = [
    '$ csdx auth:login',
    '$ csdx auth:login -u <username>',
    '$ csdx auth:login -u <username> -p <password>',
  ];

  static flags = {
    username: flags.string({
      char: 'u',
      description: messageHandler.parse('CLI_AUTH_LOGIN_FLAG_USERNAME'),
      multiple: false,
      required: false,
    }),
    password: flags.string({
      char: 'p',
      description: messageHandler.parse('CLI_AUTH_LOGIN_FLAG_PASSWORD'),
      multiple: false,
      required: false,
    }),
  };

  async run(): Promise<any> {
    const { flags } = this.parse(LoginCommand);
    authHandler.client = this.managementAPIClient;

    try {
      const username = flags.username ? flags.username : await interactive.askUsername();
      const password = flags.password ? flags.password : await interactive.askPassword();
      logger.debug('username', username);
      logger.debug('password', password);
      await this.login(username, password);
    } catch (error) {
      logger.error('login  error', error);
      cliux.error('CLI_AUTH_LOGIN_FAILED', error.message);
    }
  }

  async login(username: string, password: string): Promise<void> {
    const user: User = await authHandler.login(username, password);
    if (typeof user !== 'object' || !user.authtoken || !user.email) {
      throw new CLIError({ message: 'Failed to login - invalid response' });
    }
    config.set('authtoken', user.authtoken);
    config.set('email', user.email);
    logger.info('successfully logged in');
    cliux.success('CLI_AUTH_LOGIN_SUCCESS');
  }
}
