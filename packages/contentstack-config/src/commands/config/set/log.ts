import { Command } from '@contentstack/cli-command';
import { cliux, flags, configHandler, FlagInput, messageHandler, handleAndLogError } from '@contentstack/cli-utilities';
import { resolveLogPath } from '../../../utils/log-config-defaults';
import * as path from 'path';

export default class LogSetCommand extends Command {
  static description = 'Set logging configuration for CLI';

  static flags: FlagInput = {
    level: flags.string({
      description: 'Set the log level for the CLI. Defaults to "info" if not specified.',
      options: ['debug', 'info', 'warn', 'error'],
    }),
    path: flags.string({
      description:
        'Specify the directory path where logs should be saved. Supports both relative and absolute paths. Defaults to ~/.contentstack/logs if not specified.',
    }),
    'show-console-logs': flags.boolean({
      description: 'Enable console logging.',
      allowNo: true, // no-show-console-logs
      default: false,
    }),
  };

  static examples = [
    'csdx config:set:log',
    'csdx config:set:log --level debug',
    'csdx config:set:log --path ./logs',
    'csdx config:set:log --level debug --path ./logs --show-console-logs',
    'csdx config:set:log --no-show-console-logs',
    'csdx config:set:log --level warn --show-console-logs',
    'csdx config:set:log --path ~/custom/logs',
    'csdx config:set:log --path /var/log/contentstack',
  ];

  async run() {
    try {
      const { flags } = await this.parse(LogSetCommand);
      const currentLoggingConfig = configHandler.get('log') || {};
      if (flags['level'] !== undefined) {
        currentLoggingConfig.level = flags['level'];
      }

      if (flags['path'] !== undefined) {
        // Convert to absolute path and ensure it's a directory
        let resolvedPath = resolveLogPath(flags['path']);
        const pathExt = path.extname(resolvedPath);
        if (pathExt && pathExt.length > 0) {
          resolvedPath = path.dirname(resolvedPath);
        }

        currentLoggingConfig.path = resolvedPath;
      }

      if (flags['show-console-logs'] !== undefined) {
        currentLoggingConfig['show-console-logs'] = flags['show-console-logs'];
      }
      configHandler.set('log', currentLoggingConfig);

      if (flags['level'] !== undefined) {
        cliux.success(messageHandler.parse('CLI_CONFIG_LOG_LEVEL_SET', currentLoggingConfig.level));
      }

      if (flags['path'] !== undefined) {
        cliux.success(messageHandler.parse('CLI_CONFIG_LOG_PATH_SET', currentLoggingConfig.path));
      }

      if (flags['show-console-logs'] !== undefined) {
        cliux.success(
          messageHandler.parse('CLI_CONFIG_LOG_CONSOLE_SET', String(currentLoggingConfig['show-console-logs'])),
        );
      }
    } catch (error) {
      handleAndLogError(error, { module: 'config-set-log' });
    }
  }
}
