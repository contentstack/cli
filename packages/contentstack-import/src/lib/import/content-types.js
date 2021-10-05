/* eslint-disable no-console */
/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */
let mkdirp = require('mkdirp')
let fs = require('fs')
let path = require('path')
let _ = require('lodash')
let Promise = require('bluebird')
let chalk = require('chalk')

let helper = require('../util/fs')
let util = require('../util')
let {addlogs} = require('../util/log')
let supress = require('../util/extensionsUidReplace')
let sdkInstance = require('../util/contentstack-management-sdk')

let config = require('../../config/default')
let reqConcurrency = config.concurrency
let requestLimit = config.rateLimit
let contentTypeConfig = config.modules.content_types
let globalFieldConfig = config.modules.globalfields
let globalFieldsFolderPath
let contentTypesFolderPath
let mapperFolderPath
let globalFieldMapperFolderPath
let globalFieldUpdateFile
let globalFieldPendingPath
let skipFiles = ['__master.json', '__priority.json', 'schema.json', '.DS_Store']
let fileNames
let field_rules_ct = []
let client
let stack = {}

function importContentTypes() {
  this.contentTypes = []
  this.schemaTemplate = require('../util/schemaTemplate')
  this.requestOptions = {
    json: {},
  }
}

importContentTypes.prototype = {
  start: function (credentialConfig) {
    addlogs(config, 'Migrating contenttypes', 'success')
    let self = this
    config = credentialConfig
    client = sdkInstance.Client(config)
    stack = client.stack({api_key: config.target_stack, management_token: config.management_token})
    globalFieldsFolderPath = path.resolve(config.data, globalFieldConfig.dirName)
    contentTypesFolderPath = path.resolve(config.data, contentTypeConfig.dirName)
    mapperFolderPath = path.join(config.data, 'mapper', 'content_types')
    globalFieldMapperFolderPath =  helper.readFile(path.join(config.data, 'mapper', 'global_fields', 'success.json'))
    globalFieldPendingPath =  helper.readFile(path.join(config.data, 'mapper', 'global_fields', 'pending_global_fields.js'))
    globalFieldUpdateFile =  path.join(config.data, 'mapper', 'global_fields', 'success.json')
    fileNames = fs.readdirSync(path.join(contentTypesFolderPath))
    self.globalfields = helper.readFile(path.resolve(globalFieldsFolderPath, globalFieldConfig.fileName))
    for (let index in fileNames) {
      if (skipFiles.indexOf(fileNames[index]) === -1) {
        self.contentTypes.push(helper.readFile(path.join(contentTypesFolderPath, fileNames[index])))
      }
    }

    self.contentTypeUids = _.map(self.contentTypes, 'uid')
    self.createdContentTypeUids = []
    if (!fs.existsSync(mapperFolderPath)) {
      mkdirp.sync(mapperFolderPath)
    }
    // avoid re-creating content types that already exists in the stack
    if (fs.existsSync(path.join(mapperFolderPath, 'success.json'))) {
      self.createdContentTypeUids = helper.readFile(path.join(mapperFolderPath, 'success.json')) || []
    }
    self.contentTypeUids = _.difference(self.contentTypeUids, self.createdContentTypeUids)
    // remove contet types, already created
    _.remove(this.contentTypes, function (contentType) {
      return self.contentTypeUids.indexOf(contentType.uid) === -1
    })
    return new Promise(function (resolve, reject) {
      return Promise.map(self.contentTypeUids, function (contentTypeUid) {
        return self.seedContentTypes(contentTypeUid).then(function () {

        }).catch(function (error) {
          return reject(error)
        })
      }, {
        // seed 3 content types at a time
        concurrency: reqConcurrency,
      }).then(function () {
        let batches = []
        let lenObj = self.contentTypes
        // var a = Math.round(2.60);
        for (let i = 0; i < lenObj.length; i += Math.round(requestLimit / 3)) {
          batches.push(lenObj.slice(i, i + Math.round(requestLimit / 3)))
        }

        return Promise.map(batches, async function (batch) {
          return Promise.map(batch, async function (contentType) {
            await self.updateContentTypes(contentType)
            addlogs(config, contentType.uid + ' was updated successfully!', 'success')
          },
          {
            concurrency: reqConcurrency,
          }).then(function () {
          }).catch(e => {
            console.log('Something went wrong while migrating content type batch', e)
          })
        }, {
          concurrency: reqConcurrency,
        }).then(function () {
          // eslint-disable-next-line quotes
          if (field_rules_ct.length > 0) {
            fs.writeFile(contentTypesFolderPath + '/field_rules_uid.json', JSON.stringify(field_rules_ct), function (err) {
              if (err) throw err
            })
          }
        
         if(globalFieldPendingPath && globalFieldPendingPath.length !== 0) {
          return self.updateGlobalfields().then(function () {
            addlogs(config, chalk.green('Content types have been imported successfully!'), 'success')
            return resolve()
          }).catch((error) => {
            addlogs(config, chalk.green('Error in GlobalFields'), 'success')
            return reject(error)
          })
         }  else {
            addlogs(config, chalk.green('Content types have been imported successfully!'), 'success')
            return resolve()
         } 
        }).catch(error => {
          return reject(error)
        }) 
      }).catch(error => {
        return reject(error)
      })
    })
  },
  seedContentTypes: function (uid) {
    let self = this
    return new Promise(function (resolve, reject) {
      let body = _.cloneDeep(self.schemaTemplate)
      body.content_type.uid = uid
      body.content_type.title = uid
      let requestObject = _.cloneDeep(self.requestOptions)
      requestObject.json = body
      return stack.contentType().create(requestObject.json)
      .then(() => {
        return resolve()
      })
      .catch(function (err) {
        let error = JSON.parse(err.message)
        if (error.error_code === 115 && (error.errors.uid || error.errors.title)) {
          // content type uid already exists
          return resolve()
        }
        return reject(error)
      })
    })
  },
  updateContentTypes: function (contentType) {
    let self = this
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        let requestObject = _.cloneDeep(self.requestOptions)
        if (contentType.field_rules) {
          field_rules_ct.push(contentType.uid)
          delete contentType.field_rules
        }
        supress(contentType.schema)
        requestObject.json.content_type = contentType
        let contentTypeResponse = stack.contentType(contentType.uid)
        Object.assign(contentTypeResponse, _.cloneDeep(contentType))
        contentTypeResponse.update()
        .then(UpdatedcontentType => {
          return resolve()
        }).catch(err => {
          addlogs(config, err, 'error')
          return reject(err)
        })
      }, 1000)
    })
  },

  updateGlobalfields: function () {
    let self = this
    return new Promise(function (resolve, reject) {
      // eslint-disable-next-line no-undef
      return Promise.map(globalFieldPendingPath, function (globalfield) {
        let Obj = _.find(self.globalfields, {uid: globalfield})
        let globalFieldObj = stack.globalField(globalfield)
        Object.assign(globalFieldObj, _.cloneDeep(Obj))
        return globalFieldObj.update()
        .then(globalFieldResponse => {
          let updateObjpos = _.findIndex(globalFieldMapperFolderPath, function (successobj) {
            let global_field_uid = globalFieldResponse.uid
            return global_field_uid === successobj
          })
          globalFieldMapperFolderPath.splice(updateObjpos, 1, Obj)
          helper.writeFile(globalFieldUpdateFile, globalFieldMapperFolderPath)
        }).catch(function (err) {
          let error = JSON.parse(err.message)
          // eslint-disable-next-line no-console
          addlogs(config, chalk.red('Global Field failed to update ' + JSON.stringify(error.errors)), 'error')
        })
      }, {
        concurrency: reqConcurrency,
      }).then(function () {
        return resolve()
      }).catch(function (error) {
        // failed to update modified schemas back to their original form
        return reject(error)
      })
    })
  },
}

module.exports = new importContentTypes()
