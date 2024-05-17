import traverse from 'traverse';
import { klona } from 'klona/full';
import path, { normalize } from 'path';
import winston, { LogEntry } from 'winston';

import { cliux as ux, PrintOptions, messageHandler, sanitizePath } from './index';

export class LoggerService {
  name: string;
  data: object | null;
  logger: winston.Logger;

  static dateFormat(): string {
    return new Date(Date.now()).toUTCString();
  }
  constructor(pathToLog: string, name: string) {
    this.data = null;
    this.name = null;
    const logger = winston.createLogger({
      transports: [
        new winston.transports.File({
          filename: path.resolve(sanitizePath(process.env.CS_CLI_LOG_PATH) || `${sanitizePath(pathToLog)}/logs`, `${sanitizePath(name)}.log`),
        }),
      ],
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf((info) => {
          let stringifiedParam;
          try {
            stringifiedParam = JSON.stringify(info.obj);
          } catch (error) {
            console.log('warning: failed to log the result');
          }
          // parse message
          info.message = messageHandler.parse(info.message);
          let message = `${LoggerService.dateFormat()} : ${name}: ${info.level} : ${info.message}`;
          message = info.obj ? message + `:${stringifiedParam}` : message;
          message = this.data ? message + `:${JSON.stringify(this.data)}` : message;
          return message;
        }),
      ),
    });
    this.logger = logger;
  }

  init(context) {
    this.name = context?.plugin?.name ?? 'cli';
  }

  set loggerName(name: string) {
    this.name = name;
  }

  setLogData(data: object): void {
    this.data = data;
  }

  async info(message: string, param?: any): Promise<any> {
    if (param) {
      this.logger.log('info', message, {
        obj: param,
      });
    } else {
      this.logger.log('info', message);
    }
  }

  async debug(message: string, param?: any): Promise<any> {
    if (param) {
      this.logger.log('debug', message, {
        obj: param,
      });
    } else {
      this.logger.log('debug', message);
    }
  }

  async error(message: string, param?: any): Promise<any> {
    if (param) {
      this.logger.log('error', message, {
        obj: param,
      });
    } else {
      this.logger.log('error', message);
    }
  }

  async warn(message: string, param?: any): Promise<any> {
    if (param) {
      this.logger.log('warn', message, {
        obj: param,
      });
    } else {
      this.logger.log('warn', message);
    }
  }
}

export type LogType = 'info' | 'warn' | 'error' | 'debug';
export type LogsType = LogType | PrintOptions | undefined;
export type MessageType = string | Error | Record<string, any> | Record<string, any>[];

/* The Logger class is a TypeScript class that provides logging functionality using the winston
library, with support for redacting sensitive information and different log levels. */
export default class Logger {
  private logger: winston.Logger;
  private errorLogger: winston.Logger;
  private hiddenErrorLogger: winston.Logger;
  private config: Record<string, any>;

  /* The `sensitiveKeys` array is used to store regular expressions that match sensitive keys. These
  keys are used to redact sensitive information from log messages. When logging an object, any keys
  that match the regular expressions in the `sensitiveKeys` array will be replaced with the string
  '[REDACTED]'. This helps to prevent sensitive information from being logged or displayed. */
  private sensitiveKeys = [
    /authtoken/i,
    /^email$/,
    /^password$/i,
    /secret/i,
    /token/i,
    /api[-._]?key/i,
    /management[-._]?token/i,
  ];

  /**
   * The function returns an object with options for a file logger in the winston library.
   * @returns an object of type `winston.transports.FileTransportOptions`.
   */
  get loggerOptions(): winston.transports.FileTransportOptions {
    return {
      filename: '',
      maxFiles: 20,
      tailable: true,
      maxsize: 1000000,
    };
  }

  /**
   * The constructor function initializes the class with a configuration object and creates logger
   * instances.
   * @param config - The `config` parameter is an object that contains various configuration options
   * for the constructor. It is of type `Record<string, any>`, which means it can have any number of
   * properties of any type.
   */
  constructor(config: Record<string, any>) {
    this.config = config;
    this.logger = this.getLoggerInstance();
    this.errorLogger = this.getLoggerInstance('error');
    this.hiddenErrorLogger = this.getLoggerInstance('hidden');
  }

