import { Command, flags } from '@contentstack/cli-command';
import * as Configstore from 'configstore';
import { logger, authHandler, cliux, messageHandler } from '../../utils';

const config = new Configstore('contentstack_cli');
export default class LogoutCommand extends Command {
  private readonly parse: Function;
  private readonly managementAPIClient: any;
  private readonly authToken: string;

  static description = messageHandler.parse('CLI_AUTH_LOGOUT_DESCRIPTION');
  static examples = ['$ csdx auth:logout'];

  static flags = {
    force: flags.string({
      char: 'f',
      description: messageHandler.parse('CLI_AUTH_LOGOUT_FLAG_PASSWORD'),
      multiple: false,
      required: false,
    }),
  };

  async run(): Promise<any> {
    const { flags } = this.parse(LogoutCommand);
    authHandler.client = this.managementAPIClient;
    let confirm = false;
    confirm = flags.force
      ? true
      : await cliux.inquire({
          type: 'confirm',
          message: 'CLI_AUTH_LOGOUT_CONFIRM',
          name: 'confirmation',
        });
    try {
      if (confirm) {
        cliux.loader('CLI_AUTH_LOGOUT_LOADER_START');
        const authtoken = this.authToken;
        await authHandler.logout(authtoken);
        cliux.loader(''); //stops loading
        logger.info('successfully logged out');
        cliux.success('CLI_AUTH_LOGOUT_SUCCESS');
      }
    } catch (error) {
      logger.error('Logout error', error);
      cliux.error('CLI_AUTH_LOGOUT_FAILED', error.message);
    } finally {
      config.delete('authtoken');
      config.delete('email');
    }
  }
}
