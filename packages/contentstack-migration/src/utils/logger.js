'use strict';

const { createLogger, format, transports } = require('winston'),
  { resolve, join } = require('path'),
  { slice } = Array.prototype,
  { stringify } = JSON,

  { combine, timestamp, label, printf, colorize } = format,

  // FS helper
  { makeDir } = require('./fs-helper'),

  { NODE_ENV } = process.env;

function getString(args) {
  let str = '';
  if (args && args.length) {
    str = args.map(item =>
      item && typeof item === 'object'
        ? stringify(item)
        : item
    )
      .join(' ')
      .trim();
  }
  return str;
}

const customFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label} ${level}: ${message}]`;
});

function init(logFileName) {
  const logsDir = resolve('logs');
  // Create dir if does not exist
  makeDir(logsDir);

  const logPath = join(logsDir, logFileName + '.log'),
    // transports = [new (transports.File)({
    //   filename: logPath,
    //   maxFiles: 20,
    //   maxsize: 1000000,
    //   tailable: true,
    //   json: true
    // })];
    logger = createLogger({
      format: combine(
        colorize(),
        label({ label: 'Migration' }),
        timestamp(),
        customFormat
      ),
      transports: [
        new transports.File({ filename: logPath }),
        new transports.Console()
      ]
    });

  let args, logString;

  return {
    log: function () {
      args = slice.call(arguments);
      logString = getString(args);
      logString && logger.log('info', logString);
    },
    warn: function () {
      args = slice.call(arguments);
      logString = getString(args);
      logString && logger.log('warn', logString);
    },
    error: function () {
      args = slice.call(arguments);
      logString = getString(args);
      logString && logger.log('error', logString);
    },
    debug: function () {
      args = slice.call(arguments);
      logString = getString(args);
      logString && logger.log('debug', logString);
    }
  }
}

exports.success = init('success').log;
if (NODE_ENV === 'test') {
  exports.error = init('warn').warn;
} else {
  exports.error = init('error').error;
}
exports.warn = init('warn').warn;