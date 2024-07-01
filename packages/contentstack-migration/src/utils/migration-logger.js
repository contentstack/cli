const winston = require('winston');
const path = require('path');
const { sanitizePath } = require('@contentstack/cli-utilities');
module.exports = class MigrationLogger {
  constructor(filePath) {
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
  log(level, message) {
    this.logger.log('error', message);
  }
};
