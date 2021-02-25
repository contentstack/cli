/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp')
const path = require('path')
const chalk = require('chalk')

let helper = require('../util/helper')
let { addlogs } = require('../util/log')
let _  = require('lodash')

const stack = require('../util/contentstack-management-sdk')
let config = require('../../config/default')
const { result } = require('lodash')
const releases = require('../../../../contentstack-import/src/lib/import/releases')
let releaseConfig = config.modules.releases
let client

function ExportReleases() {
  this.releases = {}
}

ExportReleases.prototype = {
  start: function (credentialConfig) {
    addlogs(config, 'Starting releases export', 'success')
    let self = this
    config = credentialConfig
    client = stack.Client(config)
    let releasesFolderPath = path.resolve(config.data, releaseConfig.dirName)
    mkdirp.sync(releasesFolderPath)
    return new Promise(function (resolve, reject) {
      let releasesNameList = []
      //   console.log("jdjjdjjddjdj", client.stack({api_key: config.source_stack, management_token: config.management_token}).release().query())
      return client.stack({ api_key: config.source_stack, management_token: config.management_token }).release().query().find()
      .then(async response => {
        if (response.items.length !== 0) {
          var promiseResult =  await Promise.all(
            response.items.map(async release => {
              releasesNameList.push(release.name)
              const result = await release.item().findAll()
              self.releases[release.uid] = {'items': result.items, 'releases': release}
              return
            })
          )
          addlogs(config, chalk.green('All the release have been exported successfully'), 'success')
        } else if (response.items.length === 0) {
          addlogs(config, 'No release were found in the Stack', 'success')
        }
        helper.writeFile(path.join(releasesFolderPath, releaseConfig.fileName), self.releases)
        helper.writeFile(path.join(releasesFolderPath, releaseConfig.releasesList),  self.releasesNameJson)
        return resolve()
      }).catch(function (error) {
        if (error.statusCode === 401) {
          addlogs(config, chalk.red('You are not allowed to export release, Unless you provide email and password in config', 'error'))
          return resolve()
        }
        addlogs(config, error, 'error')
        return reject()
      })
    })
  },
}

module.exports = new ExportReleases()
