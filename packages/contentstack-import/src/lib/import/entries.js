/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */
const Promise = require('bluebird')
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const mkdirp = require('mkdirp')
const chalk = require('chalk')

const request = require('../util/request')
const helper = require('../util/fs')
const { addlogs } = require('../util/log')
const lookupReplaceAssets = require('../util/lookupReplaceAssets')
const lookupReplaceEntries = require('../util/lookupReplaceEntries')
const supress = require('../util/supress-mandatory-fields')
const extension_supress = require('../util/extensionsUidReplace')
const util = require('../util')
let config = util.getConfig()
const stack = require('../util/contentstack-management-sdk')
const { add } = require('lodash')
let client

let reqConcurrency = config.concurrency
let eConfig = config.modules.entries
let ePath = path.resolve(config.data, eConfig.dirName)
let ctPath = path.resolve(config.data, config.modules.content_types.dirName)
let lPath = path.resolve(config.data, config.modules.locales.dirName, config.modules.locales.fileName)

let mappedAssetUidPath
let mappedAssetUrlPath
let entryMapperPath
let environmentPath
let entryUidMapperPath
let uniqueUidMapperPath
let modifiedSchemaPath
let createdEntriesWOUidPath
let failedWOPath
let publishEntryUid


let masterLanguage = config.master_locale
let skipFiles = ['__master.json', '__priority.json', 'schema.json']
let entryBatchLimit = config.rateLimit || 10

function importEntries() {
  let self = this
  mappedAssetUidPath = path.resolve(config.data, 'mapper', 'assets', 'uid-mapping.json')
  mappedAssetUrlPath = path.resolve(config.data, 'mapper', 'assets', 'url-mapping.json')

  entryMapperPath = path.resolve(config.data, 'mapper', 'entries')
  environmentPath = path.resolve(config.data, 'environments', 'environments.json')
  mkdirp.sync(entryMapperPath)

  entryUidMapperPath = path.join(entryMapperPath, 'uid-mapping.json')
  uniqueUidMapperPath = path.join(entryMapperPath, 'unique-mapping.json')
  modifiedSchemaPath = path.join(entryMapperPath, 'modified-schemas.json')

  createdEntriesWOUidPath = path.join(entryMapperPath, 'created-entries-wo-uid.json')
  failedWOPath = path.join(entryMapperPath, 'failedWO.json')
  // Object of Schemas, referred to by their content type uid
  this.ctSchemas = {}
  // Array of content type uids, that have reference fields
  this.refSchemas = []
  // Collection of entries, that were not created, as they already exist on Stack
  this.createdEntriesWOUid = []
  // Collection of entry uids, mapped to the language they exist in
  this.uniqueUids = {}
  // Map of old entry uid to new
  this.mappedUids = {}
  // Entries that were created successfully
  this.success = []
  // Entries that failed to get created OR updated
  this.fails = []

  this.languages = helper.readFile(lPath)

  let files = fs.readdirSync(ctPath)

  this.environment = helper.readFile(environmentPath)

  for (let index in files) {
    try {
      if (skipFiles.indexOf(files[index]) === -1) {
        if (files[index] != 'field_rules_uid.json') {
          let schema = require(path.resolve(path.join(ctPath, files[index])))
          self.ctSchemas[schema.uid] = schema
        }
      }
    } catch (error) {
      console.error(error)
      process.exit(0)
    }
  }

  this.mappedAssetUids = helper.readFile(mappedAssetUidPath)
  this.mappedAssetUrls = helper.readFile(mappedAssetUrlPath)

  this.mappedAssetUids = this.mappedAssetUids || {}
  this.mappedAssetUrls = this.mappedAssetUrls || {}

  this.requestOptionTemplate = {
    // /v3/content_types/
    uri: config.host + config.apis.content_types,
    headers: config.headers,
    json: {
      entry: {}
    }
  }
}

