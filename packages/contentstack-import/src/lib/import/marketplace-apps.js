/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */
const fs = require('fs')
const _ = require('lodash')
const path = require('path');
const mkdirp = require('mkdirp');
const eachOf = require('async/eachOf');
const { HttpClient, NodeCrypto } = require('@contentstack/cli-utilities');

let config = require('../../config/default');
const { readFile, writeFile } = require('../util/fs');
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
    return await this.installApps()
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

  this.getInstalledExtensions = () => {
    return new Promise((resolve, reject) => {
      const queryRequestOptions = {
        include_marketplace_extensions: true
      }
      const { target_stack: api_key, management_token } = config || {}

      if (api_key && management_token) {
        return client
          .stack({ api_key, management_token })
          .extension()
          .query(queryRequestOptions)
          .find()
          .then(({ items }) => resolve(items))
          .catch(reject)
      } else {
        resolve([])
      }
    })
  }

  this.installApps = async () => {
    const self = this
    log(config, 'Starting marketplace app installation', 'success');
    const headers = {
      authtoken: config.auth_token,
      organization_uid: config.org_uid
    }
    const httpClient = new HttpClient().headers(headers);
    const nodeCrypto = new NodeCrypto()
    const installedExtensions = await this.getInstalledExtensions()

    return new Promise(function (resolve, reject) {
      eachOf(self.marketplaceApps, (app, _key, cb) => {
        httpClient.post(
          `${config.developerHubBaseUrl}/apps/${app.app_uid}/install`,
          { target_type: 'stack', target_uid: config.target_stack }
        ).then(async ({ data: result }) => {
          const { title } = app
          const { data, error, message } = result

          if (error) {
            log(config, `${message} - ${title}`, 'success')
            const ext = _.find(installedExtensions, { app_uid: app.app_uid })

            if (ext) {
              self.updateAppsConfig({
                app,
                nodeCrypto,
                httpClient,
                data: { ...ext, installation_uid: ext.app_installation_uid }
              }).then(cb)
                .catch(cb)
            }
            return void 0
          } else if (data) {
            log(config, `${title} app installed successfully.!`, 'success')
            self.updateAppsConfig({ data, app, nodeCrypto, httpClient })
              .then(cb)
              .catch(cb)
          } else {
            cb()
          }
        }).catch(err => {
          console.log(err)
          cb()
        })
      }, async () => {
        const installedExtensions = await self.getInstalledExtensions()
        const mapperFolderPath = path.join(config.data, 'mapper', 'marketplace_apps');

        if (!fs.existsSync(mapperFolderPath)) {
          mkdirp.sync(mapperFolderPath);
        }

        const appUidMapperPath = path.join(mapperFolderPath, 'marketplace-apps.json')
        const installedExt = _.map(
          installedExtensions,
          (row) => _.pick(row, ['uid', 'title', 'type', 'app_uid', 'app_installation_uid'])
        )

        writeFile(appUidMapperPath, installedExt);

        resolve()
      })
    })
  }

  this.updateAppsConfig = ({ data, app, httpClient, nodeCrypto }) => {
    return new Promise((resolve, reject) => {
      if (_.isEmpty(data)) {
        return resolve()
      } else {
        const { title, configuration, server_configuration } = app
        log(config, `${title} app config updated started.!`, 'success')

        if (configuration || server_configuration) {
          const payload = {}

          if (!_.isEmpty(configuration)) {
            payload['configuration'] = nodeCrypto.decrypt(configuration)
          }
          if (!_.isEmpty(server_configuration)) {
            payload['server_configuration'] = nodeCrypto.decrypt(server_configuration)
          }

          if (_.isEmpty(payload) || !data.installation_uid) {
            resolve()
          } else {
            httpClient.put(`${config.developerHubBaseUrl}/installations/${data.installation_uid}`, payload)
              .then(() => {
                log(config, `${title} app config updated successfully.!`, 'success')
              }).then(resolve)
              .catch(err => {
                console.log(err)
                reject()
              })
          }
        } else {
          return resolve()
        }
      }
    })
  }

  this.getExtensionUid = () => {
    return new Promise((resolve, reject) => {
      const queryRequestOptions = {
        include_marketplace_extensions: true
      }
      const { target_stack: api_key, management_token } = config || {}

      if (api_key && management_token) {
        return client
          .stack({ api_key, management_token })
          .extension()
          .query(queryRequestOptions)
          .find()
          .then(({ items }) => resolve(items))
          .catch(reject)
      } else {
        resolve([])
      }
    })
  }
}

module.exports = new importMarketplaceApps();