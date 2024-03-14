import map from 'lodash/map';
import winston from 'winston';
import chalk, { Chalk } from 'chalk';
import replace from 'lodash/replace';
import isObject from 'lodash/isObject';
import { normalize, resolve } from 'path';
import { PrintOptions, cliux as ux } from '@contentstack/cli-utilities';

import { LoggerType, PrintType } from '../types';

const ansiRegexPattern = [
  '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
  '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))',
].join('|');

const customLevels = {
  levels: {
    warn: 1,
    info: 2,
    debug: 3,
  },
};

/* The Logger class is a TypeScript class that provides logging functionality with different log levels
and options. */
export default class Logger {
  private infoLogger!: winston.Logger;
  private errorLogger!: winston.Logger;
  private config!: Record<string, any>;
  private hiddenInfoLogger!: winston.Logger;

  get loggerOptions(): winston.transports.FileTransportOptions {
    return {
      filename: '',
      maxFiles: 20,
      tailable: true,
      maxsize: 1000000,
    };
  }

  constructor(config: Record<string, any>) {
    this.config = config;
    this.infoLogger = this.getLoggerInstance('info');
    this.errorLogger = this.getLoggerInstance('error');
    this.hiddenInfoLogger = this.getLoggerInstance('hidden');
  }

  /**
   * The function getLoggerInstance creates and returns a winston logger instance based on the provided
   * log type.
   * @param {LoggerType} logType - The `logType` parameter is a string that represents the type of log.
   * It can have one of the following values: "error", "info", "debug", "warn", or any other custom log
   * type.
   * @returns an instance of the winston.Logger class.
   */
  getLoggerInstance(logType: LoggerType): winston.Logger {
    const consoleOptions: winston.transports.ConsoleTransportOptions = {
      format: winston.format.combine(winston.format.simple(), winston.format.colorize({ all: true })),
    };
    const isHidden = logType === 'hidden';
    logType = logType === 'hidden' ? 'info' : logType;

    if (logType === 'error') {
      consoleOptions.level = logType;
    }

    const filename = normalize(
      resolve(this.config.basePath, 'logs', `${logType}.log`),
    ).replace(/^(\.\.(\/|\\|$))+/, '');
    const transports: winston.transport[] = [
      new winston.transports.File({
        ...this.loggerOptions,
        level: logType,
        filename,
      }),
    ];

    if (!isHidden) {
      transports.push(new winston.transports.Console(consoleOptions));
    }

    const loggerOptions: winston.LoggerOptions = {
      transports,
      levels: customLevels.levels,
    };

    if (logType === 'error') {
      loggerOptions.levels = { error: 0 };
    }

    return winston.createLogger(loggerOptions);
  }

  /**
   * The function `log` takes a message and an optional log type, and logs the message using different
   * loggers based on the log type.
   * @param {string | any} message - The `message` parameter is a string or any type of value that you
   * want to log. It represents the content of the log message that you want to display.
   * @param {LoggerType | PrintOptions | undefined} [logType] - The `logType` parameter is an optional
   * parameter that specifies the type of log. It can be one of the following values:
   */
  log(
    message: string | any,
    logType?: LoggerType | PrintOptions | undefined,
    skipCredentialCheck: boolean = false,
  ): void {
    const logString = skipCredentialCheck ? message : this.returnString(message);

    switch (logType) {
      case 'info':
      case 'debug':
      case 'warn':
        this.infoLogger.log(logType, logString);
        break;
      case 'error':
        this.errorLogger.error(logString);
        break;
      case 'hidden':
        this.hiddenInfoLogger.log('info', logString);
        break;
      default:
        ux.print(logString, logType || {});
        break;
    }
  }

  /**
   * The function `returnString` takes a message as input and returns a modified version of the message
   * with sensitive credentials replaced and any ANSI escape codes removed.
   * @param {any} message - The `message` parameter can be of any type. It can be a string, an object, or
   * an array.
   * @returns a string.
   */
  returnString(message: any): string {
    let returnStr = '';

    const replaceCredentials = (item: any) => {
      try {
        return JSON.stringify(item).replace(/"authtoken":\s*".*?"/, '"authtoken": "..."');
      } catch (error) {}

      return item;
    };

    if (Array.isArray(message) && message.length) {
      returnStr = map(message, (item: any) => {
        if (item && typeof item === 'object') {
          return replaceCredentials(item);
        }

        return item;
      })
        .join('  ')
        .trim();
    } else if (isObject(message)) {
      return replaceCredentials(message);
    } else {
      returnStr = message;
    }

    returnStr = replace(returnStr, new RegExp(ansiRegexPattern, 'g'), '').trim();

    return returnStr;
  }
}

/**
 * The `print` function takes an array of `PrintType` objects, formats the messages using the `chalk`
 * library for styling, and prints the formatted messages using the `ux.print` function.
 * @param printInput - An array of objects with the following properties:
 */
export function print(printInput: Array<PrintType>): void {
  const str = map(printInput, ({ message, bold, color }: PrintType) => {
    let chalkFn: Chalk = chalk;
    if (color) chalkFn = chalkFn[color];
    if (bold) chalkFn = chalkFn.bold;

    return chalkFn(message);
  }).join(' ');

  ux.print(str);
}
