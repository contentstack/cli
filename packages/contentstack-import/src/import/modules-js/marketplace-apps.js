/*!
 * Contentstack Export
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */
const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const {
  cliux,
  HttpClient,
  NodeCrypto,
  managementSDKClient,
  isAuthenticated,
  HttpClientDecorator,
  OauthDecorator,
} = require('@contentstack/cli-utilities');

const {
  log,
  formatError,
  fileHelper: { readFileSync, writeFile },
} = require('../../utils');
const { trace } = require('../../utils/log');
const { default: config } = require('../../config');
const { getDeveloperHubUrl, getAllStackSpecificApps } = require('../../utils/marketplace-app-helper');

module.exports = class ImportMarketplaceApps {
  client;
  httpClient;
  appOriginalName;
  appUidMapping = {};
  appNameMapping = {};
  marketplaceApps = [];
  installationUidMapping = {};
  developerHubBaseUrl = null;
  marketplaceAppFolderPath = '';
  marketplaceAppConfig = config.modules.marketplace_apps;

  constructor(importConfig, stackAPIClient) {
    this.config = _.merge(config, importConfig);
    this.stackAPIClient = stackAPIClient;
  }

  async start() {
    this.mapperDirPath = path.resolve(this.config.data, 'mapper', 'marketplace_apps');
    this.uidMapperPath = path.join(this.mapperDirPath, 'uid-mapping.json');
    this.marketplaceAppFolderPath = path.resolve(this.config.data, this.marketplaceAppConfig.dirName);
    this.marketplaceApps = readFileSync(
      path.resolve(this.marketplaceAppFolderPath, this.marketplaceAppConfig.fileName),
    );

    if (_.isEmpty(this.marketplaceApps)) {
      return Promise.resolve();
    } else if (!isAuthenticated()) {
      cliux.print(
        '\nWARNING!!! To import Marketplace apps, you must be logged in. Please check csdx auth:login --help to log in\n',
        { color: 'yellow' },
      );
      return Promise.resolve();
    }

    this.developerHubBaseUrl = this.config.developerHubBaseUrl || (await getDeveloperHubUrl(this.config));
    this.config.developerHubBaseUrl = this.developerHubBaseUrl;
    this.client = await managementSDKClient({ endpoint: this.developerHubBaseUrl });
    this.appSdkAxiosInstance = await managementSDKClient({
      host: this.developerHubBaseUrl.split('://').pop()
    });
    await this.getOrgUid();

    const httpClient = new HttpClient();
    if (!this.config.auth_token) {
      this.httpClient = new OauthDecorator(httpClient);
      const headers = await this.httpClient.preHeadersCheck(this.config);
      this.httpClient = this.httpClient.headers(headers);
    } else {
      this.httpClient = new HttpClientDecorator(httpClient);
      this.httpClient.headers(this.config);
    }

    if (!fs.existsSync(this.mapperDirPath)) {
      mkdirp.sync(this.mapperDirPath);
    }

    return this.startInstallation();
  }

  async getOrgUid() {
    const tempAPIClient = await managementSDKClient({ host: this.config.host });
    const tempStackData = await tempAPIClient
      .stack({ api_key: this.config.target_stack })
      .fetch()
      .catch((error) => {
        console.log(error);
      });

    if (tempStackData?.org_uid) {
      this.config.org_uid = tempStackData.org_uid;
    }
  }

  async getAndValidateEncryptionKey(defaultValue, retry = 1) {
    let appConfig = _.find(
      this.marketplaceApps,
      ({ configuration, server_configuration }) => !_.isEmpty(configuration) || !_.isEmpty(server_configuration),
    );

    if (!appConfig) {
      return defaultValue;
    }

    const encryptionKey = await cliux.inquire({
      type: 'input',
      name: 'name',
      default: defaultValue,
      validate: (key) => {
        if (!key) return "Encryption key can't be empty.";

        return true;
      },
      message: 'Enter Marketplace app configurations encryption key',
    });

    try {
      appConfig = !_.isEmpty(appConfig.configuration) ? appConfig.configuration : appConfig.server_configuration;
      this.nodeCrypto = new NodeCrypto({ encryptionKey });
      this.nodeCrypto.decrypt(appConfig);
    } catch (error) {
      if (retry < this.config.getEncryptionKeyMaxRetry && error.code === 'ERR_OSSL_EVP_BAD_DECRYPT') {
        cliux.print(
          `Provided encryption key is not valid or your data might be corrupted.! attempt(${retry}/${this.config.getEncryptionKeyMaxRetry})`,
          { color: 'red' },
        );
        // NOTE max retry limit is 3
        return this.getAndValidateEncryptionKey(encryptionKey, retry + 1);
      } else {
        cliux.print(
          `Maximum retry limit exceeded. Closing the process, please try again.! attempt(${retry}/${this.config.getEncryptionKeyMaxRetry})`,
          { color: 'red' },
        );
        process.exit(1);
      }
    }

    return encryptionKey;
  }

  /**
   * @method startInstallation
   * @returns {Promise<void>}
   */
  async startInstallation() {
    const cryptoArgs = {};

    if (this.config.marketplaceAppEncryptionKey) {
      cryptoArgs['encryptionKey'] = this.config.marketplaceAppEncryptionKey;
    }

    if (this.config.forceStopMarketplaceAppsPrompt) {
      cryptoArgs['encryptionKey'] = this.config.marketplaceAppEncryptionKey;
      this.nodeCrypto = new NodeCrypto(cryptoArgs);
    } else {
      await this.getAndValidateEncryptionKey(this.config.marketplaceAppEncryptionKey);
    }

    // NOTE install all private apps which is not available for stack.
    await this.handleAllPrivateAppsCreationProcess();
    const installedApps = await getAllStackSpecificApps(this.config);

    log(this.config, 'Starting marketplace app installation', 'success');

    for (let app of this.marketplaceApps) {
      await this.installApps(app, installedApps);
    }

    const uidMapper = await this.generateUidMapper();
    await writeFile(this.uidMapperPath, {
      app_uid: this.appUidMapping,
      extension_uid: uidMapper || {},
      installation_uid: this.installationUidMapping,
    });
  }

  async generateUidMapper() {
    const listOfNewMeta = [];
    const listOfOldMeta = [];
    const extensionUidMap = {};
    const allInstalledApps = (await getAllStackSpecificApps(this.config)) || [];

    for (const app of this.marketplaceApps) {
      listOfOldMeta.push(..._.map(app?.ui_location?.locations, 'meta').flat());
    }
    for (const app of allInstalledApps) {
      listOfNewMeta.push(..._.map(app?.ui_location?.locations, 'meta').flat());
    }
    for (const { extension_uid, name, path, uid, data_type } of _.filter(listOfOldMeta, 'name')) {
      const meta =
        _.find(listOfNewMeta, { name, path }) ||
        _.find(listOfNewMeta, { name: this.appNameMapping[name], path }) ||
        _.find(listOfNewMeta, { name, uid, data_type });

      if (meta) {
        extensionUidMap[extension_uid] = meta.extension_uid;
      }
    }

    return extensionUidMap;
  }

  /**
   * @method handleAllPrivateAppsCreationProcess
   * @param {Object} options
   * @returns {Promise<void>}
   */
  async handleAllPrivateAppsCreationProcess() {
    const privateApps = _.filter(this.marketplaceApps, { manifest: { visibility: 'private' } });

    if (_.isEmpty(privateApps)) {
      return Promise.resolve();
    }

    await this.getConfirmationToCreateApps(privateApps);

    log(this.config, 'Starting developer hub private apps re-creation', 'success');

    for (let app of privateApps) {
      // NOTE keys can be passed to install new app in the developer hub
      app.manifest = _.pick(app.manifest, ['uid', 'name', 'description', 'icon', 'target_type', 'webhook', 'oauth']);
      this.appOriginalName = app.manifest.name;
      await this.createPrivateApps({
        oauth: app.oauth,
        webhook: app.webhook,
        ui_location: app.ui_location,
        ...app.manifest,
      });
    }

    this.appOriginalName = undefined;
  }

  async getConfirmationToCreateApps(privateApps) {
    if (!this.config.forceStopMarketplaceAppsPrompt) {
      if (
        !(await cliux.confirm(
          chalk.yellow(
            `WARNING!!! The listed apps are private apps that are not available in the destination stack: \n\n${_.map(
              privateApps,
              ({ manifest: { name } }, index) => `${String(index + 1)}) ${name}`,
            ).join('\n')}\n\nWould you like to re-create the private app and then proceed with the installation? (y/n)`,
          ),
        ))
      ) {
        if (
          await cliux.confirm(
            chalk.yellow(
              `\nWARNING!!! Canceling the app re-creation may break the content type and entry import. Would you like to proceed without re-create the private app? (y/n)`,
            ),
          )
        ) {
          return Promise.resolve(true);
        }

        if (
          !(await cliux.confirm(
            chalk.yellow('\nWould you like to re-create the private app and then proceed with the installation? (y/n)'),
          ))
        ) {
          process.exit();
        }
      }
    }
  }

  async createPrivateApps(app, uidCleaned = false, appSuffix = 1) {
    let locations = app?.ui_location?.locations;

    if (!uidCleaned && !_.isEmpty(locations)) {
      app.ui_location.locations = this.updateManifestUILocations(locations, 'uid');
    } else if (uidCleaned && !_.isEmpty(locations)) {
      app.ui_location.locations = this.updateManifestUILocations(locations, 'name', appSuffix);
    }

    if (app.name > 20) {
      app.name = app.name.slice(0, 20);
    }

    const response = await this.client
      .organization(this.config.org_uid)
      .app()
      .create(_.omit(app, ['uid']))
      .catch((error) => error);

    return this.appCreationCallback(app, response, appSuffix);
  }

  async appCreationCallback(app, response, appSuffix) {
    const { statusText, message } = response || {};

    if (message) {
      if (_.toLower(statusText) === 'conflict') {
        return this.handleNameConflict(app, appSuffix);
      } else {
        log(this.config, formatError(message), 'error');

        if (this.config.forceStopMarketplaceAppsPrompt) return Promise.resolve();

        if (
          await cliux.confirm(
            chalk.yellow(
              'WARNING!!! The above error may have an impact if the failed app is referenced in entries/content type. Would you like to proceed? (y/n)',
            ),
          )
        ) {
          Promise.resolve();
        } else {
          process.exit();
        }
      }
    } else if (response.uid) {
      // NOTE new app installation
      log(this.config, `${response.name} app created successfully.!`, 'success');
      this.appUidMapping[app.uid] = response.uid;
      this.appNameMapping[this.appOriginalName] = response.name;
    }
  }

  async handleNameConflict(app, appSuffix) {
    const appName = this.config.forceStopMarketplaceAppsPrompt
      ? this.getAppName(app.name, appSuffix)
      : await cliux.inquire({
          type: 'input',
          name: 'name',
          validate: this.validateAppName,
          default: this.getAppName(app.name, appSuffix),
          message: `${app.name} app already exist. Enter a new name to create an app.?`,
        });
    app.name = appName;

    return this.createPrivateApps(app, true, appSuffix + 1);
  }

  updateManifestUILocations(locations, type = 'uid', appSuffix = 1) {
    switch (type) {
      case 'uid':
        return _.map(locations, (location) => {
          if (location.meta) {
            location.meta = _.map(location.meta, (meta) => _.omit(meta, ['uid']));
          }

          return location;
        });
      case 'name':
        return _.map(locations, (location) => {
          if (location.meta) {
            location.meta = _.map(location.meta, (meta) => {
              if (meta.name) {
                const name = `${_.first(_.split(meta.name, '◈'))}◈${appSuffix}`;

                if (!this.appNameMapping[this.appOriginalName]) {
                  this.appNameMapping[this.appOriginalName] = name;
                }

                meta.name = name;
              }

              return meta;
            });
          }

          return location;
        });
    }
  }

  getAppName(name, appSuffix = 1) {
    if (name.length >= 19) name = name.slice(0, 18);

    name = `${_.first(_.split(name, '◈'))}◈${appSuffix}`;

    return name;
  }

  /**
   * @method installApps
   *
   * @param {Record<string, any>} app
   * @param {Record<string, any>[]} installedApps
   * @returns {Promise<void>}
   */
  async installApps(app, installedApps) {
    let updateParam;
    let installation;
    const { configuration, server_configuration } = app;
    const currentStackApp = _.find(installedApps, { manifest: { uid: app.manifest.uid } });

    if (!currentStackApp) {
      // NOTE install new app
      installation = await this.client
        .organization(this.config.org_uid)
        .app(this.appUidMapping[app.manifest.uid] || app.manifest.uid)
        .install({ targetUid: this.config.target_stack, targetType: 'stack' })
        .catch((error) => error);

      if (installation.installation_uid) {
        let appName = this.appNameMapping[app.manifest.name]
          ? this.appNameMapping[app.manifest.name]
          : app.manifest.name;
        log(this.config, `${appName} app installed successfully.!`, 'success');
        await this.makeRedirectUrlCall(installation, app.manifest.name);
        this.installationUidMapping[app.uid] = installation.installation_uid;
        updateParam = { manifest: app.manifest, ...installation, configuration, server_configuration };
      } else if (installation.message) {
        trace(installation, 'error', true);
        log(this.config, formatError(installation.message), 'success');
        await this.confirmToCloseProcess(installation);
      }
    } else if (!_.isEmpty(configuration) || !_.isEmpty(server_configuration)) {
      log(this.config, `${app.manifest.name} is already installed`, 'success');
      updateParam = await this.ifAppAlreadyExist(app, currentStackApp);
    }

    if (!this.appUidMapping[app.manifest.uid]) {
      this.appUidMapping[app.manifest.uid] = currentStackApp ? currentStackApp.manifest.uid : app.manifest.uid;
    }

    // NOTE update configurations
    if (updateParam && (!_.isEmpty(updateParam.configuration) || !_.isEmpty(updateParam.server_configuration))) {
      await this.updateAppsConfig(updateParam);
    }
  }

  async makeRedirectUrlCall(response, appName) {
    if (response.redirect_url) {
      log(this.config, `${appName} - OAuth api call started.!`, 'info');
      await new HttpClient({ maxRedirects: 20, maxBodyLength: Infinity })
        .get(response.redirect_url)
        .then(async ({ response }) => {
          if (_.includes([501, 403], response.status)) {
            trace(response, 'error', true); // NOTE Log complete stack and hide on UI
            log(this.config, `${appName} - ${response.statusText}, OAuth api call failed.!`, 'error');
            log(this.config, formatError(response), 'error');
            await this.confirmToCloseProcess({ message: response.data });
          } else {
            log(this.config, `${appName} - OAuth api call completed.!`, 'success');
          }
        })
        .catch((error) => {
          trace(error, 'error', true);
          if (_.includes([501, 403], error.status)) {
            log(this.config, formatError(error), 'error');
          }
        });
    }
  }

  async ifAppAlreadyExist(app, currentStackApp) {
    let updateParam;
    const {
      manifest: { name },
      configuration,
      server_configuration,
    } = app;

    if (!_.isEmpty(configuration) || !_.isEmpty(server_configuration)) {
      cliux.print(
        `\nWARNING!!! The ${name} app already exists and it may have its own configuration. But the current app you install has its own configuration which is used internally to manage content.\n`,
        { color: 'yellow' },
      );

      const configOption = this.config.forceStopMarketplaceAppsPrompt
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
        updateParam = { manifest: app.manifest, ...currentStackApp, configuration, server_configuration };
      }
    }

    return updateParam;
  }

  async confirmToCloseProcess(installation) {
    cliux.print(`\nWARNING!!! ${formatError(installation.message)}\n`, { color: 'yellow' });

    if (!this.config.forceStopMarketplaceAppsPrompt) {
      if (
        !(await cliux.confirm(
          chalk.yellow(
            'WARNING!!! The above error may have an impact if the failed app is referenced in entries/content type. Would you like to proceed? (y/n)',
          ),
        ))
      ) {
        process.exit();
      }
    }
  }

  /**
   * @method updateAppsConfig
   * @param {Object<{ data, app }>} param
   * @returns {Promise<void>}
   */
  updateAppsConfig(app) {
    const payload = {};
    const { uid, configuration, server_configuration } = app;

    if (!_.isEmpty(configuration)) {
      payload['configuration'] = this.nodeCrypto.decrypt(configuration);
    }
    if (!_.isEmpty(server_configuration)) {
      payload['server_configuration'] = this.nodeCrypto.decrypt(server_configuration);
    }

    if (_.isEmpty(app) || _.isEmpty(payload) || !uid) {
      return Promise.resolve();
    }
    return this.appSdkAxiosInstance.axiosInstance
      .put(`${this.developerHubBaseUrl}/installations/${uid}`, payload, {
        headers: {
          organization_uid: this.config.org_uid
        },
      })
      .then(({ data }) => {
        if (data.message) {
          trace(data, 'error', true);
          log(this.config, formatError(data.message), 'success');
        } else {
          log(this.config, `${app.manifest.name} app config updated successfully.!`, 'success');
        }
      })
      .catch((error) => {
        trace(data, 'error', true);
        log(this.config, formatError(error), 'error')
      });
  }

  validateAppName(name) {
    if (name.length < 3 || name.length > 20) {
      return 'The app name should be within 3-20 characters long.';
    }

    return true;
  }
};
