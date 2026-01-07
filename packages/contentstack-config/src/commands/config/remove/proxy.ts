import { Command } from '@contentstack/cli-command';
import { cliux, configHandler } from '@contentstack/cli-utilities';

export default class ProxyRemoveCommand extends Command {
  static description = 'Remove proxy configuration from global config';

  static examples = ['csdx config:remove:proxy'];

  async run() {
    try {
      const currentProxy = configHandler.get('proxy');
      if (!currentProxy) {
        cliux.print('No proxy configuration found in global config.', { color: 'yellow' });
        return;
      }

      configHandler.delete('proxy');
      cliux.success('Proxy configuration removed from global config successfully.');
      cliux.print('\nNote: This only removes the global config. Proxy settings from environment variables (HTTPS_PROXY, HTTP_PROXY) will still be used if present.', {
        color: 'dim',
      });
    } catch (error) {
      cliux.error('Failed to remove proxy configuration', error);
    }
  }
}

