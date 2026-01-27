import { 
  cliux, 
  managementSDKClient,
  isAuthenticated,
  log,
  handleAndLogError
} from '@contentstack/cli-utilities';
// TBD: run region command if region is not there

export default async function (opts): Promise<void> {
  const { context: { plugin: { config: { protectedCommands = {} } = {} } = {}, region = null } = {} } = this.config;
  if (opts.Command.id !== 'config:set:region') {
    if (!region) {
      cliux.error('No region found, please set a region $config:set:region');
      this.exit();
      return;
    }
    cliux.print(`Currently using region: ${region.name}`, { color: 'grey' });
  }
  // Auth guard
  if (protectedCommands[opts.Command.id]) {
    if (!isAuthenticated()) {
      handleAndLogError(new Error('No auth token found for command.'), { module: 'auth-guard', commandId: opts.Command.id });
      cliux.error('Please log in to execute the command');
      this.exit();
    }
    const client = await managementSDKClient({host: region.cma})
    try {
      const result = await client.getUser();
      if (!result) {
        handleAndLogError(new Error('Error in auth validation'), { module: 'auth-guard' });
        cliux.error('Please log in to execute the command');
        this.exit();
      }
      log.debug('Logged-in user', { module: 'auth-guard', userData: result.data });    
    } catch (error) {
      handleAndLogError(error, { module: 'auth-guard' }, 'Error in auth validation');
      cliux.error('Please log in to execute the command');
      process.exit();
    }   
  }
}
