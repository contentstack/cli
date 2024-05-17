'use strict';

const { createLogger, format, transports } = require('winston');
const { resolve, join } = require('path');
const { slice } = Array.prototype;
const { stringify } = JSON;
const { pathValidator, sanitizePath } = require('@contentstack/cli-utilities');

const { combine, label, printf, colorize } = format;

// FS helper
const { makeDir } = require('./fs-helper');

const { NODE_ENV } = process.env;

function getString(args) {
  let str = '';
  if (args && args.length > 0) {
    str = args
      .map((item) => (item && typeof item === 'object' ? stringify(item) : item))
      .join(' ')
      .trim();
  }
  return str;
}

const customFormat = printf(({ level, message }) => {
  return `${level}: ${message}`;
});

function init(logFileName) {
  const logsDir = resolve('logs');
  // Create dir if does not exist
  makeDir(logsDir);

  const logPath = pathValidator(join(sanitizePath(logsDir), sanitizePath(logFileName) + '.log'));
  const logger = createLogger({
    format: combine(colorize(), label({ label: 'Migration' }), customFormat),
    transports: [new transports.File({ filename: logPath })],
  });

  let args;
  let logString;

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
      // args = slice.call(arguments);
      // logString = getString(args);
      // logString && logger.log('error', logString);
    },
    debug: function () {
      args = slice.call(arguments);
      logString = getString(args);
      logString && logger.log('debug', logString);
    },
  };
}

exports.success = init('success').log;
if (NODE_ENV === 'test') {
  exports.error = init('warn').warn;
} else {
  exports.error = init('error').error;
}
exports.warn = init('warn').warn;
