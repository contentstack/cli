import { Command } from '@contentstack/cli-command';
import { configHandler, log } from '@contentstack/cli-utilities';

export default class ProxyRemoveCommand extends Command {
  static description = 'Remove proxy configuration from global config';

  static examples = ['csdx config:remove:proxy'];

  async run() {
    try {
      log.debug('Starting proxy configuration removal');
      const currentProxy = configHandler.get('proxy');
      if (!currentProxy) {
        log.debug('No proxy configuration found in global config');
        return;
      }

      log.debug('Removing proxy configuration from global config');
      configHandler.delete('proxy');
      log.success('Proxy configuration removed from global config successfully');
    } catch (error) {
      log.error('Failed to remove proxy configuration');
    }
  }
}

