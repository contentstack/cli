import { Command, flags } from '@contentstack/cli-command';
import * as Configstore from 'configstore';
import { logger, authHandler, cliux, interactive } from '../../utils';

const config = new Configstore('contentstack_cli');

export default class LoginCommand extends Command {
  static description = 'Login';

  static examples = ['$ csdx auth:login'];

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

  async run(): Promise<any> {
    const { flags } = this.parse(LoginCommand);
    authHandler.client = this.managementAPIClient;

    try {
      const username = flags.username
        ? flags.username
        : await cliux.inquire<string>({ type: 'input', message: 'Enter your email address', name: 'username' });
      const password = flags.password ? flags.password : await interactive.askPassword();
      logger.debug('username', username);
      logger.debug('password', password);
      const user: { authtoken: string; email: string } = await authHandler.login(username, password);
      config.set('authtoken', user.authtoken);
      config.set('email', user.email);
      cliux.success('Successfully logged in!!');
    } catch (error) {
      logger.error(error.message);
    }
  }
}
