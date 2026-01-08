import {
  cliux,
  configHandler,
  flags,
  authHandler as oauthHandler,
  managementSDKClient,
  FlagInput,
  log,
  handleAndLogError,
  messageHandler,
} from '@contentstack/cli-utilities';

import { authHandler } from '../../utils';
import { BaseCommand } from '../../base-command';
export default class LogoutCommand extends BaseCommand<typeof LogoutCommand> {
  static run;
  static description = 'User session logout';
  static examples = ['$ csdx auth:logout', '$ csdx auth:logout -y', '$ csdx auth:logout --yes'];

  static flags: FlagInput = {
    yes: flags.boolean({
      char: 'y',
      description: 'Force log out by skipping the confirmation.',
      required: false,
      default: false,
    }),
  };

  static aliases = ['logout'];

  async run(): Promise<any> {
    log.debug('LogoutCommand run method started', this.contextDetails);

    const { flags: logoutFlags } = await this.parse(LogoutCommand);
    log.debug('Token add flags parsed', { ...this.contextDetails, flags: logoutFlags });

    let confirm = logoutFlags.force === true || logoutFlags.yes === true;
    log.debug(`Initial confirmation status: ${confirm}`, {
      ...this.contextDetails,
      force: logoutFlags.force,
      yes: logoutFlags.yes,
    });

    if (!confirm) {
      log.debug('Requesting user confirmation for logout', this.contextDetails);
      confirm = await cliux.inquire({
        type: 'confirm',
        message: 'CLI_AUTH_LOGOUT_CONFIRM',
        name: 'confirmation',
      });
      log.debug(`User confirmation received: ${confirm}`, this.contextDetails);
    }

    try {
      log.debug('Initializing the Management API client for logout.', this.contextDetails);
      const managementAPIClient = await managementSDKClient({ host: this.cmaHost, skipTokenValidity: true });
      log.debug('Management API client initialized successfully', this.contextDetails);

      authHandler.client = managementAPIClient;
      log.debug('Auth handler client set for logout', this.contextDetails);

      if (confirm === true && oauthHandler.isAuthenticated()) {
        log.debug('User confirmed logout and is authenticated, proceeding with logout', this.contextDetails);
        cliux.loader('CLI_AUTH_LOGOUT_LOADER_START');

        if (await oauthHandler.isAuthorisationTypeBasic()) {
          log.debug('Using basic authentication for logout', this.contextDetails);
          const authToken = configHandler.get('authtoken');
          log.debug('Authentication token retrieved for logout.', { ...this.contextDetails, hasAuthToken: !!authToken });
          await authHandler.logout(authToken);
          log.debug('Basic authentication logout completed.', this.contextDetails);
        } else if (await oauthHandler.isAuthorisationTypeOAuth()) {
          log.debug('Using OAuth authentication for logout', this.contextDetails);
          await oauthHandler.oauthLogout();
          log.debug('OAuth logout completed', this.contextDetails);
        }

        cliux.loader('');
        log.success(messageHandler.parse('CLI_AUTH_LOGOUT_SUCCESS'), this.contextDetails);
        log.debug('Logout completed successfully.', this.contextDetails);
      } else {
        log.debug('User not confirmed or not authenticated, skipping logout', {
          ...this.contextDetails,
          confirm,
          isAuthenticated: oauthHandler.isAuthenticated(),
        });
        log.success(messageHandler.parse('CLI_AUTH_LOGOUT_ALREADY'), this.contextDetails);
      }
    } catch (error) {
      log.debug('Logout failed.', { ...this.contextDetails, error: error.message });
      cliux.print('CLI_AUTH_LOGOUT_FAILED', { color: 'yellow' });
      handleAndLogError(error, { ...this.contextDetails });
    } finally {
      if (confirm === true) {
        log.debug('Setting configuration data for logout.', this.contextDetails);
        await oauthHandler.setConfigData('logout');
        log.debug('Configuration data set for logout.', this.contextDetails);
      }
    }
  }
}
