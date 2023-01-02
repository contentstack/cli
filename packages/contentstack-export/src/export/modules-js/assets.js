/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp');
const path = require('path');
const fs = require('fs');
const Promise = require('bluebird');
const _ = require('lodash');
const chalk = require('chalk');
const progress = require('progress-stream');
const { HttpClient } = require('@contentstack/cli-utilities');

const helper = require('../util/helper');
const { addlogs } = require('../util/log');

let config = require('../../config/default');
const stack = require('../util/contentstack-management-sdk');

module.exports = class ExportAssets {
  config
  client
  bLimit
  vLimit
  invalidKeys
  folderJSONPath
  folderData = []
  assetsFolderPath
  assetContents = {}
  httpClient = HttpClient.create()
  assetConfig = config.modules.assets

  constructor(config) {
    this.config = config
    this.folderData = []
    this.assetContents = {}
    this.assetDownloadRetry = {}
    this.assetDownloadRetryLimit = 3
    this.invalidKeys = this.assetConfig.invalidKeys
    this.bLimit = this.assetConfig.batchLimit || 15
    this.vLimit = this.assetConfig.downloadLimit || config.fetchConcurrency || 3
  }

  start() {
    const self = this
    this.assetsFolderPath = path.resolve(this.config.data, this.config.branchName || '', this.assetConfig.dirName)
    this.assetContentsFile = path.resolve(this.assetsFolderPath, 'assets.json')
    this.folderJSONPath = path.resolve(this.assetsFolderPath, 'folders.json')
    self.client = stack.Client(this.config)

    addlogs(this.config, 'Starting assets export', 'success')

    // Create asset folder
    mkdirp.sync(this.assetsFolderPath)

    return new Promise(function (resolve, reject) {
      // TBD: getting all the assets should have optimized
      return self
        .getAssetCount()
        .then(function (count) {
          const assetBatches = []

          if (typeof count !== 'number' || count === 0) {
            addlogs(self.config, 'No assets found', 'success')
            return resolve()
          }
          for (let i = 0; i <= count; i += self.bLimit) {
            assetBatches.push(i);
          }

          return Promise.map(
            assetBatches,
            function (batch) {
              return self
                .getAssetJSON(batch)
                .then(function (assetsJSON) {
                  return Promise.map(
                    assetsJSON,
                    function (assetJSON) {
                      if (self.assetConfig.downloadVersionAssets) {
                        return self
                          .getVersionedAssetJSON(assetJSON.uid, assetJSON._version)
                          .then(function () {
                            self.assetContents[assetJSON.uid] = assetJSON;
                          }).catch(function (error) {
                            addlogs(
                              self.config,
                              chalk.red('The following asset failed to download\n' + JSON.stringify(assetJSON)),
                            )
                            addlogs(self.config, error, 'error')
                          })
                      } else {
                        return self.downloadAsset(assetJSON)
                          .then(function () {
                            self.assetContents[assetJSON.uid] = assetJSON
                          }).catch((err) => {
                            addlogs({ errorCode: (err && err.code), uid: assetJSON.uid }, `Asset download failed - ${assetJSON.uid}`, 'error')
                            return err
                          })
                      }
                    },
                    { concurrency: self.vLimit }
                  ).then(function () {
                    addlogs(self.config, 'Batch no ' + (batch + 1) + ' of assets is complete', 'success');
                    // helper.writeFileSync(this.assetContentsFile, self.assetContents)
                  }).catch(function (error) {
                    console.log('Error fetch/download the asset', (error && error.message))
                    addlogs(self.config, 'Asset batch ' + (batch + 1) + ' failed to download', 'error')
                    addlogs(self.config, error, 'error')
                  })
                }).catch(function (error) {
                  addlogs(self.config, error, 'error')
                  reject(error)
                })
            },
            { concurrency: self.assetConfig.concurrencyLimit || 1 }
          ).then(function () {
            helper.writeFileSync(self.assetContentsFile, self.assetContents)

            return self
              .exportFolders()
              .then(function () {
                addlogs(self.config, chalk.green('Asset export completed successfully'), 'success');
                return resolve();
              })
              .catch(function (error) {
                addlogs(self.config, error, 'success')
                reject(error)
              })
          }).catch(function (error) {
            helper.writeFileSync(self.assetContentsFile, self.assetContents)
            addlogs(
              self.config,
              chalk.red('Asset export failed due to the following errors ' + JSON.stringify(error), 'error'),
            )
            addlogs(self.config, error, 'success')
            reject(error)
          })
        }).catch(function (error) {
          addlogs(self.config, error, 'success')
          reject(error)
        })
    })
  }

  exportFolders() {
    let self = this;
    return new Promise(function (resolve, reject) {
      return self
        .getAssetCount(true)
        .then(function (fCount) {
          if (fCount === 0) {
            addlogs(self.config, 'No folders were found in the stack!', 'success');
            return resolve()
          }

          return self
            .getFolderJSON(0, fCount)
            .then(function () {
              // asset folders have been successfully exported
              addlogs(self.config, 'Asset-folders have been successfully exported!', 'success');
              return resolve();
            }).catch(function (error) {
              addlogs(self.config, chalk.red('Error while exporting asset-folders!'), 'error');
              return reject(error);
            })
        })
        .catch(function (error) {
          addlogs(self.config, error, 'error')
          // error while fetching asset folder count
          return reject(error)
        });
    });
  }

  getFolderJSON(skip, fCount) {
    let self = this
    return new Promise(function (resolve, reject) {
      if (typeof skip !== 'number') {
        skip = 0
      }

      if (skip >= fCount) {
        helper.writeFileSync(self.folderJSONPath, self.folderData)
        return resolve()
      }

      const queryRequestObj = {
        skip,
        include_folders: true,
        query: { is_dir: true }
      }

      self.client
        .stack({ api_key: self.config.source_stack, management_token: self.config.management_token })
        .asset()
        .query(queryRequestObj)
        .find()
        .then((response) => {
          skip += 100
          self.folderData.push(...response.items)
          return self.getFolderJSON(skip, fCount).then(resolve).catch(reject)
        })
    })
  }

  getAssetCount(folder) {
    const self = this
    return new Promise(function (resolve, reject) {
      if (folder && typeof folder === 'boolean') {
        let queryOptions = {
          skip: 99999990,
          include_count: true,
          include_folders: true,
          query: { is_dir: true }
        }
        self.client
          .stack({ api_key: self.config.source_stack, management_token: self.config.management_token })
          .asset()
          .query(queryOptions)
          .find()
          .then((asset) => {
            return resolve(asset.count);
          })
          .catch((error) => {
            addlogs(self.config, error, 'error');
          });
      } else {
        let queryOptions = { skip: 99999990, include_count: true }
        self.client
          .stack({ api_key: self.config.source_stack, management_token: self.config.management_token })
          .asset()
          .query(queryOptions)
          .find()
          .then(({ count }) => resolve(count))
          .catch((error) => {
            addlogs(self.config, error, 'error')
            reject(error)
          })
      }
    })
  }

  getAssetJSON(skip) {
    const self = this
    return new Promise(function (resolve, reject) {
      if (typeof skip !== 'number') {
        skip = 0
      }
      const queryRequestObj = {
        skip: skip,
        limit: self.bLimit,
        include_publish_details: true,
        except: {
          BASE: self.invalidKeys
        }
      }

      self.client
        .stack({ api_key: self.config.source_stack, management_token: self.config.management_token })
        .asset()
        .query(queryRequestObj)
        .find()
        .then(({ items }) => resolve(items))
        .catch((error) => {
          addlogs(self.config, error, 'error')
          return reject()
        })
    })
  }

  getVersionedAssetJSON(uid, version, bucket) {
    let self = this
    let assetVersionInfo = bucket || []

    return new Promise(function (resolve, reject) {
      if (self.assetDownloadRetry[uid + version] > self.assetDownloadRetryLimit) {
        console.log('Reached max', self.assetDownloadRetry[uid + version])
        return reject(new Error('Asset Max download retry limit exceeded! ' + uid))
      }

      if (version <= 0) {
        const assetVersionInfoFile = path.resolve(self.assetsFolderPath, uid, '_contentstack_' + uid + '.json');
        helper.writeFileSync(assetVersionInfoFile, assetVersionInfo)
        return resolve()
      }
      let queryrequestOption = {
        version: version,
        include_publish_details: true,
        except: {
          BASE: self.invalidKeys
        }
      }

      self.client
        .stack({ api_key: self.config.source_stack, management_token: self.config.management_token })
        .asset(uid)
        .fetch(queryrequestOption)
        .then((versionedAssetJSONResponse) => {
          self
            .downloadAsset(versionedAssetJSONResponse)
            .then(function () {
              assetVersionInfo.splice(0, 0, versionedAssetJSONResponse);
              // Remove duplicates
              assetVersionInfo = _.uniqWith(assetVersionInfo, _.isEqual);
              self
                .getVersionedAssetJSON(uid, --version, assetVersionInfo)
                .then(resolve)
                .catch(reject)
            })
            .catch(reject)
        })
        .catch((error) => {
          addlogs(self.config, error, 'error')
          console.log('Error on  fetch', error && error.message);

          if (error.status === 408) {
            console.log('retrying', uid);
            // retrying when timeout
            self.assetDownloadRetry[uid + version]
              ? ++self.assetDownloadRetry[uid + version]
              : (self.assetDownloadRetry[uid + version] = 1);
            return self.getVersionedAssetJSON(uid, version, assetVersionInfo)
              .then(resolve)
              .catch(reject)
          }

          reject(error)
        })
    })
  }

  downloadAsset(asset) {
    let self = this;
    return new Promise(async function (resolve, reject) {
      const assetFolderPath = path.resolve(self.assetsFolderPath, asset.uid)
      const assetFilePath = path.resolve(assetFolderPath, asset.filename)

      if (fs.existsSync(assetFilePath)) {
        addlogs(
          self.config,
          'Skipping download of { title: ' + asset.filename + ', uid: ' + asset.uid + ' }, as they already exist',
          'success'
        )
        return resolve()
      }
      self.assetStream = {
        url: self.config.securedAssets ? `${asset.url}?authtoken=${self.config.authtoken || self.config.auth_token}` : asset.url,
      }

      helper.makeDirectory(assetFolderPath)
      const assetFileStream = fs.createWriteStream(assetFilePath)
      self.assetStream.url = encodeURI(self.assetStream.url)
      self.httpClient
        .options({ responseType: 'stream' })
        .get(self.assetStream.url)
        .then(({ data: assetStreamRequest }) => {
          if (self.assetConfig.enableDownloadStatus) {
            const str = progress({
              time: 5000,
              length: assetStreamRequest.headers['content-length'],
            })
            str.on('progress', function (progressData) {
              console.log(`${asset.filename}: ${Math.round(progressData.percentage)}%`);
            });
            assetStreamRequest.pipe(str).pipe(assetFileStream);
          }
          assetStreamRequest.pipe(assetFileStream)
        }).catch((error) => {
          addlogs(self.config, error, 'error')
          reject(error)
        })
      assetFileStream
        .on('close', function () {
          addlogs(self.config, 'Downloaded ' + asset.filename + ': ' + asset.uid + ' successfully!', 'success');
          return resolve();
        })
        .on('error', (error) => {
          addlogs(self.config, error, 'error')
          reject(error)
        })
    });
  }

  getFolders() {
    let self = this;
    return new Promise(function (resolve, reject) {
      return self
        .getAssetCount(true)
        .then(function (count) {
          if (count === 0) {
            addlogs(self.config, 'No folders were found in the stack', 'success')
            return resolve()
          }
          return self
            .getFolderDetails(0, count)
            .then(function () {
              addlogs(self.config, chalk.green('Exported asset-folders successfully!'), 'success')
              return resolve()
            }).catch(function (error) {
              addlogs(self.config, error, 'error')
              reject(error)
            })
        }).catch(function (error) {
          addlogs(self.config, error, 'error')
          reject(error)
        });
    });
  }

  getFolderDetails(skip, tCount) {
    let self = this;
    return new Promise(function (resolve, reject) {
      if (typeof skip !== 'number') {
        skip = 0
      }
      if (skip > tCount) {
        helper.writeFileSync(self.folderJSONPath, self.folderContents)
        return resolve()
      }
      let queryRequestObj = {
        skip: skip,
        include_folders: true,
        query: { is_dir: true }
      }
      self.client
        .stack({ api_key: self.config.source_stack, management_token: self.config.management_token })
        .asset()
        .query(queryRequestObj)
        .find()
        .then((folderDetailsResponse) => {
          for (let i in folderDetailsResponse.items) {
            self.folderContents.push(folderDetailsResponse.items[i])
          }
          skip += 100
          return self.getFolderDetails(skip, tCount).then(resolve).catch(reject)
        }).catch((error) => {
          addlogs(self.config, error, 'error')
        })
    })
  }
}
