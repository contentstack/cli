import { Command } from '@contentstack/cli-command';
import { logger, cliux } from '@contentstack/cli-utilities';

export default class WhoamiCommand extends Command {
  static description = 'Display current users email address';

  static examples = ['$ csdx auth:whoami'];

  static aliases = ['whoami'];

  async run(): Promise<any> {
    try {
      if (this.email) {
        cliux.print('CLI_AUTH_WHOAMI_LOGGED_IN_AS', { color: 'white' });
        cliux.print(this.email, { color: 'green' });
        logger.info('Currently logged in user', this.email);
      } else {
        cliux.error('CLI_AUTH_WHOAMI_FAILED');
      }
    } catch (error) {
      logger.error('whoami error', error.message);
      cliux.print('CLI_AUTH_WHOAMI_FAILED', { color: 'yellow' });
      cliux.print(error.message, { color: 'red' });
    }
  }
}
