const fs = require('fs');
const path = require('path');
const config = require('../config/index.js');
const chalk = require('chalk');
const {pathValidator} = require('@contentstack/cli-utilities')

function save(key, data) {
  let bulkPublish = config ? config : {};
  let filePath = pathValidator(config.json);
  bulkPublish[key] = data;
  fs.writeFile(filePath, JSON.stringify(bulkPublish), (error) => {
    if (error) {
      console.log(chalk.red(error));
      return;
    }
    console.log(chalk.green(`Configuration file has been successfully created at ${filePath}`));
  });
}

function get(key, filePath) {
  try {
    const missing = [];
    const bulkPublish = require(filePath);
    if (!bulkPublish) {
      throw new Error('Unable to read config file');
    }
    if (!bulkPublish.alias) {
      missing.push('alias');
    }
    if (missing.length > 0) {
      throw new Error(`Please update the following values in the config file: ${missing.join(', ')}`);
    }
    if (key === 'revert') bulkPublish[key] = {};
    if (key === 'Unpublish' || key === 'cross_env_publish') bulkPublish[key] = handleFilterObj(bulkPublish[key]);
    if (!bulkPublish[key] || Object.keys(bulkPublish[key]).length === 0) {
      if (key !== 'revert') {
        throw new Error(`Config is empty for ${key} case`);
      }
    }
    return {
      alias: bulkPublish.alias,
      ...bulkPublish[key],
    };
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'MODULE_NOT_FOUND')
      throw new Error('The given config file was not found');
    throw error;
  }
}

function updateMissing(key, flags) {
  let savedConfig;
  savedConfig = get(key, pathValidator(flags.config));
  Object.keys(savedConfig).forEach((element) => {
    if (flags[element] === undefined) {
      console.log(`Using ${element} from config file`);
      flags[element] = savedConfig[element];
    }
  });
  if (flags.publishAllContentTypes) delete savedConfig.contentTypes;
  console.log('\n');
  return flags;
}

// a fix for handling filter object in Unpublish and cross publish cases
// in the config file
// because both unpublish and cross-publish commands build the filter object
// internally, and in the original bulk-publish script the filter object was
// mentioned in the config file itself
function handleFilterObj(config1) {
  config1.environment = config1.filter.environment;
  config1.contentType = config1.filter.content_type_uid;
  config1.locale = config1.filter.locale;
  config1.f_types = config1.filter.type; // adding f_types to differentiate the types specified in the config.js, and the types defined internally in Unpublish and Cross Publish
  delete config1.filter;
  return config1;
}

module.exports = {
  save: save,
  get: get,
  updateMissing: updateMissing,
};
