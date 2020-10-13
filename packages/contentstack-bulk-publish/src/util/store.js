const fs = require('fs')
const path = require('path')
const config = require('../config/index.js')
const chalk = require('chalk')

function save(key, data) {
  let bulkPublish = (config) ? config : {}
  let filePath = path.join(process.cwd(), config.json)
  bulkPublish[key] = data
  fs.writeFile(filePath, JSON.stringify(bulkPublish), (error) => {
    if(error) {
      console.log(chalk.red(error))
      return;
    }
    console.log(chalk.green(`Configuration file has been successfully created at ${filePath}`))
  })
}

function get(key, filePath) {
  try {
    const missing = []
    const bulkPublish = require(filePath)
    // const bulkPublish = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    if (!bulkPublish) {
      throw new Error('Unable to read config file')
    }
    if (!bulkPublish.alias){
      missing.push('alias')
    }
    if (missing.length > 0){ 
      throw new Error(`Please update the following values in the config file: ${missing.join(', ')}`)
    }
    if (key === 'revert')
      bulkPublish[key] = {}
    if (key === 'Unpublish' || key === 'cross_env_publish')
      bulkPublish[key] = handleFilterObj(bulkPublish[key])
    if (!bulkPublish[key] || Object.keys(bulkPublish[key]).length === 0) {
      if (key !== 'revert') {
        throw new Error(`Config is empty for ${key} case`)
      }
    }
    return {
      alias: bulkPublish.alias,
      ...bulkPublish[key]
    }
  } catch(error) {
    if(error.code === 'ENOENT' || error.code === 'MODULE_NOT_FOUND')
      throw new Error('The given config file was not found')
    throw error
  }
}

function updateMissing(key, flags) {
  let savedConfig
  try {
    savedConfig = get(key, path.resolve(flags.config))
  } catch(error) {
    throw error
  }
  Object.keys(savedConfig).forEach(element => {
    if (flags[element] === undefined) {
      console.log(`Using ${element} from config file`)
      flags[element] = savedConfig[element]
    }
  })
  if (flags.publishAllContentTypes)
    delete savedConfig.contentTypes
  console.log('\n')
  return flags
}

// a fix for handling filter object in Unpublish and cross publish cases
// in the config file
// because both unpublish and cross-publish commands build the filter object
// internally, and in the original bulk-publish script the filter object was
// mentioned in the config file itself
function handleFilterObj(config) {
  config.environment = config.filter.environment
  config.contentType = config.filter.content_type_uid
  config.locale = config.filter.locale
  config.f_types = config.filter.type // adding f_types to differentiate the types specified in the config.js, and the types defined internally in Unpublish and Cross Publish
  delete config.filter
  return config
}

module.exports = {
  save: save,
  get: get,
  updateMissing: updateMissing,
}
