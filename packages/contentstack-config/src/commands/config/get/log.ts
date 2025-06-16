import { Command } from '@contentstack/cli-command';
import { cliux, configHandler, messageHandler } from '@contentstack/cli-utilities';

export default class LogGetCommand extends Command {
  static description = 'Get current logging configuration for CLI';

  static examples = ['csdx config:get:log'];

  async run() {
    try {
      const currentLoggingConfig = configHandler.get('log') || {};
      const logLevel = currentLoggingConfig?.level;
      const logPath = currentLoggingConfig?.path;

      if (logLevel || logPath) {
        cliux.print('Logging Configuration:\n');
        if (logLevel) cliux.print(`Log Level: ${logLevel}`);
        if (logPath) cliux.print(`Log Path  : ${logPath}`);
      } else {
        cliux.print(`error: ${messageHandler.parse('CLI_CONFIG_LOG_NO_CONFIG')}`, { color: 'red' });
      }
    } catch (error) {
      cliux.error('error', error);
    }
  }
}
