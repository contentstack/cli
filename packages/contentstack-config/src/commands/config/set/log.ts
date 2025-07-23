import { Command } from '@contentstack/cli-command';
import { cliux, flags, configHandler, FlagInput, messageHandler, CLIError } from '@contentstack/cli-utilities';
import { interactive } from '../../../utils';
import { existsSync, statSync } from 'fs';
import { dirname } from 'path';

export default class LogSetCommand extends Command {
  static description = 'Set logging configuration for CLI';

  static flags: FlagInput = {
    level: flags.string({
      description: 'Set the log level for the CLI.',
      options: ['debug', 'info', 'warn', 'error'],
    }),
    path: flags.string({
      description: ' Specify the file path where logs should be saved.',
    }),
  };

  static examples = ['csdx config:set:log', 'csdx config:set:log --level debug --path ./logs/app.log'];

  async run() {
    try {
      const { flags } = await this.parse(LogSetCommand);

      let logLevel: string = flags['level'];
      let logPath: string = flags['path'];

      // Interactive prompts if not passed via flags
      if (!logLevel) {
        logLevel = await interactive.askLogLevel();
      }

      if (!logPath) {
        logPath = await interactive.askLogPath();
      }

      if (logPath) {
        const logDir = dirname(logPath);
        // Check if the directory part of the path exists and is actually a file
        if (existsSync(logDir) && statSync(logDir).isFile()) {
          throw new CLIError({
            message: `The directory path '${logDir}' is a file, not a directory. Please provide a valid directory path for the log file.`,
          });
        }
      }

      const currentLoggingConfig = configHandler.get('log') || {};
      if (logLevel) currentLoggingConfig.level = logLevel;
      if (logPath) currentLoggingConfig.path = logPath;

      configHandler.set('log', currentLoggingConfig);
      cliux.success(messageHandler.parse('CLI_CONFIG_LOG_LEVEL_SET', logLevel));
      cliux.success(messageHandler.parse('CLI_CONFIG_LOG_PATH_SET', logPath));
      cliux.print(messageHandler.parse('CLI_CONFIG_LOG_SET_SUCCESS'), { color: 'green' });
    } catch (error) {
      cliux.error('error', error);
    }
  }
}
