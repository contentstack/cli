import { Command } from '@contentstack/cli-command';
import { cliux } from '@contentstack/cli-utilities';
import { BaseCommand } from '../../base-command';

export default class WhoamiCommand extends BaseCommand<typeof WhoamiCommand> {
  static description = 'Display current users email address';

  static examples = ['$ csdx auth:whoami'];

  static aliases = ['whoami'];

  async run(): Promise<any> {
    try {
      if (this.email) {
        cliux.print('CLI_AUTH_WHOAMI_LOGGED_IN_AS', { color: 'white' });
        cliux.print(this.email, { color: 'green' });
        this.logger.info('Currently logged in user', this.email);
      } else {
        cliux.error('CLI_AUTH_WHOAMI_FAILED');
      }
    } catch (error) {
      this.logger.error('whoami error', error.message);
      cliux.print('CLI_AUTH_WHOAMI_FAILED', { color: 'yellow' });
      cliux.print(error.message, { color: 'red' });
    }
  }
}
