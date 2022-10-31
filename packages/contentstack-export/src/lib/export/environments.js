/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */
const path = require('path')
const chalk = require('chalk')
const mkdirp = require('mkdirp')

const helper = require('../util/helper')
const { addlogs } = require('../util/log')
const { formatError } = require('../util')
let stack = require('../util/contentstack-management-sdk')

module.exports = class ExportEnvironments {
  config = {}
  master = {}
  environments = {}
  requestOptions = {
    json: true,
    qs: {
      asc: 'updated_at',
      include_count: true
    }
  }

  constructor(mergeConfig) {
    this.config = mergeConfig
  }

  start() {
    let self = this
    let client = stack.Client(this.config)
    const environmentConfig = this.config.modules.environments
    const environmentsFolderPath = path.resolve(this.config.data, this.config.branchName || '', environmentConfig.dirName)

    // Create folder for environments
    mkdirp.sync(environmentsFolderPath)
    addlogs(this.config, 'Starting environment export', 'success')

    return new Promise(function (resolve, reject) {
      client
        .stack({ api_key: this.config.source_stack, management_token: this.config.management_token })
        .environment()
        .query(self.requestOptions.qs)
        .find()
        .then((environmentResponse) => {
          if (environmentResponse.items.length !== 0) {
            for (let i = 0, total = environmentResponse.count; i < total; i++) {
              let envUid = environmentResponse.items[i].uid
              self.master[envUid] = ''
              self.environments[envUid] = environmentResponse.items[i]
              delete self.environments[envUid].uid
              delete self.environments[envUid]['ACL']
            }
            helper.writeFile(path.join(environmentsFolderPath, environmentConfig.fileName), self.environments)
            addlogs(self.config, chalk.green('All the environments have been exported successfully'), 'success')
            return resolve()
          }
          if (environmentResponse.items.length === 0) {
            addlogs(self.config, 'No environments found', 'success')
            resolve()
          }
        }).catch((error) => {
          addlogs(self.config, `Environments export failed ${formatError(error)}`, 'error')
          reject(error)
        })
    })
  }
}
