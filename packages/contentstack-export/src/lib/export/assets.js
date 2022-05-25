/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const nativeRequest = require('request')
const mkdirp = require('mkdirp')
const path = require('path')
const fs = require('fs')
const Promise = require('bluebird')
const _ = require('lodash')
const chalk = require('chalk')

const helper = require('../util/helper')
const {addlogs} = require('../util/log')

let config = require('../../config/default')
const stack = require('../util/contentstack-management-sdk')
const assetConfig = config.modules.assets
const invalidKeys = assetConfig.invalidKeys

// The no. of assets fetched and processed in a batch
const bLimit = assetConfig.batchLimit || 15

// The no. of asset files downloaded at a time
const vLimit = assetConfig.downloadLimit || 3
let assetsFolderPath
let assetContentsFile
let folderJSONPath
let client

function ExportAssets() {
  this.assetContents = {}
  this.folderData = []
}

ExportAssets.prototype = {
  start: function (credentialConfig) {
    this.assetContents = {}
    this.folderData = []
    this.assetDownloadRetry = {};
    this.assetDownloadRetryLimit = 3;
    let  self = this
    config = credentialConfig
    assetsFolderPath = path.resolve(config.data, (config.branchName || ""), assetConfig.dirName)
    assetContentsFile = path.resolve(assetsFolderPath, 'assets.json')
    folderJSONPath = path.resolve(assetsFolderPath, 'folders.json')
    client = stack.Client(config)
    
    addlogs(config, 'Starting assets export', 'success')
    // Create asset folder
    mkdirp.sync(assetsFolderPath)
    return new Promise(function (resolve, reject) {
      //TBD: getting all the assets should have optimized
      return self.getAssetCount().then(function (count) {
        if (typeof count !== 'number' || count === 0) {
          addlogs(config, 'No assets found', 'success')
          return resolve()
        }
        const assetBatches = []
        for (let i = 0; i <= count; i += bLimit) {
          assetBatches.push(i)
        }
        return Promise.map(assetBatches, function (batch) {
          return self.getAssetJSON(batch).then(function (assetsJSON) {
            return Promise.map(assetsJSON, function (assetJSON) {
              return self.getVersionedAssetJSON(assetJSON.uid, assetJSON._version).then(
                function () {
                  self.assetContents[assetJSON.uid] = assetJSON
                  // log.success(chalk.white('The following asset has been downloaded successfully: ' +
                  //     assetJSON.uid))
                }).catch(function (error) {
                  console.log("error on 74", error);
                  addlogs(config, chalk.red('The following asset failed to download\n' + JSON.stringify(
                  assetJSON)))
                  addlogs(config, error.message, 'error')
              })
            }, {
              concurrency: vLimit,
            }).then(function () {
              // addlogs(config, 'Batch no ' + (batch + 1) + ' of assets is complete', 'success')
              // helper.writeFile(assetContentsFile, self.assetContents)
            }).catch(function (error) {
              console.log("error on 85", error);
              addlogs(config, 'Asset batch ' + (batch + 1) + ' failed to download', 'error')
              addlogs(config, error, 'error')
              // log this error onto a file - send over retries
            })
          }).catch(function (error) {
            console.log("error on 89", error);
            return reject(error)
          })
        }, {
          concurrency: 1,
        }).then(function () {
          return self.exportFolders().then(function () {
            addlogs(config, chalk.green('Asset export completed successfully'), 'success')
            return resolve()
          }).catch(function (error) {
            console.log("error on 99", error);
            return reject(error)
          })
        }).catch(function (error) {
          console.log("error on 103", error);
          addlogs(config, chalk.red('Asset export failed due to the following errrors ' + JSON.stringify(
            error), 'error'))
          return reject(error)
        })
      }).catch(function (error) {
        // addlogs(config, chalk.red('Failed to download assets due to the following error: ' + JSON.stringify(
        //   error)));
        console.log("error on 111", error);
        return reject(error)
      })
    })
  },
  exportFolders: function () {
    let  self = this
    return new Promise(function (resolve, reject) {
      return self.getAssetCount(true).then(function (fCount) {
        if (fCount === 0) {
          addlogs(config, 'No folders were found in the stack!', 'success')
          return resolve()
        }
        return self.getFolderJSON(0, fCount).then(function () {
          // asset folders have been successfully exported
          addlogs(config, 'Asset-folders have been successfully exported!', 'success')
          return resolve()
        }).catch(function (error) {
          console.log("error on 129", error);
          addlogs(config, chalk.red('Error while exporting asset-folders!'), 'error')
          return reject(error)
        })
      }).catch(function (error) {
        console.log("error on 134", error);
        addlogs(config, error, 'error')
        // error while fetching asset folder count
        return reject(error)
      })
    })
  },
  getFolderJSON: function (skip, fCount) {
    let  self = this
    return new Promise(function (resolve, reject) {
      if (typeof skip !== 'number') {
        skip = 0
      }
      if (skip >= fCount) {
        helper.writeFile(folderJSONPath, self.folderData)
        return resolve()
      }

      const queryRequestObj = {
        include_folders: true,
        query: {'is_dir': true},
        skip: skip,
      }

      client.stack({api_key: config.source_stack, management_token: config.management_token}).asset().query(queryRequestObj).find()
      .then(response => {
        response.items.forEach(function (folder) {
          self.folderData.push(folder)
        })
        skip += 100
        return self.getFolderJSON(skip, fCount)
        .then(resolve)
        .catch(reject)
      })
    })
  },
  getAssetCount: function (folder) {
    return new Promise(function (resolve, reject) {
      if (folder && typeof folder === 'boolean') {
        let queryOptions = {include_folders: true, query: {'is_dir': true}, include_count: true}
        client.stack({api_key: config.source_stack, management_token: config.management_token}).asset().query(queryOptions).find()
        .then(asset => {
          return resolve(asset.count)
        })
          .catch(error => {
        console.log("error on 179", error);
          addlogs(config, error, 'error')
        })
      } else {
        let queryOptions = {include_count: true}
        client.stack({api_key: config.source_stack, management_token: config.management_token}).asset().query(queryOptions).find()
        .then(asset => {
          return resolve(asset.count)
        })
          .catch(error => {
        console.log("error on 188", error);
          addlogs(config, error, 'error')
          return reject()
        })
      }
    })
  },
  getAssetJSON: function (skip) {
    return new Promise(function (resolve, reject) {
      if (typeof skip !== 'number') {
        skip = 0
      }
      const queryRequestObj = {
        skip: skip,
        limit: bLimit,
        include_publish_details: true,
        except: {
          BASE: invalidKeys,
        },
      }

      client.stack({api_key: config.source_stack, management_token: config.management_token}).asset().query(queryRequestObj).find()
      .then(assetResponse => {
        return resolve(assetResponse.items)
      }).catch(error => {
        console.log("error on 214", error);
        addlogs(config, error, 'error')
        return reject()
      })
    })
  },
  getVersionedAssetJSON: function (uid, version, bucket) {
    let self = this
    let assetVersionInfo = bucket || []
    return new Promise(function (resolve, reject) {
      if (self.assetDownloadRetry[uid + version] > self.assetDownloadRetryLimit) {
        return reject(new Error('Asset Max download retry limit exceeded! ' + uid));
      }

      if (version <= 0) {
        const assetVersionInfoFile = path.resolve(assetsFolderPath, uid, '_contentstack_' + uid + '.json')
        helper.writeFile(assetVersionInfoFile, assetVersionInfo)
        return resolve()
      }
      let queryrequestOption = {
        version: version,
        include_publish_details: true,
        except: {
          BASE: invalidKeys,
        },
      }

      client.stack({ api_key: config.source_stack, management_token: config.management_token}).asset(uid).fetch(queryrequestOption)
      .then(versionedAssetJSONResponse => {
        self.downloadAsset(versionedAssetJSONResponse).then(function () {
          assetVersionInfo.splice(0, 0, versionedAssetJSONResponse)
          // Remove duplicates
          assetVersionInfo = _.uniqWith(assetVersionInfo, _.isEqual)
          self.getVersionedAssetJSON(uid, --version, assetVersionInfo)
            .then(resolve)
            .catch((error) => {
              console.log("error on 250", error);
              reject(error);
            })
        }).catch((error) => {
          console.log("error on 254", error);
          reject(error);
        });
      }).catch((error) => {
        console.log("error on 255", error);
        if (error.status === 408) {
          // retrying when timeout
          (self.assetDownloadRetry[uid + version] ? ++self.assetDownloadRetry[uid + version] : self.assetDownloadRetry[uid + version] = 1)
          console.log("Retrying", uid);
          return self.getVersionedAssetJSON(uid, version, assetVersionInfo)
          .then(resolve)
            .catch((_error) => {
              console.log("error on 261", error);
              reject(_error);
            }) 
        }
        reject(error);
      })
    })
  },
  downloadAsset: function (asset) {
    let  self = this
    return new Promise(function (resolve, reject) {
      const assetFolderPath = path.resolve(assetsFolderPath, asset.uid)
      const assetFilePath = path.resolve(assetFolderPath, asset.filename)
      if (fs.existsSync(assetFilePath)) {
        // addlogs(config, 'Skipping download of { title: ' + asset.filename + ', uid: ' +
        //   asset.uid + ' }, as they already exist', 'success')
        return resolve()
      }
      self.assetStream = {
        url: config.securedAssets
          ? `${asset.url}?authtoken=${config.authtoken || config.auth_token}`
          : asset.url,
      };

      self.assetStream.url = encodeURI(self.assetStream.url);
      const assetStreamRequest = nativeRequest(self.assetStream)
      assetStreamRequest.on('response', function () {
        helper.makeDirectory(assetFolderPath)
        const assetFileStream = fs.createWriteStream(assetFilePath)
        assetStreamRequest.pipe(assetFileStream)
        assetFileStream.on('close', function () {
          addlogs(config, 'Downloaded ' + asset.filename + ': ' + asset.uid + ' successfully!', 'success')
          return resolve()
        })
      }).on('error', (error) => {
        console.log("error on 301", error);
        reject(error);
      })
    })
  },
  getFolders: function () {
    let  self = this
    return new Promise(function (resolve, reject) {
      return self.getAssetCount(true).then(function (count) {
        if (count === 0) {
          addlogs(config, 'No folders were found in the stack', 'success')
          return resolve()
        }
        return self.getFolderDetails(0, count).then(function () {
          addlogs(config, chalk.green('Exported asset-folders successfully!'), 'success')
          return resolve()
        }).catch(function (error) {
          console.log("error on 318", error);
          return reject(error)
        })
      }).catch(function (error) {
        console.log("error on 322", error);
        return reject(error)
      })
    })
  },
  getFolderDetails: function (skip, tCount) {
    let  self = this
    return new Promise(function (resolve, reject) {
      if (typeof skip !== 'number') {
        skip = 0
      }
      if (skip > tCount) {
        helper.writeFile(folderJSONPath, self.folderContents)
        return resolve()
      }
      let queryRequestObj = {
        include_folders: true,
        query: {'is_dir': true},
        skip: skip,
      }
      client.stack({api_key: config.source_stack, management_token: config.management_token}).asset().query(queryRequestObj).find()
      .then(folderDetailsResponse => {
        for(let i in folderDetailsResponse.items) {
          self.folderContents.push(folderDetailsResponse.items[i])
        }
        skip += 100
        return self.getFolderDetails(skip, tCount)
        .then(resolve)
        .catch((error) => {
          console.log("error on 351", error);
          reject(error);
        })
      }).catch(error => {
        console.log("error on 352", error);
        addlogs(config, error, 'error')
      })
    })
  },
}

module.exports = new ExportAssets()
