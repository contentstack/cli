/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */
const _ = require('lodash')
const path = require('path');
const eachOf = require('async/eachOf');
const { HttpClient, NodeCrypto } = require('@contentstack/cli-utilities');

let config = require('../../config/default');
const { readFile } = require('../util/fs');
const { addlogs: log } = require('../util/log');
let stack = require('../util/contentstack-management-sdk');

let client
const marketplaceAppConfig = config.modules.marketplace_apps;

function importMarketplaceApps() {
  this.marketplaceApps = []
  this.marketplaceAppFolderPath = ''
  this.start = async (credentialConfig) => {
    config = credentialConfig;
    client = stack.Client(config);
    this.marketplaceAppFolderPath = path.resolve(config.data, marketplaceAppConfig.dirName);
    this.marketplaceApps = _.unionBy(
      readFile(path.resolve(this.marketplaceAppFolderPath, marketplaceAppConfig.fileName)),
      'app_uid'
    );

    await this.getOrgUid()
    return await this.installAppsAndUpdateConfig()
  }

  this.getOrgUid = async () => {
    // NOTE get org uid
    if (config.auth_token) {
      const stack = await client
        .stack({ api_key: config.target_stack, authtoken: config.auth_token })
        .fetch()
        .catch((error) => {
          console.log(error)
        })

      if (stack && stack.org_uid) {
        config.org_uid = stack.org_uid
      }
    }
  }

  this.installAppsAndUpdateConfig = () => {
    const self = this
    log(config, 'Starting marketplace app installation', 'success');
    const headers = {
      authtoken: config.auth_token,
      organization_uid: config.org_uid
    }
    const httpClient = new HttpClient().headers(headers);
    const nodeCrypto = new NodeCrypto()

    return new Promise(function (resolve, reject) {
      eachOf(self.marketplaceApps, (app, _key, cb) => {
        httpClient.post(
          `${config.developerHubBaseUrl}/apps/${app.app_uid}/install`,
          { target_type: 'stack', target_uid: config.target_stack }
        ).then(async ({ data: result }) => {
          const { data, error } = result
          const { title, configuration, server_configuration } = app

          if (error) {
            console.log(error)
            cb()
            return void 0
          } else if (data) {
            log(config, `${title} app installed successfully.!`, 'success')

            if (configuration || server_configuration) {
              const payload = {}

              if (!_.isEmpty(configuration)) {
                payload['configuration'] = nodeCrypto.decrypt(configuration)
              }
              if (!_.isEmpty(server_configuration)) {
                payload['server_configuration'] = nodeCrypto.decrypt(server_configuration)
              }

              if (_.isEmpty(payload) || !data.installation_uid) {
                cb()
              } else {
                httpClient.put(`${config.developerHubBaseUrl}/installations/${data.installation_uid}`, payload)
                  .then(() => {
                    log(config, `${title} app config updated successfully.!`, 'success')
                  }).then(cb)
                  .catch(err => {
                    console.log(err)
                    cb()
                  })
              }
            }
          } else {
            cb()
          }
        }).catch(err => {
          console.log(err)
          cb()
        })
      }, () => {
        resolve()
      })
    })
  }
}

module.exports = new importMarketplaceApps();