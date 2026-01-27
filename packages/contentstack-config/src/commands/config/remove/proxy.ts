import { configHandler, log, handleAndLogError } from '@contentstack/cli-utilities';
import { BaseCommand } from '../../../base-command';

export default class ProxyRemoveCommand extends BaseCommand<typeof ProxyRemoveCommand> {
  static description = 'Remove proxy configuration from global config';

  static examples = ['csdx config:remove:proxy'];

  async run() {
    try {
      log.debug('Starting proxy configuration removal', this.contextDetails);
      const currentProxy = configHandler.get('proxy');
      if (!currentProxy) {
        log.debug('No proxy configuration found in global config', this.contextDetails);
        return;
      }

      log.debug('Removing proxy configuration from global config', this.contextDetails);
      configHandler.delete('proxy');
      log.success('Proxy configuration removed from global config successfully', this.contextDetails);
    } catch (error) {
      handleAndLogError(error, { ...this.contextDetails, module: 'config-remove-proxy' });
    }
  }
}

