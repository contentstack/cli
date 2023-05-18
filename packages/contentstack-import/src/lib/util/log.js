/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

var winston = require('winston');
var path = require('path');
var mkdirp = require('mkdirp');
var slice = Array.prototype.slice;

const ansiRegexPattern = [
  '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
  '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))',
].join('|');

function returnString(args) {
  var returnStr = '';
  if (args && args.length) {
    returnStr = args
      .map(function (item) {
        if (item && typeof item === 'object') {
          try {
            return JSON.stringify(item).replace(/authtoken\":\"blt................/g, 'authtoken":"blt....');
          } catch (error) {
            return item.message;
          }
        }
        return item;
      })
      .join('  ')
      .trim();
  }
  returnStr = returnStr.replace(new RegExp(ansiRegexPattern, 'g'), '').trim();
  return returnStr;
}

var myCustomLevels = {
  levels: {
    warn: 1,
    info: 2,
    debug: 3,
  },
  colors: {
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

// removed logfileName from arguments
function init(_logPath) {
  if (!logger || !errorLogger) {
    var logsDir = path.resolve(_logPath, 'logs', 'import');
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
          format: winston.format.combine(winston.format.colorize({ all: true, colors:{ error: 'red'} }), winston.format.simple()),
        }),
      ],
      levels: { error: 0 },
    });
  }

  return {
    log: function () {
      var args = slice.call(arguments);
      var logString = returnString(args);
      if (logString) {
        logger.log('info', logString);
      }
    },
    warn: function () {
      var args = slice.call(arguments);
      var logString = returnString(args);
      if (logString) {
        logger.log('warn', logString);
      }
    },
    error: function () {
      var args = slice.call(arguments);
      var logString = returnString(args);
      if (logString) {
        errorLogger.log('error', logString);
      }
    },
    debug: function () {
      var args = slice.call(arguments);
      var logString = returnString(args);
      if (logString) {
        logger.log('debug', logString);
      }
    },
  };
}

exports.addlogs = async (config, message, type) => {
  var configLogPath = config.source_stack && config.target_stack ? config.data : config.oldPath;
  // ignoring the type argument, as we are not using it to create a logfile anymore
  if (type !== 'error') {
    // removed type argument from init method
    init(configLogPath).log(message);
  } else {
    init(configLogPath).error(message);
  }
};
