import map from 'lodash/map';
import has from 'lodash/has';
import find from 'lodash/find';
import entries from 'lodash/entries';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';
import {
  managementSDKClient,
  isAuthenticated,
  cliux,
  NodeCrypto,
  HttpClientDecorator,
  OauthDecorator,
  HttpClient,
  ContentstackClient,
} from '@contentstack/cli-utilities';

import {
  log,
  getDeveloperHubUrl,
  getOrgUid,
  createNodeCryptoInstance,
  formatError,
  getStackSpecificApps,
  fsUtil,
} from '../../utils';
import BaseClass from './base-class';
import { ModuleClassParams, MarketplaceAppsConfig } from '../../types';

export default class ExportMarketplaceApps extends BaseClass {
  private httpClient: OauthDecorator | HttpClientDecorator | HttpClient;
  private marketplaceAppConfig: MarketplaceAppsConfig;
  private listOfApps: Record<string, unknown>[];
  private installedApps: Record<string, unknown>[];
  public developerHubBaseUrl: string;
  public marketplaceAppPath: string;
  public nodeCrypto: NodeCrypto;

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.httpClient = new HttpClient();
    this.marketplaceAppConfig = exportConfig.modules.marketplace_apps;
    this.listOfApps = [];
    this.installedApps = [];
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

    await this.setHttpClient();
    await this.getAllStackSpecificApps();
    this.installedApps = this.listOfApps;
    await this.exportInstalledExtensions();
  }

  async setHttpClient(): Promise<void> {
    if (!this.exportConfig.auth_token) {
      this.httpClient = new OauthDecorator(this.httpClient);
      const headers = await this.httpClient.preHeadersCheck(this.exportConfig);
      this.httpClient = this.httpClient.headers(headers);
    } else {
      this.httpClient = new HttpClientDecorator(this.httpClient);
      this.httpClient.headers(this.exportConfig);
    }
  }

  async getAllStackSpecificApps(skip = 0): Promise<any> {
    const data = await getStackSpecificApps({
      developerHubBaseUrl: this.developerHubBaseUrl,
      config: this.exportConfig,
      skip,
    });

    const { data: apps, count } = data;

    if (!this.nodeCrypto && find(apps, (app) => !isEmpty(app.configuration))) {
      this.nodeCrypto = await createNodeCryptoInstance(this.exportConfig);
    }

    const stackApps = map(apps, (app) => {
      if (has(app, 'configuration')) {
        app['configuration'] = this.nodeCrypto.encrypt(app.configuration);
      }
      return app;
    });

    this.listOfApps = [...this.listOfApps, ...stackApps];

    if (count - (skip + 50) > 0) {
      return await this.getAllStackSpecificApps(skip + 50);
    }
  }

  async exportInstalledExtensions(): Promise<void> {
    if (isEmpty(this.installedApps)) {
      log(this.exportConfig, 'No marketplace apps found', 'info');
    } else {
      for (const [index, app] of entries(this.installedApps)) {
        await this.getAppConfigurations(+index, app);
      }

      fsUtil.writeFile(pResolve(this.marketplaceAppPath, this.marketplaceAppConfig.fileName), this.installedApps);

      log(this.exportConfig, 'All the marketplace apps have been exported successfully', 'info');
    }
  }

  async getAppConfigurations(index: number, appInstallation: any) {
    const sdkClient: ContentstackClient = await managementSDKClient({
      host: this.developerHubBaseUrl.split('://').pop(),
    });
    const appName = appInstallation?.manifest?.name;
    log(this.exportConfig, `Exporting ${appName} app and it's config.`, 'info');

    await sdkClient
      .organization(this.exportConfig.org_uid)
      .app(appInstallation?.manifest?.uid)
      .installation(appInstallation?.uid)
      .installationData()
      .then(async (result: any) => {
        const { data, error } = result;
        if (has(data, 'server_configuration')) {
          if (!this.nodeCrypto && has(data, 'server_configuration')) {
            this.nodeCrypto = await createNodeCryptoInstance(this.exportConfig);
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
}
