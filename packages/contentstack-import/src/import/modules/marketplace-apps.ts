import isEmpty from 'lodash/isEmpty';
import find from 'lodash/find';
import map from 'lodash/map';
import omit from 'lodash/omit';
import first from 'lodash/first';
import split from 'lodash/split';
import toLower from 'lodash/toLower';
import filter from 'lodash/filter';
import pick from 'lodash/pick';
import { join, resolve } from 'node:path';
import {
  FsUtility,
  isAuthenticated,
  cliux,
  HttpClient,
  OauthDecorator,
  HttpClientDecorator,
  managementSDKClient,
  NodeCrypto,
} from '@contentstack/cli-utilities';
import chalk from 'chalk';

import config from '../../config';
import {
  log,
  formatError,
  getDeveloperHubUrl,
  getOrgUid,
  createPrivateApp,
  handleNameConflict,
  installApp,
  makeRedirectUrlCall,
  confirmToCloseProcess,
  getAllStackSpecificApps,
  ifAppAlreadyExist,
  updateAppConfig,
  getConfirmationToCreateApps,
  generateUidMapper,
} from '../../utils';
import BaseClass, { ApiOptions } from './base-class';
import { ModuleClassParams, MarketplaceAppsConfig } from '../../types';
import {askEncryptionKey} from '../../utils/interactive';

