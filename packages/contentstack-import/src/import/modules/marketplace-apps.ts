import chalk from 'chalk';
import map from 'lodash/map';
import find from 'lodash/find';
import pick from 'lodash/pick';
import first from 'lodash/first';
import split from 'lodash/split';
import { join } from 'node:path';
import filter from 'lodash/filter';
import isEmpty from 'lodash/isEmpty';
import toLower from 'lodash/toLower';
import {
  App,
  cliux,
  HttpClient,
  NodeCrypto,
  OauthDecorator,
  isAuthenticated,
  ContentstackClient,
  HttpClientDecorator,
  managementSDKClient,
  marketplaceSDKClient,
  ContentstackMarketplaceClient,
} from '@contentstack/cli-utilities';

import { trace } from '../../utils/log';
import { askEncryptionKey } from '../../utils/interactive';
import { ModuleClassParams, MarketplaceAppsConfig, ImportConfig } from '../../types';
import {
  log,
  fsUtil,
  getOrgUid,
  fileHelper,
  installApp,
  formatError,
  createPrivateApp,
  ifAppAlreadyExist,
  getDeveloperHubUrl,
  handleNameConflict,
  makeRedirectUrlCall,
  confirmToCloseProcess,
  getAllStackSpecificApps,
  getConfirmationToCreateApps,
} from '../../utils';

export default class ImportMarketplaceApps {
  public importConfig: ImportConfig;
  private mapperDirPath: string;
  private marketPlaceFolderPath: string;
  private marketPlaceUidMapperPath: string;
  private marketPlaceAppConfig: MarketplaceAppsConfig;
  private marketplaceApps: App[];
  private httpClient: HttpClient | OauthDecorator | HttpClientDecorator;
  private appNameMapping: Record<string, unknown>;
  private appUidMapping: Record<string, unknown>;
  private installationUidMapping: Record<string, unknown>;
  private installedApps: Record<string, any>[];
  private appOriginalName: string;
  public developerHubBaseUrl: string;
  public sdkClient: ContentstackClient;
  public nodeCrypto: NodeCrypto;
  public appSdkAxiosInstance: any;
  public appSdk: ContentstackMarketplaceClient;

  constructor({ importConfig }: ModuleClassParams) {
    this.importConfig = importConfig;
    this.marketPlaceAppConfig = importConfig.modules.marketplace_apps;
    this.mapperDirPath = join(this.importConfig.backupDir, 'mapper', 'marketplace_apps');
    this.marketPlaceFolderPath = join(this.importConfig.backupDir, this.marketPlaceAppConfig.dirName);
    this.marketPlaceUidMapperPath = join(this.mapperDirPath, 'uid-mapping.json');
    this.httpClient = new HttpClient();
    this.appNameMapping = {};
    this.appUidMapping = {};
    this.appOriginalName = undefined;
    this.installedApps = [];
    this.installationUidMapping = {};
  }

