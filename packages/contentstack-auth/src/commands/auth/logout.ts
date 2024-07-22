import { Command } from '@contentstack/cli-command';
import {
  cliux,
  configHandler,
  printFlagDeprecation,
  flags,
  authHandler as oauthHandler,
  managementSDKClient,
  FlagInput,
  formatError,
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
      description: 'Force log out by skipping the confirmation',
      required: false,
      default: false,
    }),
    force: flags.boolean({
      char: 'f',
      description: 'Force log out by skipping the confirmation',
      required: false,
      hidden: true,
      default: false,
      parse: printFlagDeprecation(['-f', '--force'], ['-y', '--yes']),
    }),
  };

  static aliases = ['logout'];

  async run(): Promise<any> {
    const { flags: logoutFlags } = await this.parse(LogoutCommand);
    let confirm = logoutFlags.force === true || logoutFlags.yes === true;
    if (!confirm) {
      confirm = await cliux.inquire({
        type: 'confirm',
        message: 'CLI_AUTH_LOGOUT_CONFIRM',
        name: 'confirmation',
      });
    }

    try {
      const managementAPIClient = await managementSDKClient({ host: this.cmaHost, skipTokenValidity: true });
      authHandler.client = managementAPIClient;
      if (confirm === true && (await oauthHandler.isAuthenticated())) {
        cliux.loader('CLI_AUTH_LOGOUT_LOADER_START');
        if (await oauthHandler.isAuthorisationTypeBasic()) {
          await authHandler.logout(configHandler.get('authtoken'));
        } else if (await oauthHandler.isAuthorisationTypeOAuth()) {
          await oauthHandler.oauthLogout();
        }
        cliux.loader('');
        this.logger.info('successfully logged out');
        cliux.success('CLI_AUTH_LOGOUT_SUCCESS');
      } else {
        cliux.success('CLI_AUTH_LOGOUT_ALREADY');
      }
    } catch (error) {
      let errorMessage = formatError(error) || 'Something went wrong while logging out. Please try again.';

      this.logger.error('Logout failed', errorMessage);
      cliux.print('CLI_AUTH_LOGOUT_FAILED', { color: 'yellow' });
      cliux.print(errorMessage, { color: 'red' });
    } finally {
      if (confirm === true) {
        await oauthHandler.setConfigData('logout');
      }
    }
  }
}
