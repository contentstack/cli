import { Command } from '@contentstack/cli-command';
import { logger, cliux } from '../../utils';
export default class WhoamiCommand extends Command {
  static description = `Display current users email address
  `;

  static examples = ['$ csdx auth:whoami'];

  static aliases = ['whoami'];

  async run(): Promise<any> {
    try {
      cliux.print('You are currently logged in with email', { color: 'white' });
      cliux.print(this.email, { color: 'yellow' });
      logger.debug('Currently logged in user', this.email);
    } catch (error) {
      logger.error(error.message);
    }
  }
}
