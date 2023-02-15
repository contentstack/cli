/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */
const _ = require('lodash');
const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const { cliux, HttpClient, NodeCrypto, managementSDKClient } = require('@contentstack/cli-utilities');

const { formatError } = require('../util');
const config = require('../../config/default');
const { addlogs: log } = require('../util/log');
const { writeFileSync } = require('../util/helper');
const { getDeveloperHubUrl } = require('../util/marketplace-app-helper');

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
    this.developerHubBaseUrl = this.config.developerHubBaseUrl || (await getDeveloperHubUrl());

    if (!this.config.auth_token) {
      cliux.print(
        'WARNING!!! To export Marketplace apps, you must be logged in. Please check csdx auth:login --help to log in',
        { color: 'yellow' },
      );
      return Promise.resolve();
    }

    await this.getOrgUid();

    this.httpClient = new HttpClient().headers({
      authtoken: this.config.auth_token,
      organization_uid: this.config.org_uid,
    });

    log(this.config, 'Starting marketplace app export', 'success');
    this.marketplaceAppPath = path.resolve(
      this.config.data,
      this.config.branchName || '',
      this.marketplaceAppConfig.dirName,
    );
    mkdirp.sync(this.marketplaceAppPath);

    return this.exportInstalledExtensions();
  }

  async getOrgUid() {
    if (this.config.auth_token) {
      const tempAPIClient = await managementSDKClient({ host: this.config.host });
      const tempStackData = await tempAPIClient
        .stack({ api_key: this.config.source_stack })
        .fetch()
        .catch((error) => {
          console.log(error);
        });

      if (tempStackData && tempStackData.org_uid) {
        this.config.org_uid = tempStackData.org_uid;
      }
    }
  }

  async createNodeCryptoInstance() {
    const cryptoArgs = {};

    if (this.config.forceStopMarketplaceAppsPrompt) {
      cryptoArgs['encryptionKey'] = this.config.marketplaceAppEncryptionKey;
    } else {
      cryptoArgs['encryptionKey'] = await cliux.inquire({
        type: 'input',
        name: 'name',
        default: this.config.marketplaceAppEncryptionKey,
        validate: (url) => {
          if (!url) return "Encryption key can't be empty.";

          return true;
        },
        message: 'Enter marketplace app configurations encryption key',
      });
    }

    this.nodeCrypto = new NodeCrypto(cryptoArgs);
  }

  async exportInstalledExtensions() {
    const installedApps = (await this.getAllStackSpecificApps()) || [];

    if (!_.isEmpty(installedApps)) {
      for (const [index, app] of _.entries(installedApps)) {
        await this.getAppConfigurations(installedApps, [+index, app]);
      }

      await writeFileSync(path.join(this.marketplaceAppPath, this.marketplaceAppConfig.fileName), installedApps);

      log(this.config, chalk.green('All the marketplace apps have been exported successfully'), 'success');
    } else {
      log(this.config, 'No marketplace apps found', 'success');
    }
  }

  getAllStackSpecificApps(listOfApps = [], skip = 0) {
    return this.httpClient
      .get(`${this.developerHubBaseUrl}/installations?target_uids=${this.config.source_stack}&skip=${skip}`)
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
        log(self.config, `Failed to export marketplace-apps ${formatError(error)}`, 'error');
      });
  }

  getAppConfigurations(installedApps, [index, app]) {
    const appName = app.manifest.name;
    log(this.config, `Exporting ${appName} app and it's config.`, 'success');

    return this.httpClient
      .get(`${this.developerHubBaseUrl}/installations/${app.uid}/installationData`)
      .then(async ({ data: result }) => {
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
