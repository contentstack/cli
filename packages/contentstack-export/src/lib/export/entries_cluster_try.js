const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const cluster = require('cluster')
const mkdirp = require('mkdirp');
const { FsUtility } = require('@contentstack/cli-utilities')

const cpuCount = require('os').cpus().length

const helper = require('../util/helper');
const config = require('../../config/default');
const { addlogs: log } = require('../util/log');

class ExportEntries {
  config
  workerState
  entriesConfig
  fsUtilityInstances
  lastIndexProcessed = 0
  contentTypesEntryCount = {}
  localAndContentTypeCombination = []

  constructor() {
    this.config = config
    this.concurrencyLimit = 10
    this.entriesConfig = config.modules.entries
    this.limit = this.entriesConfig.limit || 100
  }

  async start(credentialConfig) {
    this.createCluster()
    // console.log(cluster)
    // this.config = credentialConfig
    // this.localAndContentTypeCombination = await this.getContentTypeAndLocalMap()
    // this.initCluster(this.localAndContentTypeCombination)
  }

  initCluster(localAndContentTypeCombination) {
    for (let index = 0; index < cpuCount; index++) {
      if (localAndContentTypeCombination[index]) {
        this.createNewCluster(localAndContentTypeCombination, index)
      }
    }
  }

  createNewCluster(localAndContentTypeCombination, index = 0) {
    if (cpuCount > this.numberOfOpenClusters) {
      const { locale, content_type } = localAndContentTypeCombination[this.lastIndexProcessed + index]
      this.lastIndexProcessed = index
      cluster.fork({ locale, content_type, current_process_index: this.lastIndexProcessed })
        .on('message', self.startExportProcess)
    }
  }

  getContentTypeAndLocalMap() {
    // const self = this
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

    return apiBucket
  }

  async startExportProcess() {
    console.log(cluster)
    // const pid = cluster.worker.process.pid
    // const env = cluster.worker.process.env
    // const { skip, locale, content_type, id } = env
    // const queryParam = {
    //   locale: locale,
    //   skip: skip || 100,
    //   limit: self.limit,
    //   include_count: true,
    //   query: { locale: locale },
    //   include_publish_details: true
    // }
    // const getEntriesOptions = { queryParam, skip, locale, content_type, totalCount: 0 }
    // getEntriesOptions.totalCount = await this.getEntriesCount({ ...queryParam, skip: 999999999 })

    // const numberOfIteration = (getEntriesOptions.totalCount % 100)
    //   ? parseInt(getEntriesOptions.totalCount / 100) + 1
    //   : parseInt(getEntriesOptions.totalCount / 100)

    // if (numberOfIteration) {
    //   this.workerState[id] = 'in-use'
    // } else {
    //   this.workerState[id] = 'free'
    // }

    // for (let index = 0; index < numberOfIteration; index++) {
    //   const allPromise = []
    //   for (let i = 0; i < this.concurrencyLimit; i++) {
    //     getEntriesOptions.skip = index * 100
    //     getEntriesOptions.skip = getEntriesOptions.skip - getEntriesOptions.totalCount
    //     const promise = this.getEntries(getEntriesOptions)
    //     allPromise.push(promise)
    //   }

    //   await Promise.all(allPromise)

    //   if (index === (numberOfIteration.length - 1)) {
    //     this.workerState[id] = 'free'
    //   }
    // }
    // this.getEntries({ getEntriesOptions })
  }

  createFsUtilityInstance(options) {
    const { entryFolderPath, content_type, locale } = options
    this.fsUtilityInstances[`${content_type.uid}_${locale.code}`] = new FsUtility({
      chunkFileSize: 5,
      omitKeys: invalidKeys,
      moduleName: 'entries',
      indexFileName: 'entries.json',
      basePath: path.resolve(entryFolderPath, content_type.uid, locale.code)
    })
  }

  getEntriesCount(options = {}) {
    const { queryParam, content_type, locale } = options
    const { source_stack: api_key, management_token } = this.config
  
    return client
      .stack({ api_key, management_token })
      .contentType(content_type)
      .entry()
      .query(queryParam)
      .find()
      .then(({ count }) => {
        self.contentTypesEntryCount[`${content_type}_${locale}`] = { count, locale }

        return count
      })
  }

  getEntries(options = {}) {
    const self = this
    const { queryParam, skip, locale, content_type, totalCount, remainingCount } = options

    if (_.isEmpty(self.fsUtilityInstances[`${content_type.uid}_${config.master_locale.code}`])) {
      self.createFsUtilityInstance({ entryFolderPath, content_type, locale: { code: config.master_locale.code } })
    }

    return client
      .stack({ api_key: config.source_stack, management_token: config.management_token })
      .contentType(content_type)
      .entry()
      .query(queryParam)
      .find()
      .then(({ items }) => {
        // NOTE write into file
        const closeFile = (remainingCount > 0 || count > limit)

        if (count === 0) {
          self.fsUtilityInstances[`${content_type}_${locale}`].closeFile()
        } else {
          self.fsUtilityInstances[`${content_type}_${locale}`].writeIntoFile(items, { closeFile, mapKeyVal: true })
        }
        // NOTE end file operation

        // // NOTE recursive call to get entries
        // if (remainingCount > 0 ||  count > limit) {
        //   return self.getEntries({
        //     skip: skip + 100,
        //     totalCount: totalCount || count,
        //     queryParam: _.omit(queryParam, ['include_count']),
        //     remainingCount: (skip + 100) - (totalCount || count)
        //   })
        // }

        // self.workerState[id] = 'free'
        // resolve()

        return { items }
      }).catch((error) => {
        console.log('Entries fetch error', error && error.message)
        log(config, error, 'error')
      })
  }
}

module.exports = new ExportEntries()
