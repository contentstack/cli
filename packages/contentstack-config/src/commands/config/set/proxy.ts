import { flags, configHandler, FlagInput, log, handleAndLogError, cliux } from '@contentstack/cli-utilities';
import { askProxyPassword } from '../../../utils/interactive';
import { BaseCommand } from '../../../base-command';

export default class ProxySetCommand extends BaseCommand<typeof ProxySetCommand> {
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
      log.debug('Starting proxy configuration setup', this.contextDetails);
      const { flags } = await this.parse(ProxySetCommand);

      log.debug('Parsed proxy configuration flags', this.contextDetails);

      // Validate host - must not be empty or whitespace-only
      if (!flags.host || flags.host.trim() === '') {
        log.error('Invalid host provided - host cannot be empty or whitespace-only', this.contextDetails);
        cliux.error('Invalid host address. Host cannot be empty or contain only whitespace.');
        return;
      }

      const port = Number.parseInt(flags.port, 10);
      if (Number.isNaN(port) || port < 1 || port > 65535) {
        log.error('Invalid port number provided', this.contextDetails);
        cliux.error('Invalid port number. Port must be between 1 and 65535.');
        return;
      }

      const proxyConfig: any = {
        protocol: flags.protocol || 'http',
        host: flags.host.trim(),
        port: port,
      };

      if (flags.username) {
        log.debug('Username provided, prompting for password', this.contextDetails);
        // Prompt for password when username is provided
        const password = await askProxyPassword();
        proxyConfig.auth = {
          username: flags.username,
          password: password || '',
        };
        log.debug('Proxy authentication configured', this.contextDetails);
      }

      log.debug('Saving proxy configuration to global config', this.contextDetails);
      configHandler.set('proxy', proxyConfig);

      log.success('Proxy configuration set successfully', this.contextDetails);
    } catch (error) {
      handleAndLogError(error, { ...this.contextDetails, module: 'config-set-proxy' });
    }
  }
}

