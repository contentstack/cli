import map from 'lodash/map';
import has from 'lodash/has';
import find from 'lodash/find';
import omitBy from 'lodash/omitBy';
import entries from 'lodash/entries';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';
import {
  cliux,
  NodeCrypto,
  isAuthenticated,
  marketplaceSDKClient,
  ContentstackMarketplaceClient,
} from '@contentstack/cli-utilities';

import { ModuleClassParams, MarketplaceAppsConfig, ExportConfig, Installation, Manifest } from '../../types';
import { log, fsUtil, getOrgUid, formatError, getDeveloperHubUrl, createNodeCryptoInstance } from '../../utils';

export default class ExportMarketplaceApps {
  protected marketplaceAppConfig: MarketplaceAppsConfig;
  protected installedApps: Installation[] = [];
  public developerHubBaseUrl: string;
  public marketplaceAppPath: string;
  public nodeCrypto: NodeCrypto;
  public appSdk: ContentstackMarketplaceClient;
  public exportConfig: ExportConfig;

  constructor({ exportConfig }: Omit<ModuleClassParams, 'stackAPIClient' | 'moduleName'>) {
    this.exportConfig = exportConfig;
    this.marketplaceAppConfig = exportConfig.modules.marketplace_apps;
  }

  async start(): Promise<void> {
    if (!isAuthenticated()) {
      cliux.print(
        'WARNING!!! To export Marketplace apps, you must be logged in. Please check csdx auth:login --help to log in',
        { color: 'yellow' },
      );
      return Promise.resolve();
    }

    log(this.exportConfig, 'Starting marketplace app export', 'info');

    this.marketplaceAppPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.marketplaceAppConfig.dirName,
    );
    await fsUtil.makeDirectory(this.marketplaceAppPath);
    this.developerHubBaseUrl = this.exportConfig.developerHubBaseUrl || (await getDeveloperHubUrl(this.exportConfig));
    this.exportConfig.org_uid = await getOrgUid(this.exportConfig);

    // NOTE init marketplace app sdk
    const host = this.developerHubBaseUrl.split('://').pop();
    this.appSdk = await marketplaceSDKClient({ host });

    await this.exportApps();
  }

  /**
   * The function `exportApps` encrypts the configuration of installed apps using a Node.js crypto
   * library if it is available.
   */
  async exportApps(): Promise<any> {
    await this.getStackSpecificApps();
    await this.getAppManifestAndAppConfig();

    if (!this.nodeCrypto && find(this.installedApps, (app) => !isEmpty(app.configuration))) {
      this.nodeCrypto = await createNodeCryptoInstance(this.exportConfig);
    }

    this.installedApps = map(this.installedApps, (app) => {
      if (has(app, 'configuration')) {
        app['configuration'] = this.nodeCrypto.encrypt(app.configuration);
      }
      return app;
    });
  }

  /**
   * The function `getAppManifestAndAppConfig` exports the manifest and configurations of installed
   * marketplace apps.
   */
  async getAppManifestAndAppConfig(): Promise<void> {
    if (isEmpty(this.installedApps)) {
      log(this.exportConfig, 'No marketplace apps found', 'info');
    } else {
      for (const [index, app] of entries(this.installedApps)) {
        if (app.manifest.visibility === 'private') {
          await this.getPrivateAppsManifest(+index, app);
        }
      }

      for (const [index, app] of entries(this.installedApps)) {
        await this.getAppConfigurations(+index, app);
      }

      fsUtil.writeFile(pResolve(this.marketplaceAppPath, this.marketplaceAppConfig.fileName), this.installedApps);

      log(this.exportConfig, 'All the marketplace apps have been exported successfully', 'info');
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
    const manifest = await this.appSdk
      .marketplace(this.exportConfig.org_uid)
      .app(appInstallation.manifest.uid)
      .fetch({ include_oauth: true })
      .catch((error) => {
        log(this.exportConfig, error, 'error');
      });

    if (manifest) {
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
    log(this.exportConfig, `Exporting ${appName} app and it's config.`, 'info');

    await this.appSdk
      .marketplace(this.exportConfig.org_uid)
      .installation(appInstallation.uid)
      .installationData()
      .then(async (result: any) => {
        const { data, error } = result;

        if (has(data, 'server_configuration') || has(data, 'configuration')) {
          if (!this.nodeCrypto && (has(data, 'server_configuration') || has(data, 'configuration'))) {
            this.nodeCrypto = await createNodeCryptoInstance(this.exportConfig);
          }

          if (!isEmpty(data?.configuration)) {
            this.installedApps[index]['configuration'] = this.nodeCrypto.encrypt(data.configuration);
          }

          if (!isEmpty(data?.server_configuration)) {
            this.installedApps[index]['server_configuration'] = this.nodeCrypto.encrypt(data.server_configuration);
            log(this.exportConfig, `Exported ${appName} app and it's config.`, 'success');
          } else {
            log(this.exportConfig, `Exported ${appName} app`, 'success');
          }
        } else if (error) {
          log(this.exportConfig, `Error on exporting ${appName} app and it's config.`, 'error');
          log(this.exportConfig, error, 'error');
        }
      })
      .catch((error: any) => {
        log(this.exportConfig, `Failed to export ${appName} app config ${formatError(error)}`, 'error');
        log(this.exportConfig, error, 'error');
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
    const collection = await this.appSdk
      .marketplace(this.exportConfig.org_uid)
      .installation()
      .fetchAll({ target_uids: this.exportConfig.source_stack, skip })
      .catch((error) => {
        log(this.exportConfig, `Failed to export marketplace-apps ${formatError(error)}`, 'error');
        log(this.exportConfig, error, 'error');
      });

    if (collection) {
      const { items: apps, count } = collection;
      // NOTE Remove all the chain functions
      const installation = map(apps, (app) =>
        omitBy(app, (val, _key) => {
          if (val instanceof Function) return true;
          return false;
        }),
      ) as unknown as Installation[];
      this.installedApps = this.installedApps.concat(installation);

      if (count - (skip + 50) > 0) {
        await this.getStackSpecificApps(skip + 50);
      }
    }
  }
}
