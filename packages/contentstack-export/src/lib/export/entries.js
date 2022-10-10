const _ = require('lodash');
const { resolve } = require('path')
const { Worker, parentPort } = require('worker_threads')
// const { cliux } = require('@contentstack/cli-utilities');
const { FsUtility } = require('@contentstack/cli-utilities')

const helper = require('../util/helper')
const config = require('../../config/default')
const { addlogs: log } = require('../util/log')
const stack = require('../util/contentstack-management-sdk')

let client = null
let workerCount = 0
let fsUtilityInstances = {}

// NOTE main thread
class ExportEntries {
  client
  config
  entriesConfig

  constructor() {
    this.config = config
    this.noOfWorkers = 5
    this.concurrencyLimit = 10
    this.entriesConfig = config.modules.entries
    this.limit = this.entriesConfig.limit || 100
  }

  initClient(config) {
    if (!this.client) this.client = stack.Client(config)
  }

  cleanUp() {
    client = null
    fsUtilityInstances = {}
  }

  async start(credentialConfig) {
    this.config = credentialConfig
    this.initClient(credentialConfig)
    const entryFolderPath = resolve(
      this.config.data,
      this.config.branchName || '', this.config.modules.entries.dirName
    )

    if (credentialConfig.noOfWorkers) {
      this.noOfWorkers = credentialConfig.noOfWorkers
    }

    const { apiBucket, schemaFilePath, localesFilePath } = this.getContentTypeAndLocalMap()

    return this.makeConcurrentWorker({
      apiBucket,
      schemaFilePath,
      localesFilePath,
      entryFolderPath
    }, this.noOfWorkers)
  }

  makeConcurrentWorker(options, noOfWorker = 5, worker = null) {
    const self = this
    return new Promise((resolve) => {
      const { apiBucket, schemaFilePath, localesFilePath, entryFolderPath } = options

      if (_.isEmpty(apiBucket)) {
        if (worker) {
          worker.terminate()
          workerCount--
        }
        
        if (workerCount === 0) {
          self.cleanUp()
          resolve()
        }

        return void 0
      }

      const makeWorkerCall = () => {
        this.createWorkerOnDemand(
          options,
          { ..._.first(apiBucket), schemaFilePath, localesFilePath, entryFolderPath },
          worker
        )
        apiBucket.shift()
      }

      if (worker) {
        makeWorkerCall()
      } else {
        for (let index = 0; index < noOfWorker; index++) {
          makeWorkerCall()
        }
      }
    })
  }

  async createWorkerOnDemand(options, data, existingWorker = null) {
    const self = this
    const totalCount = await this.getEntriesCount(data)

    const postMessage = (worker) => {
      worker.postMessage({
        operation: 'get-entries',
        env: {
          ...data,
          totalCount,
          config: self.config,
          concurrencyLimit: self.concurrencyLimit
        }
      })
    }

    if (totalCount > 0) {
      if (existingWorker) {
        postMessage(existingWorker)
      } else {
        const worker = new Worker(`${__dirname}/worker.js`)

        // NOTE Set worker thread event handlers
        worker.on('message', (result) => {
          // NOTE kill worker
          if (result.action === 'terminate') {
            worker.terminate()
          }
          if (result.action === 'done') {
            self.makeConcurrentWorker(options, 1, worker)
          }
          if (result.action === 'log') {
            log(self.config, result.message, 'success')
          }
        })

        workerCount++

        worker.on('exit', (code) => {
          console.log(`Worker exited with code ${code}`)
        })

        postMessage(worker)
      }
    } else {
      self.makeConcurrentWorker(options, 1, existingWorker)
    }
  }

  getContentTypeAndLocalMap() {
    const apiBucket = []
    const schemaFilePath = resolve(
      this.config.data,
      this.config.branchName || '',
      this.config.modules.content_types.dirName,
      'schema.json',
    )
    const localesFilePath = resolve(
      this.config.data,
      this.config.branchName || '',
      this.config.modules.locales.dirName,
      this.config.modules.locales.fileName
    )

    const locales = helper.readFile(localesFilePath)
    const content_types = helper.readFile(schemaFilePath)

    _.forEach(content_types, (content_type) => {
      if (Object.keys(locales).length) {
        for (let [_uid, locale] of Object.entries(locales)) {
          apiBucket.push({
            locale: locale.code,
            content_type: content_type.uid,
          })
        }
      }

      apiBucket.push({
        content_type: content_type.uid,
        locale: config.master_locale.code
      })
    })

    return { apiBucket, schemaFilePath, localesFilePath }
  }