importEntries.prototype = {
  /**
     * Start point for entry import
     * @return promise
     */
  start: async function (credentialConfig) {
    let self = this
    config = credentialConfig
    client = stack.Client(config)
    addlogs(config, 'Migrating entry', 'success')
    return new Promise(async function (resolve, reject) {
      let langs = [masterLanguage.code]
      for (let i in self.languages) {
        langs.push(self.languages[i].code)
      }

      return self.supressFields().then(async function () {
        let counter = 0
        return Promise.map(langs, async function () {
          let lang = langs[counter]
          if ((config.hasOwnProperty('onlylocales') && config.onlylocales.indexOf(lang) !== -1) || !
            config.hasOwnProperty('onlylocales')) {
            await self.createEntries(lang)
            // .then(async function () {
            await self.getCreatedEntriesWOUid()
            // .then(async function () {
            await self.repostEntries(lang)
            // .then(function () {
            addlogs(config, 'Successfully imported \'' + lang + '\' entries!', 'success')
            counter++
            // })
            // })
            // })
          } else {
            addlogs(config, lang + ' has not been configured for import, thus skipping it', 'success')
            counter++
          }
        }, {
          concurrency: 1
        }).then(async function () {
          await self.unSupressFields()
          //.then(function () {
          await self.removeBuggedEntries()
          //.then(async function () {
          let ct_field_visibility_uid = helper.readFile(path.join(ctPath + '/field_rules_uid.json'))
          let ct_files = fs.readdirSync(ctPath)
          if (ct_field_visibility_uid && ct_field_visibility_uid != 'undefined') {
            for (let index = 0; index < ct_field_visibility_uid.length; index++) {
              if (ct_files.indexOf(ct_field_visibility_uid[index] + '.json') > -1) {
                let schema = require(path.resolve(ctPath, ct_field_visibility_uid[index]))
                await self.field_rules_update(schema)
              }
            }
          }
          addlogs(config, chalk.green('Entries have been imported successfully!'), 'success')
          if (config.entriesPublish) {
            return self.publish(langs).then(function () {
              addlogs(config, chalk.green('All the entries have been published successfully'), 'success')
              return resolve()
            }).catch(errors => {
              return reject(errors)
            })
          }
          return resolve()
        })
      }).catch(function (error) {
        console.log("dbcdbchdchd")
        return reject(error)
      })
    }).catch(error => {
    })
  },

  createEntries: function (lang) {
    let self = this
    return new Promise(async function (resolve, reject) {
      let contentTypeUids = Object.keys(self.ctSchemas)
      if (fs.existsSync(entryUidMapperPath)) {
        self.mappedUids = helper.readFile(entryUidMapperPath)
      }
      self.mappedUids = self.mappedUids || {}
      return Promise.map(contentTypeUids, function (ctUid) {
        let eLangFolderPath = path.join(entryMapperPath, lang)
        let eLogFolderPath = path.join(entryMapperPath, lang, ctUid)
        mkdirp.sync(eLogFolderPath)
        // entry file path
        let eFilePath = path.resolve(ePath, ctUid, lang + '.json')

        // log created/updated entries
        let successEntryLogPath = path.join(eLogFolderPath, 'success.json')
        let failedEntryLogPath = path.join(eLogFolderPath, 'fails.json')
        let createdEntriesPath = path.join(eLogFolderPath, 'created-entries.json')
        let createdEntries = {}
        if (fs.existsSync(createdEntriesPath)) {
          createdEntries = helper.readFile(createdEntriesPath)
          createdEntries = createdEntries || {}
        }
        if (fs.existsSync(eFilePath)) {
          let entries = helper.readFile(eFilePath)
          if (!_.isPlainObject(entries)) {
            addlogs(config, chalk.white('No entries were found for Content type:\'' + ctUid + '\' in \'' + lang +
              '\' language!'), 'success')
            return resolve()
          }
          for (let eUid in entries) {
            // will replace all old asset uid/urls with new ones
            entries[eUid] = lookupReplaceAssets({
              content_type: self.ctSchemas[ctUid],
              entry: entries[eUid]
            }, self.mappedAssetUids, self.mappedAssetUrls, eLangFolderPath)
          }
          let eUids = Object.keys(entries)
          let batches = []

          // Run entry creation in batches of ~16~ entries
          for (let i = 0; i < eUids.length; i += Math.round(entryBatchLimit / 3)) {
            batches.push(eUids.slice(i, i + Math.round(entryBatchLimit / 3)))
          }

          return Promise.map(batches, async function (batch) {
            return Promise.map(batch, async function (eUid) {
              //if entry is already created
              if (createdEntries.hasOwnProperty(eUid)) {
                addlogs(config, ('Skipping ' + JSON.stringify({
                  content_type: ctUid,
                  locale: lang,
                  oldEntryUid: eUid,
                  newEntryUid: createdEntries[eUid]
                }) + ' as it is already created'), 'success')
                self.success[ctUid] = createdEntries[eUid]
                // if its a non-master language, i.e. the entry isn't present in the master language
                if (lang !== masterLanguage) {
                  self.uniqueUids[eUid] = self.uniqueUids[eUid] || {}
                  if (self.uniqueUids[eUid].locales) {
                    self.uniqueUids[eUid].locales.push(lang)
                  } else {
                    self.uniqueUids[eUid].locales = [lang]
                  }
                  self.uniqueUids[eUid].content_type = ctUid
                }
                return
              }
              let requestObject = {
                qs: {
                  locale: lang
                },
                json: {
                  entry: entries[eUid]
                }
              }

              if (self.mappedUids.hasOwnProperty(eUid)) {
                return client.stack({ api_key: config.target_stack, management_token: config.management_token }).contentType(ctUid).entry(self.mappedUids[eUid]).fetch()
                  .then(entryToUpdate => {
                    Object.assign(entryToUpdate, _.cloneDeep(requestObject.json.entry))
                    return entryToUpdate.update({ locale: entryToUpdate.locale }).then(async result => {
                      return
                    }).catch(function (err) {
                      let error = JSON.parse(err.message)
                      if (error.hasOwnProperty('error_code') && error.error_code === 119) {
                        if (error.errors.title) {
                          addlogs(config, 'Entry ' + eUid + ' already exist, skip to avoid creating a duplicate entry', 'error')
                        } else {
                          addlogs(config, chalk.red('Error creating entry due to: ' + JSON.stringify(error)), 'error')
                        }
                        self.createdEntriesWOUid.push({
                          content_type: ctUid,
                          locale: lang,
                          entry: entries[eUid],
                          error: error
                        })
                        helper.writeFile(createdEntriesWOUidPath, self.createdEntriesWOUid)
                        return;
                      }
                      // TODO: if status code: 422, check the reason
                      // 429 for rate limit
                      addlogs(config, chalk.red('Error creating entry', JSON.stringify(error)), 'error')
                      self.fails.push({
                        content_type: ctUid,
                        locale: lang,
                        entry: entries[eUid],
                        error: error
                      })
                    })
                  })
              } else {
                return client.stack({ api_key: config.target_stack, management_token: config.management_token }).contentType(ctUid).entry().create(requestObject.json)
                  .then(async entryResponse => {
                    self.success[ctUid] = self.success[ctUid] || []
                    self.success[ctUid].push(entries[eUid])
                    if (!self.mappedUids.hasOwnProperty(eUid)) {
                      self.mappedUids[eUid] = entryResponse.uid
                      createdEntries = entryResponse
                      // if its a non-master language, i.e. the entry isn't present in the master language
                      if (lang !== masterLanguage) {
                        self.uniqueUids[eUid] = self.uniqueUids[eUid] || {}
                        if (self.uniqueUids[eUid].locales) {
                          self.uniqueUids[eUid].locales.push(lang)
                        } else {
                          self.uniqueUids[eUid].locales = [lang]
                        }
                        self.uniqueUids[eUid].content_type = ctUid
                      }
                    }
                    return;
                  }).catch(function (error) {
                    // let error = JSON.parse(err.message)
                    if (error.hasOwnProperty('error_code') && error.error_code === 119) {
                      if (error.errors.title) {
                        addlogs(config, 'Entry ' + eUid + ' already exist, skip to avoid creating a duplicate entry', 'error')
                      } else {
                        addlogs(config, chalk.red('Error creating entry due to: ' + JSON.stringify(error)), 'error')
                      }
                      self.createdEntriesWOUid.push({
                        content_type: ctUid,
                        locale: lang,
                        entry: entries[eUid],
                        error: error
                      })
                      helper.writeFile(createdEntriesWOUidPath, self.createdEntriesWOUid)
                      return;
                    }
                    // TODO: if status code: 422, check the reason
                    // 429 for rate limit
                    addlogs(config, chalk.red('Error creating entry', JSON.stringify(error)), 'error')
                    self.fails.push({
                      content_type: ctUid,
                      locale: lang,
                      entry: entries[eUid],
                      error: error
                    })
                  })
              }
              // create/update 5 entries at a time
            }, {
              concurrency: reqConcurrency
            }).then(function () {
              helper.writeFile(successEntryLogPath, self.success[ctUid])
              helper.writeFile(failedEntryLogPath, self.fails[ctUid])
              helper.writeFile(entryUidMapperPath, self.mappedUids)
              helper.writeFile(uniqueUidMapperPath, self.uniqueUids)
              helper.writeFile(createdEntriesPath, createdEntries)
            })
            // process one batch at a time
          }, {
            concurrency: reqConcurrency
          }).then(function () {
            addlogs(config, 'Entries created successfully in ' + ctUid + ' content type in ' + lang +
              ' locale!', 'success')
            self.success[ctUid] = []
            self.fails[ctUid] = []

          })
        } else {
          addlogs(config, chalk.red('Unable to find entry file path for ' + ctUid + ' content type!\nThe file \'' +
            eFilePath + '\' does not exist!'), 'error')

        }
      }, {
        concurrency: reqConcurrency
      }).then(function () {
        addlogs(config, chalk.green('Entries created successfully in \'' + lang + '\' language'), 'success')
        return resolve()
      }).catch(function (error) {
        addlogs(config, chalk.red('Failed to create entries in \'' + lang + '\' language'), 'error')
        return reject(error)
      })
    })
  },
  getCreatedEntriesWOUid: function () {
    let self = this
    return new Promise(function (resolve) {
      self.createdEntriesWOUid = helper.readFile(createdEntriesWOUidPath)
      self.failedWO = []
      if (_.isArray(self.createdEntriesWOUid) && self.createdEntriesWOUid.length) {
        return Promise.map(self.createdEntriesWOUid, function (entry) {
          return self.fetchEntry(entry)
        }, {
          concurrency: reqConcurrency
        }).then(function () {
          helper.writeFile(failedWOPath, self.failedWO)
          addlogs(config, 'Mapped entries without mapped uid successfully!', 'success')
          return resolve()
        })
      } else {
        addlogs(config, 'No entries without mapped uid found!', 'success')
        return resolve()
      }
    })
  },
  repostEntries: function (lang) {
    let self = this
    return new Promise(function (resolve, reject) {
      let _mapped_ = helper.readFile(path.join(entryMapperPath, 'uid-mapping.json'))
      if (_.isPlainObject(_mapped_)) {
        self.mappedUids = _.merge(_mapped_, self.mappedUids)
      }
      return Promise.map(self.refSchemas, function (ctUid) {
        let eFolderPath = path.join(entryMapperPath, lang, ctUid)
        let eSuccessFilePath = path.join(eFolderPath, 'success.json')

        if (!fs.existsSync(eSuccessFilePath)) {
          addlogs(config, 'Success file was not found at: ' + eSuccessFilePath, 'success')
          return resolve()
        }

        let entries = helper.readFile(eSuccessFilePath)
        entries = entries || []
        if (entries.length === 0) {
          addlogs(config, 'No entries were created to be updated in \'' + lang + '\' language!', 'success')
          return resolve()
        }

        // Keep track of entries that have their references updated
        let refsUpdatedUids = helper.readFile(path.join(eFolderPath, 'refsUpdatedUids.json'))
        let refsUpdateFailed = helper.readFile(path.join(eFolderPath, 'refsUpdateFailed.json'))
        let schema = self.ctSchemas[ctUid]

        let batches = []
        refsUpdatedUids = refsUpdatedUids || []
        refsUpdateFailed = refsUpdateFailed || []

        // map reference uids @mapper/language/mapped-uids.json
        // map failed reference uids @mapper/language/unmapped-uids.json
        let refUidMapperPath = path.join(entryMapperPath, lang)

        entries = _.map(entries, function (entry) {
          try {
            let uid = entry.uid
            let _entry = lookupReplaceEntries({
              content_type: schema,
              entry: entry
            }, _.clone(self.mappedUids), refUidMapperPath)
            // if there's self references, the uid gets replaced
            _entry.uid = uid
            return _entry
          } catch (error) {
            console.error(error)
          }
        })

        // Run entry creation in batches of ~16~ entries
        for (let i = 0; i < entries.length; i += Math.round(entryBatchLimit / 3)) {
          batches.push(entries.slice(i, i + Math.round(entryBatchLimit / 3)))
        }
        return Promise.map(batches, async function (batch, index) {
          return Promise.map(batch, async function (entry) {
            entry.uid = self.mappedUids[entry.uid]
            if (refsUpdatedUids.indexOf(entry.uid) !== -1) {
              addlogs(config, 'Entry: ' + entry.uid + ' in Content Type: ' + ctUid + ' in lang: ' +
                lang + ' references fields are already updated.', 'success')
              return;
            }

            let requestObject = {
              qs: {
                locale: lang
              },
              json: {
                entry: entry
              }
            }
            let promiseResult = new Promise((resolve, reject) => {

              client.stack({ api_key: config.target_stack, management_token: config.management_token }).contentType(ctUid).entry(entry.uid).fetch(requestObject.qs)
                .then(entryResponse => {
                  Object.assign(entryResponse, _.cloneDeep(entry))
                  delete entryResponse.publish_details
                  return entryResponse.update()
                })
                .then(response => {
                  for (let j = 0; j < entries.length; j++) {
                    if (entries[j].uid === response.uid) {
                      entries[j] = response
                      break;
                    }
                  }
                  refsUpdatedUids.push(response.uid)
                  return resolve()
                })
                .catch(function (error) {
                  addlogs(config, chalk.red('Entry Uid: ' + entry.uid + ' of Content Type: ' + ctUid +
                    ' failed to update in locale: ' + lang), 'error')

                  addlogs(config, error, 'error')
                  refsUpdateFailed.push({
                    content_type: ctUid,
                    entry: entry,
                    locale: lang,
                    error: error
                  })
                  return reject()
                })
            })
            await promiseResult
          }, {
            concurrency: reqConcurrency
          }).then(function () {
            // batch completed successfully
            helper.writeFile(path.join(eFolderPath, 'success.json'), entries)
            helper.writeFile(path.join(eFolderPath, 'refsUpdatedUids.json'), refsUpdatedUids)
            helper.writeFile(path.join(eFolderPath, 'refsUpdateFailed.json'), refsUpdateFailed)
            addlogs(config, 'Completed batch no: ' + (index + 1) + ' successfully!', 'success')

          }).catch(function (error) {
            // error while executing entry in batch
            addlogs(config, chalk.red('Failed at batch no: ' + (index + 1)), 'error')
            throw error
          })
        }, {
          concurrency: reqConcurrency
        }).then(function () {
          // finished updating entries with references
          addlogs(config, 'Imported entries of Content Type: \'' + ctUid + '\' in language: \'' + lang +
            '\' successfully!', 'success')

        }).catch(function (error) {
          // error while updating entries with references
          addlogs(config, chalk.red('Failed while importing entries of Content Type: \'' + ctUid + '\' in language: \'' +
            lang + '\' successfully!'), 'error')
          throw error
        })
      }, {
        concurrency: reqConcurrency
      }).then(function () {
        // completed updating entry references
        addlogs(config, chalk.green('Imported entries in \'' + lang + '\' language successfully!'), 'success')
        return resolve()
      }).catch(function (error) {
        // error while updating entry references
        addlogs(config, chalk.red('Failed to import entries in ' + lang + ' language'), 'error')
        return reject(error)
      })
    })
  },
  supressFields: function () {
    let self = this
    return new Promise(function (resolve, reject) {
      let modifiedSchemas = []
      let supressedSchemas = []

      for (let uid in self.ctSchemas) {
        let contentTypeSchema = _.cloneDeep(self.ctSchemas[uid])
        let flag = {
          supressed: false,
          references: false
        }
        if (contentTypeSchema.field_rules) {
          delete contentTypeSchema.field_rules
        }
        supress(contentTypeSchema.schema, flag)
        // check if supress modified flag
        if (flag.supressed) {
          supressedSchemas.push(contentTypeSchema)
          modifiedSchemas.push(self.ctSchemas[uid])
        }

        if (flag.references) {
          self.refSchemas.push(uid)
        }

        extension_supress(contentTypeSchema.schema, config.preserveStackVersion)
      }

      helper.writeFile(modifiedSchemaPath, modifiedSchemas)

      return Promise.map(supressedSchemas, async function (schema) {
        let contentTypeResponse = client.stack({ api_key: config.target_stack, management_token: config.management_token }).contentType(schema.uid)
        Object.assign(contentTypeResponse, _.cloneDeep(schema))
        return contentTypeResponse.update()
          .then(UpdatedcontentType => {
            return
          }).catch(function (error) {
            addlogs(config, chalk.red('Failed to modify mandatory field of \'' + schema.uid + '\' content type'), 'error')
            return
          })
        // update 5 content types at a time
      }, {
        concurrency: reqConcurrency
      }).then(function () {
        return resolve()
      }).catch(function (error) {
        addlogs(config, chalk.red('Error while supressing mandatory field schemas'), 'error')
        return reject(error)
      })
    })
  },
  fetchEntry: function (query) {
    let self = this
    return new Promise(function (resolve) {
      let requestObject = {
        qs: {
          query: {
            title: query.entry.title
          },
          locale: query.locale
        }
      }

      return client.stack({ api_key: config.target_stack, management_token: config.management_token }).contentType(query.content_type).entry().query(requestObject.qs).find()
        .then(function (response) {
          if (!response.body.entries.length) {
            addlogs(config, 'Unable to map entry WO uid: ' + query.entry.uid, 'error')
            // log.debug('Request:\n' + JSON.stringify(requestObject))
            self.failedWO.push(query)
            return resolve()
          }
          self.mappedUids[query.entry.uid] = response.body.entries[0].uid
          let _ePath = path.join(entryMapperPath, query.locale, query.content_type, 'success.json')
          let entries = helper.readFile(_ePath)
          entries.push(query.entry)
          helper.writeFile(_ePath, entries)
          addlogs(config, 'Completed mapping entry wo uid: ' + query.entry.uid + ': ' + response.body.entries[0].uid, 'success')
          return resolve()
        }).catch(function () {
          return resolve()
        })
    })
  },
  unSupressFields: function () {
    let self = this
    return new Promise(async function (resolve, reject) {
      let modifiedSchemas = helper.readFile(modifiedSchemaPath)
      let modifiedSchemasUids = []
      let updatedExtensionUidsSchemas = []
      for (let uid in modifiedSchemas) {
        let _contentTypeSchema = _.cloneDeep(modifiedSchemas[uid])
        if (_contentTypeSchema.field_rules) {
          delete _contentTypeSchema.field_rules
        }
        extension_supress(_contentTypeSchema.schema, config.preserveStackVersion)
        updatedExtensionUidsSchemas.push(_contentTypeSchema)
      }

      return Promise.map(updatedExtensionUidsSchemas, async function (schema) {
        let promise = new Promise((resolve, reject) => {
          client.stack({ api_key: config.target_stack, management_token: config.management_token }).contentType(schema.uid).fetch()
            .then(contentTypeResponse => {
              contentTypeResponse.schema = schema.schema
              contentTypeResponse.update()
                .then(UpdatedcontentType => {
                  modifiedSchemasUids.push(schema.uid)
                  //addlogs(config, (chalk.white('Content type: \'' + schema.uid + '\' has been restored to its previous glory!'))
                  return resolve()
                }).catch(function (error) {
                  addlogs(config, chalk.red('Failed to re-update ' + schema.uid), 'error')
                  addlogs(config, error, 'error')
                })
            }).catch(function (error) {
              addlogs(config, error, 'error')
            })
        })
        await promise

      }, {
        concurrency: reqConcurrency
      }).then(function () {
        for (let i = 0; i < modifiedSchemas.length; i++) {
          if (modifiedSchemasUids.indexOf(modifiedSchemas[i].uid) !== -1) {
            modifiedSchemas.splice(i, 1)
            i--
          }
        }
        // re-write, in case some schemas failed to update
        helper.writeFile(modifiedSchemaPath, _.compact(modifiedSchemas))
        addlogs(config, 'Re-modified content type schemas to their original form!', 'success')
        return resolve()
      }).catch(function (error) {
        // failed to update modified schemas back to their original form
        return reject(error)
      })
    })
  },
  removeBuggedEntries: function () {
    let self = this
    return new Promise(function (resolve, reject) {
      let entries = helper.readFile(uniqueUidMapperPath)
      let bugged = []
      let removed = []
      for (let uid in entries) {
        if (entries[uid].locales.indexOf(masterLanguage.code) === -1) {
          bugged.push({
            content_type: entries[uid].content_type,
            uid: uid
          })
        }
      }

      return Promise.map(bugged, function (entry) {
        // let requestObject = {
        //   uri: self.requestOptionTemplate.uri + entry.content_type + config.apis.entries + self.mappedUids[
        //   entry.uid],
        //   method: 'DELETE',
        //   qs: {
        //     locale: masterLanguage.code
        //   },
        //   headers: self.requestOptionTemplate.headers,
        //   json: true
        // }

        return client.stack({ api_key: config.source_stack, management_token: config.management_token }).contentType(entry.content_type).entry(self.mappedUids[entry.uid]).delete({ locale: masterLanguage.code })
          .then(function () {
            removed.push(self.mappedUids[entry.uid])
            addlogs(config, 'Removed bugged entry from master ' + JSON.stringify(entry), 'success')
          })
          .catch(function (error) {
            addlogs(config, chalk.red('Failed to remove bugged entry from master language'), 'error')
            addlogs(config, error, 'error')
            addlogs(config, JSON.stringify(entry), 'error')

          })

      }, {
        concurrency: reqConcurrency
      }).then(function () {

        for (let i = 0; i < bugged.length; i++) {
          if (removed.indexOf(bugged[i].uid) !== -1) {
            bugged.splice(i, 1)
            i--
          }
        }

        helper.writeFile(path.join(entryMapperPath, 'removed-uids.json'), removed)
        helper.writeFile(path.join(entryMapperPath, 'pending-uids.json'), bugged)

        addlogs(config, chalk.green('The stack has been eradicated from bugged entries!'), 'success')
        return resolve()
      }).catch(function (error) {
        // error while removing bugged entries from stack
        return reject(error)
      })
    })
  },
  field_rules_update: function (schema) {
    let self = this
    return new Promise(function (resolve, reject) {
      if (schema.field_rules) {
        let field_rules_array = []
        for (let k = 0; k < schema.field_rules.length; k++) {
          for (let i = 0; i < schema.field_rules[k].conditions.length; i++) {
            if (schema.field_rules[k].conditions[i].operand_field === 'reference') {
              let field_rules_value = schema.field_rules[k].conditions[i].value
              field_rules_array = field_rules_value.split('.')
              let updated_value = []
              for (let j = 0; j < field_rules_array.length; j++) {
                let splited_field_rules_value = field_rules_array[j]
                let old_uid = helper.readFile(path.join(entryUidMapperPath))
                if (old_uid.hasOwnProperty(splited_field_rules_value)) {
                  updated_value.push(old_uid[splited_field_rules_value])
                } else {
                  updated_value.push(field_rules_array[j])
                }
              }
              let append_all_values = updated_value.join('.')
              schema.field_rules[k].conditions[i]['value'] = append_all_values
            }
          }
        }
      } else {
        console.log('field_rules is not available')
      }

      return client.stack({ api_key: config.target_stack, management_token: config.management_token }).contentType(schema.uid).fetch()
        .then(contentTypeResponse => {
          contentTypeResponse.schema = schema.schema
          contentTypeResponse.update()
          return resolve();
        }).catch(function (error) {
        })
    })
  },
  publish: function (langs) {
    let self = this
    let envId = []
    let locales = []
    let requestObject = {
      entry: {}
    }


    let contentTypeUids = Object.keys(self.ctSchemas)
    let entryMapper = helper.readFile(entryUidMapperPath)


    return new Promise(async function (resolve, reject) {
      let counter = 0
      return Promise.map(langs, function () {
        let lang = langs[counter]
        return Promise.map(contentTypeUids, function (ctUid) {
          let eFilePath = path.resolve(ePath, ctUid, lang + '.json')
          let entries = helper.readFile(eFilePath)


          let eUids = Object.keys(entries)
          let batches = []

          if (eUids.length > 0) {
            for (let i = 0; i < eUids.length; i += entryBatchLimit) {
              batches.push(eUids.slice(i, i + entryBatchLimit))
            }
          } else {
            counter++
            return
          }


          return Promise.map(batches, async function (batch) {
            return Promise.map(batch, async function (eUid) {
              if (entries[eUid].publish_details && entries[eUid].publish_details.length != 0) {
                _.forEach(entries[eUid].publish_details, function (pubObject) {
                  if (self.environment.hasOwnProperty(pubObject.environment)) {
                    envId.push(self.environment[pubObject.environment].name)
                    let idx = _.indexOf(locales, pubObject.locale)
                    if (idx === -1) {
                      locales.push(pubObject.locale)
                    }
                  }
                })
                let entryUid = entryMapper[eUid]
                requestObject.entry['environments'] = envId
                requestObject.entry['locales'] = locales
                let publishPromiseResult = new Promise((resolve, reject) => {
                  client.stack({ api_key: config.target_stack, management_token: config.management_token }).contentType(ctUid).entry(entryUid).publish({ publishDetails: requestObject.entry, locale: lang })
                    .then(result => {
                      addlogs(config, 'Entry ' + eUid + ' published successfully in ' + ctUid + ' content type', 'success')
                      return resolve()
                    }).catch(function (err) {
                      addlogs(config, 'Entry ' + eUid + ' not published successfully in ' + ctUid + ' content type', 'error')
                      return reject(err)
                    })
                })
                await publishPromiseResult
              } else {
                return
              }
            }, {
              concurrency: reqConcurrency
            }).then(function () {
            }).catch(function (error) {
              // error while executing entry in batch
              addlogs(config, error, 'error')
              throw error
            })
            //  const result = await Promise.all(promises)
          }, {
            concurrency: 1
          }).then(function () {
            addlogs(config, 'Entries published successfully in ' + ctUid + ' content type', 'success')
          })
        }, {
          concurrency: 1
        }).then(function () {
          counter++
        })
      }, {
        concurrency: 1
      }).then(function () {
        return resolve()
      }).catch(error => {
        return reject(error)
      })
    })
  },
}

module.exports = new importEntries()
