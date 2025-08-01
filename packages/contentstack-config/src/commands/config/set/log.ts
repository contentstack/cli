import { Command } from '@contentstack/cli-command';
import { cliux, flags, configHandler, FlagInput, messageHandler } from '@contentstack/cli-utilities';
import { interactive } from '../../../utils';

export default class LogSetCommand extends Command {
  static description = 'Set logging configuration for CLI';

  static flags: FlagInput = {
    'level': flags.string({
      description: 'Set the log level for the CLI.',
      options: ['debug', 'info', 'warn', 'error'],
    }),
    'path': flags.string({
      description: 'Specify the file path where logs should be saved.',
    }),
    'show-console-logs': flags.boolean({
      description: 'Enable console logging.',
      allowNo: true, // no-show-console-logs
      default: false,
    })
  };


  static examples = [
    'csdx config:set:log',
    'csdx config:set:log --level debug --path ./logs/app.log --show-console-logs',
    'csdx config:set:log --no-show-console-logs',
  ];

  async run() {
    try {
      const { flags } = await this.parse(LogSetCommand);

      let logLevel: string = flags['level'];
      let logPath: string = flags['path'];
      const showConsoleLogs: boolean = flags['show-console-logs'];
      const currentLoggingConfig = configHandler.get('log') || {};
      logLevel = logLevel || currentLoggingConfig?.level;
      logPath = logPath || currentLoggingConfig?.path;
      // Interactive prompts if not passed via flags
      if (!logLevel) {
        logLevel = await interactive.askLogLevel();
      }

      if (!logPath) {
        logPath = await interactive.askLogPath();
      }

      if (logLevel) currentLoggingConfig.level = logLevel;
      if (logPath) currentLoggingConfig.path = logPath;
      currentLoggingConfig.showConsoleLogs = showConsoleLogs;

      configHandler.set('log', currentLoggingConfig);

      cliux.success(messageHandler.parse('CLI_CONFIG_LOG_LEVEL_SET', logLevel));
      cliux.success(messageHandler.parse('CLI_CONFIG_LOG_PATH_SET', logPath));
      cliux.success(messageHandler.parse('CLI_CONFIG_LOG_CONSOLE_SET', String(showConsoleLogs)));
      cliux.print(messageHandler.parse('CLI_CONFIG_LOG_SET_SUCCESS'), { color: 'green' });
    } catch (error) {
      cliux.error('error', error);
    }
  }
}
