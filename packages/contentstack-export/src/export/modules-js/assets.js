/*!
 * Contentstack Export
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp');
const path = require('path');
const fs = require('fs');
const Promise = require('bluebird');
const _ = require('lodash');
const chalk = require('chalk');
const progress = require('progress-stream');
const { HttpClient, configHandler, validateUids, sanitizePath, validateFileName } = require('@contentstack/cli-utilities');
const { fileHelper, log, formatError } = require('../../utils');
let { default: config } = require('../../config');

module.exports = class ExportAssets {
  config;
  bLimit;
  vLimit;
  invalidKeys;
  folderJSONPath;
  folderData = [];
  assetsFolderPath;
  assetContents = {};
  httpClient = HttpClient.create();
  assetConfig = config.modules.assets;

  constructor(exportConfig, stackAPIClient) {
    this.stackAPIClient = stackAPIClient;
    this.config = _.merge(config, exportConfig);
    this.folderData = [];
    this.assetContents = {};
    this.assetDownloadRetry = {};
    this.assetDownloadRetryLimit = 3;
    this.invalidKeys = this.assetConfig.invalidKeys;
    this.bLimit = this.assetConfig.batchLimit || 15;
    this.vLimit = this.assetConfig.downloadLimit || this.config.fetchConcurrency || 3;
  }

  start() {
    const self = this;
    this.assetsFolderPath = path.resolve(this.config.data, this.config.branchName || '', this.assetConfig.dirName);
    this.assetContentsFile = path.resolve(this.assetsFolderPath, 'assets.json');
    this.folderJSONPath = path.resolve(this.assetsFolderPath, 'folders.json');

    log(this.config, 'Starting assets export', 'success');

    // Create asset folder
    mkdirp.sync(this.assetsFolderPath);

    return new Promise((resolve, reject) => {
      // TBD: getting all the assets should have optimized
      return self
        .getAssetCount()
        .then((count) => {
          const assetBatches = [];

          if (typeof count !== 'number' || count === 0) {
            log(self.config, 'No assets found', 'success');
            return resolve();
          }
          for (let i = 0; i <= count; i += self.bLimit) {
            assetBatches.push(i);
          }

          return Promise.map(
            assetBatches,
            (batch) => {
              return self
                .getAssetJSON(batch)
                .then((assetsJSON) => {
                  return Promise.map(
                    assetsJSON,
                    (assetJSON) => {
                      if (self.assetConfig.downloadVersionAssets) {
                        return self
                          .getVersionedAssetJSON(assetJSON.uid, assetJSON._version)
                          .then(() => {
                            self.assetContents[assetJSON.uid] = assetJSON;
                          })
                          .catch((error) => {
                            log(
                              self.config,
                              `Asset '${assetJSON.uid}' failed to download.\n ${formatError(error)}`,
                              'error',
                            );
                            log(self.config, error, 'error');
                          });
                      } else {
                        return self
                          .downloadAsset(assetJSON)
                          .then(() => {
                            self.assetContents[assetJSON.uid] = assetJSON;
                          })
                          .catch((err) => {
                            log(self.config, `Asset '${assetJSON.uid}' download failed. ${formatError(err)}`, 'error');
                            return err;
                          });
                      }
                    },
                    { concurrency: self.vLimit },
                  )
                    .then(() => {
                      log(self.config, 'Batch no ' + (batch + 1) + ' of assets is complete', 'success');
                      // fileHelper.writeFileSync(this.assetContentsFile, self.assetContents)
                    })
                    .catch((error) => {
                      log(self.config, `Asset batch ${batch + 1} failed to download`, 'error');
                      log(self.config, formatError(error), 'error');
                      log(self.config, error, 'error');
                    });
                })
                .catch((error) => {
                  log(self.config, error, 'error');
                  reject(error);
                });
            },
            { concurrency: self.assetConfig.concurrencyLimit || 1 },
          )
            .then(() => {
              fileHelper.writeFileSync(self.assetContentsFile, self.assetContents);

              return self
                .exportFolders()
                .then(() => {
                  log(self.config, chalk.green('Asset export completed successfully'), 'success');
                  return resolve();
                })
                .catch((error) => {
                  log(self.config, error, 'error');
                  reject(error);
                });
            })
            .catch((error) => {
              fileHelper.writeFileSync(self.assetContentsFile, self.assetContents);
              log(self.config, `Asset export failed. ${formatError(error)}`, 'error');
              log(self.config, error, 'error');
              reject(error);
            });
        })
        .catch((error) => {
          log(self.config, error, 'error');
          reject(error);
        });
    });
  }

  exportFolders() {
    const self = this;
    return new Promise((resolve, reject) => {
      return self
        .getAssetCount(true)
        .then((fCount) => {
          if (fCount === 0) {
            log(self.config, 'No folders were found in the stack!', 'success');
            return resolve();
          }

          return self
            .getFolderJSON(0, fCount)
            .then(() => {
              // asset folders have been successfully exported
              log(self.config, 'Asset-folders have been successfully exported!', 'success');
              return resolve();
            })
            .catch((error) => {
              log(self.config, `Error while exporting asset-folders!\n ${formatError(error)}`, 'error');
              return reject(error);
            });
        })
        .catch((error) => {
          log(self.config, error, 'error');
          // error while fetching asset folder count
          return reject(error);
        });
    });
  }

  getFolderJSON(skip, fCount) {
    const self = this;
    return new Promise((resolve, reject) => {
      if (typeof skip !== 'number') {
        skip = 0;
      }

      if (skip >= fCount) {
        fileHelper.writeFileSync(self.folderJSONPath, self.folderData);
        return resolve();
      }

      const queryRequestObj = {
        skip,
        include_folders: true,
        query: { is_dir: true },
      };

      self.stackAPIClient
        .asset()
        .query(queryRequestObj)
        .find()
        .then((response) => {
          skip += 100;
          self.folderData.push(...response.items);
          return self.getFolderJSON(skip, fCount).then(resolve).catch(reject);
        })
        .catch((error) => reject(error));
    });
  }

  getAssetCount(folder) {
    const self = this;
    return new Promise((resolve, reject) => {
      if (folder && typeof folder === 'boolean') {
        const queryOptions = {
          skip: 99999990,
          include_count: true,
          include_folders: true,
          query: { is_dir: true },
        };
        self.stackAPIClient
          .asset()
          .query(queryOptions)
          .find()
          .then((asset) => {
            return resolve(asset.count);
          })
          .catch((error) => {
            log(self.config, error, 'error');
          });
      } else {
        const queryOptions = { skip: 99999990, include_count: true };
        self.stackAPIClient
          .asset()
          .query(queryOptions)
          .find()
          .then(({ count }) => resolve(count))
          .catch((error) => {
            log(self.config, error, 'error');
            reject(error);
          });
      }
    });
  }

  getAssetJSON(skip) {
    const self = this;
    return new Promise((resolve, reject) => {
      if (typeof skip !== 'number') {
        skip = 0;
      }
      const queryRequestObj = {
        skip: skip,
        limit: self.bLimit,
        include_publish_details: true,
        except: {
          BASE: self.invalidKeys,
        },
      };

      self.stackAPIClient
        .asset()
        .query(queryRequestObj)
        .find()
        .then(({ items }) => resolve(items))
        .catch((error) => {
          log(self.config, error, 'error');
          return reject();
        });
    });
  }

  getVersionedAssetJSON(uid, version, bucket) {
    const self = this;
    const assetVersionInfo = bucket || [];

    return new Promise((resolve, reject) => {
      if (self.assetDownloadRetry[uid + version] > self.assetDownloadRetryLimit) {
        console.log('Reached max', self.assetDownloadRetry[uid + version]);
        return reject(new Error('Asset Max download retry limit exceeded! ' + uid));
      }

      if (version <= 0) {
        if(validateUids(uid)){
          const assetVersionInfoFile = path.resolve(sanitizePath(self.assetsFolderPath), sanitizePath(uid), '_contentstack_' + sanitizePath(uid) + '.json');
          fileHelper.writeFileSync(assetVersionInfoFile, assetVersionInfo);
          return resolve();
        }
      }
      const queryrequestOption = {
        version: version,
        include_publish_details: true,
        except: {
          BASE: self.invalidKeys,
        },
      };

      self.stackAPIClient
        .asset(uid)
        .fetch(queryrequestOption)
        .then((versionedAssetJSONResponse) => {
          self
            .downloadAsset(versionedAssetJSONResponse)
            .then(() => {
              assetVersionInfo.splice(0, 0, versionedAssetJSONResponse);
              // Remove duplicates
              assetVersionInfo = _.uniqWith(assetVersionInfo, _.isEqual);
              self.getVersionedAssetJSON(uid, --version, assetVersionInfo).then(resolve).catch(reject);
            })
            .catch(reject);
        })
        .catch((error) => {
          log(self.config, error, 'error');

          if (error.status === 408) {
            console.log('retrying', uid);
            // retrying when timeout
            self.assetDownloadRetry[uid + version]
              ? ++self.assetDownloadRetry[uid + version]
              : (self.assetDownloadRetry[uid + version] = 1);
            return self.getVersionedAssetJSON(uid, version, assetVersionInfo).then(resolve).catch(reject);
          }
          reject(error);
        });
    });
  }

  downloadAsset(asset) {
    const self = this;
    return new Promise(async (resolve, reject) => {
      if(!validateUids(asset.uid) && !validateFileName(asset.filename)) {
        reject(`UIDs not valid`)
      }
      const assetFolderPath = path.resolve(sanitizePath(self.assetsFolderPath), sanitizePath(asset.uid));
      const assetFilePath = path.resolve(sanitizePath(assetFolderPath), sanitizePath(asset.filename));

      if (fs.existsSync(assetFilePath)) {
        log(
          self.config,
          'Skipping download of { title: ' + asset.filename + ', uid: ' + asset.uid + ' }, as they already exist',
          'success',
        );
        return resolve();
      }
      self.assetStream = {
        url: self.config.securedAssets ? `${asset.url}?authtoken=${configHandler.get('authtoken')}` : asset.url,
      };

      fileHelper.makeDirectory(assetFolderPath);
      const assetFileStream = fs.createWriteStream(assetFilePath);
      self.assetStream.url = encodeURI(self.assetStream.url);
      self.httpClient
        .options({ responseType: 'stream' })
        .get(self.assetStream.url)
        .then(({ data: assetStreamRequest }) => {
          if (self.assetConfig.enableDownloadStatus) {
            const str = progress({
              time: 5000,
              length: assetStreamRequest.headers['content-length'],
            });
            str.on('progress', (progressData) => {
              console.log(`${asset.filename}: ${Math.round(progressData.percentage)}%`);
            });
            assetStreamRequest.pipe(str).pipe(assetFileStream);
          }
          assetStreamRequest.pipe(assetFileStream);
        })
        .catch((error) => {
          log(self.config, error, 'error');
          reject(error);
        });
      assetFileStream
        .on('close', function () {
          log(self.config, 'Downloaded ' + asset.filename + ': ' + asset.uid + ' successfully!', 'success');
          return resolve();
        })
        .on('error', (error) => {
          log(self.config, `Download ${asset.filename}: ${asset.uid} failed!`, 'error');
          log(self.config, error, 'error');
          reject(error);
        });
    });
  }

  getFolders() {
    const self = this;
    return new Promise((resolve, reject) => {
      return self
        .getAssetCount(true)
        .then((count) => {
          if (count === 0) {
            log(self.config, 'No folders were found in the stack', 'success');
            return resolve();
          }
          return self
            .getFolderDetails(0, count)
            .then(function () {
              log(self.config, chalk.green('Exported asset-folders successfully!'), 'success');
              return resolve();
            })
            .catch(function (error) {
              log(self.config, error, 'error');
              reject(error);
            });
        })
        .catch(function (error) {
          log(self.config, error, 'error');
          reject(error);
        });
    });
  }

  getFolderDetails(skip, tCount) {
    const self = this;
    return new Promise((resolve, reject) => {
      if (typeof skip !== 'number') {
        skip = 0;
      }
      if (skip > tCount) {
        fileHelper.writeFileSync(self.folderJSONPath, self.folderContents);
        return resolve();
      }
      const queryRequestObj = {
        skip: skip,
        include_folders: true,
        query: { is_dir: true },
      };
      self.stackAPIClient
        .asset()
        .query(queryRequestObj)
        .find()
        .then((folderDetailsResponse) => {
          for (let i in folderDetailsResponse.items) {
            self.folderContents.push(folderDetailsResponse.items[i]);
          }
          skip += 100;
          return self.getFolderDetails(skip, tCount).then(resolve).catch(reject);
        })
        .catch((error) => {
          log(self.config, error, 'error');
        });
    });
  }
};
