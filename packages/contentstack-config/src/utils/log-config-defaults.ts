import * as path from 'path';
import * as os from 'os';

export const LOG_CONFIG_DEFAULTS = {
  LEVEL: 'info',
  PATH: path.join(os.homedir(), '.contentstack', 'logs'),
  SHOW_CONSOLE_LOGS: false,
} as const;

/**
 * Resolves a log path to an absolute path
 * @param logPath - The path to resolve
 * @returns Absolute path
 */
export function resolveLogPath(logPath: string): string {
  if (!logPath) return LOG_CONFIG_DEFAULTS.PATH;

  return path.isAbsolute(logPath) ? logPath : path.resolve(process.cwd(), logPath);
}

/**
 * Gets the effective log configuration with defaults applied
 * @param currentConfig - Current configuration from config handler
 * @returns Configuration with defaults applied
 */
export function getEffectiveLogConfig(currentConfig: any = {}) {
  const logLevel = currentConfig?.level || LOG_CONFIG_DEFAULTS.LEVEL;
  const logPath = resolveLogPath(currentConfig?.path || LOG_CONFIG_DEFAULTS.PATH);
  const showConsoleLogs = currentConfig?.['showConsoleLogs'] ?? LOG_CONFIG_DEFAULTS.SHOW_CONSOLE_LOGS;

  return {
    level: logLevel,
    path: logPath,
    showConsoleLogs,
  };
}
