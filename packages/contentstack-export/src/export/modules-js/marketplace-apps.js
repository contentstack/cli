/*!
 * Contentstack Export
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */
const _ = require('lodash');
const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const eachOf = require('async/eachOf');
const {
  cliux,
  HttpClient,
  NodeCrypto,
  managementSDKClient,
  HttpClientDecorator,
  OauthDecorator,
  isAuthenticated,
} = require('@contentstack/cli-utilities');
const { default: config } = require('../../config');
const { formatError, log, fileHelper } = require('../../utils');
const { getDeveloperHubUrl, createNodeCryptoInstance } = require('../../utils');

module.exports = class ExportMarketplaceApps {
  client;
  config;
  httpClient;
  nodeCrypto;
  marketplaceAppPath = null;
  developerHubBaseUrl = null;
  marketplaceAppConfig = config.modules.marketplace_apps;

  constructor(credentialConfig) {
    this.config = _.merge(config, credentialConfig);
  }

  async start() {
    if (!isAuthenticated()) {
      cliux.print(
        'WARNING!!! To export Marketplace apps, you must be logged in. Please check csdx auth:login --help to log in',
        { color: 'yellow' },
      );
      return Promise.resolve();
    }

    this.developerHubBaseUrl = this.config.developerHubBaseUrl || (await getDeveloperHubUrl(this.config));
    this.appSdkAxiosInstance = await managementSDKClient({
      endpoint: this.developerHubBaseUrl,
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

    log(this.config, 'Starting marketplace app export', 'success');
    this.marketplaceAppPath = path.resolve(
      this.config.data,
      this.config.branchName || '',
      this.marketplaceAppConfig.dirName,
    );
    mkdirp.sync(this.marketplaceAppPath);

    this.nodeCrypto = await createNodeCryptoInstance(config);

    return this.exportInstalledExtensions();
  }

  async getOrgUid() {
    const tempAPIClient = await managementSDKClient({ host: this.config.host });
    const tempStackData = await tempAPIClient
      .stack({ api_key: this.config.source_stack })
      .fetch()
      .catch((error) => {
        log(this.config, formatError(error), 'error');
        console.log(error);
      });

    if (tempStackData?.org_uid) {
      this.config.org_uid = tempStackData.org_uid;
    }
  }

  async exportInstalledExtensions() {
    const client = await managementSDKClient({ host: this.developerHubBaseUrl.split('://').pop() });
    const installedApps = (await this.getAllStackSpecificApps()) || [];

    if (!_.isEmpty(installedApps)) {
      for (const [index, app] of _.entries(installedApps)) {
        await this.getAppConfigurations(client, installedApps, [+index, app]);
      }

      fileHelper.writeFileSync(path.join(this.marketplaceAppPath, this.marketplaceAppConfig.fileName), installedApps);

      log(this.config, chalk.green('All the marketplace apps have been exported successfully'), 'success');
    } else {
      log(this.config, 'No marketplace apps found', 'success');
    }
  }

  getAllStackSpecificApps(listOfApps = [], skip = 0) {
    return this.appSdkAxiosInstance.axiosInstance
      .get(`/installations?target_uids=${this.config.source_stack}&skip=${skip}`, {
        headers: {
          organization_uid: this.config.org_uid
        },
      })
      .then(async ({ data }) => {
        const { data: apps, count } = data;

        if (!this.nodeCrypto && _.find(apps, (app) => !_.isEmpty(app.configuration))) {
          await this.createNodeCryptoInstance();
        }

        listOfApps.push(
          ..._.map(apps, (app) => {
            if (_.has(app, 'configuration')) {
              app['configuration'] = this.nodeCrypto.encrypt(app.configuration || configuration);
            }

            return app;
          }),
        );

        if (count - (skip + 50) > 0) {
          return await this.getAllStackSpecificApps(listOfApps, skip + 50);
        }

        return listOfApps;
      })
      .catch((error) => {
        log(this.config, `Failed to export marketplace-apps. ${formatError(error)}`, 'error');
      });
  }

  async getAppConfigurations(sdkClient, installedApps, [index, appInstallation]) {
    const appName = appInstallation.manifest.name;
    log(this.config, `Exporting ${appName} app and it's config.`, 'success');

    await sdkClient
      .organization(this.config.org_uid)
      .app(appInstallation.manifest.uid)
      .installation(appInstallation.uid)
      .installationData()
      .then(async (result) => {
        const { data, error } = result;
        if (_.has(data, 'server_configuration')) {
          if (!this.nodeCrypto && _.has(data, 'server_configuration')) {
            await this.createNodeCryptoInstance();
          }

          if (!_.isEmpty(data.server_configuration)) {
            installedApps[index]['server_configuration'] = this.nodeCrypto.encrypt(data.server_configuration);
            log(this.config, `Exported ${appName} app and it's config.`, 'success');
          } else {
            log(this.config, `Exported ${appName} app`, 'success');
          }
        } else if (error) {
          log(this.config, `Error on exporting ${appName} app and it's config.`, 'error');
        }
      })
      .catch((err) => {
        log(this.config, `Failed to export ${appName} app config ${formatError(err)}`, 'error');
      });
  }
};
