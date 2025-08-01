import map from 'lodash/map';
import has from 'lodash/has';
import find from 'lodash/find';
import omitBy from 'lodash/omitBy';
import entries from 'lodash/entries';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';
import { Command } from '@contentstack/cli-command';
import {
  cliux,
  NodeCrypto,
  isAuthenticated,
  marketplaceSDKClient,
  ContentstackMarketplaceClient,
  log,
  messageHandler,
  handleAndLogError,
} from '@contentstack/cli-utilities';

import { fsUtil, getOrgUid, createNodeCryptoInstance, getDeveloperHubUrl } from '../../utils';
import { ModuleClassParams, MarketplaceAppsConfig, ExportConfig, Installation, Manifest } from '../../types';
import BaseClass from './base-class';

export default class ExportMarketplaceApps extends BaseClass {
  protected marketplaceAppConfig: MarketplaceAppsConfig;
  protected installedApps: Installation[] = [];
  public developerHubBaseUrl: string;
  public marketplaceAppPath: string;
  public nodeCrypto: NodeCrypto;
  public appSdk: ContentstackMarketplaceClient;
  public exportConfig: ExportConfig;
  public command: Command;
  public query: Record<string, any>;

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.exportConfig = exportConfig;
    this.marketplaceAppConfig = exportConfig.modules.marketplace_apps;
    this.exportConfig.context.module = 'marketplace-apps';
    this.currentModuleName = 'Marketplace Apps';
  }

  async start(): Promise<void> {
    try {
      log.debug('Starting marketplace apps export process...', this.exportConfig.context);
      
      if (!isAuthenticated()) {
        cliux.print(
          'WARNING!!! To export Marketplace apps, you must be logged in. Please check csdx auth:login --help to log in',
          { color: 'yellow' },
        );
        return Promise.resolve();
      }

      // Initial setup and analysis with loading spinner
      const [appsCount] = await this.withLoadingSpinner(
        'MARKETPLACE-APPS: Analyzing marketplace apps...',
        async () => {
          await this.setupPaths();
          const appsCount = await this.getAppsCount();
          return [appsCount];
        }
      );

      if (appsCount === 0) {
        log.info(messageHandler.parse('MARKETPLACE_APPS_NOT_FOUND'), this.exportConfig.context);
        return;
      }

      // Create nested progress manager
      const progress = this.createNestedProgress(this.currentModuleName);

      // Add processes based on what we found
      progress.addProcess('Apps Fetch', appsCount);
      progress.addProcess('App Processing', appsCount); // Manifests and configurations

      // Fetch stack specific apps
      progress.startProcess('Apps Fetch').updateStatus('Fetching marketplace apps...', 'Apps Fetch');
      await this.exportApps();
      progress.completeProcess('Apps Fetch', true);

      // Process apps (manifests and configurations)
      if (this.installedApps.length > 0) {
        progress.startProcess('App Processing').updateStatus('Processing app manifests and configurations...', 'App Processing');
        await this.getAppManifestAndAppConfig();
        progress.completeProcess('App Processing', true);
      }

      this.completeProgress(true);
      log.success('Marketplace apps export completed successfully', this.exportConfig.context);
      
    } catch (error) {
      log.debug('Error occurred during marketplace apps export', this.exportConfig.context);
      handleAndLogError(error, { ...this.exportConfig.context });
      this.completeProgress(false, error?.message || 'Marketplace apps export failed');
    }
  }

  async setupPaths(): Promise<void> {
    this.marketplaceAppPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.marketplaceAppConfig.dirName,
    );
    log.debug(`Marketplace apps folder path: ${this.marketplaceAppPath}`, this.exportConfig.context);
    
    await fsUtil.makeDirectory(this.marketplaceAppPath);
    log.debug('Created marketplace apps directory', this.exportConfig.context);
    
    this.developerHubBaseUrl = this.exportConfig.developerHubBaseUrl || (await getDeveloperHubUrl(this.exportConfig));
    log.debug(`Developer hub base URL: ${this.developerHubBaseUrl}`, this.exportConfig.context);
    
    this.exportConfig.org_uid = await getOrgUid(this.exportConfig);
    this.query = { target_uids: this.exportConfig.source_stack };
    log.debug(`Organization UID: ${this.exportConfig.org_uid}`, this.exportConfig.context);

    // NOTE init marketplace app sdk
    const host = this.developerHubBaseUrl.split('://').pop();
    log.debug(`Initializing marketplace SDK with host: ${host}`, this.exportConfig.context);
    this.appSdk = await marketplaceSDKClient({ host });
  }

  async getAppsCount(): Promise<number> {
    log.debug('Fetching marketplace apps count...', this.exportConfig.context);
    
    try {
      const externalQuery = this.exportConfig.query?.modules['marketplace-apps'];
      if (externalQuery) {
        if (externalQuery.app_uid?.$in?.length > 0) {
          this.query.app_uids = externalQuery.app_uid.$in.join(',');
        }
        if (externalQuery.installation_uid?.$in?.length > 0) {
          this.query.installation_uids = externalQuery.installation_uid?.$in?.join(',');
        }
      }

      const collection = await this.appSdk
        .marketplace(this.exportConfig.org_uid)
        .installation()
        .fetchAll({ ...this.query, limit: 1, skip: 0 });

      const count = collection?.count || 0;
      log.debug(`Total marketplace apps count: ${count}`, this.exportConfig.context);
      return count;
    } catch (error) {
      log.debug('Failed to fetch marketplace apps count', this.exportConfig.context);
      return 0;
    }
  }

  /**
   * The function `exportApps` encrypts the configuration of installed apps using a Node.js crypto
   * library if it is available.
   */
  async exportApps(): Promise<any> {
    log.debug('Starting apps export process...', this.exportConfig.context);
    
    await this.getStackSpecificApps();
    log.debug(`Retrieved ${this.installedApps.length} stack-specific apps`, this.exportConfig.context);

    if (!this.nodeCrypto && find(this.installedApps, (app) => !isEmpty(app.configuration))) {
      log.debug('Initializing NodeCrypto for app configuration encryption', this.exportConfig.context);
      this.nodeCrypto = await createNodeCryptoInstance(this.exportConfig);
    }

    this.installedApps = map(this.installedApps, (app) => {
      if (has(app, 'configuration')) {
        log.debug(`Encrypting configuration for app: ${app.manifest?.name || app.uid}`, this.exportConfig.context);
        app['configuration'] = this.nodeCrypto.encrypt(app.configuration);
      }
      return app;
    });
    
    log.debug(`Processed ${this.installedApps.length} total marketplace apps`, this.exportConfig.context);
  }

  /**
   * The function `getAppManifestAndAppConfig` exports the manifest and configurations of installed
   * marketplace apps.
   */
  async getAppManifestAndAppConfig(): Promise<void> {
    if (isEmpty(this.installedApps)) {
      log.info(messageHandler.parse('MARKETPLACE_APPS_NOT_FOUND'), this.exportConfig.context);
    } else {
      log.debug(`Processing ${this.installedApps.length} installed apps`, this.exportConfig.context);
      
      for (const [index, app] of entries(this.installedApps)) {
        if (app.manifest.visibility === 'private') {
          log.debug(`Processing private app manifest: ${app.manifest.name}`, this.exportConfig.context);
          await this.getPrivateAppsManifest(+index, app);
        }
      }

      for (const [index, app] of entries(this.installedApps)) {
        log.debug(`Processing app configurations: ${app.manifest?.name || app.uid}`, this.exportConfig.context);
        await this.getAppConfigurations(+index, app);
        
        // Track progress for each app processed
        this.progressManager?.tick(true, `app: ${app.manifest?.name || app.uid}`, null, 'App Processing');
      }

      const marketplaceAppsFilePath = pResolve(this.marketplaceAppPath, this.marketplaceAppConfig.fileName);
      log.debug(`Writing marketplace apps to: ${marketplaceAppsFilePath}`, this.exportConfig.context);
      fsUtil.writeFile(marketplaceAppsFilePath, this.installedApps);

      log.success(
        messageHandler.parse('MARKETPLACE_APPS_EXPORT_COMPLETE', Object.keys(this.installedApps).length),
        this.exportConfig.context,
      );
    }
  }

  /**
   * The function `getPrivateAppsManifest` fetches the manifest of a private app and assigns it to the
   * `manifest` property of the corresponding installed app.
   * @param {number} index - The `index` parameter is a number that represents the position of the app
   * in an array or list. It is used to identify the specific app in the `installedApps` array.
   * @param {App} appInstallation - The `appInstallation` parameter is an object that represents the
   * installation details of an app. It contains information such as the UID (unique identifier) of the
   * app's manifest.
   */
  async getPrivateAppsManifest(index: number, appInstallation: Installation) {
    log.debug(`Fetching private app manifest for: ${appInstallation.manifest.name} (${appInstallation.manifest.uid})`, this.exportConfig.context);
    
    const manifest = await this.appSdk
      .marketplace(this.exportConfig.org_uid)
      .app(appInstallation.manifest.uid)
      .fetch({ include_oauth: true })
      .catch((error) => {
        log.debug(`Failed to fetch private app manifest for: ${appInstallation.manifest.name}`, this.exportConfig.context);
        handleAndLogError(
          error,
          {
            ...this.exportConfig.context,
          },
          messageHandler.parse('MARKETPLACE_APP_MANIFEST_EXPORT_FAILED', appInstallation.manifest.name),
        );
      });

    if (manifest) {
      log.debug(`Successfully fetched private app manifest for: ${appInstallation.manifest.name}`, this.exportConfig.context);
      this.installedApps[index].manifest = manifest as unknown as Manifest;
    }
  }

  /**
   * The function `getAppConfigurations` exports the configuration of an app installation and encrypts
   * the server configuration if it exists.
   * @param {number} index - The `index` parameter is a number that represents the index of the app
   * installation in an array or list. It is used to identify the specific app installation that needs
   * to be processed or accessed.
   * @param {any} appInstallation - The `appInstallation` parameter is an object that represents the
   * installation details of an app. It contains information such as the app's manifest, unique
   * identifier (uid), and other installation data.
   */
  async getAppConfigurations(index: number, appInstallation: any) {
    const appName = appInstallation?.manifest?.name;
    const appUid = appInstallation?.manifest?.uid;
    const app = appName || appUid;
    log.debug(`Fetching app configuration for: ${app}`, this.exportConfig.context);
    log.info(messageHandler.parse('MARKETPLACE_APP_CONFIG_EXPORT', app), this.exportConfig.context);

    await this.appSdk
      .marketplace(this.exportConfig.org_uid)
      .installation(appInstallation.uid)
      .installationData()
      .then(async (result: any) => {
        const { data, error } = result;

        if (has(data, 'server_configuration') || has(data, 'configuration')) {
          log.debug(`Found configuration data for app: ${app}`, this.exportConfig.context);
          
          if (!this.nodeCrypto && (has(data, 'server_configuration') || has(data, 'configuration'))) {
            log.debug(`Initializing NodeCrypto for app: ${app}`, this.exportConfig.context);
            this.nodeCrypto = await createNodeCryptoInstance(this.exportConfig);
          }

          if (!isEmpty(data?.configuration)) {
            log.debug(`Encrypting configuration for app: ${app}`, this.exportConfig.context);
            this.installedApps[index]['configuration'] = this.nodeCrypto.encrypt(data.configuration);
          }

          if (!isEmpty(data?.server_configuration)) {
            log.debug(`Encrypting server configuration for app: ${app}`, this.exportConfig.context);
            this.installedApps[index]['server_configuration'] = this.nodeCrypto.encrypt(data.server_configuration);
            log.success(messageHandler.parse('MARKETPLACE_APP_CONFIG_SUCCESS', app), this.exportConfig.context);
          } else {
            log.success(messageHandler.parse('MARKETPLACE_APP_EXPORT_SUCCESS', app), this.exportConfig.context);
          }
        } else if (error) {
          log.debug(`Error in app configuration data for: ${app}`, this.exportConfig.context);
          handleAndLogError(
            error,
            {
              ...this.exportConfig.context,
            },
            messageHandler.parse('MARKETPLACE_APP_CONFIG_EXPORT_FAILED', app),
          );
        }
      })
      .catch((error: any) => {
        log.debug(`Failed to fetch app configuration for: ${app}`, this.exportConfig.context);
        handleAndLogError(
          error,
          {
            ...this.exportConfig.context,
          },
          messageHandler.parse('MARKETPLACE_APP_CONFIG_EXPORT_FAILED', app),
        );
      });
  }

  /**
   * The function `getStackSpecificApps` retrieves a collection of marketplace apps specific to a stack
   * and stores them in the `installedApps` array.
   * @param [skip=0] - The `skip` parameter is used to determine the number of items to skip in the API
   * response. It is used for pagination purposes, allowing you to fetch a specific range of items from
   * the API. In this code, it is initially set to 0, indicating that no items should be skipped in
   */
  async getStackSpecificApps(skip = 0) {
    log.debug(`Fetching stack-specific apps with skip: ${skip}`, this.exportConfig.context);  
    const collection = await this.appSdk
      .marketplace(this.exportConfig.org_uid)
      .installation()
      .fetchAll({ ...this.query, skip })
      .catch((error) => {
        log.debug('Error occurred while fetching stack-specific apps', this.exportConfig.context);
        handleAndLogError(error, {
          ...this.exportConfig.context,
        });
      });

    if (collection) {
      const { items: apps, count } = collection;
      log.debug(`Fetched ${apps?.length || 0} apps out of total ${count}`, this.exportConfig.context);
      
      // NOTE Remove all the chain functions
      const installation = map(apps, (app) =>
        omitBy(app, (val, _key) => {
          if (val instanceof Function) return true;
          return false;
        }),
      ) as unknown as Installation[];
      
      log.debug(`Processed ${installation.length} app installations`, this.exportConfig.context);
      
      // Track progress for each app fetched
      installation.forEach((app) => {
        this.progressManager?.tick(true, `app: ${app.manifest?.name || app.uid}`, null, 'Apps Fetch');
      });
      
      this.installedApps = this.installedApps.concat(installation);

      if (count - (skip + 50) > 0) {
        log.debug(`Continuing to fetch apps with skip: ${skip + 50}`, this.exportConfig.context);
        await this.getStackSpecificApps(skip + 50);
      } else {
        log.debug('Completed fetching all stack-specific apps', this.exportConfig.context);
      }
    }
  }
}
