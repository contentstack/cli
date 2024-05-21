import { join } from 'path';
import { LogEntry } from 'winston/index';
import { Logger, pathValidator, sanitizePath } from '@contentstack/cli-utilities';
import { LogsType, MessageType } from '@contentstack/cli-utilities/lib/logger';

import { ImportConfig } from '../types';

let logger: Logger;

export function isImportConfig(config: ImportConfig | MessageType): config is ImportConfig {
  return (config as ImportConfig).data !== undefined && (config as ImportConfig)?.contentVersion !== undefined;
}

export function log(entry: LogEntry): void;
export function log(error: MessageType, logType: LogsType): void;
export function log(error: MessageType, logType: 'error', hidden: boolean): void;
export function log(entryOrMessage: MessageType, logType?: LogsType, hidden?: boolean): Logger | void {
  logger = initLogger();

  if (logType === 'error') {
    logger.log(entryOrMessage, logType, hidden);
  } else {
    logger.log(entryOrMessage, logType);
  }
}

export function initLogger(config?: ImportConfig | undefined) {
  if (!logger) {
    const basePath = pathValidator(join(sanitizePath(config?.cliLogsPath ?? process.cwd()), 'logs', 'import'));
    logger = new Logger(Object.assign(config ?? {}, { basePath }));
  }

  return logger;
}

export { logger };

export const trace = log;
