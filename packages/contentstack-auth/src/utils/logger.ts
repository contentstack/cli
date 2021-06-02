import * as winston from 'winston';
import config from '../config';
import messageHandler from './message-handler';
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
          let stringifiedParam;
          try {
            stringifiedParam = JSON.stringify(info.obj);
          } catch (error) {
            console.log('warning: failed to log the result');
          }
          // parse message
          info.message = messageHandler.parse(info.message);
          let message = `${LoggerService.dateFormat()}:${name}:${info.level}:${info.message}`;
          message = info.obj ? message + `:${stringifiedParam}` : message;
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

  async info(message: string): void {
    this.logger.log('info', message);
  }

  async info(message: string, obj: object): void {
    this.logger.log('info', message, {
      obj,
    });
  }

  async debug(message: string): void {
    this.logger.log('debug', message);
  }

  async debug(message: string, obj: object | string): void {
    this.logger.log('debug', message, {
      obj,
    });
  }

  async error(message: string): void {
    this.logger.log('error', message);
  }

  async error(message: string, obj: object): void {
    this.logger.log('error', message, {
      obj,
    });
  }

  async warn(message: string) {
    this.logger.log('warn', message);
  }

  async warn(message: string, obj: object) {
    this.logger.log('warn', message, {
      obj,
    });
  }
}

export default new LoggerService('contentstack-auth');
