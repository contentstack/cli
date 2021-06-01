import * as winston from 'winston';
import config from '../config';
class LoggerService {
  name: string;
  data: object | null;
  logger: winston.Logger;

  static dateFormat(): string {
    return new Date(Date.now()).toUTCString();
  }
  constructor(name: string) {
    this.data = null;
    this.name = name;

    const logger = winston.createLogger({
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: `./logs/${name}.log`,
        }),
      ],
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf((info) => {
          let message = `${LoggerService.dateFormat()}:${name}:${info.level}:${info.message}`;
          message = info.obj ? message + `:${JSON.stringify(info.obj)}` : message;
          message = this.data ? message + `:${JSON.stringify(this.data)}` : message;
          return message;
        }),
      ),
      level: config['log-level'],
    });
    this.logger = logger;
  }

  setLogData(data: object): void {
    this.data = data;
  }

  info(message: string): void {
    this.logger.log('info', message);
  }

  info(message: string, obj: object): void {
    this.logger.log('info', message, {
      obj,
    });
  }

  debug(message: string): void {
    this.logger.log('debug', message);
  }

  debug(message: string, obj: object | string): void {
    this.logger.log('debug', message, {
      obj,
    });
  }

  error(message: string): void {
    this.logger.log('error', message);
  }

  error(message: string, obj: object): void {
    this.logger.log('error', message, {
      obj,
    });
  }
  warn(message: string) {
    this.logger.log('warn', message);
  }

  warn(message: string, obj: object) {
    this.logger.log('warn', message, {
      obj,
    });
  }
}

export default new LoggerService('contentstack-auth');
