/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

var winston = require('winston');
var path = require('path');
var mkdirp = require('mkdirp');
var slice = Array.prototype.slice;

function returnString (args) {
  var returnStr = '';
  if (args && args.length) {
    returnStr = args.map(function (item) {
      if (item && typeof (item) === 'object') {
        return JSON.stringify(item);
      }
      return item;
    }).join('  ').trim();
  }
  return returnStr;
}

var myCustomLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  },
  colors: {
    info: 'blue',
    debug: 'green',
    warn: 'yellow',
    error: 'red'
  }
};

let logger
let successTransport
let errorTransport
let debugTransport

// removed logfileName from arguments
function init(_logPath) {
  if (!logger) {
    var logsDir = path.resolve(_logPath, 'logs', 'import')
    // Create dir if doesn't already exist
    mkdirp.sync(logsDir)

    successTransport = {
      name: 'success-file',
      filename: path.join(logsDir, 'success.log'),
      maxFiles: 20,
      maxsize: 1000000,
      tailable: true,
      json: true,
      level: 'info',
    }

    errorTransport = {
      name: 'error-file',
      filename: path.join(logsDir, 'error.log'),
      maxFiles: 20,
      maxsize: 1000000,
      tailable: true,
      json: true,
      level: 'error',
    }

    debugTransport = {
      name: 'debug-file',
      filename: path.join(logsDir, 'debug.log'),
      maxFiles: 20,
      maxsize: 1000000,
      tailable: true,
      json: true,
      level: 'debug',
    }

    logger = new (winston.Logger)({
      levels: myCustomLevels.levels
    });
  }

  return {
    log: function () {
      var args = slice.call(arguments);
      var logString = returnString(args);
      logger.clear()
      logger
      .add(winston.transports.File, successTransport)
      .add(winston.transports.Console)
      if (logString) {
        logger.log('info', logString);
      }
    },
    warn: function () {
      var args = slice.call(arguments);
      var logString = returnString(args);
      logger.clear()
      logger
      .add(winston.transports.File, successTransport)
      .add(winston.transports.Console)
      if (logString) {
        logger.log('warn', logString);
      }
    },
    error: function () {
      var args = slice.call(arguments);
      var logString = returnString(args);
      logger.clear()
      logger
      .add(winston.transports.File, errorTransport)
      .add(winston.transports.Console)
      if (logString) {
        logger.log('error', logString);
      }
    },
    debug: function () {
      var args = slice.call(arguments);
      var logString = returnString(args);
      logger.clear()
      logger
      .add(winston.transports.File, debugTransport)
      .add(winston.transports.Console)
      if (logString) {
        logger.log('debug', logString);
      }
    }
  };
}

exports.addlogs = async (config, message, type) => {
  var configLogPath
  config.source_stack && config.target_stack ? configLogPath = config.data : configLogPath = config.oldPath
  // ignoring the type argument, as we are not using it to create a logfile anymore
  if (type !== 'error') {
    // removed type argument from init method
    init(configLogPath).log(message)
  } else {
    init(configLogPath).error(message)
  }
}