  /**
   * @method start
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    log(this.importConfig, 'Migrating marketplace apps', 'info');

    if (fileHelper.fileExistsSync(this.marketPlaceFolderPath)) {
      this.marketplaceApps = fsUtil.readFile(
        join(this.marketPlaceFolderPath, this.marketPlaceAppConfig.fileName),
        true,
      ) as App[];
    } else {
      log(this.importConfig, `No such file or directory - '${this.marketPlaceFolderPath}'`, 'error');
      return;
    }

    if (isEmpty(this.marketplaceApps)) {
      return Promise.resolve();
    } else if (!isAuthenticated()) {
      cliux.print(
        '\nWARNING!!! To import Marketplace apps, you must be logged in. Please check csdx auth:login --help to log in\n',
        { color: 'yellow' },
      );
      return Promise.resolve();
    }
    await fsUtil.makeDirectory(this.mapperDirPath);
    this.developerHubBaseUrl = this.importConfig.developerHubBaseUrl || (await getDeveloperHubUrl(this.importConfig));

    // NOTE init marketplace app sdk
    const host = this.developerHubBaseUrl.split('://').pop();
    this.appSdk = await marketplaceSDKClient({ host });

    this.sdkClient = await managementSDKClient({ endpoint: this.developerHubBaseUrl });
    this.appSdkAxiosInstance = await managementSDKClient({
      host: this.developerHubBaseUrl.split('://').pop(),
    });
    this.importConfig.org_uid = await getOrgUid(this.importConfig);
    await this.setHttpClient();
    await this.startInstallation();

    log(this.importConfig, 'Marketplace apps have been imported successfully!', 'success');
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

    const uidMapper = await this.generateUidMapper();
    fsUtil.writeFile(this.marketPlaceUidMapperPath, {
      app_uid: this.appUidMapping,
      extension_uid: uidMapper || {},
      installation_uid: this.installationUidMapping,
    });
  }

  async generateUidMapper(): Promise<Record<string, unknown>> {
    const listOfNewMeta = [];
    const listOfOldMeta = [];
    const extensionUidMap: Record<string, unknown> = {};
    this.installedApps =
      (await getAllStackSpecificApps(this.developerHubBaseUrl, this.httpClient as HttpClient, this.importConfig)) || [];

    for (const app of this.marketplaceApps) {
      listOfOldMeta.push(...map(app?.ui_location?.locations, 'meta').flat());
    }
    for (const app of this.installedApps) {
      listOfNewMeta.push(...map(app?.ui_location?.locations, 'meta').flat());
    }
    for (const { extension_uid, uid } of filter(listOfOldMeta, 'name')) {
      const meta = find(listOfNewMeta, { uid });

      if (meta) {
        extensionUidMap[extension_uid] = meta.extension_uid;
      }
    }

    return extensionUidMap;
  }

  async getAndValidateEncryptionKey(defaultValue: string, retry = 1): Promise<any> {
    let appConfig = find(
      this.marketplaceApps,
      ({ configuration, server_configuration }) => !isEmpty(configuration) || !isEmpty(server_configuration),
    );

    if (!appConfig) {
      return defaultValue;
    }

    const encryptionKey = await askEncryptionKey(defaultValue);

    try {
      appConfig = !isEmpty(appConfig.configuration) ? appConfig.configuration : appConfig.server_configuration;
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
      if (this.importConfig.skipPrivateAppRecreationIfExist && (await this.isPrivateAppExistInDeveloperHub(app))) {
        // NOTE Found app already exist in the same org
        this.appUidMapping[app.uid] = app.uid;
        cliux.print(`App '${app.manifest.name}' already exist. skipping app recreation.!`, { color: 'yellow' });
        continue;
      }

      // NOTE keys can be passed to install new app in the developer hub
      const validKeys = [
        'uid',
        'name',
        'icon',
        'oauth',
        'webhook',
        'visibility',
        'target_type',
        'description',
        'ui_location',
        'framework_version',
      ];
      const manifest = pick(app.manifest, validKeys);
      this.appOriginalName = manifest.name;

      await this.createPrivateApps(manifest);
    }

    this.appOriginalName = undefined;
  }

  /**
   * The function checks if a private app exists in the developer hub.
   * @param {App} app - The `app` parameter is an object representing an application. It likely has
   * properties such as `uid` which is a unique identifier for the app.
   * @returns a boolean value. It returns true if the installation object is not empty, and false if
   * the installation object is empty.
   */
  async isPrivateAppExistInDeveloperHub(app: App) {
    const installation = await this.appSdk
      .marketplace(this.importConfig.org_uid)
      .installation(app.uid)
      .fetch()
      .catch((_) => {}); // NOTE Keeping this to avoid Unhandled exception

    return !isEmpty(installation);
  }

  async createPrivateApps(app: any, appSuffix = 1, updateUiLocation = false) {
    if (updateUiLocation && !isEmpty(app?.ui_location?.locations)) {
      app.ui_location.locations = this.updateManifestUILocations(app?.ui_location?.locations, appSuffix);
    }

    if (app.name > 20) {
      app.name = app.name.slice(0, 20);
    }

    const response = await createPrivateApp(this.sdkClient, this.importConfig, app);
    return this.appCreationCallback(app, response, appSuffix);
  }

  updateManifestUILocations(locations: any, appSuffix = 1) {
    return map(locations, (location) => {
      if (location.meta) {
        location.meta = map(location.meta, (meta) => {
          if (meta.name && this.appOriginalName == meta.name) {
            const name = `${first(split(meta.name, '◈'))}◈${appSuffix}`;

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

  async appCreationCallback(app: any, response: any, appSuffix: number): Promise<any> {
    const { statusText, message } = response || {};

    if (message) {
      if (toLower(statusText) === 'conflict') {
        const updatedApp = await handleNameConflict(app, appSuffix, this.importConfig);
        return this.createPrivateApps(updatedApp, appSuffix + 1, true);
      } else {
        trace(response, 'error', true);
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
      this.appNameMapping[this.appOriginalName] = response.name;
    }
  }

  /**
   * @method installApps
   *
   * @param {Record<string, any>} app
   * @param {Record<string, any>[]} installedApps
   * @returns {Promise<void>}
   */
  async installApps(app: any): Promise<void> {
    let updateParam;
    const { configuration, server_configuration } = app;
    const currentStackApp = find(this.installedApps, { manifest: { uid: app?.manifest?.uid } });

    if (!currentStackApp) {
      // NOTE install new app
      const mappedUid = this.appUidMapping[app?.manifest?.uid] as string;
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
    } else if (!isEmpty(configuration) || !isEmpty(server_configuration)) {
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

    // TODO migrate this HTTP API call into SDK
    // NOTE Use updateAppConfig(this.sdkClient, this.importConfig, app, payload) utility when migrating to SDK call;
    return this.appSdkAxiosInstance.axiosInstance
      .put(`${this.developerHubBaseUrl}/installations/${uid}`, payload, {
        headers: {
          organization_uid: this.importConfig.org_uid,
        },
      })
      .then(({ data }: any) => {
        if (data?.message) {
          trace(data, 'error', true);
          log(this.importConfig, formatError(data.message), 'success');
        } else {
          log(this.importConfig, `${app.manifest.name} app config updated successfully.!`, 'success');
        }
      })
      .catch((error: any) => {
        trace(error, 'error', true);
        log(this.importConfig, formatError(error), 'error');
      });
  }
}
