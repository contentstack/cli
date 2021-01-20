/* eslint-disable no-redeclare */
var util = require('./lib/util')
var login = require('./lib/util/login')
var { addlogs } = require('./lib/util/log')
const chalk = require('chalk')
let path = require('path')
let _ = require('lodash')
const { config } = require('cli-ux')
// const { reject } = require('async')

exports.initial = async function (config) {
  return new Promise(function (resolve, reject) {
    config = util.buildAppConfig(config)
    util.validateConfig(config)
    exports.getConfig = function () {
      return config
    }
   // try {
    login.login(config).then(async function () {
      var types = config.modules.types
      if (config.moduleName && config.moduleName !== undefined) {
        singleExport(config.moduleName, types, config)
      } else {
        allExport(config, types).then(() => {
        return resolve()
        })
      }
    }).catch(error => {
      if (error.errors.api_key) {
        addlogs(config, chalk.red('Stack Api key ' + error.errors.api_key[0], 'Please enter valid Key', 'error'))
        addlogs(config, 'The log for this is stored at ' + config.data + '/export/logs', 'success')
      } else {
        let objKey = Object.keys(error.errors)
        addlogs(config, chalk.red('Stack fail to export, ' + objKey + "" + error.errors[objKey][0]), 'error')
      }
    }) 
  })
  // } catch(error) {
  //   console.log("Error me Huuuuu");
  // } 
  // })
}

var singleExport = (moduleName, types, config) => {
  var types = config.modules.types
  if (types.indexOf(moduleName) > -1) {
    var exportedModule = require('./lib/export/' + moduleName)
    exportedModule.start(config).then(function () {
      addlogs(config, moduleName + ' was exported successfully!', 'success')
      addlogs(config, 'The log for this is stored at ' + path.join(config.data, 'logs', 'export'), 'success')
    }).catch(function (error) {
      addlogs(config, 'Failed to migrate ' + moduleName, 'error')
      addlogs(config, error, 'error')
      addlogs(config, 'The log for this is stored at ' + path.join(config.data, 'logs', 'export'), 'error')
    })
  } else {
    addlogs(config, 'Please provide valid module name.', 'error')
  }
}

var allExport = async (config, types) => {
return new Promise(async (resolve, reject) => {
  try {
    for (let i = 0; i < types.length; i++) {
      let type = types[i]
      var exportedModule = require('./lib/export/' + type)
      await exportedModule.start(config).then(result => {;
        if (type === 'stack') {
          let master_locale = { master_locale: { code: result.master_locale } }
          config = _.merge(config, master_locale)
        }
        return
      })
    }
    addlogs(config, chalk.green('Stack: ' + config.source_stack + ' has been exported succesfully!'), 'success')
    addlogs(config, 'The log for this is stored at ' + path.join(config.data, 'logs', 'export'), 'success')
    return resolve()
  } catch (error) {
    addlogs(config, chalk.red('Failed to migrate stack: ' + config.source_stack + '. Please check error logs for more info'), 'error')
    addlogs(config, chalk.red(error.errorMessage), 'error')
    addlogs(config, 'The log for this is stored at ' + path.join(config.data, 'logs', 'export'), 'error')
    return reject()
  }
})
}
