import { 
  cliux, 
  managementSDKClient,
  isAuthenticated
} from '@contentstack/cli-utilities';
import {LoggerService} from '@contentstack/cli-utilities'
// TBD: run region command if region is not there

export default async function (opts): Promise<void> {
  const newLogger = new LoggerService(process.cwd(),'cli-log');
  const { context: { plugin: { config: { protectedCommands = {} } = {} } = {}, region = null } = {} } = this.config;
  if (opts.Command.id !== 'config:set:region') {
    if (!region) {
      cliux.error('No region found, please set a region $config:set:region');
      this.exit();
      return;
    }
    cliux.print(`\n Currently using ${region.name} region \n`, { color: 'grey' });
  }
  // Auth guard
  if (protectedCommands[opts.Command.id]) {
    if (!isAuthenticated()) {
      newLogger.error('No auth token found for command', opts.Command.id);
      cliux.error('Please login to execute the command');
      this.exit();
    }
    const client = await managementSDKClient({host: region.cma})
    try {
      const result = await client.getUser();
      if (!result) {
        newLogger.error('error in auth validation');
        cliux.error('Please login to execute the command');
        this.exit();
      }
      newLogger.debug('logged in user', result.data);    
    } catch (error) {
      newLogger.error('error in auth validation', error);
      cliux.error('Please login to execute the command');
      process.exit();
    }   
  }
}
