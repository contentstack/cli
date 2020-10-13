/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

let ncp = require('ncp')
let Bluebird = require('bluebird')
let fs = require('fs')
let path = require('path')
const chalk = require('chalk')

let login = require('./lib/util/login')
let util = require('./lib/util/index')
let {addlogs} = require('./lib/util/log')

exports.initial = function (configData) { 

  let config = util.initialization(configData)
  config.oldPath = config.data
  if (config && config !== undefined) {
    login(config)
    .then(function () {
      if (fs.existsSync(config.data)) {
      let migrationBackupDirPath = path.join(process.cwd(), '_backup_' + Math.floor((Math.random() * 1000)))
      return createBackup(migrationBackupDirPath, config).then((basePath) => {
        config.data = basePath
        return util.sanitizeStack(config)
      }).catch(e=>{
        console.error(e)
        process.exit(1)
      })
     .then(() => {
        let types = config.modules.types    
        if (config.moduleName && config.moduleName !== undefined) {
          singleExport(config.moduleName, types, config)
        } else {
          allExport(config, types)
        }
      }).catch(e=>{
        console.error(e)
        process.exit(1)
      })
    } else {    
      let filename = path.basename(config.data)
      addlogs(config, chalk.red(filename + " Folder does not Exist"), 'error')
      return
    }
    }).catch(error => {      
      return
    })
  }
}


let singleExport = (moduleName, types, config) => {
  if (types.indexOf(moduleName) > -1) {
    let exportedModule = require('./lib/import/' + moduleName)
    exportedModule.start(config).then(function () {
      addlogs(config, moduleName + ' imported successfully!', 'success')
    }).catch(function (error) {
      addlogs(config, 'Failed to migrate ' + moduleName, 'error')
      addlogs(config, error, 'error')
    })
  } else {
    addlogs(config, 'Please provide valid module name.', 'error')
  }
}

let allExport = async (config, types) => {
  let counter = 0
  Bluebird.map(types, function (type) {
    if (config.preserveStackVersion) {
      let exportedModule = require('./lib/import/' + types[counter])
      counter++
      return exportedModule.start(config)
    } else if(!config.preserveStackVersion && type !== 'stack')  {
      let exportedModule = require('./lib/import/' + types[counter])
      counter++
      return exportedModule.start(config)
    } else {
      counter++
    }
  }, {
    concurrency: 1
  }).then(function () {
    addlogs(config, chalk.green('Stack: ' + config.target_stack + ' has been imported succesfully!'), 'success')
    addlogs(config, 'The log for this is stored at' + config.oldPath + '/logs/import', 'success')
  }).catch(function (error) {    
    addlogs(config, chalk.red('Failed to migrate stack: ' + config.target_stack + '. Please check error logs for more info'), 'error')
    addlogs(config, error, 'error')
  })
}


  function createBackup (backupDirPath, config) {
    return new Promise((resolve, reject) => {
      if (config.hasOwnProperty('useBackedupDir') && fs.existsSync(path.join(__dirname, config.useBackedupDir))) {
        return resolve(config.useBackedupDir)
      }
      ncp.limit = config.backupConcurrency || 16
      if (path.isAbsolute(config.data)) {
        return ncp(config.data, backupDirPath, (error) => {
          if (error) {
            return reject(error)
          }
          return resolve(backupDirPath)
        })
      } else {
        ncp(path.join(__dirname, config.data), backupDirPath, (error) => {
          if (error) {
            return reject(error)
          }
          return resolve(backupDirPath)
        })
      }
    })
  }
