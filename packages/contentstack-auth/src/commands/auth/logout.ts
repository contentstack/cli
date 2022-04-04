import { Command, flags } from '@contentstack/cli-command';
import { logger, cliux, messageHandler, configHandler } from '@contentstack/cli-utilities';
import { authHandler } from '../../utils';
export default class LogoutCommand extends Command {
  private readonly parse: Function;
  managementAPIClient: any;
  authToken: string;
  static run; // to fix the test issue
  static description = "User session logout";
  static examples = ['$ csdx auth:logout', '$ csdx auth:logout -f'];

  static flags = {
    force: flags.boolean({
      char: 'f',
      description: messageHandler.parse('CLI_AUTH_LOGOUT_FLAG_FORCE'),
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
      logger.debug('Logout failed', error.message);
      cliux.error('CLI_AUTH_LOGOUT_FAILED', error.message);
    } finally {
      configHandler.delete('authtoken');
      configHandler.delete('email');
    }
  }
}
