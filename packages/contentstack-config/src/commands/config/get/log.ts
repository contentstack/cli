import { Command } from '@contentstack/cli-command';
import { cliux, configHandler, TableHeader } from '@contentstack/cli-utilities';
import { getEffectiveLogConfig } from '../../../utils/log-config-defaults';

export default class LogGetCommand extends Command {
  static description = 'Get logging configuration for CLI';

  static examples = ['csdx config:get:log'];

  async run() {
    try {
      const currentLoggingConfig = configHandler.get('log') || {};
      const effectiveConfig = getEffectiveLogConfig(currentLoggingConfig);

      const logConfigList = [
        {
          Setting: 'Log Level',
          Value: effectiveConfig.level,
        },
        {
          Setting: 'Log Path',
          Value: effectiveConfig.path,
        },
        {
          Setting: 'Show Console Logs',
          Value: effectiveConfig.showConsoleLogs.toString(),
        },
      ];

      const headers: TableHeader[] = [{ value: 'Setting' }, { value: 'Value' }];

      cliux.table(headers, logConfigList);
      cliux.print('\nNote: Absolute paths are displayed. Relative paths are resolved from current working directory.', {
        color: 'dim',
      });
    } catch (error) {
      cliux.error('Error', error);
    }
  }
}
