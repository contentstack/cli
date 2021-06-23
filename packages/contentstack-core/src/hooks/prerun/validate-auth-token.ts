import * as Configstore from 'configstore';
import axios from 'axios';
import { cliux, logger } from '../../utils';
import { default as internalConfig } from '../../config';

const config = new Configstore('contentstack_cli');

/**
 * Authenticate before executing the protected commands
 */
export default async function (opts): Promise<void> {
  if (internalConfig.protectedCommands[opts.Command.id]) {
    const authToken = config.get('authtoken');
    if (!authToken) {
      logger.error('No auth token found for command', opts.Command.id);
      cliux.error('CLI_CORE_LOGIN_AGAIN');
      this.exit();
      return;
    }
    const region = config.get('region');
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
      console.log('No region found');
      cliux.error('CLI_CORE_NO_REGION_FOUND');
      this.exit();
    }
  }
}
