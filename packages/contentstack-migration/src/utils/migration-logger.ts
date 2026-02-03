import winston from 'winston';
import path from 'path';
import { sanitizePath } from '@contentstack/cli-utilities';

export default class MigrationLogger {
  filePath: string;
  logger: winston.Logger;

  constructor(filePath: string) {
    this.filePath = path.join(sanitizePath(filePath), 'migration-logs');
    this.logger = winston.createLogger({
      levels: { error: 1 },
      transports: [
        new winston.transports.File({
          level: 'error',
          filename: path.join(sanitizePath(this.filePath), 'error.logs'),
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
      ],
    });
  }

  log(level: string, message: any): void {
    this.logger.log('error', message);
  }
}
