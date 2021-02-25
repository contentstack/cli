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
const { result } = require('lodash');

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

        if (!self.releasesUidMapper.hasOwnProperty(releaseUid)) {
          let requestOption = {
            release: releases.releases
          };
          
          return client.stack({ api_key: config.target_stack, management_token: config.management_token }).release().create(requestOption)
            .then(async function (response) {
            
              var promiseResult =  await Promise.all(
                releases.items.map(async release => {
                 let item = release
                 console.log("Line no 75++++++++", item)
                 response.item().create({item})
                 .then((result) => {
                   console.log("result part yahape hai");
                 }).catch((error) => {
                  console.log("Linennnoo no 81++++++", error);
                 })
                 console.log("result++++++", itemCreated);
                 addlogs(config, chalk.white("Complete releases module"), 'success')
                  return
                })
              )
              
              // self.releaseItems(releaseUid, response.uid)
              // .then(() => {
              //   addlogs(config, chalk.white("complete releases module"), 'success')
              // })
              self.releasesUidMapper[releaseUid] = response.uid;
              // helper.writeFile(releasesUidMapperPath, self.releasesUidMapper);
              return;
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
        addlogs(config, (chalk.green('Releases have been imported successfully!')), 'success');
        return resolve();
      }).catch(function (error) {
        helper.writeFile(releasesFailsPath, self.fails);
        addlogs(config, chalk.red('Releases import failed'), 'error');
        return reject(error);
      });
    });
  },

  releaseItems: function(oldUid, NewUid) {
    new Promise(function(resolve, reject) {
      let requestOption = {
        items: releases
      };
      return client.stack({ api_key: config.target_stack, management_token: config.management_token }).release(NewUid).item().create({ items })
      .then(async function (response) {
        client.stack({ api_key: 'api_key'}).release('release_uid').item().create({ items })
       .then((release) => console.log(release))
      }).catch(function (error) {
       
      });
    })
  }
}
module.exports = new importReleases();