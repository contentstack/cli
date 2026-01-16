import { cliux, configHandler, TableHeader, log, handleAndLogError } from '@contentstack/cli-utilities';
import { BaseCommand } from '../../../base-command';

export default class ProxyGetCommand extends BaseCommand<typeof ProxyGetCommand> {
  static description = 'Get proxy configuration for CLI';

  static examples = ['csdx config:get:proxy'];

  async run() {
    try {
      log.debug('Starting proxy configuration retrieval', this.contextDetails);
      const globalProxyConfig = configHandler.get('proxy');

      if (globalProxyConfig) {
        log.debug('Proxy configuration found in global config', this.contextDetails);
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
        log.info('Proxy configuration displayed successfully', this.contextDetails);
      } else {
        log.debug('No proxy configuration found in global config', this.contextDetails);
      }
    } catch (error) {
      handleAndLogError(error, { ...this.contextDetails, module: 'config-get-proxy' });
    }
  }
}


