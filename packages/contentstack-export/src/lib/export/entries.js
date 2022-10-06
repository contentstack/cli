const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const mkdirp = require('mkdirp')
const cluster = require('cluster')
const { Worker } = require('worker_threads')

const helper = require('../util/helper')
const config = require('../../config/default')
const { addlogs: log } = require('../util/log')
const stack = require('../util/contentstack-management-sdk');

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

  start(credentialConfig) {
    this.config = credentialConfig
    this.initClient(credentialConfig)
    const entryFolderPath = path.resolve(
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
    return new Promise((resolve) => {
      const { apiBucket, schemaFilePath, localesFilePath, entryFolderPath } = options

      if (_.isEmpty(apiBucket)) {
        if (worker) {
          worker.terminate()
          workerCount--
        }

        return resolve()
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
    const schemaFilePath = path.resolve(
      this.config.data,
      this.config.branchName || '',
      this.config.modules.content_types.dirName,
      'schema.json',
    )
    const localesFilePath = path.resolve(
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
      limit: 1,
      locale: locale,
      skip: 999999999,
      include_count: true,
      query: { locale: locale }
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

module.exports = new ExportEntries()
