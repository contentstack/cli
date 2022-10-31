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
const { cliux, configHandler, HttpClient, NodeCrypto } = require('@contentstack/cli-utilities');

const { formatError } = require('../util');
let config = require('../../config/default');
const { writeFile } = require('../util/helper');
const { addlogs: log } = require('../util/log');
const { getInstalledExtensions } = require('../util/marketplace-app-helper');

module.exports = class ExportMarketplaceApps {
  config;
  marketplaceAppPath = null;
  developerHuBaseUrl = null;
  marketplaceAppConfig = config.modules.marketplace_apps;

  constructor(credentialConfig) {
    this.config = credentialConfig;
  }

  async start() {
    this.developerHuBaseUrl = await this.getDeveloperHubUrl();

    if (!config.auth_token) {
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

  exportInstalledExtensions = () => {
    const self = this;

    return new Promise(async function (resolve, reject) {
      getInstalledExtensions(self.config)
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
          const headers = {
            authtoken: self.config.auth_token,
            organization_uid: self.config.org_uid,
          };
          const httpClient = new HttpClient().headers(headers);
          const nodeCrypto = new NodeCrypto();
          const developerHubApps =
            (await httpClient
              .get(`${self.developerHuBaseUrl}/apps`)
              .then(({ data: { data } }) => data)
              .catch((err) => {
                console.log(err);
              })) || [];

          eachOf(
            _.uniqBy(installedApps, 'app_uid'),
            (app, _key, cb) => {
              log(self.config, `Exporting ${app.title} app and it's config.`, 'success');
              const listOfIndexToBeUpdated = _.map(installedApps, ({ app_uid }, index) =>
                app_uid === app.app_uid ? index : undefined,
              ).filter((val) => val !== undefined);

              httpClient
                .get(`${self.developerHuBaseUrl}/installations/${app.app_installation_uid}/installationData`)
                .then(({ data: result }) => {
                  const { data, error } = result;
                  const developerHubApp = _.find(developerHubApps, { uid: app.app_uid });

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
                        installedApps[index]['configuration'] = nodeCrypto.encrypt(configuration);
                      }
                      if (!_.isEmpty(server_configuration)) {
                        installedApps[index]['server_configuration'] = nodeCrypto.encrypt(server_configuration);
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

                  cb();
                })
                .catch((err) => {
                  addlogs(self.config, `Failed to export ${app.title} app config ${formatError(error)}`, 'error');
                  console.log(err);
                  cb();
                });
            },
            () => {
              if (!_.isEmpty(installedApps)) {
                writeFile(path.join(self.marketplaceAppPath, self.marketplaceAppConfig.fileName), installedApps);

                log(self.config, chalk.green('All the marketplace apps have been exported successfully'), 'success');
              } else {
                log(self.config, 'No marketplace apps found', 'success');
              }

              resolve();
            },
          );
        })
        .catch((error) => {
          addlogs(self.config, `Failed to export marketplace-apps ${formatError(error)}`, 'error');
          reject(error);
        });
    });
  };

  getDeveloperHubUrl = async () => {
    const { cma, name } = configHandler.get('region') || {};
    let developerHubBaseUrl = this.config.developerHubUrls[cma];

    if (!developerHubBaseUrl) {
      developerHubBaseUrl = await cliux.inquire({
        type: 'input',
        name: 'name',
        validate: (url) => {
          if (!url) return 'Developer-hub URL cant be empty.';

          return true;
        },
        message: `Enter the developer-hub base URL for the ${name} region - `,
      });
    }

    return developerHubBaseUrl.startsWith('http') ? developerHubBaseUrl : `https://${developerHubBaseUrl}`;
  };
};

module.exports = new exportMarketplaceApps();
