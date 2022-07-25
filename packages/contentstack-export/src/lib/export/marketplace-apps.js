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
const { HttpClient, NodeCrypto } = require('@contentstack/cli-utilities');

let config = require('../../config/default');
const { writeFile } = require('../util/helper');
const { addlogs: log } = require('../util/log');
let stack = require('../util/contentstack-management-sdk');
const { getInstalledExtensions } = require('../util/marketplace-app-helper')

let client
let marketplaceAppConfig = config.modules.marketplace_apps;

function exportMarketplaceApps() {
  this.marketplaceAppPath = null
  this.start = async (credentialConfig) => {
    config = credentialConfig;
    client = stack.Client(config);
    log(credentialConfig, 'Starting marketplace app export', 'success');
    this.marketplaceAppPath = path.resolve(
      config.data, config.branchName || '',
      marketplaceAppConfig.dirName
    );
    mkdirp.sync(this.marketplaceAppPath);

    return this.exportInstalledExtensions()
  }

  this.exportInstalledExtensions = () => {
    const self = this

    return new Promise(async function (resolve, reject) {
      getInstalledExtensions(config)
        .then(async (items) => {
          const installedApps = _.map(
            _.filter(items, 'app_uid'),
            ({ uid, title, app_uid, app_installation_uid }) => ({ title, uid, app_uid, app_installation_uid })
          )
          const headers = {
            authtoken: config.auth_token,
            organization_uid: config.org_uid
          }
          const httpClient = new HttpClient().headers(headers);
          const nodeCrypto = new NodeCrypto()
          const developerHubApps = await httpClient.get(`${config.developerHubBaseUrl}/apps`)
            .then(({ data: { data } }) => data)
            .catch(err => {
              console.log(err)
            }) || []

          eachOf(installedApps, (apps, key, cb) => {
            log(config, `Exporting ${apps.title} app and it's config.`, 'success')

            httpClient.get(`${config.developerHubBaseUrl}/installations/${apps.app_installation_uid}/installationData`)
              .then(({ data: result }) => {
                const { data, error } = result
                const developerHubApp = _.find(developerHubApps, { uid: installedApps[key].app_uid })

                if (developerHubApp) {
                  installedApps[key]['visibility'] = developerHubApp.visibility
                  installedApps[key]['manifest'] = _.pick(
                    developerHubApp,
                    ['name', 'description', 'icon', 'target_type', 'ui_location', 'webhook', 'oauth'] // NOTE keys can be passed to install new app in the developer hub
                  )
                }

                if (
                  !_.isEmpty(data) &&
                  (_.has(data, 'configuration') || _.has(data, 'server_configuration'))
                ) {
                  const { configuration, server_configuration } = data

                  if (!_.isEmpty(configuration)) {
                    installedApps[key]['configuration'] = nodeCrypto.encrypt(configuration)
                  }
                  if (!_.isEmpty(server_configuration)) {
                    installedApps[key]['server_configuration'] = nodeCrypto.encrypt(server_configuration)
                  }

                  log(config, `Exported ${apps.title} app and it's config.`, 'success')
                } else if (error) {
                  console.log(error)
                  log(config, `Error on exporting ${apps.title} app and it's config.`, 'error')
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

              log(config, chalk.green('All the marketplace apps have been exported successfully'), 'success')
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