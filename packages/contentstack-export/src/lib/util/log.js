/*!
* Contentstack Export
* Copyright (c) 2019 Contentstack LLC
* MIT Licensed
*/

var winston = require('winston')
var path = require('path')
var mkdirp = require('mkdirp')
var slice = Array.prototype.slice

function returnString(args) {
  var returnStr = ''
  if (args && args.length) {
    returnStr = args.map(function (item) {
      if (item && typeof (item) === 'object') {
        return JSON.stringify(item)
      }
      return item
    }).join('  ').trim()
  }
  return returnStr
}

var myCustomLevels = {
  levels: {
    error: 0,
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
}

let logger
function init(_logPath, logfileName) {
  if (!logger) {
    var logsDir = path.resolve(_logPath, 'logs', 'export')
    // Create dir if doesn't already exist
    mkdirp.sync(logsDir)
    var logPath = path.join(logsDir, logfileName + '.log')

    var transports = [new (winston.transports.File)({
      filename: logPath,
      maxFiles: 20,
      maxsize: 1000000,
      tailable: true,
      json: true,
    })]

    transports.push(new (winston.transports.Console)())

    logger = new (winston.Logger)({
      transports: transports,
      levels: myCustomLevels.levels
    })
  }

  return {
    log: function () {
      var args = slice.call(arguments)
      var logString = returnString(args)
      if (logString) {
        logger.log('info', logString)
      }
    },
    warn: function () {
      var args = slice.call(arguments)
      var logString = returnString(args)
      if (logString) {
        logger.log('warn', logString)
      }
    },
    error: function (args) {
      var args = slice.call(arguments)
      var logString = returnString(args)
      if (logString) {
        logger.log('error', logString)
      }
    },
    debug: function () {
      // var args = slice.call(arguments)
      var logString = returnString(args)
      if (logString) {
        logger.log('debug', logString)
      }
    },
  }
}

exports.addlogs = async (config, message, type) => {
  if (type !== 'error') {
    init(config.data, type).log(message)
  } else {
    init(config.data, type).error(message)
  }
}

exports.unlinkFileLogger = () => {
  if (logger) {
    const fileLogger = logger.transports.file
    logger.remove(fileLogger)
  }
}