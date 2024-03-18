const winston = require('winston');
const path = require('path');
module.exports = class MigrationLogger {
  constructor(filePath) {
    this.filePath = path.join(filePath, 'migration-logs');
    this.logger = winston.createLogger({
      levels: { info: 1, error: 2 },
      transports: [
        new winston.transports.File({
          level: 'error',
          filename: path.join(this.filePath, 'error.logs'),
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
        new winston.transports.File({
          level: 'info',
          filename: path.join(this.filePath, 'info.logs'),
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
      ],
    });
  }
  log(level, message) {
    if (level === 'info') {
      this.logger.log('info', message);
    }
    this.logger.log('error', message);
  }
};