export default class ImportMarketplaceApps extends BaseClass {
  private fs: FsUtility;
  private mapperDirPath: string;
  private marketPlaceFolderPath: string;
  private marketPlaceUidMapperPath: string;
  private marketPlaceAppConfig: MarketplaceAppsConfig;
  private marketplaceApps: Record<string, any>[];////need to handle unknown type also
  private httpClient: HttpClient | OauthDecorator | HttpClientDecorator;
  private appNameMapping: Record<string, unknown>;
  private appUidMapping: Record<string, unknown>;
  private installationUidMapping: Record<string, unknown>;
  private installedApps: Record<string, any>[];//need to handle unknown type also
  private appOrginalName: string;
  public developerHubBaseUrl: string;
  public sdkClient: string;
  public nodeCrypto: NodeCrypto;

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });

    this.marketPlaceAppConfig = config.modules.marketplace_apps;
    this.mapperDirPath = join(this.importConfig.backupDir, 'mapper', 'marketplace_apps');
    this.marketPlaceFolderPath = join(this.importConfig.backupDir, this.marketPlaceAppConfig.dirName);
    this.marketPlaceUidMapperPath = join(this.mapperDirPath, 'uid-mapping.json');
    this.fs = new FsUtility({ basePath: this.mapperDirPath });
    this.marketplaceApps = this.fs.readFile(
      join(this.marketPlaceFolderPath, this.marketPlaceAppConfig.fileName),
      true,
    ) as Record<string, unknown>[];
    this.httpClient = new HttpClient();
    this.appNameMapping = {};
    this.appUidMapping = {};
    this.appOrginalName = undefined;
    this.installedApps = [];
    this.installationUidMapping = {};
  }

  /**
   * @method start
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    log(this.importConfig, 'Migrating new marketplace apps', 'info');

    if (isEmpty(this.marketplaceApps)) {
      return Promise.resolve();
    } else if (!isAuthenticated()) {
      cliux.print(
        '\nWARNING!!! To import Marketplace apps, you must be logged in. Please check csdx auth:login --help to log in\n',
        { color: 'yellow' },
      );
      return Promise.resolve();
    }

    this.developerHubBaseUrl = this.importConfig.developerHubBaseUrl || (await getDeveloperHubUrl(this.importConfig));
    this.sdkClient = await managementSDKClient({ endpoint: this.developerHubBaseUrl });
    this.importConfig.org_uid = await getOrgUid(this.stack, this.importConfig);
    await this.setHttpClient();

    return this.startInstallation();
  }

  async setHttpClient(): Promise<void> {
    if (!this.importConfig.auth_token) {
      this.httpClient = new OauthDecorator(this.httpClient);
      const headers = await this.httpClient.preHeadersCheck(this.importConfig);
      this.httpClient = this.httpClient.headers(headers);
    } else {
      this.httpClient = new HttpClientDecorator(this.httpClient);
      this.httpClient.headers(this.importConfig);
    }
  }

  /**
   * @method startInstallation
   * @returns {Promise<void>}
   */
  async startInstallation(): Promise<void> {
    const cryptoArgs = { encryptionKey: '' };
    if (this.importConfig.marketplaceAppEncryptionKey) {
      cryptoArgs['encryptionKey'] = this.importConfig.marketplaceAppEncryptionKey;
    }

    if (this.importConfig.forceStopMarketplaceAppsPrompt) {
      cryptoArgs['encryptionKey'] = this.importConfig.marketplaceAppEncryptionKey;
      this.nodeCrypto = new NodeCrypto(cryptoArgs);
    } else {
      await this.getAndValidateEncryptionKey(this.importConfig.marketplaceAppEncryptionKey);
    }

    // NOTE install all private apps which is not available for stack.
    await this.handleAllPrivateAppsCreationProcess();
    this.installedApps = await getAllStackSpecificApps(
      this.developerHubBaseUrl,
      this.httpClient as HttpClient,
      this.importConfig,
    );

    log(this.importConfig, 'Starting marketplace app installation', 'success');

    for (let app of this.marketplaceApps) {
      await this.installApps(app);
    }

    const uidMapper = await generateUidMapper(this.installedApps, this.marketplaceApps, this.appNameMapping);
    new FsUtility({ basePath: this.mapperDirPath }).writeFile(this.marketPlaceUidMapperPath, {
      app_uid: this.appUidMapping,
      extension_uid: uidMapper || {},
      installation_uid: this.installationUidMapping,
    });
  }

  async getAndValidateEncryptionKey(defaultValue:string, retry = 1): Promise<any> {
    let appConfig = find(
      this.marketplaceApps,
      ({ configuration, server_configuration }) => isEmpty(configuration) || isEmpty(server_configuration),
    );

    if (!appConfig) {
      return defaultValue;
    }

    const encryptionKey = await askEncryptionKey(defaultValue);

    try {
      appConfig = isEmpty(appConfig.configuration) ? appConfig.configuration : appConfig.server_configuration;
      this.nodeCrypto = new NodeCrypto({ encryptionKey });
      this.nodeCrypto.decrypt(appConfig);
    } catch (error) {
      if (retry < this.importConfig.getEncryptionKeyMaxRetry && error.code === 'ERR_OSSL_EVP_BAD_DECRYPT') {
        cliux.print(
          `Provided encryption key is not valid or your data might be corrupted.! attempt(${retry}/${this.importConfig.getEncryptionKeyMaxRetry})`,
          { color: 'red' },
        );
        // NOTE max retry limit is 3
        return this.getAndValidateEncryptionKey(encryptionKey, retry + 1);
      } else {
        cliux.print(
          `Maximum retry limit exceeded. Closing the process, please try again.! attempt(${retry}/${this.importConfig.getEncryptionKeyMaxRetry})`,
          { color: 'red' },
        );
        process.exit(1);
      }
    }

    return encryptionKey;
  }

  /**
   * @method handleAllPrivateAppsCreationProcess
   * @returns {Promise<void>}
   */
  async handleAllPrivateAppsCreationProcess(): Promise<void> {
    const privateApps = filter(this.marketplaceApps, { manifest: { visibility: 'private' } });

    if (isEmpty(privateApps)) {
      return Promise.resolve();
    }

    await getConfirmationToCreateApps(privateApps, this.importConfig);

    log(this.importConfig, 'Starting developer hub private apps re-creation', 'success');

    for (let app of privateApps) {
      // NOTE keys can be passed to install new app in the developer hub
      app.manifest = pick(app.manifest, ['uid', 'name', 'description', 'icon', 'target_type', 'webhook', 'oauth']);
      this.appOrginalName = app.manifest.name;
      await this.createPrivateApps({
        oauth: app.oauth,
        webhook: app.webhook,
        ui_location: app.ui_location,
        ...(app.manifest as object),
      });
    }

    this.appOrginalName = undefined;
  }

  async createPrivateApps(app: any, uidCleaned = false, appSuffix = 1) {
    let locations = app.ui_location && app.ui_location.locations;

    if (!uidCleaned && isEmpty(locations)) {
      app.ui_location.locations = this.updateManifestUILocations(locations, 'uid');
    } else if (uidCleaned && isEmpty(locations)) {
      app.ui_location.locations = this.updateManifestUILocations(locations, 'name', appSuffix);
    }

    if (app.name > 20) {
      app.name = app.name.slice(0, 20);
    }

    const response = await createPrivateApp(this.sdkClient, this.importConfig, app);
    return this.appCreationCallback(app, response, appSuffix);
  }

  async updateManifestUILocations(locations: any, type = 'uid', appSuffix = 1) {
    switch (type) {
      case 'uid':
        return map(locations, (location) => {
          if (location.meta) {
            location.meta = map(location.meta, (meta) => omit(meta, ['uid']));
          }

          return location;
        });
      case 'name':
        return map(locations, (location) => {
          if (location.meta) {
            location.meta = map(location.meta, (meta) => {
              if (meta.name) {
                const name = `${first(split(meta.name, '◈'))}◈${appSuffix}`;

                if (!this.appNameMapping[this.appOrginalName]) {
                  this.appNameMapping[this.appOrginalName] = name;
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

  async appCreationCallback(app: any, response: any, appSuffix: number): Promise<any> {
    const { statusText, message } = response || {};

    if (message) {
      if (toLower(statusText) === 'conflict') {
        const updatedApp = await handleNameConflict(app, appSuffix, this.importConfig);
        return this.createPrivateApps(updatedApp, true, appSuffix + 1);
      } else {
        log(this.importConfig, formatError(message), 'error');

        if (this.importConfig.forceStopMarketplaceAppsPrompt) return Promise.resolve();

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
      log(this.importConfig, `${response.name} app created successfully.!`, 'success');
      this.appUidMapping[app.uid] = response.uid;
      this.appNameMapping[this.appOrginalName] = response.name;
    }
  }

  /**
   * @method installApps
   * @returns {Void}
   */
  async installApps(app: any): Promise<void> {
    let updateParam;
    const { configuration, server_configuration } = app;
    const currentStackApp = find(this.installedApps, { manifest: { uid: app?.manifest?.uid } });

    if (!currentStackApp) {
      // NOTE install new app
      const mappedUid = this.appUidMapping[app?.manifest?.uid];
      const installation = await installApp(this.sdkClient, this.importConfig, app?.manifest?.uid, mappedUid);

      if (installation.installation_uid) {
        const appManifestName = app?.manifest?.name;
        const appName = this.appNameMapping[appManifestName] ? this.appNameMapping[appManifestName] : appManifestName;

        log(this.importConfig, `${appName} app installed successfully.!`, 'success');
        await makeRedirectUrlCall(installation, appManifestName, this.importConfig);
        this.installationUidMapping[app.uid] = installation.installation_uid;
        updateParam = { manifest: app.manifest, ...installation, configuration, server_configuration };
      } else if (installation.message) {
        log(this.importConfig, formatError(installation.message), 'success');
        await confirmToCloseProcess(installation, this.importConfig);
      }
    } else if (isEmpty(configuration) || isEmpty(server_configuration)) {
      log(this.importConfig, `${app.manifest.name} is already installed`, 'success');
      updateParam = await ifAppAlreadyExist(app, currentStackApp, this.importConfig);
    }

    if (!this.appUidMapping[app.manifest.uid]) {
      this.appUidMapping[app.manifest.uid] = currentStackApp ? currentStackApp.manifest.uid : app.manifest.uid;
    }

    // NOTE update configurations
    if (updateParam && (!isEmpty(updateParam.configuration) || !isEmpty(updateParam.server_configuration))) {
      await this.updateAppsConfig(updateParam);
    }
  }

  /**
   * @method updateAppsConfig
   * @returns {Promise<void>}
   */
  async updateAppsConfig(app: any): Promise<void> {
    type payloadConfig = {
      configuration: Record<string, unknown>;
      server_configuration: Record<string, unknown>;
    };
    const payload: payloadConfig = { configuration: {}, server_configuration: {} };
    const { uid, configuration, server_configuration } = app;
    
    if (!isEmpty(configuration)) {
      payload['configuration'] = this.nodeCrypto.decrypt(configuration);
    }
    if (!isEmpty(server_configuration)) {
      payload['server_configuration'] = this.nodeCrypto.decrypt(server_configuration);
    }

    if (isEmpty(app) || isEmpty(payload) || !uid) {
      return Promise.resolve();
    }
    await updateAppConfig(this.sdkClient, this.importConfig, app, payload);
  }
}
