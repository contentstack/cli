/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */
const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const { cliux, HttpClient, NodeCrypto } = require('@contentstack/cli-utilities');

let config = require('../../config/default');
const { addlogs: log } = require('../util/log');
const { readFileSync, writeFile } = require('../util/fs');
const sdk = require('../util/contentstack-management-sdk');
const { getDeveloperHubUrl, getInstalledExtensions } = require('../util/marketplace-app-helper');

module.exports = class ImportMarketplaceApps {
  client;
  marketplaceApps = [];
  marketplaceAppsUid = [];
  developerHubBaseUrl = null;
  marketplaceAppFolderPath = '';
  marketplaceAppConfig = config.modules.marketplace_apps;

  constructor(credentialConfig) {
    this.config = _.merge(config, credentialConfig);
  }

  async start() {
    this.client = sdk.Client(this.config);
    this.developerHubBaseUrl = await getDeveloperHubUrl();
    this.marketplaceAppFolderPath = path.resolve(this.config.data, this.marketplaceAppConfig.dirName);
    this.marketplaceApps = _.uniqBy(
      readFileSync(path.resolve(this.marketplaceAppFolderPath, this.marketplaceAppConfig.fileName)),
      'app_uid',
    );
    this.marketplaceAppsUid = _.map(this.marketplaceApps, 'uid');

    if (!this.config.auth_token && !_.isEmpty(this.marketplaceApps)) {
      cliux.print(
        'WARNING!!! To import Marketplace apps, you must be logged in. Please check csdx auth:login --help to log in',
        { color: 'yellow' },
      );
      return Promise.resolve();
    } else if (_.isEmpty(this.marketplaceApps)) {
      return Promise.resolve();
    }

    await this.getOrgUid();
    return this.handleInstallationProcess();
  }

  /**
   * @method getOrgUid
   * @returns {Void}
   */
  getOrgUid = async () => {
    const self = this;
    // NOTE get org uid
    if (self.config.auth_token) {
      const stack = await this.client
        .stack({ api_key: self.config.target_stack, authtoken: self.config.auth_token })
        .fetch()
        .catch((error) => {
          console.log(error);
          log(self.config, 'Starting marketplace app installation', 'success');
        });

      if (stack && stack.org_uid) {
        self.config.org_uid = stack.org_uid;
      }
    }
  };

  /**
   * @method handleInstallationProcess
   * @returns {Promise<void>}
   */
  handleInstallationProcess = async () => {
    const self = this;
    const headers = {
      authtoken: self.config.auth_token,
      organization_uid: self.config.org_uid,
    };
    const httpClient = new HttpClient().headers(headers);
    const nodeCrypto = new NodeCrypto();

    // NOTE install all private apps which is not available for stack.
    await this.handleAllPrivateAppsCreationProcess({ httpClient });
    const installedExtensions = await getInstalledExtensions(self.config);

    // NOTE after private app installation, refetch marketplace apps from file
    const marketplaceAppsFromFile = readFileSync(
      path.resolve(this.marketplaceAppFolderPath, self.marketplaceAppConfig.fileName),
    );
    this.marketplaceApps = _.filter(marketplaceAppsFromFile, ({ uid }) => _.includes(this.marketplaceAppsUid, uid));

    log(self.config, 'Starting marketplace app installation', 'success');

    for (let app of self.marketplaceApps) {
      await self.installApps({ app, installedExtensions, httpClient, nodeCrypto });
    }

    // NOTE get all the extension again after all apps installed (To manage uid mapping in content type, entries)
    const extensions = await getInstalledExtensions(self.config);
    const mapperFolderPath = path.join(self.config.data, 'mapper', 'marketplace_apps');

    if (!fs.existsSync(mapperFolderPath)) {
      mkdirp.sync(mapperFolderPath);
    }

    const appUidMapperPath = path.join(mapperFolderPath, 'marketplace-apps.json');
    const installedExt = _.map(extensions, (row) =>
      _.pick(row, ['uid', 'title', 'type', 'app_uid', 'app_installation_uid']),
    );

    writeFile(appUidMapperPath, installedExt);

    return Promise.resolve();
  };

  /**
   * @method handleAllPrivateAppsCreationProcess
   * @param {Object} options
   * @returns {Promise<void>}
   */
  handleAllPrivateAppsCreationProcess = async (options) => {
    const self = this;
    const { httpClient } = options;
    const listOfExportedPrivateApps = _.filter(self.marketplaceApps, { visibility: 'private' });

    if (_.isEmpty(listOfExportedPrivateApps)) {
      return Promise.resolve();
    }

    // NOTE get list of developer-hub installed apps (private)
    const installedDeveloperHubApps =
      (await httpClient
        .get(`${this.developerHubBaseUrl}/apps`)
        .then(({ data: { data } }) => data)
        .catch((err) => {
          console.log(err);
        })) || [];
    const listOfNotInstalledPrivateApps = _.filter(
      listOfExportedPrivateApps,
      (app) => !_.includes(_.map(installedDeveloperHubApps, 'uid'), app.app_uid),
    );

    if (!_.isEmpty(listOfNotInstalledPrivateApps) && !self.config.forceMarketplaceAppsImport) {
      const confirmation = await cliux.confirm(
        chalk.yellow(
          `WARNING!!! The listed apps are private apps that are not available in the destination stack: \n\n${_.map(
            listOfNotInstalledPrivateApps,
            ({ manifest: { name } }, index) => `${String(index + 1)}) ${name}`,
          ).join('\n')}\n\nWould you like to re-create the private app and then proceed with the installation? (y/n)`,
        ),
      );

      if (!confirmation) {
        const continueProcess = await cliux.confirm(
          chalk.yellow(
            `WARNING!!! Canceling the app re-creation may break the content type and entry import. Would you like to proceed? (y/n)`,
          ),
        );

        if (continueProcess) {
          return Promise.resolve();
        } else {
          process.exit();
        }
      }
    }

    log(self.config, 'Starting developer hub private apps re-creation', 'success');

    for (let app of listOfNotInstalledPrivateApps) {
      await self.createAllPrivateAppsInDeveloperHub({ app, httpClient });
    }

    return Promise.resolve();
  };

  /**
   * @method removeUidFromManifestUILocations
   * @param {Array<Object>} locations
   * @returns {Array<Object>}
   */
  removeUidFromManifestUILocations = (locations) => {
    return _.map(locations, (location) => {
      if (location.meta) {
        location.meta = _.map(location.meta, (meta) => _.omit(meta, ['uid']));
      }

      return location;
    });
  };

  /**
   * @method updateNameInManifestUILocations
   * @param {Array<Object>} locations
   * @returns {Array<Object>}
   */
  updateNameInManifestUILocations = (locations, appSuffix = 1) => {
    return _.map(locations, (location) => {
      if (location.meta) {
        location.meta = _.map(location.meta, (meta) => {
          meta.name = `${_.first(_.split(meta.name, '◈'))}◈${appSuffix}`;

          return meta;
        });
      }

      return location;
    });
  };

  getAppName = (name, appSuffix = 1) => {
    if (name.length >= 19) name = name.slice(0, 18);

    name = `${_.first(_.split(name, '◈'))}◈${appSuffix}`;

    return name;
  };

  /**
   * @method createAllPrivateAppsInDeveloperHub
   * @param {Object} options
   * @returns {Promise<void>}
   */
  createAllPrivateAppsInDeveloperHub = async (options, uidCleaned = false, appSuffix = 1, isRecursive = false) => {
    const self = this;
    const { app, httpClient } = options;

    return new Promise((resolve) => {
      if (!uidCleaned && app.manifest.ui_location && !_.isEmpty(app.manifest.ui_location.locations)) {
        app.manifest.ui_location.locations = this.removeUidFromManifestUILocations(app.manifest.ui_location.locations);
      } else if (isRecursive && app.manifest.ui_location && !_.isEmpty(app.manifest.ui_location.locations)) {
        app.manifest.ui_location.locations = this.updateNameInManifestUILocations(
          app.manifest.ui_location.locations,
          appSuffix - 1 || 1,
          isRecursive,
        );
      }

      if (app.manifest.name > 20) {
        app.manifest.name = app.manifest.name.slice(0, 20);
      }

      httpClient
        .post(`${this.developerHubBaseUrl}/apps`, app.manifest)
        .then(async ({ data: result }) => {
          const { name } = app.manifest;
          const { data, error, message } = result || {};

          if (error) {
            log(self.config, message, 'error');

            if (_.toLower(error) === 'conflict') {
              const appName = self.config.forceMarketplaceAppsImport
                ? self.getAppName(app.manifest.name, appSuffix)
                : await cliux.inquire({
                    type: 'input',
                    name: 'name',
                    default: `${app.manifest.name}◈${appSuffix}`,
                    validate: this.validateAppName,
                    message: `${message}. Enter a new name to create an app.?`,
                  });
              app.manifest.name = appName;

              await self
                .createAllPrivateAppsInDeveloperHub({ app, httpClient }, true, appSuffix + 1, true)
                .then(resolve)
                .catch(resolve);
            } else {
              if (self.config.forceMarketplaceAppsImport) return resolve();

              const confirmation = await cliux.confirm(
                chalk.yellow(
                  'WARNING!!! The above error may have an impact if the failed app is referenced in entries/content type. Would you like to proceed? (y/n)',
                ),
              );

              if (confirmation) {
                resolve();
              } else {
                process.exit();
              }
            }
          } else if (data) {
            // NOTE new app installation
            log(self.config, `${name} app created successfully.!`, 'success');
            this.updatePrivateAppUid(app, data, app.manifest);
          }

          resolve();
        })
        .catch((error) => {
          if (error && (error.message || error.error_message)) {
            log(self.config, error.message || error.error_message, 'error');
          } else {
            log(self.config, 'Something went wrong.!', 'error');
          }

          resolve();
        });
    });
  };

  /**
   * @method updatePrivateAppUid
   * @param {Object} app
   * @param {Object} data
   */
  updatePrivateAppUid = (app, data, manifest) => {
    const self = this;
    const allMarketplaceApps = readFileSync(
      path.resolve(self.marketplaceAppFolderPath, self.marketplaceAppConfig.fileName),
    );
    const index = _.findIndex(allMarketplaceApps, { uid: app.uid, visibility: 'private' });

    if (index > -1) {
      allMarketplaceApps[index] = {
        ...allMarketplaceApps[index],
        manifest,
        title: data.name,
        app_uid: data.uid,
        old_title: allMarketplaceApps[index].title,
        previous_data: [
          ...(allMarketplaceApps[index].old_data || []),
          { [`v${(allMarketplaceApps[index].old_data || []).length}`]: allMarketplaceApps[index] },
        ],
      };

      writeFile(path.join(self.marketplaceAppFolderPath, self.marketplaceAppConfig.fileName), allMarketplaceApps);
    }
  };

  /**
   * @method installApps
   * @param {Object} options
   * @returns {Void}
   */
  installApps = (options) => {
    const self = this;
    const { app, installedExtensions, httpClient, nodeCrypto } = options;

    return new Promise((resolve, reject) => {
      httpClient
        .post(`${self.developerHubBaseUrl}/apps/${app.app_uid}/install`, {
          target_type: 'stack',
          target_uid: self.config.target_stack,
        })
        .then(async ({ data: result }) => {
          let updateParam;
          const { title } = app;
          const { data, error, message, error_code, error_message } = result;

          if (error || error_code) {
            // NOTE if already installed copy only config data
            log(self.config, `${message || error_message} - ${title}`, 'success');
            const ext = _.find(installedExtensions, { app_uid: app.app_uid });

            if (ext) {
              if (!_.isEmpty(app.configuration) || !_.isEmpty(app.server_configuration)) {
                cliux.print(
                  `WARNING!!! The ${title} app already exists and it may have its own configuration. But the current app you install has its own configuration which is used internally to manage content.`,
                  { color: 'yellow' },
                );

                const configOption = self.config.forceMarketplaceAppsImport
                  ? 'Update it with the new configuration.'
                  : await cliux.inquire({
                      choices: [
                        'Update it with the new configuration.',
                        'Do not update the configuration (WARNING!!! If you do not update the configuration, there may be some issues with the content which you import).',
                        'Exit',
                      ],
                      type: 'list',
                      name: 'value',
                      message: 'Choose the option to proceed',
                    });

                if (configOption === 'Exit') {
                  process.exit();
                } else if (configOption === 'Update it with the new configuration.') {
                  updateParam = {
                    app,
                    nodeCrypto,
                    httpClient,
                    data: { ...ext, installation_uid: ext.app_installation_uid },
                  };
                }
              }
            } else {
              if (!self.config.forceMarketplaceAppsImport) {
                cliux.print(`WARNING!!! ${message || error_message}`, { color: 'yellow' });
                const confirmation = await cliux.confirm(
                  chalk.yellow(
                    'WARNING!!! The above error may have an impact if the failed app is referenced in entries/content type. Would you like to proceed? (y/n)',
                  ),
                );

                if (!confirmation) {
                  process.exit();
                }
              }
            }
          } else if (data) {
            // NOTE new app installation
            log(self.config, `${title} app installed successfully.!`, 'success');
            updateParam = { data, app, nodeCrypto, httpClient };
          }

          if (updateParam) {
            self.updateAppsConfig(updateParam).then(resolve).catch(reject);
          } else {
            resolve();
          }
        })
        .catch((error) => {
          if (error && (error.message || error.error_message)) {
            log(self.config, error.message || error.error_message, 'error');
          } else {
            log(self.config, 'Something went wrong.!', 'error');
          }

          reject();
        });
    });
  };

  updateConfigData(config) {
    const configKeyMapper = {};
    const serverConfigKeyMapper = {
      cmsApiKey: this.config.target_stack,
    };

    if (!_.isEmpty(config.configuration) && !_.isEmpty(configKeyMapper)) {
      _.forEach(_.keys(configKeyMapper), (key) => {
        config.configuration[key] = configKeyMapper[key];
      });
    }

    if (!_.isEmpty(config.server_configuration) && !_.isEmpty(serverConfigKeyMapper)) {
      _.forEach(_.keys(serverConfigKeyMapper), (key) => {
        config.server_configuration[key] = serverConfigKeyMapper[key];
      });
    }

    return config;
  }

  /**
   * @method updateAppsConfig
   * @param {Object<{ data, app, httpClient, nodeCrypto }>} param
   * @returns {Promise<void>}
   */
  updateAppsConfig = ({ data, app, httpClient, nodeCrypto }) => {
    const self = this;
    return new Promise((resolve, reject) => {
      let payload = {};
      const { title, configuration, server_configuration } = app;

      if (!_.isEmpty(configuration)) {
        payload['configuration'] = nodeCrypto.decrypt(configuration);
      }
      if (!_.isEmpty(server_configuration)) {
        payload['server_configuration'] = nodeCrypto.decrypt(server_configuration);
      }

      payload = self.updateConfigData(payload);

      if (_.isEmpty(data) || _.isEmpty(payload) || !data.installation_uid) {
        resolve();
      } else {
        httpClient
          .put(`${this.developerHubBaseUrl}/installations/${data.installation_uid}`, payload)
          .then(() => {
            log(self.config, `${title} app config updated successfully.!`, 'success');
          })
          .then(resolve)
          .catch((error) => {
            if (error && (error.message || error.error_message)) {
              log(self.config, error.message || error.error_message, 'error');
            } else {
              log(self.config, 'Something went wrong.!', 'error');
            }

            reject();
          });
      }
    });
  };

  validateAppName = (name) => {
    if (name.length < 3 || name.length > 20) {
      return 'The app name should be within 3-20 characters long.';
    }

    return true;
  };
};
