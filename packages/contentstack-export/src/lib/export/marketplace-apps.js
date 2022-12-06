/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */
const _ = require('lodash');
const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const eachOf = require('async/eachOf');
const { cliux, HttpClient, NodeCrypto } = require('@contentstack/cli-utilities');
const { formatError } = require('../util');
let config = require('../../config/default');
const { writeFileSync } = require('../util/helper');
const { addlogs: log } = require('../util/log');
const { getDeveloperHubUrl, getInstalledExtensions } = require('../util/marketplace-app-helper');

module.exports = class ExportMarketplaceApps {
  config;
  nodeCrypto;
  marketplaceAppPath = null;
  developerHubBaseUrl = null;
  marketplaceAppConfig = config.modules.marketplace_apps;

  constructor(exportConfig, stackAPIClient) {
    this.config = _.merge(config, exportConfig);
    this.stackAPIClient = stackAPIClient;
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

    log(this.config, 'Starting marketplace app export', 'success');
    this.marketplaceAppPath = path.resolve(
      this.config.data,
      this.config.branchName || '',
      this.marketplaceAppConfig.dirName,
    );
    mkdirp.sync(this.marketplaceAppPath);

    return this.exportInstalledExtensions();
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

  exportInstalledExtensions = () => {
    const self = this;
    const headers = {
      authtoken: self.config.auth_token,
      organization_uid: self.config.org_uid,
    };
    const httpClient = new HttpClient().headers(headers);

    return new Promise(async (resolve, reject) => {
      getInstalledExtensions(self.config, this.stackAPIClient)
        .then(async (items) => {
          const installedApps = _.map(
            _.filter(items, 'app_uid'),
            ({ uid, title, app_uid, app_installation_uid, type }) => ({
              title,
              uid,
              app_uid,
              app_installation_uid,
              type,
            }),
          );
          const uniqApps = _.uniqBy(installedApps, 'app_uid');

          const developerHubApps =
            (await httpClient
              .get(`${self.developerHubBaseUrl}/apps`)
              .then(({ data: { data } }) => data)
              .catch((err) => {
                log(self.config, err, 'error');
              })) || [];

          for (const app of uniqApps) {
            log(self.config, `Exporting ${app.title} app and it's config.`, 'success');
            const listOfIndexToBeUpdated = _.map(installedApps, ({ app_uid }, index) =>
              app_uid === app.app_uid ? index : undefined,
            ).filter((val) => val !== undefined);

            await httpClient
              .get(`${self.developerHubBaseUrl}/installations/${app.app_installation_uid}/installationData`)
              .then(async ({ data: result }) => {
                const { data, error } = result;
                const developerHubApp = _.find(developerHubApps, { uid: app.app_uid });

                if ((_.has(data, 'configuration') || _.has(data, 'server_configuration')) && !self.nodeCrypto) {
                  await self.createNodeCryptoInstance();
                }

                _.forEach(listOfIndexToBeUpdated, (index, i) => {
                  if (developerHubApp) {
                    installedApps[index]['visibility'] = developerHubApp.visibility;
                    installedApps[index]['manifest'] = _.pick(
                      developerHubApp,
                      ['name', 'description', 'icon', 'target_type', 'ui_location', 'webhook', 'oauth'], // NOTE keys can be passed to install new app in the developer hub
                    );
                  }

                  if (_.has(data, 'configuration') || _.has(data, 'server_configuration')) {
                    const { configuration, server_configuration } = data;

                    if (!_.isEmpty(configuration)) {
                      installedApps[index]['configuration'] = self.nodeCrypto.encrypt(configuration);
                    }
                    if (!_.isEmpty(server_configuration)) {
                      installedApps[index]['server_configuration'] = self.nodeCrypto.encrypt(server_configuration);
                    }

                    if (i === 0) {
                      log(self.config, `Exported ${app.title} app and it's config.`, 'success');
                    }
                  } else if (error) {
                    console.log(error);
                    if (i === 0) {
                      log(self.config, `Error on exporting ${app.title} app and it's config.`, 'error');
                    }
                  }
                });
              })
              .catch((err) => {
                log(self.config, `Failed to export ${app.title} app config ${formatError(error)}`, 'error');
                console.log(err);
              });
          }

          if (!_.isEmpty(installedApps)) {
            await writeFileSync(path.join(self.marketplaceAppPath, self.marketplaceAppConfig.fileName), installedApps);

            log(self.config, chalk.green('All the marketplace apps have been exported successfully'), 'success');
          } else {
            log(self.config, 'No marketplace apps found', 'success');
          }

          resolve();
        })
        .catch((error) => {
          log(self.config, `Failed to export marketplace-apps ${formatError(error)}`, 'error');
          reject(error);
        });
    });
  };
};
