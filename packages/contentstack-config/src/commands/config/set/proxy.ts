import { Command } from '@contentstack/cli-command';
import { cliux, flags, configHandler, FlagInput } from '@contentstack/cli-utilities';
import { askProxyPassword } from '../../../utils/interactive';

export default class ProxySetCommand extends Command {
  static description = 'Set proxy configuration for CLI';

  static flags: FlagInput = {
    host: flags.string({
      description: 'Proxy host address',
    }),
    port: flags.string({
      description: 'Proxy port number',
    }),
    protocol: flags.string({
      description: 'Proxy protocol (http or https)',
      options: ['http', 'https'],
      default: 'http',
    }),
    username: flags.string({
      description: 'Proxy username (optional)',
    }),
  };

  static examples = [
    'csdx config:set:proxy --host 127.0.0.1 --port 3128',
    'csdx config:set:proxy --host proxy.example.com --port 8080 --protocol https',
    'csdx config:set:proxy --host proxy.example.com --port 8080 --username user',
  ];

  async run() {
    try {
      const { flags } = await this.parse(ProxySetCommand);

      // Validate required flags when setting proxy
      if (!flags.host || !flags.port) {
        cliux.error('Both --host and --port are required when setting proxy configuration. Use "csdx config:remove:proxy" to remove proxy config.');
        return;
      }
      
      const port = Number.parseInt(flags.port, 10);
      if (Number.isNaN(port) || port < 1 || port > 65535) {
        cliux.error('Invalid port number. Port must be between 1 and 65535.');
        return;
      }

      const proxyConfig: any = {
        protocol: flags.protocol || 'http',
        host: flags.host,
        port: port,
      };

      if (flags.username) {
        // Prompt for password when username is provided
        const password = await askProxyPassword();
        proxyConfig.auth = {
          username: flags.username,
          password: password || '',
        };
      }

      configHandler.set('proxy', proxyConfig);

      cliux.success(`Proxy configuration set successfully:`);
      cliux.success(`  Host: ${proxyConfig.host}`);
      cliux.success(`  Port: ${proxyConfig.port}`);
      cliux.success(`  Protocol: ${proxyConfig.protocol}`);
      if (proxyConfig.auth) {
        cliux.success(`  Username: ${proxyConfig.auth.username ? '***' : 'Not set'}`);
        cliux.success(`  Password: ${proxyConfig.auth.password ? '***' : 'Not set'}`);
      }
    } catch (error) {
      cliux.error('Failed to set proxy configuration', error);
    }
  }
}

