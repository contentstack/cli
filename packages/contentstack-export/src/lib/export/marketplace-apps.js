/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */
const _ = require('lodash')
const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const eachOf = require('async/eachOf');
const { HttpClient } = require('@contentstack/cli-utilities');

let config = require('../../config/default');
const { writeFile } = require('../util/helper');
const { addlogs: log } = require('../util/log');
let stack = require('../util/contentstack-management-sdk');

let client
let marketplaceAppConfig = config.modules.marketplace_apps;

function exportMarketplaceApps() {
  this.marketplaceAppPath = null
  this.start = (credentialConfig) => {
    config = credentialConfig;
    client = stack.Client(config);
    log(credentialConfig, 'Starting marketplace app export', 'success');
    this.marketplaceAppPath = path.resolve(
      config.data, config.branchName || '',
      marketplaceAppConfig.dirName
    );
    mkdirp.sync(this.marketplaceAppPath);

    this.getInstalledExtensions()
  }

  this.getInstalledExtensions = () => {
    const self = this
    const queryRequestOptions = {
      include_marketplace_extensions: true
    }
    const { apiKey: api_key, token: management_token } = config.management_token_data || {}

    return new Promise(function (resolve, reject) {
      client
        .stack({ api_key, management_token })
        .extension()
        .query(queryRequestOptions)
        .find()
        .then(({ items }) => {
          const installedApps = _.map(
            _.unionBy(_.filter(items, 'app_uid'), 'app_uid'),
            ({ uid, title, app_uid, app_installation_uid }) => ({ title, uid, app_uid, app_installation_uid })
          )
          const headers = {
            authtoken: config.auth_token,
            organization_uid: config.org_uid
          }
          const httpClient = new HttpClient().headers(headers);

          eachOf(installedApps, (apps, key, cb) => {
            httpClient.get(`${config.developerHubBaseUrl}/installations/${apps.app_installation_uid}/installationData`)
              .then(({ data: result }) => {
                const { data, error } = result

                if (
                  !_.isEmpty(data) &&
                  (_.has(data, 'configuration') || _.has(data, 'server_configuration'))
                ) {
                  const { configuration, server_configuration } = data
                  installedApps[key] = {
                    ...installedApps[key],
                    configuration,
                    server_configuration
                  }
                } else if (error) {
                  console.log(error)
                }
              }).then(cb)
              .catch(err => {
                console.log(err)
                cb()
              })
          }, () => {
            if (!_.isEmpty(installedApps)) {
              writeFile(
                path.join(self.marketplaceAppPath, marketplaceAppConfig.fileName),
                installedApps
              )

              log(config, chalk.green('All the locales have been exported successfully'), 'success')
            } else {
              log(config, 'No marketplace apps found', 'success')
            }

            resolve()
          })
        }).catch(reject)
    })
  }
}

module.exports = new exportMarketplaceApps();