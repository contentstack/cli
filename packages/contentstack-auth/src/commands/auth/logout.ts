import { Command, flags } from '@contentstack/cli-command';
import * as Configstore from 'configstore';
import { logger, authHandler, cliux } from '../../utils';

const config = new Configstore('contentstack_cli');
export default class LogoutCommand extends Command {
  static description = 'Logout';
  static examples = ['$ csdx auth:logout'];

  static flags = {
    force: flags.string({
      char: 'f',
      description: 'force logging out for skipping the confirmation',
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
          message: 'Are you sure you want to log out? (Y/N)',
          name: 'confirmation',
        });
    try {
      if (confirm) {
        cliux.loader('Logging out....');
        const authtoken = this.authToken;
        await authHandler.logout(authtoken);
        cliux.loader(''); //stops loading
        cliux.success('Successfully logged out');
      }
    } catch (error) {
      logger.error(error.message);
    } finally {
      config.delete('authtoken');
      config.delete('email');
    }
  }
}
