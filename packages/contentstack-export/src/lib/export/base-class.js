const _ = require('lodash')
const { readdirSync, existsSync, writeFileSync, readFileSync } = require('fs')

const { addlogs: log } = require('../util/log')
const BaseErrorHandler = require('./base-error-handler')
const stack = require('../util/contentstack-management-sdk')

module.exports = class BaseClass extends BaseErrorHandler {
  client
  uidData = []
  apiData = []
  lastSyncDetail = {
    file: '',
    lastSkip: 0,
    lastBatch: 0,
    totalCount: 0
  }
  promiseData = []
  config = require('../../config/default')

  constructor(options) {
    super(options)
    this.config = options.config
    this.client = stack.Client(this.config)
    this.setDefaultLastSyncDetails()
  }

  get apiDataObject() {
    return { data: this.apiData, uid: this.uidData, lastSyncDetail: this.lastSyncDetail }
  }

  get stack() {
    return this.client
      .stack({ api_key: this.config.source_stack, management_token: this.config.management_token })
  }

  setDefaultLastSyncDetails() {
    this.lastSyncDetail = {
      file: '',
      lastSkip: 0,
      lastBatch: 0,
      totalCount: 0
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, (ms <= 0) ? 0 : ms))
  }

  makeConcurrentCall(env) {
    const { module, promisify, totalCount, concurrencyLimit, options, dataSerialization, apiData = {} } = env
    this.apiData = apiData

    return new Promise(async (resolve) => {
      let batchNo = 0
      this.lastSyncDetail.totalCount = totalCount
      const batch = _.fill(new Array(parseInt(totalCount / 100)), 100)

      if (totalCount % 100) batch.push(100)

      const apiBatches = (
        env.apiBatches ||
        _.chunk(
          _.map(batch, (skip, i) => (skip * i)),
          concurrencyLimit
        )
      )

      if (!_.isEmpty(options.lastSyncDetail)) {
        const { lastBatch } = options.lastSyncDetail
        batchNo = lastBatch

        for (let index = 0; index < lastBatch; index++) {
          apiBatches.shift()
        }
      }

      for (const batch of apiBatches) {
        batchNo += 1
        const allPromise = []
        let start = +new Date()

        for (const element of batch) {
          if (env.updateEnvParam instanceof Function) {
            env = env.updateEnvParam(env, element)
          }

          if (env.apiBatches) {
            env.batchData = element
          } else if (_.has(options, 'skip')) {
            options.skip = element
            options.totalCount = totalCount
            options.remainingCount = totalCount
            options.queryParam.include_count = false
          }

          const promise = promisify instanceof Function
            ? promisify(env)
            : this.makeAPICall(env, {}, dataSerialization)
          allPromise.push(promise.catch(() => {}))
        }

        const res = await Promise.all(allPromise)

        if (options.keepPromiseData) {
          this.promiseData.push(...res)
        }

        let end = +new Date()
        const exeTime = (end - start)
        this.lastSyncDetail.lastBatch = batchNo
        log(this.config, `Batch no ${batchNo} of ${module} is complete`, 'success')

        if (this.config.modules.assets.displayExecutionLogTime) {
          console.log(`Time Taken to execute: ${exeTime} milliseconds. Waite time: ${(exeTime < 1000) ? (1000 - exeTime) : 0} ms`)
        }

        if (exeTime < 1000) await this.delay(1000 - exeTime)

        if (_.isEqual(_.last(apiBatches), batch)) resolve(this.apiDataObject)
      }
    })
  }

  /**
   * @method makeAPICall
   * @param {Record<string, any>} options - Api related params
   * @param {Record<string, any>} param - Promise resolve and reject methods
   */
  makeAPICall(
    { module, uid, options },
    { resolve, reject } = {}
  ) {
    const { skip, include_count, queryParam, lastSyncDetail } = options
    const { lastSkip } = (lastSyncDetail || {})
    queryParam.skip = (lastSkip || skip)
    queryParam.include_count = include_count

    let stack = this.stack

    switch (module) {
      case 'assets':
        stack = stack.asset().query(queryParam).find()
        break
      case 'asset':
      case 'versioned asset':
        stack = stack.asset(uid).fetch(queryParam)
        break
    }

    return stack
      .then(async (res) => {
        if (!uid) {
          const { items, count } = res
          this.multipleDataApiResolver(
            { items, count },
            { module, uid, options },
            { resolve, reject }
          )
        } else {
          return (resolve instanceof Function) ? resolve(res) : res
        }
      }).catch((error) => {
        return (reject instanceof Function) ? reject(error) : error
      })
  }

  async multipleDataApiResolver({ items, count }, { module, uid, options }, { resolve, reject } = {}) {
    const { lastSyncDetail, queryParam, filePath, uidFilePath, recursive } = options
    const { lastSkip } = (lastSyncDetail || {})

    if (options.returnRes) {
      return (resolve instanceof Function) ? resolve(resData) : resData
    }

    this.lastSyncDetail.lastSkip = (queryParam.skip + items.length)
    this.lastSyncDetail.totalCount = (count || options.totalCount)

    if (count === 0 || options.onlyCount) {
      const resData = { count: (queryParam.uid && queryParam.uid.$nin) || count }
      return (resolve instanceof Function) ? resolve(resData) : resData
    }

    if (options.dataSerialization instanceof Function) {
      this.apiData = options.dataSerialization(this.apiData, items, options.instance)
    } else {
      this.apiData.push(...items)
    }

    if (options.pickFromMeta) {
      this.uidData.push(..._.map(items, (row) => _.pick(row, [...options.pick || 'uid'])))
    }

    if (recursive) {
      if (count) {
        options.totalCount = count
        options.remainingCount = count - 100
      } else if (options.remainingCount) {
        options.remainingCount = options.remainingCount - 100
      }

      if (lastSkip && options.remainingCount) {
        options.remainingCount = this.lastSyncDetail.totalCount - queryParam.skip
      }

      if (options.remainingCount > 0) {
        options.skip += 100
        options.include_count = false

        return this.makeAPICall(
          { module, uid, options },
          { resolve, reject }
        )
      }

      await this.writeIntoFile(filePath, this.apiData)

      if (uidFilePath && options.pickFromMeta) {
        await this.writeIntoFile(uidFilePath, this.uidData)
      }
    }

    const resData = recursive
      ? { count: options.totalCount }
      : { items, count: options.totalCount }

    return (resolve instanceof Function) ? resolve(resData) : resData
  }

  async writeIntoFile(path, data) {
    if (this.fetchPolicy === 'cache-first') {
      data = existsSync(path)
        ? _.merge(JSON.parse(readFileSync(path, 'utf-8')), data)
        : data
    }

    return writeFileSync(path, JSON.stringify(data))
  }

  async getDirectories(source) {
    return (await readdirSync(source, { withFileTypes: true }))
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
  }

  async getFileList(dirName, onlyName = true) {
    let files = []
    const items = await readdirSync(dirName, { withFileTypes: true })

    for (const item of items) {
      if (item.isDirectory()) {
        files = [
          ...files,
          ...(await this.getFileList(`${dirName}/${item.name}`))
        ]
      } else {
        files.push(onlyName ? item.name : `${dirName}/${item.name}`)
      }
    }

    return files
  }
}