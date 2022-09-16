/* eslint-disable no-prototype-builtins */
/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp');
const path = require('path');
const Promise = require('bluebird');
const fs = require('fs');
const _ = require('lodash');
const chalk = require('chalk');

let upload = require('../util/upload');
const helper = require('../util/fs');
const { addlogs } = require('../util/log');
const stack = require('../util/contentstack-management-sdk');

let config = require('../../config/default');
const assetsConfig = config.modules.assets;
let assetBatchLimit =
  assetsConfig.hasOwnProperty('batchLimit') && typeof assetBatchLimit === 'number' ? assetsConfig.assetBatchLimit : 2;
let assetsFolderPath;
let mapperDirPath;
let environmentPath;
let client;

function importAssets() {
  this.uidMapping = {};
  this.urlMapping = {};
  this.fails = [];
  this.assetBucket = [];
  this.folderDetails = [];
  this.folderBucket = [];
  this.mappedFolderUids = {};
}

importAssets.prototype = {
  start: function (credential) {
    addlogs(config, 'Migrating assets', 'success');
    let self = this;
    config = credential;
    client = stack.Client(config);
    assetsFolderPath = path.join(config.data, config.modules.assets.dirName);
    mapperDirPath = path.resolve(config.data, 'mapper', 'assets');
    environmentPath = path.resolve(config.data, 'environments', 'environments.json');
    self.uidMapperPath = path.join(mapperDirPath, 'uid-mapping.json');
    self.urlMapperPath = path.join(mapperDirPath, 'url-mapping.json');
    self.failsPath = path.join(mapperDirPath, 'fail.json');
    self.assets = helper.readFile(path.join(assetsFolderPath, assetsConfig.fileName));
    self.environment = helper.readFile(environmentPath);
    if (fs.existsSync(self.uidMapperPath)) {
      self.uidMapping = helper.readFile(self.uidMapperPath);
    }
    if (fs.existsSync(self.urlMapperPath)) {
      self.urlMapping = helper.readFile(self.urlMapperPath);
    }

    mkdirp.sync(mapperDirPath);

    return new Promise(function (resolve, reject) {
      if (self.assets === undefined || _.isEmpty(self.assets)) {
        addlogs(config, 'No Assets Found', 'success');
        return resolve({ empty: true });
      }
      let assetUids = Object.keys(self.assets);
      let batches = [];
      for (let i = 0; i < assetUids.length; i += assetBatchLimit) {
        batches.push(assetUids.slice(i, i + assetBatchLimit));
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
                    addlogs(
                      config,
                      'Skipping upload of asset: ' + assetUid + '. Its mapped to: ' + self.uidMapping[assetUid],
                      'success',
                    );
                    // the asset has been already imported
                    return;
                  }
                  let currentAssetFolderPath = path.join(assetsFolderPath, assetUid);
                  if (fs.existsSync(currentAssetFolderPath)) {
                    // if this is true, means, the exported asset data is versioned
                    // hence, upload each asset with its version
                    if (config.versioning) {
                      return self
                        .uploadVersionedAssets(assetUid, currentAssetFolderPath)
                        .then(function () {
                          // empty function
                        })
                        .catch(function (error) {
                          addlogs(config, (chalk.red('Asset upload failed \n' + error), 'error'));
                        });
                    }
                    let assetPath = path.resolve(currentAssetFolderPath, self.assets[assetUid].filename);
                    let uidContainer = {};
                    let urlContainer = {};
                    if (self.assets[assetUid].parent_uid && typeof self.assets[assetUid].parent_uid === 'string') {
                      if (self.mappedFolderUids.hasOwnProperty(self.assets[assetUid].parent_uid)) {
                        self.assets[assetUid].parent_uid = self.mappedFolderUids[self.assets[assetUid].parent_uid];
                      } else {
                        addlogs(
                          config,
                          (self.assets[assetUid].parent_uid + " parent_uid was not found! Thus, setting it as 'null'",
                          'error'),
                        );
                      }
                    }

                    return self
                      .uploadAsset(assetPath, self.assets[assetUid], uidContainer, urlContainer)
                      .then(async function () {
                        self.uidMapping[assetUid] = uidContainer[assetUid];
                        self.urlMapping[self.assets[assetUid].url] = urlContainer[self.assets[assetUid].url];

                        if (config.entriesPublish && self.assets[assetUid].publish_details.length > 0) {
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
                        addlogs(config, chalk.red('Asset upload failed \n' + error, 'error'));
                        return error;
                        // asset failed to upload
                        // log them onto /mapper/assets/fail.json
                      });
                  }
                  addlogs(config, currentAssetFolderPath + ' does not exist!', 'error');
                },
                {
                  concurrency: 1,
                },
              ).then(function () {
                helper.writeFile(self.uidMapperPath, self.uidMapping);
                helper.writeFile(self.urlMapperPath, self.urlMapping);
                // completed uploading assets
                addlogs(config, 'Completed asset import of batch no: ' + (index + 1), 'success');
                return index + 1;
                // TODO: if there are failures, retry
              });
            },
            {
              concurrency: 1,
            },
          )
            .then(function () {
              let numberOfSuccessfulAssetUploads = Object.keys(self.uidMapping).length;
              if (numberOfSuccessfulAssetUploads > 0) {
                addlogs(
                  config,
                  chalk.green(numberOfSuccessfulAssetUploads + ' assets uploaded successfully!'),
                  'success',
                );
              }
              // TODO: if there are failures, retry
              return resolve();
            })
            .catch(function (error) {
              return reject(error);
            });
        })
        .catch(function (error) {
          return reject(error);
        });
    });
  },
  uploadVersionedAssets: function (uid, assetFolderPath) {
    let self = this;
    return new Promise(function (resolve, reject) {
      let versionedAssetMetadata = helper.readFile(path.join(assetFolderPath, '_contentstack_' + uid + '.json'));
      // using last version, find asset's parent

      let lastVersion = versionedAssetMetadata[versionedAssetMetadata.length - 1];
      if (typeof lastVersion.parent_uid === 'string') {
        if (self.mappedFolderUids.hasOwnProperty(lastVersion.parent_uid)) {
          // update each version of that asset with the last version's parent_uid
          versionedAssetMetadata.forEach(function (assetMetadata) {
            assetMetadata.parent_uid = self.mappedFolderUids[lastVersion.parent_uid];
          });
        } else {
          addlogs(config, (lastVersion.parent_uid + " parent_uid was not found! Thus, setting it as 'null'", 'error'));
          versionedAssetMetadata.forEach(function (assetMetadata) {
            assetMetadata.parent_uid = null;
          });
        }
      }
      let counter = 0;
      let filesStreamed = [];
      let uidContainer = {};
      let urlContainer = {};
      return Promise.map(
        versionedAssetMetadata,
        function () {
          let assetMetadata = versionedAssetMetadata[counter];
          let assetPath = path.join(assetFolderPath, assetMetadata.filename);
          if (++counter === 1) {
            return self
              .uploadAsset(assetPath, assetMetadata, uidContainer, urlContainer)
              .then(function () {
                filesStreamed.push(assetMetadata.filename);
              })
              .catch(reject);
          }
          return self
            .updateAsset(assetPath, assetMetadata, filesStreamed, uidContainer, urlContainer)
            .then(function () {
              filesStreamed.push(assetMetadata.filename);
            })
            .catch((_error) => {
              // empty function
            });
        },
        {
          concurrency: 1,
        },
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
          addlogs(config, chalk.red('Failed to upload asset\n' + error), 'error');
          return resolve();
        });
    });
  },
  updateAsset: function (assetPath, metadata, filesStreamed, _uidContainer, urlContainer) {
    return new Promise(function (resolve, reject) {
      let requestOption = {};
      if (filesStreamed && filesStreamed.indexOf(metadata.filename) !== -1) {
        addlogs(config, 'Skipping re-upload/streaming of ' + metadata.uid + '/' + metadata.filename, 'success');
        requestOption.formData = {};
        return resolve();
      }

      addlogs(config, 'Streaming: ' + metadata.uid + '/' + metadata.filename, 'success');
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

      return upload(requestOption, assetPath)
        .then(function (response) {
          urlContainer[metadata.url] = response.url;
          return resolve();
        })
        .catch(function (error) {
          return reject(error);
        });
    });
  },
  uploadAsset: function (assetPath, metadata, uidContainer, urlContainer) {
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
      return upload(requestOption, assetPath)
        .then(function (response) {
          uidContainer[metadata.uid] = response.uid;
          urlContainer[metadata.url] = response.url;
          return resolve();
        })
        .catch(function (error) {
          addlogs(config, error, 'error');
          return reject(error);
        });
    });
  },

  importFolders: function () {
    let self = this;
    return new Promise(function (resolve, reject) {
      let mappedFolderPath = path.resolve(config.data, 'mapper', 'assets', 'folder-mapping.json');
      self.folderDetails = helper.readFile(path.resolve(assetsFolderPath, 'folders.json'));

      if (_.isEmpty(self.folderDetails)) {
        addlogs(config, 'No folders were found at: ' + path.join(assetsFolderPath, 'folders.json'), 'success');
        return resolve();
      }
      let tree = self.buildTree(_.cloneDeep(self.folderDetails));
      let createdFolders = {};
      let createdFolderUids = [];
      // if a few folders have already been created, skip re-creating them
      if (fs.existsSync(mappedFolderPath)) {
        createdFolders = helper.readFile(mappedFolderPath);
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
          return client
            .stack({ api_key: config.target_stack, management_token: config.management_token })
            .asset()
            .folder()
            .create(folder.json)
            .then((response) => {
              addlogs(config, "Created folder: '" + folder.json.asset.name + "'", 'success');
              // assigning newUid to oldUid
              createdFolders[folder.oldUid] = response.uid;
              helper.writeFile(mappedFolderPath, createdFolders);
              idx++;
            })
            .catch(function (err) {
              let error = JSON.parse(err.message);
              if (error.errors.authorization || error.errors.api_key) {
                addlogs(config, chalk.red('Api_key or management_token is not valid'), 'error');
                return reject(error);
              }
              return error;
            });
        },
        {
          concurrency: 1,
        },
      )
        .then(function () {
          self.mappedFolderUids = helper.readFile(mappedFolderPath);
          // completed creating folders
          return resolve();
        })
        .catch(function (error) {
          return reject(error);
        });
    });
  },
  buildFolderReqObjs: function (createdFolderUids, tree, parent_uid) {
    let self = this;
    for (let leaf in tree) {
      // if the folder is already created, skip
      if (createdFolderUids.indexOf(leaf) !== -1) {
        continue;
      }
      let folderObj = _.find(self.folderDetails, function (folder) {
        return folder.uid === leaf;
      });
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
  },
  buildTree: function (coll) {
    let tree = {};
    for (let i = 0; i < coll.length; i++) {
      // ! hasOwnProperty('parent_uid') added, as some folders do not have `parent_uid`
      if (coll[i].parent_uid === null || !coll[i].hasOwnProperty('parent_uid')) {
        tree[coll[i].uid] = {};
        coll.splice(i, 1);
        i--;
      }
    }
    this.findBranches(tree, _.keys(tree), coll);
    return tree;
  },
  findBranches: function (tree, branches, coll) {
    let self = this;
    _.forEach(branches, (branch) => {
      for (let j = 0; j < coll.length; j++) {
        if (branch === coll[j].parent_uid) {
          let childUid = coll[j].uid;
          tree[branch][childUid] = {};
          self.findBranches(tree[branch], [childUid], coll);
        }
      }
    });
  },
  publish: function (assetUid, assetObject) {
    let self = this;
    let envId = [];
    let locales = [];

    let requestObject = {
      json: {
        asset: {},
      },
    };

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
      return client
        .stack({ api_key: config.target_stack, management_token: config.management_token })
        .asset(assetUid)
        .publish({ publishDetails: requestObject.json.asset })
        .then(function () {
          addlogs(config, 'Asset ' + assetUid + ' published successfully', 'success');
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

            addlogs(config, chalk.red('Asset ' + assetUid + ' not published, ' + error.errorMessage), 'error');
            return reject(err);
          }
          return reject(err);
        });
    });
  },
};

module.exports = new importAssets();
