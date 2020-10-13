const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const {getLogsDirPath} = require('../util/logger.js')

const logsDir = getLogsDirPath();

/* eslint-disable consistent-return */

function doesFileExistInLogsDirectory(filename) {
  const files = fs.readdirSync(logsDir);
  if (files.indexOf(filename) !== -1) {
    return true;
  }
  console.log(chalk.red(`Error: ${filename} doesn't exist in logs directory at ${logsDir}`));
}

function validateFile(filename, types) {
  if (doesFileExistInLogsDirectory(filename)) {
    const [timestamp, logType, status] = filename.split('.');

    if (!timestamp || !logType || !status) {
      console.log(chalk.red(`Error: ${filename} is not a valid log file or the log name has been changed`));
      return false;
    }

    if (status !== 'success' && status !== 'error') {
      console.log(chalk.red(`Error: ${filename} is not a valid log file or the log name has been changed`));
      return false;
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

            if(status !=='error') {
              console.log(chalk.red('Error: The given log file is not an error log file.'));
              return false;
            }

            if(types.indexOf(logType) === -1) {
              console.log(chalk.red('Error: For this operation, the log file should be of the following types'));
              types.forEach((type) => { console.log(chalk.red("\t" + type)); });
              return false;
            }
          }
          return true;
        default:
          console.log(chalk.red(`Error: ${filename} is not a valid log file or the log name has been changed`));
          return false;
      }
    }
  }
}

module.exports = {
  validateFile,
};
