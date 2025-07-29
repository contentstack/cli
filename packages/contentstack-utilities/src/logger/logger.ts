import traverse from 'traverse';
import { klona } from 'klona/full';
import { normalize } from 'path';
import * as winston from 'winston';
import { levelColors, logLevels } from '../constants/logging';
import { LoggerConfig, LogLevel, LogType } from '../interfaces/index';
import { configHandler } from '..';

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
    /stack/i,
  ];

  constructor(config: LoggerConfig) {
    this.config = config;
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
    return this.createLogger(level === 'hidden' ? 'error' : level, filePath);
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
    const transports: winston.transport[] = [
      new winston.transports.File({
        ...this.loggerOptions,
        filename: `${filePath}/${level}.log`,
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
    ];

    // Add console transport only if showConsoleLogs is true
    if (configHandler && typeof configHandler.get === 'function' && configHandler.get('showConsoleLogs')) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf((info) => {
              const redactedInfo = this.redact(info);
              const colorizer = winston.format.colorize();
              const levelText = redactedInfo.level.toUpperCase();
              const { timestamp, message } = redactedInfo;
              return colorizer.colorize(redactedInfo.level, `[${timestamp}] ${levelText}: ${message}`);
            }),
          ),
        }),
      );
    }

    return winston.createLogger({
      levels: logLevels,
      level,
      transports,
    });
  }

  private isSensitiveKey(keyStr: string): boolean {
    return typeof keyStr === 'string' ? this.sensitiveKeys.some((regex) => regex.test(keyStr)) : false;
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
    } catch {
      return info;
    }
  }

  private shouldLog(level: LogType, target: 'console' | 'file'): boolean {
    const configLevel = target === 'console' ? this.config.consoleLogLevel : this.config.logLevel;
    const minLevel = configLevel ? logLevels[configLevel] : logLevels['info']; // Default to info level
    const currentLevel = logLevels[level] || logLevels['info']; // Handle undefined levels
    return currentLevel <= minLevel;
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
      this.loggers.success.info(message, { ...meta, type: 'success' });
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
    context?: Record<string, any>;
    hidden?: boolean;
    meta?: Record<string, any>;
  }): void {
    const logPayload = {
      level: logLevels.error,
      message: params.message,
      meta: {
        type: params.type,
        error: params.error,
        ...(params.context || {}),
        ...(params.meta || {}),
      },
    };

    // Always log to error file, but respect hidden parameter for console
    if (this.shouldLog('error', 'file')) {
      this.loggers.error.error(logPayload);
    }

    // For console, use debug level if hidden, otherwise error level
    const consoleLevel: LogType = params.hidden ? 'debug' : 'error';
    if (this.shouldLog(consoleLevel, 'console')) {
      this.loggers[consoleLevel].error(logPayload);
    }
  }

  public logWarn(params: {
    type: string;
    message: string;
    warn?: any;
    context?: Record<string, any>;
    meta?: Record<string, any>;
  }): void {
    const logPayload = {
      level: logLevels.warn,
      message: params.message,
      timestamp: new Date(),
      meta: {
        type: params.type,
        warn: params.warn,
        ...(params.context || {}),
        ...(params.meta || {}),
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
    context?: Record<string, any>;
    meta?: Record<string, any>;
  }): void {
    const logPayload = {
      level: logLevels.info,
      message: params.message,
      timestamp: new Date(),
      meta: {
        type: params.type,
        info: params.info,
        ...(params.context || {}),
        ...(params.meta || {}),
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
    context?: Record<string, any>;
    meta?: Record<string, any>;
  }): void {
    const logPayload = {
      level: 'success',
      message: params.message,
      timestamp: new Date(),
      meta: {
        type: params.type,
        data: params.data,
        ...(params.context || {}),
        ...(params.meta || {}),
      },
    };
    if (this.shouldLog('success', 'console') || this.shouldLog('success', 'file')) {
      this.loggers.success.info(logPayload);
    }
  }

  public logDebug(params: {
    type: string;
    message: string;
    debug?: any;
    context?: Record<string, any>;
    meta?: Record<string, any>;
  }): void {
    const logPayload = {
      level: logLevels.debug,
      message: params.message,
      meta: {
        type: params.type,
        debug: params.debug,
        ...(params.context || {}),
        ...(params.meta || {}),
      },
    };
    if (this.shouldLog('debug', 'console') || this.shouldLog('debug', 'file')) {
      this.loggers.debug.debug(logPayload);
    }
  }
}
