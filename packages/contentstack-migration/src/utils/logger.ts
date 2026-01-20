import { createLogger, format, transports } from 'winston';
import { resolve, join } from 'path';
import { pathValidator, sanitizePath } from '@contentstack/cli-utilities';

// FS helper
import { makeDir } from './fs-helper';

const { NODE_ENV } = process.env;

function getString(args: any[]): string {
  let str = '';
  if (args && args.length > 0) {
    str = args
      .map((item) => (item && typeof item === 'object' ? JSON.stringify(item) : item))
      .join(' ')
      .trim();
  }
  return str;
}

const customFormat = format.printf(({ level, message }: any) => {
  return `${level}: ${message}`;
});

function init(logFileName: string): any {
  const logsDir = resolve(process.env.CS_CLI_LOG_PATH ?? process.cwd(), 'logs');
  // Create dir if does not exist
  makeDir(logsDir);

  const logPath = pathValidator(join(sanitizePath(logsDir), sanitizePath(logFileName) + '.log'));
  const logger = createLogger({
    format: format.combine(format.colorize(), format.label({ label: 'Migration' }), customFormat),
    transports: [new transports.File({ filename: logPath })],
  });

  let args: any;
  let logString: string;

  return {
    log: function (...args: any[]) {
      logString = getString(args);
      logString && logger.log('info', logString);
    },
    warn: function (...args: any[]) {
      logString = getString(args);
      logString && logger.log('warn', logString);
    },
    error: function () {
      // args = slice.call(arguments);
      // logString = getString(args);
      // logString && logger.log('error', logString);
    },
    debug: function (...args: any[]) {
      logString = getString(args);
      logString && logger.log('debug', logString);
    },
  };
}

const successFn = init('success');
export const success = successFn.log;

let errorFn: any;
if (NODE_ENV === 'test') {
  errorFn = init('warn');
} else {
  errorFn = init('error');
}
export const error = errorFn.error;

const warnFn = init('warn');
export const warn = warnFn.warn;
