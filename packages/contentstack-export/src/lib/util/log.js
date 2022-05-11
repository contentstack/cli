/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

var winston = require('winston');
var path = require('path');
var mkdirp = require('mkdirp');
var slice = Array.prototype.slice;

function returnString(args) {
  var returnStr = '';
  if (args && args.length) {
    returnStr = args
      .map(function (item) {
        if (item && typeof item === 'object') {
          return JSON.stringify(item);
        }
        return item;
      })
      .join('  ')
      .trim();
  }
  return returnStr;
}

var myCustomLevels = {
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
    var logsDir = path.resolve(_logPath, 'logs', 'export');
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
      transports: [new winston.transports.File(successTransport), new winston.transports.Console()],
      levels: myCustomLevels.levels,
    });

    errorLogger = winston.createLogger({
      transports: [new winston.transports.File(errorTransport), new winston.transports.Console({ level: 'error' })],
      levels: { error: 0 },
    });
  }

  return {
    log: function () {
      let args = slice.call(arguments);
      let logString = returnString(args);
      if (logString) {
        logger.log('info', logString);
      }
    },
    warn: function () {
      let args = slice.call(arguments);
      let logString = returnString(args);
      if (logString) {
        logger.log('warn', logString);
      }
    },
    error: function () {
      let args = slice.call(arguments);
      let logString = returnString(args);
      if (logString) {
        errorLogger.log('error', logString);
      }
    },
    debug: function () {
      let args = slice.call(arguments);
      let logString = returnString(args);
      if (logString) {
        logger.log('debug', logString);
      }
    },
  };
}

exports.addlogs = async (config, message, type) => {
  // ignoring the type argument, as we are not using it to create a logfile anymore
  if (type !== 'error') {
    // removed type argument from init method
    init(config.data).log(message);
  } else {
    init(config.data).error(message);
  }
};

exports.unlinkFileLogger = () => {
  if (logger) {
    const transports = logger.transports;
    transports.forEach(transport => {
      if (transport.name === 'file') {
        logger.remove(transport);
      }
    });

  }

  if (errorLogger) {
    const transports = errorLogger.transports;
    transports.forEach(transport => {
      if (transport.name === 'file') {
        errorLogger.remove(transport);
      }
    });
  }
};
