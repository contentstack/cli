import winston from 'winston';
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
    this.name = null;

    const logger = winston.createLogger({
      transports: [
        // new winston.transports.Console(),
        new winston.transports.File({
          filename: `../contentstack/logs/${name}.log`,
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
      // // level: (config.get('logger.level') as string) || 'error',
      // level: 'error',
      // silent: true
      // silent: config.get('logger.enabled') && process.env.CLI_ENV !== 'TEST' ? false : false,
    });
    this.logger = logger;
  }

  init(context) {
    this.name = (context && context.plugin && context.plugin.name) || 'cli';
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

export default new LoggerService('cli')