  getEntriesCount(options = {}) {
    const { content_type, locale } = options
    const { source_stack: api_key, management_token } = this.config

    const queryParam = {
      locale,
      limit: 1,
      skip: 99999999,
      include_count: true,
      query: { locale }
    }

    return this.client
      .stack({ api_key, management_token })
      .contentType(content_type)
      .entry()
      .query(queryParam)
      .find()
      .then(({ count }) => count)
  }
}
// NOTE end main thread

// NOTE worker utilities
const getClient = (config) => {
  if (!client) client = stack.Client(config)

  return client
}

const createFsUtilityInstance = (options) => {
  const { entryFolderPath, content_type, locale, invalidKeys } = options
  fsUtilityInstances[`${content_type}_${locale}`] = new FsUtility({
    chunkFileSize: 5,
    omitKeys: invalidKeys,
    moduleName: 'entries',
    indexFileName: 'entries.json',
    basePath: resolve(entryFolderPath, content_type, locale)
  })
}

const makeEntriesConcurrentCall = (env) => {
  const { config, totalCount, concurrencyLimit, limit = 100, skip = 0, locale, content_type, entryFolderPath } = env
  const queryParam = {
    limit,
    locale: locale,
    skip: skip || 100,
    include_count: true,
    query: { locale: locale },
    include_publish_details: true
  }
  const getEntriesOptions = {
    skip,
    config,
    locale,
    queryParam,
    totalCount,
    content_type,
    entryFolderPath
  }

  return new Promise(async (resolve) => {
    let batchNo = 0
    const batch = _.fill(new Array(parseInt(totalCount / 100)), 100)

    if (totalCount % 100) batch.push(100)

    const apiBatches = _.chunk(
      _.map(batch, (skip, i) => (skip * i)),
      concurrencyLimit
    )

    if (_.isEmpty(apiBatches)) return resolve()

    for (const skipBatch of apiBatches) {
      batchNo += 1
      const allPromise = []

      for (const skip of skipBatch) {
        const promise = getEntries(getEntriesOptions, skip)
        allPromise.push(promise)
      }

      await Promise.all(allPromise)
    
      parentPort.postMessage({
        action: 'log',
        message: `Export of ${env.content_type} with batch no ${batchNo} is done.`
      })

      if (_.isEqual(_.last(apiBatches), skipBatch)) {
        delete fsUtilityInstances[`${content_type}_${locale}`]
        resolve()
      }
    }
  })
}

const getEntries = (options = {}, skip = 0) => {
  const { totalCount, config, queryParam, locale, content_type, entryFolderPath } = options
  queryParam.skip = skip

  if (_.isEmpty(fsUtilityInstances[`${content_type}_${locale}`])) {
    createFsUtilityInstance({ entryFolderPath, content_type, locale })
  }

  return getClient(config)
    .stack({ api_key: config.source_stack, management_token: config.management_token })
    .contentType(content_type)
    .entry()
    .query(queryParam)
    .find()
    .then(({ items }) => {
      // NOTE write into file
      const closeFile = (
        ((queryParam.skip + items.length) >= totalCount) ||
        (totalCount <= 100)
      )

      if (_.isEmpty(items)) {
        fsUtilityInstances[`${content_type}_${locale}`].closeFile()
      } else {
        fsUtilityInstances[`${content_type}_${locale}`].writeIntoFile(
          items,
          { closeFile, mapKeyVal: true }
        )
      }
      // NOTE end file operation

      return items
    }).catch((error) => {
      console.log('Entries fetch error', error && error.message)
      log(config, error, 'error')
    })
}
// NOTE end worker utilities

module.exports = {
  class: ExportEntries,
  getEntries,
  getClient,
  createFsUtilityInstance,
  makeEntriesConcurrentCall
}
