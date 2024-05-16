const winston = require('winston');
const path = require('path');
const { sanitizepath } = require('@contentstack/cli-utilities');
module.exports = class MigrationLogger {
  constructor(filePath) {
    this.filePath = path.join(sanitizepath(filePath), 'migration-logs');
    this.logger = winston.createLogger({
      levels: { error: 1 },
      transports: [
        new winston.transports.File({
          level: 'error',
          filename: path.join(sanitizepath(this.filePath), 'error.logs'),
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
      ],
    });
  }
  log(level, message) {
    this.logger.log('error', message);
  }
};
