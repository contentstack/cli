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
const { cliux } = require('@contentstack/cli-utilities');
const { HttpClient, NodeCrypto } = require('@contentstack/cli-utilities');

let config = require('../../config/default');
const { addlogs: log } = require('../util/log');
const { readFile, writeFile } = require('../util/fs');
const sdk = require('../util/contentstack-management-sdk');
const { getInstalledExtensions } = require('../util/marketplace-app-helper')

let client
const marketplaceAppConfig = config.modules.marketplace_apps;

function importMarketplaceApps() {
  this.marketplaceApps = []
  this.marketplaceAppFolderPath = ''

  this.start = async (credentialConfig) => {
    config = credentialConfig;
    client = sdk.Client(config);
    this.marketplaceAppFolderPath = path.resolve(config.data, marketplaceAppConfig.dirName);
    this.marketplaceApps = _.uniqBy(
      readFile(path.resolve(this.marketplaceAppFolderPath, marketplaceAppConfig.fileName)),
      'app_uid'
    );

    await this.getOrgUid()
    return this.handleInstallationProcess()
  }

  /**
   * @method getOrgUid
   * @returns {Void}
   */
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

  /**
   * @method handleInstallationProcess
   * @returns {Promise<void>}
   */
  this.handleInstallationProcess = async () => {
    const self = this
    const headers = {
      authtoken: config.auth_token,
      organization_uid: config.org_uid
    }
    const httpClient = new HttpClient().headers(headers);
    const nodeCrypto = new NodeCrypto()

    // NOTE install private apps which is not available for stack.
    await this.installAllPrivateAppsInDeveloperHub({ httpClient })
    const installedExtensions = await getInstalledExtensions(config)

    return new Promise(function (resolve) {
      if (!_.isEmpty(self.marketplaceApps)) {
        log(config, 'Starting marketplace app installation', 'success');
      }

      eachOf(self.marketplaceApps, (app, _key, cb) => {
        self.installApps({ cb, app, installedExtensions, httpClient, nodeCrypto })
          .then(cb)
          .catch(cb)
      }, async () => {
        const extensions = await getInstalledExtensions(config)
        const mapperFolderPath = path.join(config.data, 'mapper', 'marketplace_apps');

        if (!fs.existsSync(mapperFolderPath)) {
          mkdirp.sync(mapperFolderPath);
        }

        const appUidMapperPath = path.join(mapperFolderPath, 'marketplace-apps.json')
        const installedExt = _.map(
          extensions,
          (row) => _.pick(row, ['uid', 'title', 'type', 'app_uid', 'app_installation_uid'])
        )

        writeFile(appUidMapperPath, installedExt);

        resolve()
      })
    })
  }

  /**
   * @method installAllPrivateAppsInDeveloperHub
   * @param {Object} options 
   * @returns {Promise<void>}
   */
  this.installAllPrivateAppsInDeveloperHub = async (options) => {
    const self = this
    const { httpClient } = options
    // NOTE get list of developer-hub installed apps (private)
    const installedDeveloperHubApps = await httpClient.get(`${config.extensionHost}/apps-api/apps/`)
      .then(({ data: { data } }) => data)
      .catch(err => {
        console.log(err)
      }) || []
    const listOfNotInstalledPrivateApps = _.filter(
      _.filter(self.marketplaceApps, { visibility: 'private' }),
      (app) => !_.includes(_.map(installedDeveloperHubApps, 'uid'), app.app_uid)
    )

    return new Promise(async function (resolve) {
      if (!_.isEmpty(listOfNotInstalledPrivateApps)) {
        log(config, 'Starting developer hub private apps installation', 'success');
        const confirmation = await cliux.confirm(
          `Following list for apps are private apps which are not available for this stack (${_.map(title).join()}). Would you like to proceed to install them y/n.?`
        );

        if (!confirmation) {
          return resolve()
        }
      }

      eachOf(listOfNotInstalledPrivateApps, (app, _key, cb) => {
        httpClient.post(
          `${config.extensionHost}/apps-api/apps`,
          app.manifest
        ).then(async function ({ data: result }) {
          const { title } = app;
          const { data, error, message } = result;

          if (error) {
            log(config, message, 'error');
            const confirmation = await cliux.confirm(
              'The above error may have impact if the failed app has referenced with entries/content type. Would you like to proceed. (y/n)?'
            );

            if (confirmation) {
              cb()
            } else {
              process.exit()
            }
          } else if (data) { // NOTE new app installation
            log(config, `${title} app installed successfully.!`, 'success');
            const index = _.findIndex(
              self.marketplaceApps,
              { uid: app.uid, visibility: 'private' }
            )
            if (index > -1) {
              self.marketplaceApps[index] = {
                ...self.marketplaceApps[index],
                new_app_uid: data.uid
              }

              writeFile(
                path.join(self.marketplaceAppFolderPath, marketplaceAppConfig.fileName),
                self.marketplaceApps
              )
            }

            cb()
          } else {
            cb();
          }
        }).catch(err => {
          console.log(err)
          cb()
        })
      }, resolve)
    })
  }

  /**
   * @method installApps
   * @param {Object} options 
   * @returns {Void}
   */
  this.installApps = (options) => {
    const self = this
    const { app, installedExtensions, httpClient, nodeCrypto } = options

    return new Promise((resolve, reject) => {
      httpClient.post(
        `${config.developerHubBaseUrl}/apps/${app.app_uid}/install`,
        { target_type: 'stack', target_uid: config.target_stack }
      ).then(function ({ data: result }) {
        let updateParam
        const { title } = app;
        const { data, error, message } = result;

        if (error) { // NOTE if already installed copy only config data
          log(config, `${message} - ${title}`, 'success');
          const ext = _.find(installedExtensions, { app_uid: app.app_uid });

          if (ext) {
            updateParam = {
              app,
              nodeCrypto,
              httpClient,
              data: { ...ext, installation_uid: ext.app_installation_uid }
            }
          }
        } else if (data) { // NOTE new app installation
          log(config, `${title} app installed successfully.!`, 'success');
          updateParam = { data, app, nodeCrypto, httpClient }
        }

        if (updateParam && !_.isEmpty(data)) {
          self.updateAppsConfig(updateParam)
            .then(resolve)
            .catch(reject)
        } else {
          resolve()
        }
      }).catch(err => {
        log(config, err.message, 'error')
        reject()
      })
    })
  }

  /**
   * @method updateAppsConfig
   * @param {Object<{ data, app, httpClient, nodeCrypto }>} param
   * @returns {Promise<void>}
   */
  this.updateAppsConfig = ({ data, app, httpClient, nodeCrypto }) => {
    return new Promise((resolve, reject) => {
      const payload = {}
      const { title, configuration, server_configuration } = app

      if (!_.isEmpty(configuration)) {
        payload['configuration'] = nodeCrypto.decrypt(configuration)
      }
      if (!_.isEmpty(server_configuration)) {
        payload['server_configuration'] = nodeCrypto.decrypt(server_configuration)
      }

      if (_.isEmpty(data) || _.isEmpty(payload) || !data.installation_uid) {
        resolve()
      } else {
        httpClient.put(`${config.developerHubBaseUrl}/installations/${data.installation_uid}`, payload)
          .then(() => {
            log(config, `${title} app config updated successfully.!`, 'success')
          }).then(resolve)
          .catch(err => {
            log(config, err.message, 'error')
            reject()
          })
      }
    })
  }
}

module.exports = new importMarketplaceApps();