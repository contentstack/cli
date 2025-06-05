import traverse from 'traverse';
import { klona } from 'klona/full';
import { normalize } from 'path';
import * as winston from 'winston';
import { LogEntry } from 'winston';
import { levelColors, logLevels } from '../constants/logging';
import { LoggerConfig, LogLevel, LogType } from '../interfaces/index';

export default class Logger {
  private loggers: Record<string, winston.Logger>;
  private config: LoggerConfig;

  private sensitiveKeys = [
    /authtoken/i,
    /^email$/i,
    /^password$/i,
    /secret/i,
    /token/i,
    /api[-._]?key/i,
    /management[-._]?token/i,
    /sessionid/i,
    /orgid/i,
  ];

  constructor(config: LoggerConfig) {
    this.config = config;
    // Add the custom colors first
    winston.addColors(levelColors);
    this.loggers = {
      error: this.getLoggerInstance('error'),
      warn: this.getLoggerInstance('warn'),
      info: this.getLoggerInstance('info'),
      debug: this.getLoggerInstance('debug'),
      success: this.getLoggerInstance('info'), // Map success to info
    };
  }

  getLoggerInstance(level: 'error' | 'info' | 'warn' | 'debug' | 'hidden' = 'info'): winston.Logger {
    const filePath = normalize(process.env.CS_CLI_LOG_PATH || this.config.basePath).replace(/^(\.\.(\/|\\|$))+/, '');
    if (level === 'hidden') {
      return this.createLogger('error', filePath);
    }
    return this.createLogger(level, filePath);
  }

  private get loggerOptions(): winston.transports.FileTransportOptions {
    return {
      filename: '',
      maxFiles: 20,
      tailable: true,
      maxsize: 1000000,
    };
  }

  private createLogger(level: LogLevel, filePath: string): winston.Logger {
    return winston.createLogger({
      levels: logLevels,
      level: level,
      transports: [
        new winston.transports.File({
          ...this.loggerOptions,
          filename: `${filePath}/${level}.log`,
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf((info) => {
              const colorizer = winston.format.colorize();

              // Handle success type specifically
              const levelToColorize = info.level;
              const levelText = levelToColorize.toUpperCase();

              const timestamp = info.timestamp;
              const message = info.message;

              let fullLine = `[${timestamp}] ${levelText}: ${message}`;
              return colorizer.colorize(levelToColorize, fullLine);
            }),
          ),
        }),
      ],
    });
  }

  private isSensitiveKey(keyStr: string): boolean {
    return keyStr && typeof keyStr === 'string' ? this.sensitiveKeys.some((regex) => regex.test(keyStr)) : false;
  }

  private redactObject(obj: any): void {
    const self = this;
    traverse(obj).forEach(function redactor() {
      if (this.key && self.isSensitiveKey(this.key)) {
        this.update('[REDACTED]');
      }
    });
  }

  private redact(info: any): any {
    try {
      const copy = klona(info);
      this.redactObject(copy);

      const splat = copy[Symbol.for('splat')];
      if (splat) this.redactObject(splat);

      return copy;
    } catch (error) {
      return info;
    }
  }

  private isLogEntry(obj: any): obj is LogEntry {
    return typeof obj === 'object' && 'level' in obj && 'message' in obj;
  }

  private shouldLog(level: LogType, target: 'console' | 'file'): boolean {
    const configLevel = target === 'console' ? this.config.consoleLogLevel : this.config.logLevel;
    const minLevel = configLevel ? logLevels[configLevel] : 2; // default: info
    const entryLevel = logLevels[level];
    return entryLevel <= minLevel;
  }

  /* === Public Log Methods === */

  public error(message: string, meta?: any): void {
    if (this.shouldLog('error', 'console') || this.shouldLog('error', 'file')) {
      this.loggers.error.error(message, { ...meta, level: 'error' });
    }
  }

  public warn(message: string, meta?: any): void {
    if (this.shouldLog('warn', 'console') || this.shouldLog('warn', 'file')) {
      this.loggers.warn.warn(message, { ...meta, level: 'warn' });
    }
  }

  public info(message: string, meta?: any): void {
    if (this.shouldLog('info', 'console') || this.shouldLog('info', 'file')) {
      this.loggers.info.info(message, { ...meta, level: 'info' });
    }
  }

  public success(message: string, meta?: any): void {
    if (this.shouldLog('success', 'console') || this.shouldLog('success', 'file')) {
      this.loggers.success.log('success', message, { ...meta });
    }
  }

  public debug(message: string, meta?: any): void {
    if (this.shouldLog('debug', 'console') || this.shouldLog('debug', 'file')) {
      this.loggers.debug.debug(message, { ...meta, level: 'debug' });
    }
  }

  /* === Structured Logging === */

  public logError(params: {
    type: string;
    message: string;
    error: any;
    context?: string;
    hidden?: boolean;
    meta?: Record<string, any>;
  }): void {
    const logPayload = {
      level: logLevels.error,
      message: params.message,
      timestamp: new Date(),
      meta: {
        type: params.type,
        error: params.error,
        context: params.context,
        ...params.meta,
      },
    };
    const targetLevel: LogType = params.hidden ? 'debug' : 'error';

    if (this.shouldLog(targetLevel, 'console') || this.shouldLog(targetLevel, 'file')) {
      this.loggers[targetLevel].error(logPayload);
    }
  }

  public logWarn(params: {
    type: string;
    message: string;
    warn?: any;
    context?: string;
    meta?: Record<string, any>;
  }): void {
    const logPayload = {
      level: logLevels.warn,
      message: params.message,
      timestamp: new Date(),
      meta: {
        type: params.type,
        context: params.context,
        ...params.meta,
      },
    };
    if (this.shouldLog('warn', 'console') || this.shouldLog('warn', 'file')) {
      this.loggers.warn.warn(logPayload);
    }
  }

  public logInfo(params: {
    type: string;
    message: string;
    info?: any;
    context?: string;
    meta?: Record<string, any>;
  }): void {
    const logPayload = {
      level: logLevels.info,
      message: params.message,
      timestamp: new Date(),
      meta: {
        type: params.type,
        info: params.info,
        context: params.context,
        ...params.meta,
      },
    };
    if (this.shouldLog('info', 'console') || this.shouldLog('info', 'file')) {
      this.loggers.info.info(logPayload);
    }
  }

  public logSuccess(params: {
    type: string;
    message: string;
    data?: any;
    context?: string;
    meta?: Record<string, any>;
  }): void {
    const logPayload = {
      level: 'success',
      message: params.message,
      timestamp: new Date(),
      meta: {
        type: params.type,
        data: params.data,
        context: params.context,
        ...params.meta,
      },
    };
    if (this.shouldLog('success', 'console') || this.shouldLog('success', 'file')) {
      this.loggers.success.log(logPayload);
    }
  }

  public logDebug(params: {
    type: string;
    message: string;
    debug?: any;
    context?: string;
    meta?: Record<string, any>;
  }): void {
    const logPayload = {
      level: logLevels.debug,
      message: params.message,
      timestamp: new Date(),
      meta: {
        type: params.type,
        debug: params.debug,
        context: params.context,
        ...params.meta,
      },
    };
    if (this.shouldLog('debug', 'console') || this.shouldLog('debug', 'file')) {
      this.loggers.debug.debug(logPayload);
    }
  }
}
