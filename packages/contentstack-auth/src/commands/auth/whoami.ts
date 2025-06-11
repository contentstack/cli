import { cliux, log, handleAndLogError, messageHandler } from '@contentstack/cli-utilities';
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
        log.info(messageHandler.parse('CLI_AUTH_WHOAMI_LOGGED_IN_AS', this.email), this.contextDetails);
      } else {
        log.error(messageHandler.parse('CLI_AUTH_WHOAMI_FAILED'), this.contextDetails);
      }
    } catch (error) {
      cliux.print('CLI_AUTH_WHOAMI_FAILED', { color: 'yellow' });
      handleAndLogError(error, { ...this.contextDetails });
    }
  }
}
