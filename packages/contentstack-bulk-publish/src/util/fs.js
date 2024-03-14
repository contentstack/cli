const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const { getLogsDirPath } = require('../util/logger.js');

const logsDir = getLogsDirPath();

/* eslint-disable consistent-return */

function doesFileExistInLogsDirectory(filename) {
  const files = fs.readdirSync(logsDir);
  if (files.indexOf(filename) !== -1) {
    return true;
  }
  throw new Error(`${filename} doesn't exist in logs directory at ${logsDir}`);
}

function validateFile(filename, types) {
  if (doesFileExistInLogsDirectory(filename)) {
    const [timestamp, logType, status] = filename.split('.');

    if (!timestamp || !logType || !status) {
      throw new Error(`${filename} is not a valid log file or the log name has been changed`);
    }

    if (status !== 'success' && status !== 'error') {
      throw new Error(`${filename} is not a valid log file or the log name has been changed`);
    }

    if (logType) {
      switch (logType) {
        case 'bulk-add-fields':
        case 'add-fields':
        case 'bulk-cross-publish':
        case 'cross-publish':
        case 'bulk-nonlocalized-field-changes':
        case 'nonlocalized-field-changes':
        case 'bulk-publish-assets':
        case 'publish-assets':
        case 'bulk-publish-edits':
        case 'publish-edits':
        case 'bulk-publish-entries':
        case 'publish-entries':
        case 'publish-unpublished-env':
        case 'bulk-publish-draft':
        case 'publish-draft':
        case 'bulk-unpublish':
        case 'unpublish':
        case 'revert':
          if (types && types.length > 0) {
            if (status !== 'error') {
              throw new Error('Error: The given log file is not an error log file.');
            }

            if (types.indexOf(logType) === -1) {
              let validTypes = '' + types.join(', ');
              throw new Error(`For this operation, the log file should be of the following types: ${validTypes}`);
            }
          }
          return true;
        default:
          throw new Error(`${filename} is not a valid log file or the log name has been changed`);
      }
    }
  }
}

module.exports = {
  validateFile,
};
