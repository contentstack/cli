/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */
const fs = require('fs')
const _ = require('lodash')
const path = require('path')
const chalk = require('chalk')
const mkdirp = require('mkdirp')
const inquirer = require('inquirer')
const eachOf = require('async/eachOf')
const { cliux } = require('@contentstack/cli-utilities')
const { HttpClient, NodeCrypto } = require('@contentstack/cli-utilities')

let config = require('../../config/default')
const { addlogs: log } = require('../util/log')
const { readFile, writeFile } = require('../util/fs')
const sdk = require('../util/contentstack-management-sdk')
const { getInstalledExtensions } = require('../util/marketplace-app-helper')

let client
const marketplaceAppConfig = config.modules.marketplace_apps

function importMarketplaceApps() {
  this.marketplaceApps = []
  this.marketplaceAppFolderPath = ''

  this.start = async (credentialConfig) => {
    config = credentialConfig
    client = sdk.Client(config)
    this.marketplaceAppFolderPath = path.resolve(config.data, marketplaceAppConfig.dirName)
    this.marketplaceApps = _.uniqBy(
      readFile(path.resolve(this.marketplaceAppFolderPath, marketplaceAppConfig.fileName)),
      'app_uid'
    )

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
    const httpClient = new HttpClient().headers(headers)
    const nodeCrypto = new NodeCrypto()

    // NOTE install private apps which is not available for stack.
    await this.handleAllPrivateAppsInstallationProcess({ httpClient })
    const installedExtensions = await getInstalledExtensions(config)

    // NOTE after private app installation refetch marketplace apps from file
    this.marketplaceApps = _.uniqBy(
      readFile(path.resolve(this.marketplaceAppFolderPath, marketplaceAppConfig.fileName)),
      'app_uid'
    )

    if (!_.isEmpty(self.marketplaceApps)) {
      log(config, 'Starting marketplace app installation', 'success')
    }

    for (let app of self.marketplaceApps) {
      await self.installApps({ app, installedExtensions, httpClient, nodeCrypto })
    }

    // NOTE get all the extension again after all apps installed (To manage uid mapping in content type, entries)
    const extensions = await getInstalledExtensions(config)
    const mapperFolderPath = path.join(config.data, 'mapper', 'marketplace_apps')

    if (!fs.existsSync(mapperFolderPath)) {
      mkdirp.sync(mapperFolderPath)
    }

    const appUidMapperPath = path.join(mapperFolderPath, 'marketplace-apps.json')
    const installedExt = _.map(
      extensions,
      (row) => _.pick(row, ['uid', 'title', 'type', 'app_uid', 'app_installation_uid'])
    )

    writeFile(appUidMapperPath, installedExt)

    return Promise.resolve()
  }

  /**
   * @method handleAllPrivateAppsInstallationProcess
   * @param {Object} options 
   * @returns {Promise<void>}
   */
  this.handleAllPrivateAppsInstallationProcess = async (options) => {
    const self = this
    const { httpClient } = options
    const listOfExportedPrivateApps = _.filter(self.marketplaceApps, { visibility: 'private' })

    if (_.isEmpty(listOfExportedPrivateApps)) {
      return Promise.resolve()
    }

    // NOTE get list of developer-hub installed apps (private)
    const installedDeveloperHubApps = await httpClient.get(`${config.extensionHost}/apps-api/apps/`)
      .then(({ data: { data } }) => data)
      .catch(err => {
        console.log(err)
      }) || []
    const listOfNotInstalledPrivateApps = _.filter(
      listOfExportedPrivateApps,
      (app) => (
        !_.includes(_.map(installedDeveloperHubApps, 'uid'), app.app_uid) &&
        !_.includes(_.map(installedDeveloperHubApps, 'uid'), app.new_app_uid)
      )
    )

    if (!_.isEmpty(listOfNotInstalledPrivateApps)) {
      log(config, 'Starting developer hub private apps installation', 'success')
      const confirmation = await cliux.confirm(
        chalk.yellow(`WARNING!!! The following list of apps are private apps which are not available for this stack [${_.map(listOfNotInstalledPrivateApps, 'title').join()}]. Would you like to proceed with installing them? y/n`)
      )

      if (!confirmation) {
        const continueProcess = await cliux.confirm(
          chalk.yellow(`WARNING!!! Hence, you canceled the installation which may break content-type and entry import. Would you like to proceed.? y/n`)
        )

        if (continueProcess) {
          return resolve()
        } else {
          process.exit()
        }
      }
    }

    for (let app of listOfNotInstalledPrivateApps) {
      await self.installAllPrivateAppsInDeveloperHub({ app, httpClient })
    }

    return Promise.resolve()
  }

  /**
   * @method installAllPrivateAppsInDeveloperHub
   * @param {Object} options 
   * @returns {Promise<void>}
   */
  this.installAllPrivateAppsInDeveloperHub = async (options) => {
    const self = this
    const { app, httpClient } = options

    return new Promise((resolve) => {
      httpClient.post(
        `${config.extensionHost}/apps-api/apps`,
        app.manifest
      ).then(async ({ data: result }) => {
        const { title } = app
        const { data, error, message } = result

        if (error) {
          log(config, message, 'error')

          if (_.toLower(error) === 'conflict') {
            const appName = await inquirer.prompt({
              type: 'input',
              name: 'name',
              default: `Copy of ${app.manifest.name}`,
              message: `${message}. Enter a new name to create an app.?`,
            })
            app.manifest.name = appName.name
            await self.installAllPrivateAppsInDeveloperHub({ app, httpClient })
              .then(resolve)
              .catch(resolve)
          } else {
            const confirmation = await cliux.confirm(
              chalk.yellow('WARNING!!! The above error may have an impact if the failed app has been referenced in entries/content type. Would you like to proceed.? (y/n)')
            )

            if (confirmation) {
              resolve()
            } else {
              process.exit()
            }
          }
        } else if (data) { // NOTE new app installation
          log(config, `${title} app installed successfully.!`, 'success')
          this.updatePrivateAppUid(app, data)
        }

        resolve()
      }).catch(error => {
        log(config, error.message, 'success')
        resolve()
      })
    })
  }

  /**
   * @method updatePrivateAppUid
   * @param {Object} app 
   * @param {Object} data 
   */
  this.updatePrivateAppUid = (app, data) => {
    const allMarketplaceApps = readFile(path.resolve(self.marketplaceAppFolderPath, marketplaceAppConfig.fileName))
    const index = _.findIndex(
      allMarketplaceApps,
      { uid: app.uid, visibility: 'private' }
    )
    if (index > -1) {
      allMarketplaceApps[index] = {
        ...allMarketplaceApps[index],
        new_app_uid: data.uid
      }

      writeFile(
        path.join(self.marketplaceAppFolderPath, marketplaceAppConfig.fileName),
        allMarketplaceApps
      )
    }
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
        `${config.developerHubBaseUrl}/apps/${app.new_app_uid || app.app_uid}/install`,
        { target_type: 'stack', target_uid: config.target_stack }
      ).then(async ({ data: result }) => {
        let updateParam
        const { title } = app
        const { data, error, message } = result

        if (error) { // NOTE if already installed copy only config data
          log(config, `${message} - ${title}`, 'success')
          const ext = _.find(installedExtensions, { app_uid: app.app_uid })

          if (ext) {
            cliux.print(
              'WARNING!!! The app already exists and it may have its own configuration. But the current app we install has its own config which is used internally to manage content.',
              { color: 'yellow' }
            )
            const configOption = await inquirer.prompt([
              {
                choices: [
                  'Update with new config',
                  'Don\'t update config (WARNING!!! There may be some issues with contents which we import)',
                  'Exit'
                ],
                type: 'list',
                name: 'value',
                message: 'Choose the option to proceed'
              }
            ])

            if (configOption.value === 'Exit') {
              process.exit()
            } else if (configOption.value === 'Update with new config') {
              updateParam = {
                app,
                nodeCrypto,
                httpClient,
                data: { ...ext, installation_uid: ext.app_installation_uid }
              }
            }
          } else {
            cliux.print(`WARNING!!! ${message}`, { color: 'yellow' })
            const confirmation = await cliux.confirm(
              chalk.yellow('WARNING!!! The above error may have an impact if the failed app has been referenced in entries/content type. Would you like to proceed.? (y/n)')
            )

            if (!confirmation) {
              process.exit()
            }
          }
        } else if (data) { // NOTE new app installation
          log(config, `${title} app installed successfully.!`, 'success')
          updateParam = { data, app, nodeCrypto, httpClient }
        }

        if (updateParam) {
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

module.exports = new importMarketplaceApps()