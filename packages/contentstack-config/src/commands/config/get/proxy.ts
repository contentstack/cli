import { Command } from '@contentstack/cli-command';
import { cliux, configHandler, TableHeader, log } from '@contentstack/cli-utilities';

export default class ProxyGetCommand extends Command {
  static description = 'Get proxy configuration for CLI';

  static examples = ['csdx config:get:proxy'];

  async run() {
    try {
      log.debug('Starting proxy configuration retrieval');
      const globalProxyConfig = configHandler.get('proxy');

      if (globalProxyConfig) {
        log.debug('Proxy configuration found in global config');
        let usernameValue = 'Not set';
        if (globalProxyConfig.auth?.username) {
          usernameValue = globalProxyConfig.auth.username;
        }

        const proxyConfigList = [
          {
            Setting: 'Host',
            Value: globalProxyConfig.host || 'Not set',
          },
          {
            Setting: 'Port',
            Value: globalProxyConfig.port ? String(globalProxyConfig.port) : 'Not set',
          },
          {
            Setting: 'Protocol',
            Value: globalProxyConfig.protocol || 'Not set',
          },
          {
            Setting: 'Username',
            Value: usernameValue,
          },
          {
            Setting: 'Password',
            Value: globalProxyConfig.auth?.password ? '***' : 'Not set',
          },
        ];

        const headers: TableHeader[] = [{ value: 'Setting' }, { value: 'Value' }];

        cliux.table(headers, proxyConfigList);
        log.info('Proxy configuration displayed successfully');
      } else {
        log.debug('No proxy configuration found in global config');
      }
    } catch (error) {
      log.error('Error retrieving proxy configuration');
    }
  }
}


