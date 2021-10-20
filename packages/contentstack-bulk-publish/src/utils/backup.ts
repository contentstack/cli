const path = require('path');
const winston = require('winston');
const homedir = require('os').homedir()
const logsDir = path.join(homedir, 'contentstack-cli-logs', 'bulk-publish')

let filename;

export function getLoggerInstance(fileName) {
  filename = path.join(logsDir, fileName);
  const logger = winston.createLogger({
    transports: [
      new winston.transports.File({ filename: `${filename}.error`, level: 'error' }),
      new winston.transports.File({ filename: `${filename}.success`, level: 'info' }),
    ],
  });
  return logger;
};

export function getFileLoggerInstance(fileName) {
  filename = path.join(logsDir, fileName);
  const logger = winston.createLogger({
    transports: [
      new winston.transports.File({ filename }),
    ],
  });
  return logger;
}

export function getAllLogs(fname): any {
  const options = {
    limit: 1000000000000,
    start: 0,
    order: 'desc',
  };
  const logger = getFileLoggerInstance(fname);
  logger.query(options, async (err, result) => {
    if (err) return err;
    return result;
  });
}
export function addLogs(logger, data, Type) {
  switch (Type) {
    case 'error':
      logger.error(data);
      break;
    case 'info':
      logger.info(data);
      break;
    default:
      console.log('Unknown logging level');
  }
}
export function getLogsDirPath() {
  return logsDir
}