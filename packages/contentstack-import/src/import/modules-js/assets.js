/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */
const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const Promise = require('bluebird');
let { default: config } = require('../../config');
const { fileHelper, log, uploadAssetHelper } = require('../../utils');
const { sanitizePath, validateUids, validateFileName } = require('@contentstack/cli-utilities');

module.exports = class ImportAssets {
  assets;
  fails = [];
  assetConfig;
  mapperDirPath;
  assetBatchLimit;
  uidMapping = {};
  urlMapping = {};
  environmentPath;
  assetBucket = [];
  assetsFolderPath;
  folderBucket = [];
  folderDetails = [];
  mappedFolderUids = {};

  constructor(importConfig, stackAPIClient) {
    this.config = _.merge(config, importConfig);
    this.stackAPIClient = stackAPIClient;
    this.assetConfig = config.modules['assets-old'];
    this.assetBatchLimit =
      this.assetConfig.hasOwnProperty('assetBatchLimit') && typeof this.assetConfig.assetBatchLimit === 'number'
        ? this.assetConfig.assetBatchLimit
        : 2;
  }

  start() {
    let self = this;
    log(self.config, 'Migrating assets', 'success');
    this.assetsFolderPath = path.join(this.config.data, this.assetConfig.dirName);
    this.mapperDirPath = path.resolve(this.config.data, 'mapper', 'assets');
    this.environmentPath = path.resolve(this.config.data, 'environments', 'environments.json');
    this.uidMapperPath = path.join(this.mapperDirPath, 'uid-mapping.json');
    this.urlMapperPath = path.join(this.mapperDirPath, 'url-mapping.json');
    this.failsPath = path.join(this.mapperDirPath, 'fail.json');
    this.assets = fileHelper.readFileSync(path.join(this.assetsFolderPath, this.assetConfig.fileName));
    this.environment = fileHelper.readFileSync(this.environmentPath);
    if (fs.existsSync(this.uidMapperPath)) {
      this.uidMapping = fileHelper.readFileSync(this.uidMapperPath);
    }
    if (fs.existsSync(this.urlMapperPath)) {
      this.urlMapping = fileHelper.readFileSync(this.urlMapperPath);
    }

    mkdirp.sync(this.mapperDirPath);

    return new Promise(function (resolve, reject) {
      if (self.assets === undefined || _.isEmpty(self.assets)) {
        log(self.config, 'No Assets Found', 'success');
        return resolve({ empty: true });
      }

      let batches = [];
      let assetUids = Object.keys(self.assets);

      for (let i = 0; i < assetUids.length; i += self.assetBatchLimit) {
        batches.push(assetUids.slice(i, i + self.assetBatchLimit));
      }

      return self
        .importFolders()
        .then(function () {
          return Promise.map(
            batches,
            async function (batch, index) {
              return Promise.map(
                batch,
                function (assetUid) {
                  if (self.uidMapping.hasOwnProperty(assetUid)) {
                    log(
                      self.config,
                      'Skipping upload of asset: ' + assetUid + '. Its mapped to: ' + self.uidMapping[assetUid],
                      'success',
                    );
                    // the asset has been already imported
                    return void 0;
                  }
                  if(!validateUids(assetUid)){
                    reject(`UID Not Valid`)
                  }
                  let currentAssetFolderPath = path.join(sanitizePath(self.assetsFolderPath), sanitizePath(assetUid));
                  if (fs.existsSync(currentAssetFolderPath)) {
                    // if this is true, means, the exported asset data is versioned
                    // hence, upload each asset with its version
                    if (self.config.versioning) {
                      return self.uploadVersionedAssets(assetUid, currentAssetFolderPath).catch(function (error) {
                        log(self.config, 'Asset upload failed \n' + error, 'error');
                      });
                    }

                    let uidContainer = {};
                    let urlContainer = {};
                    if(!validateFileName(self.assets[assetUid].filename)){
                      reject(`File Name Not Valid`)
                    }
                    let assetPath = path.resolve(sanitizePath(currentAssetFolderPath), sanitizePath(self.assets[assetUid].filename));

                    if (self.assets[assetUid].parent_uid && typeof self.assets[assetUid].parent_uid === 'string') {
                      if (self.mappedFolderUids.hasOwnProperty(self.assets[assetUid].parent_uid)) {
                        self.assets[assetUid].parent_uid = self.mappedFolderUids[self.assets[assetUid].parent_uid];
                      } else {
                        log(
                          self.config,
                          `'${self.assets[assetUid].parent_uid}' parent_uid was not found! Thus, setting it as 'null'`,
                          'error',
                        );
                      }
                    }

                    return self
                      .uploadAsset(assetPath, self.assets[assetUid], uidContainer, urlContainer)
                      .then(async function () {
                        self.uidMapping[assetUid] = uidContainer[assetUid];
                        self.urlMapping[self.assets[assetUid].url] = urlContainer[self.assets[assetUid].url];

                        if (self.config.entriesPublish && self.assets[assetUid].publish_details.length > 0) {
                          let assetsUid = uidContainer[assetUid];
                          try {
                            return await self.publish(assetsUid, self.assets[assetUid]);
                          } catch (error) {
                            return error;
                          }
                        }
                        // assetUid has been successfully uploaded
                        // log them onto /mapper/assets/success.json
                      })
                      .catch(function (error) {
                        log(self.config, 'Asset upload failed \n' + error, 'error');
                        return error;
                        // asset failed to upload
                        // log them onto /mapper/assets/fail.json
                      });
                  }
                  log(self.config, `'${currentAssetFolderPath}' does not exist!`, 'error');
                },
                { concurrency: self.assetConfig.assetBatchLimit },
              ).then(function () {
                fileHelper.writeFileSync(self.uidMapperPath, self.uidMapping);
                fileHelper.writeFileSync(self.urlMapperPath, self.urlMapping);
                // completed uploading assets
                log(self.config, 'Completed asset import of batch no: ' + (index + 1), 'success');
                return index + 1;
                // TODO: if there are failures, retry
              });
            },
            { concurrency: 1 },
          )
            .then(function () {
              let numberOfSuccessfulAssetUploads = Object.keys(self.uidMapping).length;
              if (numberOfSuccessfulAssetUploads > 0) {
                log(
                  self.config,
                  chalk.green(numberOfSuccessfulAssetUploads + ' assets uploaded successfully!'),
                  'success',
                );
              }
              // TODO: if there are failures, retry
              return resolve();
            })
            .catch(function (error) {
              log(self.config, error, 'error');
              return reject(error);
            });
        })
        .catch(function (error) {
          log(self.config, error, 'error');
          return reject(error);
        });
    });
  }

  uploadVersionedAssets(uid, assetFolderPath) {
    let self = this;
    return new Promise(function (resolve, reject) {
      if(!validateUids(uid)){
        reject(`UID not valid`)
      }
      let versionedAssetMetadata = fileHelper.readFileSync(
        path.join(sanitizePath(assetFolderPath), '_contentstack_' + sanitizePath(uid) + '.json'),
      );
      // using last version, find asset's parent
      let lastVersion = versionedAssetMetadata[versionedAssetMetadata.length - 1];

      if (typeof lastVersion.parent_uid === 'string') {
        if (self.mappedFolderUids.hasOwnProperty(lastVersion.parent_uid)) {
          // update each version of that asset with the last version's parent_uid
          versionedAssetMetadata.forEach(function (assetMetadata) {
            assetMetadata.parent_uid = self.mappedFolderUids[lastVersion.parent_uid];
          });
        } else {
          log(self.config, (lastVersion.parent_uid + " parent_uid was not found! Thus, setting it as 'null'", 'error'));
          versionedAssetMetadata.forEach(function (assetMetadata) {
            assetMetadata.parent_uid = null;
          });
        }
      }
      let counter = 0;
      let uidContainer = {};
      let urlContainer = {};
      let filesStreamed = [];

      return Promise.map(
        versionedAssetMetadata,
        function () {
          let assetMetadata = versionedAssetMetadata[counter];
          if(!validateFileName(assetMetadata.filename)){
            reject(`File Name not valid`)
          }
          let assetPath = path.join(sanitizePath(assetFolderPath), sanitizePath(assetMetadata.filename));

          if (++counter === 1) {
            return self
              .uploadAsset(assetPath, assetMetadata, uidContainer, urlContainer)
              .then(function () {
                filesStreamed.push(assetMetadata.filename);
              })
              .catch((error) => {
                log(self.config, error, 'error');
                reject(error);
              });
          }

          return self
            .updateAsset(assetPath, assetMetadata, filesStreamed, uidContainer, urlContainer)
            .then(function () {
              filesStreamed.push(assetMetadata.filename);
            })
            .catch((error) => {
              log(self.config, error, 'error');
            });
        },
        { concurrency: self.assetConfig.uploadAssetsConcurrency },
      )
        .then(function () {
          self.uidMapping[uid] = uidContainer[uid];
          for (let url in urlContainer) {
            self.urlMapping[url] = urlContainer[url];
          }
          // completed uploading all the versions of the asset
          return resolve();
        })
        .catch(function (error) {
          // failed to upload asset
          // write it on fail logs, but do not stop the process
          log(self.config, 'Failed to upload asset\n' + error, 'error');
          return resolve();
        });
    });
  }

  updateAsset(assetPath, metadata, filesStreamed, _uidContainer, urlContainer) {
    const self = this;
    return new Promise(function (resolve, reject) {
      let requestOption = {};
      if (filesStreamed && filesStreamed.indexOf(metadata.filename) !== -1) {
        log(self.config, 'Skipping re-upload/streaming of ' + metadata.uid + '/' + metadata.filename, 'success');
        requestOption.formData = {};
        return resolve();
      }

      log(self.config, 'Streaming: ' + metadata.uid + '/' + metadata.filename, 'success');
      requestOption.formData = {};

      if (metadata.hasOwnProperty('parent_uid') && typeof metadata.parent_uid === 'string') {
        requestOption.formData['asset[parent_uid]'] = metadata.parent_uid;
      }

      if (metadata.hasOwnProperty('description') && typeof metadata.description === 'string') {
        requestOption.formData['asset[description]'] = metadata.description;
      }

      if (metadata.hasOwnProperty('tags') && Array.isArray(metadata.tags)) {
        requestOption.formData['asset[tags]'] = metadata.tags;
      }

      if (metadata.hasOwnProperty('title') && typeof metadata.title === 'string') {
        requestOption.formData['asset[title]'] = metadata.title;
      }

      return uploadAssetHelper(self.config, requestOption, assetPath)
        .then(function (response) {
          urlContainer[metadata.url] = response.url;
          return resolve();
        })
        .catch(function (error) {
          log(self.config, error, 'error');
          return reject(error);
        });
    });
  }

  uploadAsset(assetPath, metadata, uidContainer, urlContainer) {
    const self = this;
    return new Promise(function (resolve, reject) {
      let requestOption = {};

      if (metadata.hasOwnProperty('parent_uid') && typeof metadata.parent_uid === 'string') {
        requestOption.parent_uid = metadata.parent_uid;
      }

      if (metadata.hasOwnProperty('description') && typeof metadata.description === 'string') {
        requestOption.description = metadata.description;
      }

      // eslint-disable-next-line no-prototype-builtins
      if (metadata.hasOwnProperty('tags') && Array.isArray(metadata.tags)) {
        requestOption.tags = metadata.tags;
      }

      if (metadata.hasOwnProperty('title') && typeof metadata.title === 'string') {
        requestOption.title = metadata.title;
      }
      return uploadAssetHelper(self.config, requestOption, assetPath)
        .then(function (response) {
          uidContainer[metadata.uid] = response.uid;
          urlContainer[metadata.url] = response.url;
          return resolve();
        })
        .catch(function (error) {
          log(self.config, error, 'error');
          return reject(error);
        });
    });
  }

  importFolders() {
    let self = this;
    return new Promise(function (resolve, reject) {
      let mappedFolderPath = path.resolve(self.config.data, 'mapper', 'assets', 'folder-mapping.json');
      self.folderDetails = fileHelper.readFileSync(path.resolve(self.assetsFolderPath, 'folders.json'));

      if (_.isEmpty(self.folderDetails)) {
        log(self.config, 'No folders were found at: ' + path.join(self.assetsFolderPath, 'folders.json'), 'success');
        return resolve();
      }
      let tree = self.buildTree(_.cloneDeep(self.folderDetails));
      let createdFolders = {};
      let createdFolderUids = [];
      // if a few folders have already been created, skip re-creating them
      if (fs.existsSync(mappedFolderPath)) {
        createdFolders = fileHelper.readFileSync(mappedFolderPath);
        // check if the read file has mapped objects
        if (_.isPlainObject(createdFolders)) {
          createdFolderUids = Object.keys(createdFolders);
        }
      }
      self.buildFolderReqObjs(createdFolderUids, tree, null);
      let idx = 0;
      return Promise.map(
        self.folderBucket,
        function () {
          let folder = self.folderBucket[idx];
          if (createdFolders.hasOwnProperty(folder.json.asset.parent_uid)) {
            // replace old uid with new
            folder.json.asset.parent_uid = createdFolders[folder.json.asset.parent_uid];
          }
          return self.stackAPIClient
            .asset()
            .folder()
            .create(folder.json)
            .then((response) => {
              log(self.config, "Created folder: '" + folder.json.asset.name + "'", 'success');
              // assigning newUid to oldUid
              createdFolders[folder.oldUid] = response.uid;
              fileHelper.writeFileSync(mappedFolderPath, createdFolders);
              idx++;
            })
            .catch(function (err) {
              let error = JSON.parse(err.message);
              if (error.errors.authorization || error.errors.api_key) {
                log(self.config, 'Api_key or management_token is not valid', 'error');
                return reject(error);
              }

              log(self.config, err, 'error');
              return error;
            });
        },
        { concurrency: self.assetConfig.importFoldersConcurrency },
      )
        .then(function () {
          self.mappedFolderUids = fileHelper.readFileSync(mappedFolderPath);
          // completed creating folders
          return resolve();
        })
        .catch(function (error) {
          log(self.config, error, 'error');
          return reject(error);
        });
    });
  }

  buildFolderReqObjs(createdFolderUids, tree, parent_uid) {
    let self = this;
    for (let leaf in tree) {
      // if the folder is already created, skip
      if (createdFolderUids.indexOf(leaf) !== -1) {
        continue;
      }
      let folderObj = _.find(self.folderDetails, { uid: leaf });
      let requestOption = {
        json: {
          asset: {
            name: folderObj.name,
            parent_uid: parent_uid || null,
          },
        },
        oldUid: leaf,
      };
      self.folderBucket.push(requestOption);
      if (Object.keys(tree[leaf]).length > 0) {
        self.buildFolderReqObjs(createdFolderUids, tree[leaf], leaf);
      }
    }
  }

  buildTree(coll) {
    let tree = {};
    for (let i = 0; i < coll.length; i++) {
      if (coll[i].parent_uid === null || !coll[i].hasOwnProperty('parent_uid')) {
        tree[coll[i].uid] = {};
        coll.splice(i, 1);
        i--;
      }
    }
    this.findBranches(tree, _.keys(tree), coll);
    return tree;
  }

  findBranches(tree, branches, coll) {
    let self = this;
    _.forEach(branches, (branch) => {
      for (const element of coll) {
        if (branch === element.parent_uid) {
          let childUid = element.uid;
          tree[branch][childUid] = {};
          self.findBranches(tree[branch], [childUid], coll);
        }
      }
    });
  }

  publish(assetUid, assetObject) {
    let envId = [];
    let self = this;
    let locales = [];
    let requestObject = { json: { asset: {} } };

    return new Promise(function (resolve, reject) {
      _.forEach(assetObject.publish_details, function (pubObject) {
        if (self.environment.hasOwnProperty(pubObject.environment)) {
          envId.push(self.environment[pubObject.environment].name);
          let idx = _.indexOf(locales, pubObject.locale);
          if (idx === -1) {
            locales.push(pubObject.locale);
          }
        }
      });
      requestObject.json.asset.environments = envId;
      requestObject.json.asset.locales = locales;
      return self.stackAPIClient
        .asset(assetUid)
        .publish({ publishDetails: requestObject.json.asset })
        .then(function () {
          log(self.config, 'Asset ' + assetUid + ' published successfully', 'success');
          return resolve();
        })
        .catch(function (err) {
          if (err && err.message) {
            let error;
            try {
              error = JSON.parse(err.message);
            } catch (cError) {
              error = { errorMessage: err.message };
            }
            log(self.config, 'Asset ' + assetUid + ' not published, ' + error.errorMessage, 'error');
            return reject(err);
          }

          return reject(err);
        });
    });
  }
};
