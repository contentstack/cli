import * as Configstore from 'configstore';
import axios from 'axios';
import { cliux, logger } from '../../utils';
import { default as internalConfig } from '../../config';

// const PROTECTED_COMMANDS = ['cm:bootstrap'];
const config = new Configstore('contentstack_cli');
const protectedCommands = { 'cm:bootstrap': true }; // config.get('protectedCommands');
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
    }
    const region = config.get('region');
    if (region && region.cma) {
      try {
        const result = await axios.get(`${region.cma}/v3/user`, { headers: { authtoken: authToken } });
        if (result.status !== 200) {
          this.exit();
        }
        logger.debug('logged in user', result.data);
      } catch (error) {
        logger.error('error in auth validation', error);
        cliux.error('CLI_CORE_LOGIN_AGAIN');
        this.exit();
      }
    } else {
      console.log('No region found');
      cliux.error('CLI_CORE_NO_REGION_FOUND');
      this.exit();
    }
  }
}
