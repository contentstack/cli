import chalk from 'chalk';
import map from 'lodash/map';
import omit from 'lodash/omit';
import find from 'lodash/find';
import pick from 'lodash/pick';
import first from 'lodash/first';
import split from 'lodash/split';
import { join } from 'node:path';
import filter from 'lodash/filter';
import isEmpty from 'lodash/isEmpty';
import toLower from 'lodash/toLower';
import {
  cliux,
  AppData,
  NodeCrypto,
  isAuthenticated,
  marketplaceSDKClient,
  ContentstackMarketplaceClient,
} from '@contentstack/cli-utilities';

import { trace } from '../../utils/log';
import { askEncryptionKey, getLocationName } from '../../utils/interactive';
import { ModuleClassParams, MarketplaceAppsConfig, ImportConfig, Installation, Manifest } from '../../types';
import {
  log,
  fsUtil,
  getOrgUid,
  fileHelper,
  formatError,
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
  private marketplaceApps: Installation[];
  private appNameMapping: Record<string, unknown>;
  private appUidMapping: Record<string, unknown>;
  private installationUidMapping: Record<string, unknown>;
  private installedApps: Installation[];
  private appOriginalName: string;
  public developerHubBaseUrl: string;
  public nodeCrypto: NodeCrypto;
  public appSdk: ContentstackMarketplaceClient;
  public existingNames: Set<string>;

  constructor({ importConfig }: ModuleClassParams) {
    this.importConfig = importConfig;
    this.marketPlaceAppConfig = importConfig.modules.marketplace_apps;
    this.mapperDirPath = join(this.importConfig.backupDir, 'mapper', 'marketplace_apps');
    this.marketPlaceFolderPath = join(this.importConfig.backupDir, this.marketPlaceAppConfig.dirName);
    this.marketPlaceUidMapperPath = join(this.mapperDirPath, 'uid-mapping.json');
    this.appNameMapping = {};
    this.appUidMapping = {};
    this.appOriginalName = undefined;
    this.installedApps = [];
    this.installationUidMapping = {};
    this.existingNames = new Set<string>();
  }

  /**
   * This function starts the process of importing marketplace apps.
   * @returns The function `start()` returns a `Promise<void>`.
   */
  async start(): Promise<void> {
    log(this.importConfig, 'Migrating marketplace apps', 'info');

    if (fileHelper.fileExistsSync(this.marketPlaceFolderPath)) {
      this.marketplaceApps = fsUtil.readFile(
        join(this.marketPlaceFolderPath, this.marketPlaceAppConfig.fileName),
        true,
      ) as Installation[];
    } else {
      log(this.importConfig, `No Marketplace apps are found - '${this.marketPlaceFolderPath}'`, 'info');
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
    this.importConfig.developerHubBaseUrl = this.developerHubBaseUrl;

    // NOTE init marketplace app sdk
    const host = this.developerHubBaseUrl.split('://').pop();
    this.appSdk = await marketplaceSDKClient({ host });
    this.importConfig.org_uid = await getOrgUid(this.importConfig);

    // NOTE start the marketplace import process
    await this.importMarketplaceApps();

    log(this.importConfig, 'Marketplace apps have been imported successfully!', 'success');
  }

  /**
   * The function `importMarketplaceApps` installs marketplace apps, handles private app creation,
   * validates app installation, and generates a UID mapper.
   */
  async importMarketplaceApps(): Promise<void> {
    // NOTE set default encryptionKey
    const cryptoArgs = { encryptionKey: this.importConfig.marketplaceAppEncryptionKey };

    if (this.importConfig.forceStopMarketplaceAppsPrompt) {
      this.nodeCrypto = new NodeCrypto(cryptoArgs);
    } else {
      await this.getAndValidateEncryptionKey(this.importConfig.marketplaceAppEncryptionKey);
    }

    // NOTE install all private apps which is not available for stack.
    await this.handleAllPrivateAppsCreationProcess();
    // NOTE getting all apps to validate if it's already installed in the stack to manage conflict
    this.installedApps = await getAllStackSpecificApps(this.importConfig);

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

  /**
   * The function `generateUidMapper` generates a mapping of extension UIDs from old metadata to new
   * metadata based on the installed and marketplace apps.
   * @returns The function `generateUidMapper` returns a Promise that resolves to a `Record<string,
   * unknown>`.
   */
  async generateUidMapper(): Promise<Record<string, unknown>> {
    const listOfNewMeta = [];
    const listOfOldMeta = [];
    const extensionUidMap: Record<string, unknown> = {};
    // NOTE After installation getting all apps to create mapper.
    this.installedApps = (await getAllStackSpecificApps(this.importConfig)) || [];

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

  /**
   * The function `getAndValidateEncryptionKey` retrieves and validates an encryption key, with the
   * option to retry a specified number of times.
   * @param {string} defaultValue - The defaultValue parameter is a string that represents the default
   * encryption key value to use if no valid encryption key is found in the marketplaceApps
   * configuration.
   * @param [retry=1] - The `retry` parameter is an optional parameter that specifies the number of
   * times the function should retry getting and validating the encryption key if it fails. The default
   * value is 1, meaning that if the function fails to get and validate the encryption key on the first
   * attempt, it will not retry.
   * @returns The function `getAndValidateEncryptionKey` returns a Promise that resolves to the
   * encryption key.
   */
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
   * The function `handleAllPrivateAppsCreationProcess` handles the creation process for all private
   * apps in a developer hub, including checking for existing apps, getting confirmation from the user,
   * and creating the apps if necessary.
   * @returns a Promise that resolves to void.
   */
  async handleAllPrivateAppsCreationProcess(): Promise<void> {
    const privateApps = filter(this.marketplaceApps, { manifest: { visibility: 'private' } });

    if (isEmpty(privateApps)) {
      return Promise.resolve();
    }

    let canCreatePrivateApp = await getConfirmationToCreateApps(privateApps, this.importConfig);
    this.importConfig.canCreatePrivateApp = canCreatePrivateApp;
    if (canCreatePrivateApp) {
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
        const manifest = pick(app.manifest, validKeys) as Manifest;
        this.appOriginalName = manifest.name;

        await this.createPrivateApp(manifest);
      }
    } else {
      log(this.importConfig, 'Skipping private apps creation on Developer Hub...', 'success');
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
  async isPrivateAppExistInDeveloperHub(app: Installation) {
    const installation = await this.appSdk
      .marketplace(this.importConfig.org_uid)
      .installation(app.uid)
      .fetch()
      .catch(() => {}); // NOTE Keeping this to avoid Unhandled exception

    return !isEmpty(installation);
  }

  /**
   * The function creates a private app in a marketplace, with an optional suffix for the app name and
   * an option to update the UI location.
   * @param {Manifest} app - The `app` parameter is an object that represents the manifest of the app
   * being created. It contains various properties such as `name`, `ui_location`, and `uid`.
   * @param [appSuffix=1] - The appSuffix parameter is an optional parameter that specifies a suffix to
   * be added to the app's UI location. It is used when updating the UI location of the app.
   * @param [updateUiLocation=false] - A boolean value indicating whether to update the UI location of
   * the app.
   * @returns the result of the `appCreationCallback` function, which takes in the `app`, `response`,
   * and `appSuffix` as arguments.
   */
  async createPrivateApp(app: Manifest, appSuffix = 1, updateUiLocation = false) {
    if (updateUiLocation && !isEmpty(app?.ui_location?.locations)) {
      app.ui_location.locations = this.updateManifestUILocations(app?.ui_location?.locations, appSuffix);
    }

    if (app.name.length > 20) {
      app.name = app.name.slice(0, 20);
    }

    const response = await this.appSdk
      .marketplace(this.importConfig.org_uid)
      .app()
      .create(omit(app, ['uid']) as AppData)
      .catch((error: any) => error);

    return this.appCreationCallback(app, response, appSuffix);
  }

  /**
   * The function installs an app from a marketplace onto a target stack.
   * @param {ImportConfig} config - The `config` parameter is an object that contains the configuration
   * for the installation. It likely includes information such as the target stack UID and other
   * relevant details.
   * @param {string} [appManifestUid] - The `appManifestUid` parameter is the unique identifier of the
   * app manifest. It is used to specify which app to install from the marketplace.
   * @returns a Promise that resolves to an object.
   */
  async installApp(config: ImportConfig, appManifestUid?: string): Promise<any> {
    return await this.appSdk
      .marketplace(this.importConfig.org_uid)
      .app(appManifestUid)
      .install({ targetUid: config.target_stack, targetType: 'stack' })
      .catch((error: any) => error);
  }

  /**
   * The function updates the names of locations in a manifest UI based on a given app suffix.
   * @param {any} locations - An array of objects representing different locations in a manifest file.
   * Each object has a "meta" property which is an array of objects representing metadata for that
   * location.
   * @param [appSuffix=1] - The `appSuffix` parameter is an optional parameter that specifies a suffix
   * to be added to the app name. It is set to 1 by default.
   * @returns The function `updateManifestUILocations` returns an updated array of `locations`.
   */
  updateManifestUILocations(locations: any, appSuffix = 1) {
    return map(locations, (location, index) => {
      if (location.meta) {
        location.meta = map(location.meta, (meta) => {
          if (meta.name && this.appOriginalName == meta.name) {
            const name = getLocationName(first(split(meta.name, '◈')), appSuffix, this.existingNames);

            if (!this.appNameMapping[this.appOriginalName]) {
              this.appNameMapping[this.appOriginalName] = name;
            }

            meta.name = name;
          } else if (meta.name) {
            meta.name = getLocationName(first(split(meta.name, '◈')), appSuffix + (+index + 1), this.existingNames);
          }

          return meta;
        });
      }

      return location;
    });
  }

  /**
   * The function `appCreationCallback` handles the creation of a new app and handles any conflicts or
   * errors that may occur during the process.
   * @param {any} app - The `app` parameter is an object representing the app that is being created. It
   * contains various properties such as `uid` (unique identifier), `name`, and other app-specific
   * details.
   * @param {any} response - The `response` parameter is an object that contains the response received
   * from an API call. It may have properties such as `statusText` and `message`.
   * @param {number} appSuffix - The `appSuffix` parameter is a number that is used to generate a
   * unique suffix for the app name in case of a name conflict. It is incremented each time a name
   * conflict occurs to ensure that the new app name is unique.
   * @returns a Promise.
   */
  async appCreationCallback(app: any, response: any, appSuffix: number): Promise<any> {
    const { statusText, message } = response || {};

    if (message) {
      if (toLower(statusText) === 'conflict') {
        const updatedApp = await handleNameConflict(app, appSuffix, this.importConfig);
        return this.createPrivateApp(updatedApp, appSuffix + 1, true);
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
      if (app.manifest.visibility === 'private' && !this.importConfig.canCreatePrivateApp) {
        log(this.importConfig, `Skipping the installation of the private app ${app.manifest.name}...`, 'info');
        return Promise.resolve();
      }
      const installation = await this.installApp(
        this.importConfig,
        // NOTE if it's private app it should get uid from mapper else will use manifest uid
        this.appUidMapping[app.manifest.uid] || app.manifest.uid,
      );

      if (installation.installation_uid) {
        const appName = this.appNameMapping[app.manifest.name] ?? app.manifest.name;
        log(this.importConfig, `${appName} app installed successfully.!`, 'success');
        await makeRedirectUrlCall(installation, appName, this.importConfig);
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
   * The `updateAppsConfig` function updates the configuration and server configuration of an app in a
   * marketplace.
   * @param {Installation} app - The `app` parameter is an object that represents an installation of an
   * app. It contains the following properties:
   */
  async updateAppsConfig(app: Installation): Promise<void> {
    const { installation_uid, configuration, server_configuration } = app;

    if (!isEmpty(configuration)) {
      await this.appSdk
        .marketplace(this.importConfig.org_uid)
        .installation(installation_uid)
        .setConfiguration(this.nodeCrypto.decrypt(configuration))
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

    if (!isEmpty(server_configuration)) {
      await this.appSdk
        .marketplace(this.importConfig.org_uid)
        .installation(installation_uid)
        .setServerConfig(this.nodeCrypto.decrypt(server_configuration))
        .then(({ data }: any) => {
          if (data?.message) {
            trace(data, 'error', true);
            log(this.importConfig, formatError(data.message), 'error');
          } else {
            log(this.importConfig, `${app.manifest.name} app server config updated successfully.!`, 'info');
          }
        })
        .catch((error: any) => {
          trace(error, 'error', true);
          log(this.importConfig, formatError(error), 'error');
        });
    }
  }
}
