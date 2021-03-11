/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const chalk = require('chalk');
const _ = require('lodash')

const helper = require('../util/fs');
const { addlogs } = require('../util/log');
let config = require('../../config/default')
let stack = require('../util/contentstack-management-sdk');
const { add } = require('lodash');

let reqConcurrency = config.concurrency;
let releasesConfig = config.modules.releases;
let releasesFolderPath
let releasesMapperPath
let releasesUidMapperPath
let releasesSuccessPath
let releasesFailsPath
let client


function importReleases() {
  this.fails = [];
  this.success = [];
  this.releasesUidMapper = {};
  this.labelUids = [];
  if (fs.existsSync(releasesUidMapperPath)) {
    this.releasesUidMapper = helper.readFile(releasesUidMapperPath);
    this.releasesUidMapper = this.releasesUidMapper || {};
  }
}

importReleases.prototype = {
  start: function (credentialConfig) {
    let self = this;
    config = credentialConfig
    client = stack.Client(config)
    addlogs(config, chalk.white('Migrating releases'), 'success')
    releasesFolderPath = path.resolve(config.data, releasesConfig.dirName)
    self.releases = helper.readFile(path.resolve(releasesFolderPath, releasesConfig.fileName));
    releasesMapperPath = path.resolve(config.data, 'mapper', 'releases');
    releasesUidMapperPath = path.resolve(config.data, 'mapper', 'releases', 'uid-mapping.json');
    assetsUidMapperPath = path.resolve(config.data, 'mapper', 'assets', 'uid-mapping.json');
    entriesUidMapperPath = path.resolve(config.data, 'mapper', 'entries', 'uid-mapping.json');
    releasesSuccessPath = path.resolve(config.data, 'releases', 'success.json');
    releasesFailsPath = path.resolve(config.data, 'releases', 'fails.json');
    mkdirp.sync(releasesMapperPath);
    return new Promise(function (resolve, reject) {
      if (self.releases == undefined) {
        addlogs(config, chalk.white('No releases Found'), 'error');
        return resolve();
      }
      self.releasesUids = Object.keys(self.releases);
      return Promise.map(self.releasesUids, function (releaseUid) {
        let releases = self.releases[releaseUid];
            self.assetsUids = helper.readFile(assetsUidMapperPath)
            self.entriesUids = helper.readFile(entriesUidMapperPath)

        if (!self.releasesUidMapper.hasOwnProperty(releaseUid)) {
          let requestOption = {
            release: releases.releases
          };
          
          client.stack({ api_key: config.target_stack, management_token: config.management_token }).release().create(requestOption)
            .then(async function (response) {
              
              if (releases.items.length !== 0 ) {
               Promise.all(
                  releases.items.map(async release => {
                   let item = release
                   if (item.content_type_uid === 'built_io_upload') {
                    item.uid = self.assetsUids[item.uid] 
                   } else {
                    item.uid = self.entriesUids[item.uid]
                   }
                  response.item().create({item})
                   .then((responseData) => {
                    //  responseData.deploy({environment: ''})
                    // addlogs(config, chalk.white("Item added under "+ response.name), 'success')
                   }).catch((error) => {
                    addlogs(config, error, 'error')
                    addlogs(config, chalk.white("Fail to add items under "+ response.name), 'error')
                   })
                  })
                )
                .then(() => {
                  self.releasesUidMapper[releaseUid] = response.uid;
                  helper.writeFile(releasesUidMapperPath, self.releasesUidMapper);
                  return;
                })
              }
            }).catch(function (error) {
              self.fails.push(releases);
              if (error.errors.name) {
                addlogs(config, chalk.red('releases: \'' + releases.name + '\'  already exist'), 'error');
              } else {
                addlogs(config, chalk.red('releases: \'' + releases.name + '\' failed to be imported\n'), 'error');
              }
              return;
            });
        } else {
          // the release has already been created
          addlogs(config, (chalk.white('The Releases: \'' + releases.name +
            '\' already exists. Skipping it to avoid duplicates!')), 'success');
          return;
        }
        // import 1 releases at a time
      }, {
        concurrency: reqConcurrency
      }).then(function () {
        helper.writeFile(releasesSuccessPath, self.success);
        addlogs(config, (chalk.green('All releases have been imported successfully!')), 'success');
        return resolve();
      }).catch(function (error) {
        helper.writeFile(releasesFailsPath, self.fails);
        addlogs(config, chalk.red('Releases import failed'), 'error');
        return reject(error);
      });
    });
  }
}
module.exports = new importReleases();