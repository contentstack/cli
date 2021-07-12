import { logger, cliux, configHandler } from '@contentstack/utilities';
import axios from 'axios';
import { default as internalConfig } from '../../config';

/**
 * Authenticate before executing the protected commands
 */
export default async function (opts): Promise<void> {
  if (internalConfig.protectedCommands[opts.Command.id]) {
    const authToken = configHandler.get('authtoken');
    if (!authToken) {
      logger.error('No auth token found for command', opts.Command.id);
      cliux.error('CLI_CORE_LOGIN_AGAIN');
      this.exit();
      return;
    }
    const region = configHandler.get('region');
    if (region && region.cma) {
      try {
        const result = await axios.get(`${region.cma}/v3/user`, { headers: { authtoken: authToken } });
        if (result.status !== 200) {
          this.exit();
          return;
        }
        logger.debug('logged in user', result.data);
      } catch (error) {
        logger.error('error in auth validation', error);
        cliux.error('CLI_CORE_LOGIN_AGAIN');
        this.exit();
        return;
      }
    } else {
      cliux.error('CLI_CORE_NO_REGION_FOUND');
      this.exit();
    }
  }
}
