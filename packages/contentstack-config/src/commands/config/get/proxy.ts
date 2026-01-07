import { Command } from '@contentstack/cli-command';
import { cliux, configHandler, TableHeader } from '@contentstack/cli-utilities';

export default class ProxyGetCommand extends Command {
  static description = 'Get proxy configuration for CLI';

  static examples = ['csdx config:get:proxy'];

  async run() {
    try {
      // Check all sources
      const globalProxyConfig = configHandler.get('proxy');
      const envHttpsProxy = process.env.HTTPS_PROXY;
      const envHttpProxy = process.env.HTTP_PROXY;

      // Determine which source is being used (priority order: Environment variables > Global config)
      let activeSource = 'None';
      let proxyConfig: any = null;

      if (envHttpsProxy || envHttpProxy) {
        activeSource = 'Environment variables';
        const proxyUrl = envHttpsProxy || envHttpProxy;
        try {
          const url = new URL(proxyUrl);
          proxyConfig = {
            host: url.hostname,
            port: url.port || (url.protocol === 'https:' ? '443' : '80'),
            protocol: url.protocol.replace(':', ''),
            username: url.username || undefined,
            password: url.password ? '***' : undefined,
          };
        } catch {
          // Invalid URL, skip
        }
      } else if (globalProxyConfig) {
        activeSource = 'Global config';
        proxyConfig = {
          host: globalProxyConfig.host,
          port: globalProxyConfig.port,
          protocol: globalProxyConfig.protocol,
          username: globalProxyConfig.auth?.username || undefined,
          password: globalProxyConfig.auth?.password ? '***' : undefined,
        };
      }

      if (proxyConfig) {
        const proxyConfigList = [
          {
            Setting: 'Source',
            Value: activeSource,
          },
          {
            Setting: 'Host',
            Value: proxyConfig.host || 'Not set',
          },
          {
            Setting: 'Port',
            Value: proxyConfig.port ? String(proxyConfig.port) : 'Not set',
          },
          {
            Setting: 'Protocol',
            Value: proxyConfig.protocol || 'Not set',
          },
          {
            Setting: 'Username',
            Value: proxyConfig.username ? (proxyConfig.username === '***' ? '***' : proxyConfig.username) : 'Not set',
          },
          {
            Setting: 'Password',
            Value: proxyConfig.password ? '***' : 'Not set',
          },
        ];

        const headers: TableHeader[] = [{ value: 'Setting' }, { value: 'Value' }];

        cliux.table(headers, proxyConfigList);
        cliux.print('\nNote: Proxy configuration priority: Environment variables > Global config', {
          color: 'dim',
        });
      } else {
        cliux.print('No proxy configuration found.', { color: 'yellow' });
        cliux.print('\nProxy can be configured via:');
        cliux.print('  1. Global config: csdx config:set:proxy --host <host> --port <port>');
        cliux.print('  2. Environment variables: HTTPS_PROXY or HTTP_PROXY');
        cliux.print('     - macOS/Linux: Set in ~/.zshrc, ~/.bashrc, or ~/.profile');
        cliux.print('     - Windows: Set via System Properties or PowerShell: $env:HTTPS_PROXY="..."');
      }
    } catch (error) {
      cliux.error('Error retrieving proxy configuration', error);
    }
  }
}


