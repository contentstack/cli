import { cliux, log, handleAndLogError, messageHandler } from '@contentstack/cli-utilities';
import { BaseCommand } from '../../base-command';

export default class WhoamiCommand extends BaseCommand<typeof WhoamiCommand> {
  static description = 'Display current users email address';

  static examples = ['$ csdx auth:whoami'];

  static aliases = ['whoami'];

  async run(): Promise<any> {
    log.debug('WhoamiCommand run method started', this.contextDetails);

    try {
      log.debug('Checking user email from context', { ...this.contextDetails, hasEmail: !!this.email });

      if (this.email) {
        log.debug('User email found, displaying user information', { ...this.contextDetails, email: this.email });
        cliux.print('CLI_AUTH_WHOAMI_LOGGED_IN_AS', { color: 'white' });
        cliux.print(this.email, { color: 'green' });
        log.debug('Whoami command completed successfully', this.contextDetails);
      } else {
        log.debug('No user email found in context', this.contextDetails);
        log.error(messageHandler.parse('CLI_AUTH_WHOAMI_FAILED'), this.contextDetails);
      }
    } catch (error) {
      log.debug('Whoami command failed', { ...this.contextDetails, error });
      cliux.print('CLI_AUTH_WHOAMI_FAILED', { color: 'yellow' });
      handleAndLogError(error, { ...this.contextDetails });
    }
  }
}
