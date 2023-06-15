/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

import * as winston from 'winston';
import * as path from 'path';
import * as mkdirp from 'mkdirp';

const slice = Array.prototype.slice;

const ansiRegexPattern = [
  '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
  '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))',
].join('|');

function returnString(args) {
  let returnStr = '';
  if (args && args.length) {
    returnStr = args
      .map(function (item) {
        if (item && typeof item === 'object') {
          try {
            return JSON.stringify(item).replace(/authtoken\":\d"blt................/g, 'authtoken":"blt....');
          } catch (error) {}
          return item;
        }
        return item;
      })
      .join('  ')
      .trim();
  }
  returnStr = returnStr.replace(new RegExp(ansiRegexPattern, 'g'), '').trim();
  return returnStr;
}
const myCustomLevels = {
  levels: {
    warn: 1,
    info: 2,
    debug: 3,
  },
  colors: {
    //colors aren't being used anywhere as of now, we're using chalk to add colors while logging
    info: 'blue',
    debug: 'green',
    warn: 'yellow',
    error: 'red',
  },
};

let logger;
let errorLogger;

let successTransport;
let errorTransport;

function init(_logPath) {
  if (!logger || !errorLogger) {
    const logsDir = path.resolve(_logPath, 'logs', 'export');
    // Create dir if doesn't already exist
    mkdirp.sync(logsDir);

    successTransport = {
      filename: path.join(logsDir, 'success.log'),
      maxFiles: 20,
      maxsize: 1000000,
      tailable: true,
      json: true,
      level: 'info',
    };

    errorTransport = {
      filename: path.join(logsDir, 'error.log'),
      maxFiles: 20,
      maxsize: 1000000,
      tailable: true,
      json: true,
      level: 'error',
    };

    logger = winston.createLogger({
      transports: [
        new winston.transports.File(successTransport),
        new winston.transports.Console({ format: winston.format.simple() }),
      ],
      levels: myCustomLevels.levels,
    });

    errorLogger = winston.createLogger({
      transports: [
        new winston.transports.File(errorTransport),
        new winston.transports.Console({
          level: 'error',
          format: winston.format.combine(
            winston.format.colorize({ all: true, colors: { error: 'red' } }),
            winston.format.simple(),
          ),
        }),
      ],
      levels: { error: 0 },
    });
  }

  return {
    log: function (message) {
      const args = slice.call(arguments);
      const logString = returnString(args);
      if (logString) {
        logger.log('info', logString);
      }
    },
    warn: function () {
      const args = slice.call(arguments);
      const logString = returnString(args);
      if (logString) {
        logger.log('warn', logString);
      }
    },
    error: function (message) {
      const args = slice.call(arguments);
      const logString = returnString(args);
      if (logString) {
        errorLogger.log('error', logString);
      }
    },
    debug: function () {
      const args = slice.call(arguments);
      const logString = returnString(args);
      if (logString) {
        logger.log('debug', logString);
      }
    },
  };
}

export const log = async (config, message, type) => {
  config.data = config.data || path.join(__dirname, 'logs');
  // ignoring the type argument, as we are not using it to create a logfile anymore
  if (type !== 'error') {
    // removed type argument from init method
    init(config.data).log(message);
  } else {
    init(config.data).error(message);
  }
};

export const unlinkFileLogger = () => {
  if (logger) {
    const transports = logger.transports;
    transports.forEach((transport) => {
      if (transport.name === 'file') {
        logger.remove(transport);
      }
    });
  }

  if (errorLogger) {
    const transports = errorLogger.transports;
    transports.forEach((transport) => {
      if (transport.name === 'file') {
        errorLogger.remove(transport);
      }
    });
  }
};
