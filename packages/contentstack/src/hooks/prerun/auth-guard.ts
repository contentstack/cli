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
    // NOTE Every exit below is non-zero. `this.exit()` and `process.exit()` both default to 0,
    // so a command blocked by the auth guard used to report success to the caller.
    if (!isAuthenticated()) {
      handleAndLogError(new Error('Authentication required for this command'), { module: 'auth-guard', commandId: opts.Command.id });
      cliux.error('Please log in to execute the command');
      this.exit(1);
    }
    const client = await managementSDKClient({host: region.cma})
    try {
      const result = await client.getUser();
      if (!result) {
        handleAndLogError(new Error('Error in auth validation'), { module: 'auth-guard' });
        cliux.error('Please log in to execute the command');
        this.exit(1);
      }
      log.debug('Logged-in user', { module: 'auth-guard', userData: result.data });
    } catch (error) {
      handleAndLogError(error, { module: 'auth-guard' }, 'Error in auth validation');
      cliux.error('Please log in to execute the command');
      process.exit(1);
    }
  }
}
