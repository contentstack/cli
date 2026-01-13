import { Command } from '@contentstack/cli-command';
import { flags, configHandler, FlagInput, log } from '@contentstack/cli-utilities';
import { askProxyPassword } from '../../../utils/interactive';

export default class ProxySetCommand extends Command {
  static description = 'Set proxy configuration for CLI';

  static flags: FlagInput = {
    host: flags.string({
      description: 'Proxy host address',
      required: true,
    }),
    port: flags.string({
      description: 'Proxy port number',
      required: true,
    }),
    protocol: flags.string({
      description: 'Proxy protocol (http or https)',
      options: ['http', 'https'],
      default: 'http',
      required: true,
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
      log.debug('Starting proxy configuration setup');
      const { flags } = await this.parse(ProxySetCommand);

      log.debug('Parsed proxy configuration flags');

      const port = Number.parseInt(flags.port, 10);
      if (Number.isNaN(port) || port < 1 || port > 65535) {
        log.error('Invalid port number provided');
        return;
      }

      const proxyConfig: any = {
        protocol: flags.protocol || 'http',
        host: flags.host,
        port: port,
      };

      if (flags.username) {
        log.debug('Username provided, prompting for password');
        // Prompt for password when username is provided
        const password = await askProxyPassword();
        proxyConfig.auth = {
          username: flags.username,
          password: password || '',
        };
        log.debug('Proxy authentication configured');
      }

      log.debug('Saving proxy configuration to global config');
      configHandler.set('proxy', proxyConfig);

      log.success('Proxy configuration set successfully');
    } catch (error) {
      log.error('Failed to set proxy configuration');
    }
  }
}

