/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const _ = require('lodash')
const chalk = require('chalk')
const { resolve } = require('path')
const Promise = require('bluebird')
const progress = require('progress-stream')
const { HttpClient } = require('@contentstack/cli-utilities')
const { rmSync, existsSync, mkdirSync, writeFileSync, readFileSync, createWriteStream } = require('fs')

const helper = require('../util/helper')
const BaseClass = require('./base-class')
const { addlogs: log } = require('../util/log')

module.exports = class ExportAssets extends BaseClass {
  assetConfig
  invalidKeys
  fetchPolicy
  assetsRootPath
  folderJSONPath
  assetApiObject
  assetsFolderPath
  assetContents = {}
  versionedAssets = []
  assetsVersionInfo = []
  downloadedAssetsName
  downloadedAssetsFolder
  assetContentsFilePath
  assetDownloadRetry = {}
  assetDownloadMetaFilePath
  updateFetchDetails = true
  assetDownloadRetryLimit = 3
  httpClient = HttpClient.create()
  fetchDetails = { folders: {}, assets: {} }

  constructor(config) {
    super({ config })
    this.failedAssets = []
    this.assetApiObject = {}
    this.assetFolderApiObject = {}
    this.assetConfig = config.modules.assets
    this.invalidKeys = this.assetConfig.invalidKeys
    this.fetchPolicy = this.assetConfig.fetchPolicy || 'cache-first'
    this.assetsRootPath = resolve(config.data, config.branchName || '', this.assetConfig.dirName)
    this.assetsFolderPath = resolve(this.assetsRootPath, 'folders.json')
    this.assetContentsFilePath = resolve(this.assetsRootPath, 'assets.json')
    this.exportDetailsPath = resolve(this.assetsRootPath, 'export-details.json')
    this.versionedAssetsFilePath = resolve(this.assetsRootPath, 'versioned-assets.json')
    this.versionedAssetsUidFilePath = resolve(this.assetsRootPath, 'versioned-assets-uid.json')
    this.assetDownloadMetaFilePath = resolve(this.assetsRootPath, 'assets-download-meta-detail.json')

    // STUB register error handlers and hooks
    this.registerHooks(this, ['beforeExit'])
    this.registerExceptionEvents(undefined, this.onException, this)
    this.registerOnInterruptEvents(undefined, this.onInterrupt, this)
  }

  get commonQueryParam() {
    return {
      skip: 0,
      asc: 'created_at',
      include_count: true
    }
  }

  get commonApiMethodOptions() {
    return {
      skip: 0,
      totalCount: 0,
      remainingCount: 0,
      include_count: true,
      queryParam: {},
      filePath: null,
      uidFilePath: null,
      onlyCount: false,
      instance: this,
      recursive: true
    }
  }

  async start() {
    if (!existsSync(this.assetsRootPath)) {
      mkdirSync(this.assetsRootPath, { recursive: true })
    }

    this.downloadedAssetsName = await this.getFileList(this.assetsRootPath)
    this.downloadedAssetsFolder = await this.getDirectories(this.assetsRootPath)

    log(this.config, 'Starting assets export', 'success')

    // NOTE Step 1 - get all assets folders
    this.lastSyncDetail.file = 'assets-folder'
    await this.getAssetsFolders()
      .then(({ count }) => {
        log(
          this.config,
          (count === 0 ? 'No folders were found in the stack!' : 'Assets-folders have been successfully exported!'),
          'success'
        )
        this.apiData = []
        this.apiData = {}
        this.fetchDetails.folders = this.apiDataObject.lastSyncDetail
        this.setDefaultLastSyncDetails()
      }).catch((error) => {
        this.internalErrorCaptured = true
        log(this.config, chalk.red('Error while exporting asset-folders!'), 'error')
        log(this.config, error, 'error')
      })

    // NOTE get assets count
    const assetsCount = await this.stack.asset()
      .query({ ...this.commonQueryParam, skip: 9999999 })
      .find()
      .then(async ({ count }) => count)

    if (assetsCount > 0) {
      this.lastSyncDetail.file = 'assets'
      // NOTE Step 2 - Get all assets assets
      await this.getAllAssets({ assetsCount })
        .then(({ count }) => {
          this.apiData = []
          this.apiData = {}
          this.fetchDetails.assets = this.apiDataObject.lastSyncDetail
          this.setDefaultLastSyncDetails()
          log(
            this.config,
            (count === 0 ? 'No assets found' : 'Assets have been successfully exported!'),
            'success'
          )
        }).catch((error) => {
          log(this.config, chalk.red('Error while exporting assets metadata!'), 'error')
          log(this.config, error, 'error')
        })

      // NOTE step 3 - Download assets
      await this.downloadAssets({ assetsCount })
        .then((count) => {
          log(
            this.config,
            (count === 0 ? 'No assets found to download.!' : 'Assets have been successfully downloaded!'),
            'success'
          )
        }).catch((error) => {
          log(this.config, chalk.red('Error while downloading assets!'), 'error')
          log(this.config, error, 'error')
        })

      if (this.assetConfig.downloadVersionAssets) {
        await this.handleVersionedAssetsDownloadProcess()
          .then(() => {
            log(this.config, 'Versioned Assets downloaded successfully.!', 'success')
          })
      }
    }

    // NOTE retry if assets download failed
    if (this.assetConfig.retryIfAssetDownloadFailed) {
      const apiBatches = _.chunk(this.failedAssets, 2)
      log(this.config, 'Retrying failed to download assets.', 'success')
      this.failedAssets = []

      for (const batch of apiBatches) {
        const allPromise = []

        for (const asset of batch) {
          const promise = await new Promise((resolve, reject) => {
            this.assetsDownloadAPICall({ self: this, resolve, reject, asset })
          }).catch(() => {
            this.failedAssets.push(asset)
          })
          allPromise.push(promise)
        }

        await Promise.all(allPromise)
      }

      log(this.config, 'Retry asset download completed.!', 'success')
    }

    if (!_.isEmpty(this.failedAssets)) {
      log(this.config, `Number of ${this.failedAssets.length} assets not download.!`, 'success')
      writeFileSync(resolve(this.assetsRootPath, 'download-failed-assets.json'), JSON.stringify(this.failedAssets))
    } else if (existsSync(this.assetDownloadMetaFilePath)) {
      rmSync(this.assetDownloadMetaFilePath, { force: true })
    }
  }

  /**
   * @method getAssetsFolders
   * @returns Promise
   */
  getAssetsFolders() {
    const options = {
      ...this.commonApiMethodOptions,
      queryParam: {
        ...this.commonQueryParam,
        include_folders: true,
        query: { is_dir: true }
      },
      lastSyncDetail: null,
      filePath: this.assetsFolderPath,
      exportDetailsPath: this.exportDetailsPath
    }

    if (
      existsSync(this.exportDetailsPath) &&
      this.fetchPolicy === 'cache-first'
    ) {
      const { folders } = JSON.parse(readFileSync(this.exportDetailsPath, 'utf-8'))
      options.lastSyncDetail = folders
    }

    return new Promise((resolve, reject) => this.makeAPICall({ module: 'assets', options }, { resolve, reject }))
  }

  assetDataSerialization(tempData, apiData, _self) {
    if (_self.assetConfig.downloadVersionAssets) {
      _self.versionedAssets.push(
        ..._.map(
          _.filter(apiData, ({ _version }) => _version > 1),
          ({ uid, _version }) => ({ [uid]: _version })
        )
      )
    }

    return _.assign(tempData, ..._.map(apiData, (row) => ({ [row.uid]: row })))
  }

  /**
   * @method getAllAssets
   * @returns Promise
   */
  getAllAssets(params) {
    const options = {
      ...this.commonApiMethodOptions,
      queryParam: {
        ...this.commonQueryParam,
        include_publish_details: true,
        except: { BASE: this.invalidKeys }
      },
      pickFromMeta: true,
      pick: ['uid', 'url', 'filename'],
      filePath: this.assetContentsFilePath,
      uidFilePath: this.assetDownloadMetaFilePath
    }

    if (
      existsSync(this.exportDetailsPath) &&
      this.fetchPolicy === 'cache-first'
    ) {
      const { assets } = JSON.parse(readFileSync(this.exportDetailsPath, 'utf-8'))
      options.lastSyncDetail = assets

      if (assets.totalCount === params.assetsCount) {
        this.updateFetchDetails = false
        return Promise.resolve({ count: assets.totalCount })
      }
    }

    options.dataSerialization = this.assetDataSerialization

    if (this.assetConfig.makeConcurrentNetworkCalls) options.recursive = false

    if (this.assetConfig.makeConcurrentNetworkCalls) { // NOTE concurrent api call
      const env = {
        options,
        module: 'assets',
        totalCount: params.assetsCount,
        concurrencyLimit: this.assetConfig.concurrencyLimit || 5
      }

      return this.makeConcurrentCall(env)
        .then(async ({ data, uid, lastSyncDetail }) => {
          if (!_.isEmpty(data)) {
            await this.writeIntoFile(this.assetContentsFilePath, data)

            if (!_.isEmpty(uid)) {
              await this.writeIntoFile(this.assetDownloadMetaFilePath, uid)
            }
          }

          if (!_.isEmpty(lastSyncDetail) && this.exportDetailsPath) {
            await this.writeIntoFile(this.exportDetailsPath, lastSyncDetail)
          }

          if (!_.isEmpty(this.versionedAssets) && this.versionedAssetsUidFilePath) {
            await this.writeIntoFile(this.versionedAssetsUidFilePath, this.versionedAssets)
          }

          return { count: params.assetsCount }
        })
    } else {
      // NOTE Make sequential api call
      return new Promise((resolve, reject) => {
        const finalCallBack = ({ count }) => {
          if (!_.isEmpty(this.versionedAssets)) {
            writeFileSync(this.versionedAssetsUidFilePath, JSON.stringify(this.versionedAssets))
          }
  
          resolve({ count })
        }
  
        this.makeAPICall(
          { module: 'assets', options },
          { resolve: finalCallBack, reject }
        )
      })
    }
  }

  async downloadAssets(params) {
    const downloadedAssets = await this.getDirectories(this.assetsRootPath)

    if (existsSync(this.assetDownloadMetaFilePath)) {
      let assetsMeta = JSON.parse(readFileSync(this.assetDownloadMetaFilePath, { encoding: 'utf-8' }))

      if (this.fetchPolicy === 'cache-first') {
        if (!_.isEmpty(downloadedAssets)) {
          assetsMeta = _.filter(assetsMeta, ({ uid }) => !_.includes(downloadedAssets, uid))
        }

        if (_.isEmpty(assetsMeta)) {
          return Promise.resolve({ count: 0 })
        }
      }

      const apiBatches = _.chunk(
        assetsMeta,
        (this.assetConfig.downloadLimit || 2)
      )

      const env = {
        apiBatches,
        options: {},
        self: this,
        module: 'assets',
        downloadedAssets,
        asset: assetsMeta,
        promisify: this.assetsPromisify,
        totalCount: params.assetsCount || _.keys(assetsMeta).length
      }

      return this.makeConcurrentCall(env)
    }
  }

  async handleVersionedAssetsDownloadProcess() {
    const versionedAssets = JSON.parse(readFileSync(this.versionedAssetsUidFilePath, { encoding: 'utf-8' }))
    const batches = _.map(versionedAssets, (element) => {
      let batch = []
      const [uid, version] = _.first(_.entries(element))

      for (let index = 1; index < version; index++) {
        batch.push({ [uid]: index })
      }

      return batch
    }).flat()

    if (_.isEmpty(batches) || _.isEmpty(versionedAssets)) {
      return Promise.resolve({ count: 0 })
    }

    const apiBatches = _.chunk(
      batches,
      (this.assetConfig.concurrencyLimit || 5)
    )

    const updateEnvParam = (env, batch) => {
      env.uid = _.first(_.keys(batch))
      env.options.queryParam.version = _.first(_.values(batch))

      return env
    }

    const options = {
      queryParam: {
        version: 1,
        include_publish_details: true,
        except: { BASE: this.invalidKeys }
      },
      keepPromiseData: true
    }

    const env = {
      options,
      apiBatches,
      updateEnvParam,
      module: 'versioned asset',
      totalCount: batches.length,
      concurrencyLimit: this.assetConfig.concurrencyLimit || 5
    }

    await this.makeConcurrentCall(env)

    return await this.downloadVersionAssets()
  }

  async downloadVersionAssets() {
    if (!_.isEmpty(this.promiseData)) {
      let assetsMeta = this.promiseData

      if (this.fetchPolicy === 'cache-first') {
        if (!_.isEmpty(this.downloadedAssetsName)) {
          assetsMeta = _.filter(
            this.promiseData,
            ({ filename }) => !_.includes(this.downloadedAssetsName, filename)
          )
        }

        if (_.isEmpty(assetsMeta)) {
          return Promise.resolve({ count: 0 })
        }
      }

      const apiBatches = _.chunk(
        _.orderBy(assetsMeta, 'uid').reverse(),
        (this.assetConfig.downloadLimit || 2)
      )

      const env = {
        apiBatches,
        self: this,
        options: {},
        isVersion: true,
        asset: assetsMeta,
        module: 'versioned assets',
        promisify: this.assetsPromisify,
        totalCount: assetsMeta.length
      }

      return this.makeConcurrentCall(env)
    }

    return { count: 0 }
  }

  assetsDownloadAPICall(options) {
    const { self, asset, resolve: promiseResolve, reject } = options
    const assetFolderPath = resolve(self.assetsRootPath, asset.uid)
    const assetFilePath = resolve(assetFolderPath, asset.filename)

    helper.makeDirectory(assetFolderPath)
    const assetStreamURL = self.config.securedAssets
      ? `${asset.url}?authtoken=${config.authtoken || config.auth_token}`
      : asset.url

    const assetFileStream = createWriteStream(assetFilePath)
    assetFileStream
      .on('close', function () {
        log(self.config, `Downloaded ${asset.filename}: ${asset.uid} successfully!`, 'success')
        promiseResolve()
      }).on('error', (error) => {
        console.log(error)
        log(self.config, error, 'error')
        reject(error)
      })
    self.httpClient
      .options({ responseType: 'stream' })
      .get(encodeURI(assetStreamURL))
      .then(({ data: assetStreamRequest }) => {
        if (self.assetConfig.enableDownloadStatus) {
          const str = progress({
            time: 5000,
            length: assetStreamRequest.headers['content-length']
          })
          str.on('progress', function (progressData) {
            console.log(`${asset.filename}: ${Math.round(progressData.percentage)}%`)
          })
          assetStreamRequest.pipe(str).pipe(assetFileStream)
        }
        assetStreamRequest.pipe(assetFileStream)
      }).catch((error) => {
        // console.log(assetStreamURL, asset)
        this.failedAssets.push(asset)
        log(this.config, error, 'error')
      
        reject(error)
      })
  }

  assetsPromisify(option) {
    const { batchData: asset, self, isVersion } = option

    return new Promise(async function (_resolve, reject) {
      if (
        self.fetchPolicy === 'cache-first' &&
        _.includes(self.downloadedAssetsFolder, asset.uid) &&
        _.includes(self.downloadedAssetsName, asset.filename)
      ) {
        log(
          self.config,
          `Skipping download of { title: ${asset.filename}, uid: ${asset.uid} }, as they already exist`,
          'success'
        )

        return resolve()
      }

      await self.assetsDownloadAPICall({ self, asset, reject, resolve: _resolve })

      if (isVersion) {
        self.assetsVersionInfo.push(asset)

        if (asset._version === 1) {
          const fileName = resolve(self.assetsRootPath, asset.uid, '_contentstack_' + asset.uid + '.json')
          const writableData = _.filter(self.assetsVersionInfo, ({ uid }) => uid === asset.uid)
          await self.writeIntoFile(fileName, writableData)
          self.assetsVersionInfo = _.filter(
            self.assetsVersionInfo,
            ({ uid }) => _.includes(_.map(writableData, 'uid'), uid)
          )
        }
      }
    })
  }

  // STUB Error handling section
  beforeExit(code, _parent) {
    console.log(
      'beforeExit Hook => ',
      'isInternalErrorOccurred => ', this.isInternalErrorOccurred,
      'isProcessInterrupt => ', this.isProcessInterrupt,
      { code }
    )

    this.onExistHookAction()
  }

  onExistHookAction() {
    // NOTE write fetch details into-file
    if (!_.isEmpty(this.fetchDetails) && this.updateFetchDetails) {
      this.writeIntoFile(this.exportDetailsPath, this.fetchDetails)
    }

    if (
      (
        this.isInternalErrorOccurred &&
        (this.assetConfig.saveData.onError || this.assetConfig.saveData.onException)
      ) || (this.isProcessInterrupt && this.assetConfig.saveData.onInterrupt)
    ) {
      if (!_.isEmpty(this.assetFolderApiObject)) {
        this.saveDataOnErrorOrFailure(this.assetFolderApiObject)
      } else if (!_.isEmpty(this.assetApiObject)) {
        this.saveDataOnErrorOrFailure(this.assetApiObject)
      }
    }
  }

  onInterrupt(_self) {
    _self.setSyncData()
    _self.onExistHookAction()
    process.exit()
  }

  onException(reason, promise, _self) {
    console.log(reason, promise, _self.setSyncData)
    _self.setSyncData()
  }

  setSyncData() {
    switch (this.lastSyncDetail.file) {
      case 'assets':
        this.assetApiObject = this.lastSyncDetail
        break
      case 'assets-folder':
        this.assetFolderApiObject = this.lastSyncDetail
        break
    }
  }

  async saveDataOnErrorOrFailure(apiObject) {
    const { data, uid, lastSyncDetail } = apiObject
    if (!_.isEmpty(data)) {
      await this.writeIntoFile(this.assetContentsFilePath, lastSyncDetail)

      if (!_.isEmpty(uid)) {
        await this.writeIntoFile(this.assetDownloadMetaFilePath, lastSyncDetail)
      }
    }

    if (!_.isEmpty(lastSyncDetail) && this.exportDetailsPath) {
      await this.writeIntoFile(this.exportDetailsPath, lastSyncDetail)
    }
  }
  // STUB Error handling section end
}
