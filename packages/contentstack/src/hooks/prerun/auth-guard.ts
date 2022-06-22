import { logger, cliux, configHandler, HttpClient } from '@contentstack/cli-utilities';

// TBD: run region command if region is not there
export default async function (opts): Promise<void> {
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
    const authToken = configHandler.get('authtoken');
    if (!authToken) {
      logger.error('No auth token found for command', opts.Command.id);
      cliux.error('Please login to execute the command');
      this.exit();
    }
    try {
      const result = await HttpClient.create().headers({ authtoken: authToken }).get(`${region.cma}/v3/user`);
      if (result.status !== 200) {
        logger.error('error in auth validation');
        cliux.error('Please login to execute the command');
        this.exit();
      }
      logger.debug('logged in user', result.data);
    } catch (error) {
      logger.error('error in auth validation', error);
      cliux.error('Please login to execute the command');
      this.exit();
      return;
    }
  }
}
