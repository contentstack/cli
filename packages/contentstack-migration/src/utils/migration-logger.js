const winston = require('winston');
const path = require('path');
module.exports = class MigrationLogger {
  constructor(filePath) {
    this.filePath = path.join(filePath, 'migration-logs');
    this.logger = winston.createLogger({
      levels: { error: 1 },
      transports: [
        new winston.transports.File({
          level: 'error',
          filename: path.join(this.filePath, 'error.logs'),
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
      ],
    });
  }
  log(level, message) {
    this.logger.log('error', message);
  }
};
