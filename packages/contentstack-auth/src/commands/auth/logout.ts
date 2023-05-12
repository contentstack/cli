import { Command } from '@contentstack/cli-command';
import {
  logger,
  cliux,
  configHandler,
  printFlagDeprecation,
  flags,
  authHandler as oauthHandler,
  managementSDKClient,
  FlagInput,
} from '@contentstack/cli-utilities';

import { authHandler } from '../../utils';

export default class LogoutCommand extends Command {
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
      if ((await oauthHandler.isAuthenticated()) && (await oauthHandler.isAuthorisationTypeBasic())) {
        if (confirm === true) {
          cliux.loader('CLI_AUTH_LOGOUT_LOADER_START');
          await authHandler.logout(configHandler.get('authtoken'));
          cliux.loader('');
          logger.info('successfully logged out');
          cliux.success('CLI_AUTH_LOGOUT_SUCCESS');
        }
      } else {
        cliux.loader('CLI_AUTH_LOGOUT_LOADER_START');
        cliux.loader('');
        logger.info('successfully logged out');
        cliux.success('CLI_AUTH_LOGOUT_SUCCESS');
      }
    } catch (error) {
      let errorMessage = '';
      if (error) {
        if (error.message) {
          if (error.message.message) {
            errorMessage = error.message.message;
          } else {
            errorMessage = error.message;
          }
        } else {
          errorMessage = error;
        }
      }

      logger.error('Logout failed', errorMessage);
      cliux.print('CLI_AUTH_LOGOUT_FAILED', { color: 'yellow' });
      cliux.print(errorMessage, { color: 'red' });
    } finally {
      if (confirm === true) {
        await oauthHandler.setConfigData('logout');
      }
    }
  }
}
