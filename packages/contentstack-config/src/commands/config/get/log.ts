import { Command } from '@contentstack/cli-command';
import { cliux, configHandler, messageHandler, TableHeader } from '@contentstack/cli-utilities';

export default class LogGetCommand extends Command {
  static description = 'Get logging configuration for CLI';

  static examples = ['csdx config:get:log'];

  async run() {
    try {
      const currentLoggingConfig = configHandler.get('log') || {};
      const logLevel = currentLoggingConfig?.level;
      const logPath = currentLoggingConfig?.path;

      if (logLevel || logPath) {
        const logConfigList = [
          {
            'Log Level': logLevel || 'Not set',
            'Log Path': logPath || 'Not set',
          },
        ];

        const headers: TableHeader[] = [
          { value: 'Log Level' },
          { value: 'Log Path' },
        ];

        cliux.table(headers, logConfigList);
      } else {
        cliux.print(`error: ${messageHandler.parse('CLI_CONFIG_LOG_NO_CONFIG')}`, { color: 'red' });
      }
    } catch (error) {
      cliux.error('error', error);
    }
  }
}