  /**
   * The function getLoggerInstance creates and returns a winston logger instance with specified log
   * level and transports.
   * @param {'error' | 'info' | 'hidden'} [level=info] - The `level` parameter is an optional parameter
   * that specifies the logging level. It can have one of three values: 'error', 'info', or 'hidden'.
   * The default value is 'info'.
   * @returns an instance of the winston.Logger class.
   */
  getLoggerInstance(level: 'error' | 'info' | 'hidden' = 'info'): winston.Logger {
    const filePath = normalize(process.env.CS_CLI_LOG_PATH || this.config.basePath).replace(/^(\.\.(\/|\\|$))+/, '');

    const transports: winston.transport[] = [];

    if (level !== 'hidden') {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(winston.format.colorize({ all: true })),
        }),
      );
    }

    transports.push(
      new winston.transports.File({
        ...this.loggerOptions,
        level: level === 'hidden' ? 'error' : level,
        filename: `${filePath}/${level === 'hidden' ? 'error' : level}.log`,
      }),
    );

    return winston.createLogger({
      levels:
        level === 'error' || level === 'hidden'
          ? { error: 0 }
          : {
              warn: 1,
              info: 2,
              debug: 3,
            },
      level,
      transports,
      format: winston.format.combine(
        winston.format((info) => this.redact(info))(),
        winston.format.errors({ stack: level === 'hidden' }), // NOTE keep stack only for the hidden type
        winston.format.simple(),
        winston.format.timestamp(),
        winston.format.metadata(),
      ),
    });
  }

  /**
   * The function checks if a given key string matches any of the sensitive keys defined in an array.
   * @param {string} keyStr - The parameter `keyStr` is a string that represents a key.
   * @returns a boolean value. It returns true if the keyStr matches any of the regular expressions in
   * the sensitiveKeys array, and false otherwise.
   */
  isSensitiveKey(keyStr: string) {
    if (keyStr && typeof keyStr === 'string') {
      return this.sensitiveKeys.some((regex) => regex.test(keyStr));
    }
  }

  /**
   * The function redactObject takes an object as input and replaces any sensitive keys with the string
   * '[REDACTED]'.
   * @param {any} obj - The `obj` parameter is an object that you want to redact sensitive information
   * from.
   */
  redactObject(obj: any) {
    const self = this;
    traverse(obj).forEach(function redactor() {
      if (self.isSensitiveKey(this.key)) {
        this.update('[REDACTED]');
      }
    });
  }

  /**
   * The redact function takes an object, creates a copy of it, redacts sensitive information from the
   * copy, and returns the redacted copy.
   * @param {any} obj - The `obj` parameter is of type `any`, which means it can accept any type of
   * value. It is the object that needs to be redacted.
   * @returns The `redact` function is returning a copy of the `obj` parameter with certain properties
   * redacted.
   */
  redact(obj: any) {
    try {
      const copy = klona(obj);
      this.redactObject(copy);

      const splat = copy[Symbol.for('splat')];
      this.redactObject(splat);

      return copy;
    } catch (error) {
      return obj;
    }
  }

  /**
   * The function checks if an object is a LogEntry by verifying if it has the properties 'level' and
   * 'message'.
   * @param {any} obj - The `obj` parameter is of type `any`, which means it can be any type of value.
   * @returns a boolean value.
   */
  isLogEntry(obj: any): obj is LogEntry {
    return typeof obj === 'object' && 'level' in obj && 'message' in obj;
  }

  /* The `log` function is a method of the `Logger` class. It is used to log messages or log entries
  with different log types. */
  log(entry: LogEntry): void;
  log(message: MessageType, logType: LogsType): void;
  log(message: MessageType, logType: 'error', hidden: boolean): void;
  log(entryOrMessage: LogEntry | MessageType, logType?: LogsType, hidden?: boolean): void {
    if (this.isLogEntry(entryOrMessage)) {
      this.logger.log(entryOrMessage);
    } else {
      switch (logType) {
        case 'info':
        case 'debug':
        case 'warn':
          this.logger.log(logType, entryOrMessage);
          break;
        case 'error':
          if (hidden) {
            this.hiddenErrorLogger.error(entryOrMessage);
          } else {
            this.errorLogger.error(entryOrMessage);
            this.hiddenErrorLogger.error(entryOrMessage);
          }
          break;
        default:
          ux.print(entryOrMessage as string, logType || {});
          break;
      }
    }
  }
}
