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
  log,
  handleAndLogError,
} from '@contentstack/cli-utilities';

import { askEncryptionKey, getLocationName } from '../../utils/interactive';
import { ModuleClassParams, MarketplaceAppsConfig, ImportConfig, Installation, Manifest } from '../../types';
import {
  fsUtil,
  getOrgUid,
  fileHelper,
  formatError,
  ifAppAlreadyExist,
  handleNameConflict,
  makeRedirectUrlCall,
  confirmToCloseProcess,
  getAllStackSpecificApps,
  getConfirmationToCreateApps,
  getDeveloperHubUrl,
  PROCESS_NAMES,
  MODULE_CONTEXTS,
  PROCESS_STATUS,
  MODULE_NAMES,
} from '../../utils';
import BaseClass from './base-class';

export default class ImportMarketplaceApps extends BaseClass {
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

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.importConfig.context.module = MODULE_CONTEXTS.MARKETPLACE_APPS;
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.MARKETPLACE_APPS];
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
    try {
      log.debug('Starting marketplace apps import process...', this.importConfig.context);

      const [marketplaceAppsCount] = await this.analyzeMarketplaceApps();
      if (marketplaceAppsCount === 0) {
        log.info('No marketplace apps found to import', this.importConfig.context);
        return;
      }

      if (!isAuthenticated()) {
        cliux.print(
          '\nWARNING!!! To import Marketplace apps, you must be logged in. Please check csdx auth:login --help to log in\n',
          { color: 'yellow' },
        );
        log.info('Skipping marketplace apps import - user not authenticated', this.importConfig.context);
        return;
      }

      // Handle encryption key prompt BEFORE starting progress
      if (!this.importConfig.forceStopMarketplaceAppsPrompt) {
        log.debug('Validating security configuration before progress start', this.importConfig.context);
        await this.getAndValidateEncryptionKey(this.importConfig.marketplaceAppEncryptionKey);
      }

      const progress = this.createNestedProgress(this.currentModuleName);
      const privateAppsCount = filter(this.marketplaceApps, { manifest: { visibility: 'private' } }).length;

      progress.addProcess(PROCESS_NAMES.SETUP_ENVIRONMENT, 1);
      if (privateAppsCount > 0) {
        progress.addProcess(PROCESS_NAMES.CREATE_APPS, privateAppsCount);
      }
      progress.addProcess(PROCESS_NAMES.INSTALL_APPS, marketplaceAppsCount);

      this.prepareMarketplaceAppMapper();

      // Step 1: Setup Environment SDK and authentication
      log.info('Setting up marketplace SDK and authentication', this.importConfig.context);
      progress
        .startProcess(PROCESS_NAMES.SETUP_ENVIRONMENT)
        .updateStatus(PROCESS_STATUS[PROCESS_NAMES.SETUP_ENVIRONMENT].SETTING_UP, PROCESS_NAMES.SETUP_ENVIRONMENT);
      await this.setupMarketplaceEnvironment();
      progress.completeProcess(PROCESS_NAMES.SETUP_ENVIRONMENT, true);

      // Step 2: Handle private apps creation (if any)
      if (privateAppsCount > 0) {
        log.info('Starting private apps creation process', this.importConfig.context);
        progress
          .startProcess(PROCESS_NAMES.CREATE_APPS)
          .updateStatus(PROCESS_STATUS[PROCESS_NAMES.CREATE_APPS].CREATING, PROCESS_NAMES.CREATE_APPS);
        await this.handleAllPrivateAppsCreationProcess();
        progress.completeProcess(PROCESS_NAMES.CREATE_APPS, true);
      }

      // Step 3: Install marketplace apps - FIXED THIS PART
      log.info('Starting marketplace apps installation process', this.importConfig.context);
      progress
        .startProcess(PROCESS_NAMES.INSTALL_APPS)
        .updateStatus(PROCESS_STATUS[PROCESS_NAMES.INSTALL_APPS].INSTALLING, PROCESS_NAMES.INSTALL_APPS);

      await this.importMarketplaceApps();
      progress.completeProcess(PROCESS_NAMES.INSTALL_APPS, true);

      this.completeProgress(true);
      log.success('Marketplace apps have been imported successfully!', this.importConfig.context);
    } catch (error) {
      this.completeProgress(false, error?.message || 'Marketplace apps import failed');
      handleAndLogError(error, { ...this.importConfig.context });
    }
  }

  /**
   * The function `importMarketplaceApps` installs marketplace apps, handles private app creation,
   * validates app installation, and generates a UID mapper.
   */
  async importMarketplaceApps(): Promise<void> {
    log.debug('Setting up security configuration for marketplace apps', this.importConfig.context);
    // NOTE set default encryptionKey
    const cryptoArgs = { encryptionKey: this.importConfig.marketplaceAppEncryptionKey };

    if (this.importConfig.forceStopMarketplaceAppsPrompt) {
      log.debug('Using forced security configuration without validation', this.importConfig.context);
      this.nodeCrypto = new NodeCrypto(cryptoArgs);
    }
    // NOTE getting all apps to validate if it's already installed in the stack to manage conflict
    log.debug('Getting all stack-specific apps for validation', this.importConfig.context);
    this.installedApps = await getAllStackSpecificApps(this.importConfig);
    log.debug(`Found ${this.installedApps?.length || 0} already installed apps`, this.importConfig.context);

    log.info('Starting marketplace app installation', this.importConfig.context);

    for (let app of this.marketplaceApps) {
      log.debug(`Processing app: ${app.manifest?.name || app.manifest?.uid}`, this.importConfig.context);
      await this.installApps(app);
    }

    log.debug('Generating UID mapper', this.importConfig.context);
    const uidMapper = await this.generateUidMapper();

    log.debug('Writing UID mappings to file', this.importConfig.context);
    fsUtil.writeFile(this.marketPlaceUidMapperPath, {
      app_uid: this.appUidMapping,
      extension_uid: uidMapper || {},
      installation_uid: this.installationUidMapping,
    });
    const appUidCount = Object.keys(this.appUidMapping || {}).length;
    const extensionUidCount = Object.keys(uidMapper || {}).length;
    log.debug(
      `Written UID data: ${appUidCount} app UIDs, ${extensionUidCount} extension UIDs`,
      this.importConfig.context,
    );
  }

  /**
   * The function `generateUidMapper` generates a mapping of extension UIDs from old metadata to new
   * metadata based on the installed and marketplace apps.
   * @returns The function `generateUidMapper` returns a Promise that resolves to a `Record<string,
   * unknown>`.
   */
  async generateUidMapper(): Promise<Record<string, unknown>> {
    log.debug('Generating UID mapper for extensions', this.importConfig.context);
    const listOfNewMeta = [];
    const listOfOldMeta = [];
    const extensionUidMap: Record<string, unknown> = {};

    // NOTE After installation getting all apps to create mapper.
    log.debug('Fetching updated list of installed apps', this.importConfig.context);
    this.installedApps = (await getAllStackSpecificApps(this.importConfig)) || [];
    log.debug(`Found ${this.installedApps?.length || 0} installed apps after installation`, this.importConfig.context);

    log.debug('Processing old metadata from marketplace apps', this.importConfig.context);
    for (const app of this.marketplaceApps) {
      const appMeta = map(app?.ui_location?.locations, 'meta').flat();
      listOfOldMeta.push(...appMeta);
      log.debug(`Added ${appMeta.length} meta entries from app: ${app.manifest?.name}`, this.importConfig.context);
    }

    log.debug('Processing new metadata from installed apps', this.importConfig.context);
    for (const app of this.installedApps) {
      const appMeta = map(app?.ui_location?.locations, 'meta').flat();
      listOfNewMeta.push(...appMeta);
      log.debug(
        `Added ${appMeta.length} meta entries from installed app: ${app.manifest?.name}`,
        this.importConfig.context,
      );
    }

    log.debug(
      `Creating extension UID mappings from ${listOfOldMeta.length} old meta entries`,
      this.importConfig.context,
    );
    for (const { extension_uid, uid } of filter(listOfOldMeta, 'name')) {
      const meta = find(listOfNewMeta, { uid });

      if (meta) {
        extensionUidMap[extension_uid] = meta.extension_uid;
        log.debug(`Extension UID mapping: ${extension_uid} → ${meta.extension_uid}`, this.importConfig.context);
      }
    }

    const extensionMapCount = Object.keys(extensionUidMap || {}).length;
    log.debug(`Generated ${extensionMapCount} extension UID items`, this.importConfig.context);
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
    log.debug(`Validating security configuration (attempt ${retry})`, this.importConfig.context);
    let appConfig = find(
      this.marketplaceApps,
      ({ configuration, server_configuration }) => !isEmpty(configuration) || !isEmpty(server_configuration),
    );

    if (!appConfig) {
      log.debug('No app configuration found requiring encryption', this.importConfig.context);
      return defaultValue;
    }

    log.debug('Found app configuration requiring security setup, asking for input', this.importConfig.context);
    cliux.print('\n');
    const encryptionKey = await askEncryptionKey(defaultValue);

    try {
      appConfig = !isEmpty(appConfig.configuration) ? appConfig.configuration : appConfig.server_configuration;
      log.debug('Creating NodeCrypto instance with security configuration', this.importConfig.context);
      this.nodeCrypto = new NodeCrypto({ encryptionKey });
      log.debug('Testing security configuration with app data', this.importConfig.context);
      this.nodeCrypto.decrypt(appConfig);
      log.debug('Security configuration validation successful', this.importConfig.context);
    } catch (error) {
      log.debug(`Security configuration validation failed: ${error.message}`, this.importConfig.context);
      if (retry < this.importConfig.getEncryptionKeyMaxRetry && error.code === 'ERR_OSSL_EVP_BAD_DECRYPT') {
        cliux.print(
          `Provided encryption key is not valid or your data might be corrupted.! attempt(${retry}/${this.importConfig.getEncryptionKeyMaxRetry})`,
          { color: 'red' },
        );
        // NOTE max retry limit is 3
        log.debug(
          `Retrying security configuration validation (${retry + 1}/${this.importConfig.getEncryptionKeyMaxRetry})`,
          this.importConfig.context,
        );
        return this.getAndValidateEncryptionKey(encryptionKey, retry + 1);
      } else {
        cliux.print(
          `Maximum retry limit exceeded. Closing the process, please try again.! attempt(${retry}/${this.importConfig.getEncryptionKeyMaxRetry})`,
          { color: 'red' },
        );
        log.debug('Maximum retry limit exceeded for encryption validation', this.importConfig.context);
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
    log.debug('Filtering private apps from marketplace apps', this.importConfig.context);
    const privateApps = filter(this.marketplaceApps, { manifest: { visibility: 'private' } });
    log.debug(`Found ${privateApps.length} private apps to process`, this.importConfig.context);

    if (isEmpty(privateApps)) {
      log.debug('No private apps found, skipping private app creation process', this.importConfig.context);
      return Promise.resolve();
    }

    log.debug('Getting confirmation to create private apps', this.importConfig.context);
    cliux.print('\n');
    let canCreatePrivateApp = await getConfirmationToCreateApps(privateApps, this.importConfig);
    this.importConfig.canCreatePrivateApp = canCreatePrivateApp;

    if (canCreatePrivateApp) {
      log.info('Starting developer hub private apps re-creation', this.importConfig.context);
      log.debug(`Processing ${privateApps.length} private apps for creation`, this.importConfig.context);

      for (let app of privateApps) {
        log.debug(`Checking if private app exists: ${app.manifest.name}`, this.importConfig.context);
        if (await this.isPrivateAppExistInDeveloperHub(app)) {
          // NOTE Found app already exist in the same org
          this.appUidMapping[app.uid] = app.uid;
          this.progressManager?.tick(true, `${app.manifest.name} (already exists)`, null, PROCESS_NAMES.CREATE_APPS);
          cliux.print(`App '${app.manifest.name}' already exist. skipping app recreation.!`, { color: 'yellow' });
          log.debug(`App '${app.manifest.name}' already exists, skipping recreation`, this.importConfig.context);
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
        log.debug(`Extracting valid configuration from app manifest: ${app.manifest.name}`, this.importConfig.context);
        const manifest = pick(app.manifest, validKeys) as Manifest;
        this.appOriginalName = manifest.name;

        log.debug(`Creating private app: ${manifest.name}`, this.importConfig.context);
        await this.createPrivateApp(manifest);
      }

      log.success(`Completed processing ${privateApps.length} private apps`, this.importConfig.context);
    } else {
      log.info('Skipping private apps creation on Developer Hub...', this.importConfig.context);
      // Mark all private apps as skipped in progress
      for (let app of privateApps) {
        this.progressManager?.tick(true, `${app.manifest.name} (creation skipped)`, null, PROCESS_NAMES.CREATE_APPS);
      }
    }

    this.appOriginalName = undefined;
    log.debug('Private apps creation process completed', this.importConfig.context);
  }

  /**
   * The function checks if a private app exists in the developer hub.
   * @param {App} app - The `app` parameter is an object representing an application. It likely has
   * properties such as `uid` which is a unique identifier for the app.
   * @returns a boolean value. It returns true if the installation object is not empty, and false if
   * the installation object is empty.
   */
  async isPrivateAppExistInDeveloperHub(app: Installation) {
    log.debug(
      `Checking if private app exists in developer hub: ${app.manifest?.name} (${app.uid})`,
      this.importConfig.context,
    );
    const installation = await this.appSdk
      .marketplace(this.importConfig.org_uid)
      .installation(app.uid)
      .fetch()
      .catch((): void => {
        log.debug(`App ${app.manifest?.name} not found in developer hub`, this.importConfig.context);
        return undefined;
      }); // NOTE Keeping this to avoid Unhandled exception

    const exists = !isEmpty(installation);
    log.debug(`Private app ${app.manifest?.name} exists in developer hub: ${exists}`, this.importConfig.context);
    return exists;
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
    log.debug(
      `Creating private app: ${app.name} (suffix: ${appSuffix}, updateUiLocation: ${updateUiLocation})`,
      this.importConfig.context,
    );

    if (updateUiLocation && !isEmpty(app?.ui_location?.locations)) {
      log.debug(`Updating UI locations for app: ${app.name}`, this.importConfig.context);
      app.ui_location.locations = this.updateManifestUILocations(app?.ui_location?.locations, appSuffix);
    }

    if (app.name.length > 20) {
      const originalName = app.name;
      app.name = app.name.slice(0, 20);
      log.debug(`Truncated app name from '${originalName}' to '${app.name}'`, this.importConfig.context);
    }

    log.debug(`Making API call to create private app: ${app.name}`, this.importConfig.context);
    const response = await this.appSdk
      .marketplace(this.importConfig.org_uid)
      .app()
      .create(omit(app, ['uid']) as AppData)
      .catch((error: any) => {
        log.debug(`Error creating private app ${app.name}: ${error.message}`, this.importConfig.context);
        return error;
      });

    log.debug(`Processing app creation response for: ${app.name}`, this.importConfig.context);
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
    log.debug(`Installing app with manifest UID: ${appManifestUid}`, this.importConfig.context);
    log.debug(`Target stack: ${config.target_stack}`, this.importConfig.context);

    return await this.appSdk
      .marketplace(this.importConfig.org_uid)
      .app(appManifestUid)
      .install({ targetUid: config.target_stack, targetType: 'stack' })
      .then((response) => {
        log.debug(`App installation successful: ${appManifestUid}`, this.importConfig.context);
        return response;
      })
      .catch((error: any) => {
        log.debug(`App installation failed: ${appManifestUid} - ${error.message}`, this.importConfig.context);
        return error;
      });
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
    log.debug(`Updating manifest UI locations with suffix: ${appSuffix}`, this.importConfig.context);
    log.debug(`Processing ${locations.length} locations`, this.importConfig.context);

    return map(locations, (location, index) => {
      if (location.meta) {
        log.debug(`Processing location ${index} with ${location.meta.length} meta entries`, this.importConfig.context);
        location.meta = map(location.meta, (meta) => {
          if (meta.name && this.appOriginalName == meta.name) {
            const name = getLocationName(first(split(meta.name, '◈')), appSuffix, this.existingNames);

            if (!this.appNameMapping[this.appOriginalName]) {
              this.appNameMapping[this.appOriginalName] = name;
              log.debug(`Created app name mapping: ${this.appOriginalName} → ${name}`, this.importConfig.context);
            }

            meta.name = name;
            log.debug(`Updated meta name to: ${name}`, this.importConfig.context);
          } else if (meta.name) {
            const newName = getLocationName(first(split(meta.name, '◈')), appSuffix + (+index + 1), this.existingNames);
            log.debug(`Updated meta name from '${meta.name}' to '${newName}'`, this.importConfig.context);
            meta.name = newName;
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
    log.debug(`Processing app creation callback for: ${app.name} (suffix: ${appSuffix})`, this.importConfig.context);

    if (message) {
      log.debug(`App creation response has message: ${message}`, this.importConfig.context);
      if (toLower(statusText) === 'conflict') {
        log.debug(`Name conflict detected for app: ${app.name}`, this.importConfig.context);
        const updatedApp = await handleNameConflict(app, appSuffix, this.importConfig);
        log.debug(`Retrying app creation with updated name: ${updatedApp.name}`, this.importConfig.context);
        return this.createPrivateApp(updatedApp, appSuffix + 1, true);
      } else {
        this.progressManager?.tick(false, `${app.name}`, message, PROCESS_NAMES.CREATE_APPS);
        log.error(formatError(message), this.importConfig.context);

        if (this.importConfig.forceStopMarketplaceAppsPrompt) {
          log.debug('Force stop marketplace apps prompt is enabled, resolving', this.importConfig.context);
          return Promise.resolve();
        }

        if (
          await cliux.confirm(
            chalk.yellow(
              'WARNING!!! The above error may have an impact if the failed app is referenced in entries/content type. Would you like to proceed? (y/n)',
            ),
          )
        ) {
          log.debug('User chose to proceed despite error', this.importConfig.context);
          Promise.resolve();
        } else {
          log.debug('User chose to exit due to error', this.importConfig.context);
          process.exit();
        }
      }
    } else if (response.uid) {
      // NOTE new app installation
      this.progressManager?.tick(true, `${response.name}`, null, PROCESS_NAMES.CREATE_APPS);
      log.success(`${response.name} app created successfully.!`, this.importConfig.context);
      log.debug(`App UID mapping: ${app.uid} → ${response.uid}`, this.importConfig.context);
      this.appUidMapping[app.uid] = response.uid;
      this.appNameMapping[this.appOriginalName] = response.name;
      log.debug(`App name mapping: ${this.appOriginalName} → ${response.name}`, this.importConfig.context);
    } else {
      this.progressManager?.tick(false, `${app.name}`, 'Unexpected response format', PROCESS_NAMES.CREATE_APPS);
      log.debug(`Unexpected response format for app: ${app.name}`, this.importConfig.context);
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
    try {
      log.debug(`Installing app: ${app.manifest?.name || app.manifest?.uid}`, this.importConfig.context);
      let updateParam;
      const { configuration, server_configuration } = app;
      const currentStackApp = find(this.installedApps, { manifest: { uid: app?.manifest?.uid } });

      if (!currentStackApp) {
        log.debug(
          `App not found in current stack, installing new app: ${app.manifest?.name}`,
          this.importConfig.context,
        );
        if (app.manifest.visibility === 'private' && !this.importConfig.canCreatePrivateApp) {
          this.progressManager?.tick(
            true,
            `${app.manifest.name} (skipped - private app not allowed)`,
            null,
            PROCESS_NAMES.INSTALL_APPS,
          );
          log.info(`Skipping the installation of the private app ${app.manifest.name}...`, this.importConfig.context);
          return Promise.resolve();
        }

        log.debug(
          `Installing app with manifest UID: ${this.appUidMapping[app.manifest.uid] || app.manifest.uid}`,
          this.importConfig.context,
        );
        const installation = await this.installApp(
          this.importConfig,
          // NOTE if it's private app it should get uid from mapper else will use manifest uid
          this.appUidMapping[app.manifest.uid] || app.manifest.uid,
        );

        if (installation.installation_uid) {
          const appName = this.appNameMapping[app.manifest.name] || app.manifest.name || app.manifest.uid;
          this.progressManager?.tick(true, `${appName}`, null, PROCESS_NAMES.INSTALL_APPS);
          log.success(`${appName} app installed successfully.!`, this.importConfig.context);
          log.debug(`Installation UID: ${installation.installation_uid}`, this.importConfig.context);

          log.debug(`Making redirect URL call for app: ${appName}`, this.importConfig.context);
          await makeRedirectUrlCall(installation, appName, this.importConfig);

          this.installationUidMapping[app.uid] = installation.installation_uid;
          log.debug(
            `Installation UID mapping: ${app.uid} → ${installation.installation_uid}`,
            this.importConfig.context,
          );
          updateParam = { manifest: app.manifest, ...installation, configuration, server_configuration };
        } else if (installation.message) {
          this.progressManager?.tick(false, `${app.manifest?.name}`, installation.message, PROCESS_NAMES.INSTALL_APPS);
          log.info(formatError(installation.message), this.importConfig.context);
          log.debug(`Installation failed for app: ${app.manifest?.name}`, this.importConfig.context);
          cliux.print('\n');
          await confirmToCloseProcess(installation, this.importConfig);
        }
      } else if (!isEmpty(configuration) || !isEmpty(server_configuration)) {
        const appName = app.manifest.name || app.manifest.uid;
        this.progressManager?.tick(
          true,
          `${appName} (already installed, updating config)`,
          null,
          PROCESS_NAMES.INSTALL_APPS,
        );
        log.info(`${appName} is already installed`, this.importConfig.context);
        log.debug(`Handling existing app configuration for: ${appName}`, this.importConfig.context);
        updateParam = await ifAppAlreadyExist(app, currentStackApp, this.importConfig);
      } else {
        this.progressManager?.tick(true, `${app.manifest?.name} (already installed)`, null, PROCESS_NAMES.INSTALL_APPS);
        log.debug(
          `App ${app.manifest?.name} is already installed with no configuration to update`,
          this.importConfig.context,
        );
      }

      if (!this.appUidMapping[app.manifest.uid]) {
        this.appUidMapping[app.manifest.uid] = currentStackApp ? currentStackApp.manifest.uid : app.manifest.uid;
        log.debug(
          `App UID mapping: ${app.manifest.uid} → ${this.appUidMapping[app.manifest.uid]}`,
          this.importConfig.context,
        );
      }

      // NOTE update configurations
      if (updateParam && (!isEmpty(updateParam.configuration) || !isEmpty(updateParam.server_configuration))) {
        log.debug(`Updating app configuration for: ${app.manifest?.name}`, this.importConfig.context);
        await this.updateAppsConfig(updateParam);
      } else {
        log.debug(`No configuration update needed for: ${app.manifest?.name}`, this.importConfig.context);
      }
    } catch (error) {
      this.progressManager?.tick(
        false,
        `APP name: ${app.manifest?.name}`,
        error?.message || 'Failed to install apps',
        PROCESS_NAMES.INSTALL_APPS,
      );
      throw error;
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
    const appName = app.manifest.name || app.manifest.uid;
    log.debug(`Updating app configuration for: ${appName} (${installation_uid})`, this.importConfig.context);

    if (!isEmpty(configuration)) {
      log.debug(`Updating app configuration for: ${appName}`, this.importConfig.context);
      await this.appSdk
        .marketplace(this.importConfig.org_uid)
        .installation(installation_uid)
        .setConfiguration(this.nodeCrypto.decrypt(configuration))
        .then(({ data }: any) => {
          if (data?.message) {
            log.debug(data, this.importConfig.context);
            log.info(formatError(data.message), this.importConfig.context);
          } else {
            log.success(`${appName} app config updated successfully.!`, this.importConfig.context);
            log.debug(`Configuration update successful for: ${appName}`, this.importConfig.context);
          }
        })
        .catch((error: any) => {
          log.debug(error, this.importConfig.context);
          log.error(formatError(error), this.importConfig.context);
          log.debug(`Configuration update failed for: ${appName}`, this.importConfig.context);
        });
    }

    if (!isEmpty(server_configuration)) {
      log.debug(`Updating server configuration for: ${appName}`, this.importConfig.context);
      await this.appSdk
        .marketplace(this.importConfig.org_uid)
        .installation(installation_uid)
        .setServerConfig(this.nodeCrypto.decrypt(server_configuration))
        .then(({ data }: any) => {
          if (data?.message) {
            log.debug(data, this.importConfig.context);
            log.error(formatError(data.message), this.importConfig.context);
          } else {
            log.success(`${appName} app server config updated successfully.!`, this.importConfig.context);
            log.debug(`Server configuration update successful for: ${appName}`, this.importConfig.context);
          }
        })
        .catch((error: any) => {
          log.debug(error, this.importConfig.context);
          log.error(formatError(error), this.importConfig.context);
          log.debug(`Server configuration update failed for: ${appName}`, this.importConfig.context);
        });
    }
  }

  private async analyzeMarketplaceApps(): Promise<[number]> {
    return this.withLoadingSpinner('MARKETPLACE APPS: Analyzing import data...', async () => {
      log.debug('Checking for marketplace apps folder existence', this.importConfig.context);

      if (!fileHelper.fileExistsSync(this.marketPlaceFolderPath)) {
        log.info(`No Marketplace apps are found - '${this.marketPlaceFolderPath}'`, this.importConfig.context);
        return [0];
      }

      log.debug(`Found marketplace apps folder: ${this.marketPlaceFolderPath}`, this.importConfig.context);

      this.marketplaceApps = fsUtil.readFile(
        join(this.marketPlaceFolderPath, this.marketPlaceAppConfig.fileName),
        true,
      ) as Installation[];

      if (isEmpty(this.marketplaceApps)) {
        log.debug('No marketplace apps found to import', this.importConfig.context);
        return [0];
      }

      const count = this.marketplaceApps?.length || 0;
      log.debug(`Found ${count} marketplace apps to import`, this.importConfig.context);
      return [count];
    });
  }

  private prepareMarketplaceAppMapper() {
    log.debug('Creating marketplace apps mapper directory', this.importConfig.context);
    fsUtil.makeDirectory(this.mapperDirPath);
    log.debug(`Created marketplace apps mapper directory, ${this.mapperDirPath}`, this.importConfig.context);
  }

  private async setupMarketplaceEnvironment(): Promise<void> {
    try {
      log.debug('Getting developer hub base URL', this.importConfig.context);
      this.developerHubBaseUrl = this.importConfig.developerHubBaseUrl || (await getDeveloperHubUrl(this.importConfig));
      this.importConfig.developerHubBaseUrl = this.developerHubBaseUrl;
      log.debug(`Using developer hub base URL: ${this.developerHubBaseUrl}`, this.importConfig.context);

      // NOTE init marketplace app sdk
      log.debug('Initializing marketplace SDK client', this.importConfig.context);
      const host = this.developerHubBaseUrl.split('://').pop();
      this.appSdk = await marketplaceSDKClient({ host });
      log.debug('Initialized marketplace SDK client', this.importConfig.context);

      log.debug('Getting organization UID', this.importConfig.context);
      this.importConfig.org_uid = await getOrgUid(this.importConfig);
      log.debug(`Using organization UID: ${this.importConfig.org_uid}`, this.importConfig.context);
    } catch (error) {
      throw error;
    }
  }
}
