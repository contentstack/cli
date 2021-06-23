import { Command } from '@contentstack/cli-command';
import { logger, cliux, messageHandler } from '../../utils';
export default class WhoamiCommand extends Command {
  email: string;
  static run;
  static description = messageHandler.parse('CLI_AUTH_WHOAMI_DESCRIPTION');

  static examples = ['$ csdx auth:whoami'];

  static aliases = ['whoami'];

  async run(): Promise<any> {
    try {
      cliux.print('CLI_AUTH_WHOAMI_LOGGED_IN_AS', { color: 'white' });
      cliux.print(this.email, { color: 'yellow' });
      logger.info('Currently logged in user', this.email);
    } catch (error) {
      logger.error('whoami error', error.message);
      cliux.error('CLI_AUTH_WHOAMI_FAILED', error.message);
    }
  }
}
