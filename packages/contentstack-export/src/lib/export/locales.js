/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp')
const path = require('path')
const chalk = require('chalk')

const helper = require('../util/helper')
const {addlogs} = require('../util/log')
let config = require('../../config/default')
let localeConfig = config.modules.locales
const masterLocale = config.master_locale
let requiredKeys = localeConfig.requiredKeys
let stack = require('../util/contentstack-management-sdk')


function ExportLocales() {
  this.qs = {
    include_count: true,
    asc: 'updated_at',
    query: {
      code: {
        $nin: [masterLocale.code],
      },
    },
    only: {
      BASE: requiredKeys,
    },
  }
  this.locales = {}
}

ExportLocales.prototype.start = function (credentialConfig) {
  addlogs(credentialConfig, 'Starting locale export', 'success')
  let self = this
  config = credentialConfig
  let localesFolderPath = path.resolve(config.data, localeConfig.dirName)
  mkdirp.sync(localesFolderPath)

  let client = stack.Client(config)
  return new Promise(function (resolve, reject) {
    client.stack({api_key: config.source_stack, management_token: config.management_token}).locale().query(self.qs).find()
    .then(localeResponse => {
      if (localeResponse.items.length !== 0) {
        localeResponse.items.forEach(function (locale) {
          addlogs(credentialConfig, locale.name + ' locale was exported successfully', 'success')
          for (const key in locale) {
            if (requiredKeys.indexOf(key) === -1) {
              delete locale.key
            }
          }
          self.locales[locale.uid] = locale
        })
        addlogs(credentialConfig, chalk.green('All the locales have been exported successfully'), 'success')
      } else if (localeResponse.items.length === 0) {
        addlogs(credentialConfig, 'No languages found except the master language', 'success')
      }
      helper.writeFile(path.join(localesFolderPath, localeConfig.fileName), self.locales)
      return resolve()
    }).catch(error => {
      addlogs(credentialConfig, error, 'error')
      return reject()
    })
  })
}

module.exports = new ExportLocales()
