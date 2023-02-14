/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const path = require('path');
const mkdirp = require('mkdirp');
const merge = require('lodash/merge');
const { default: config } = require('../../config');
let stackConfig = config.modules.stack;

class ExportStack {
  stackConfig = config.modules.stack;

  constructor(exportConfig, stackAPIClient) {
    this.config = merge(config, exportConfig);
    this.stackAPIClient = stackAPIClient;
    this.requestOption = {
      uri: this.config.host + this.config.apis.stacks,
      headers: this.config.headers,
      json: true,
    };
  }

  async start() {
    const self = this;
    if (self.config.auth_token) {
      const stack = await self.stackAPIClient.fetch().catch((error) => {
        console.log(error);
      });

      if (stack && stack.org_uid) {
        self.config.org_uid = stack.org_uid;
        self.config.sourceStackName = stack.name;
      }
    }

    if (!self.config.preserveStackVersion && !self.config.hasOwnProperty('master_locale')) {
      const apiDetails = {
        limit: 100,
        skip: 0,
        include_count: true,
      };
      return self.getLocales(apiDetails);
    } else if (self.config.preserveStackVersion) {
      log(self.config, 'Exporting stack details', 'success');
      let stackFolderPath = path.resolve(self.config.data, stackConfig.dirName);
      let stackContentsFile = path.resolve(stackFolderPath, stackConfig.fileName);

      mkdirp.sync(stackFolderPath);

      return new Promise((resolve, reject) => {
        return self.stackAPIClient
          .fetch()
          .then((response) => {
            fileHelper.writeFile(stackContentsFile, response);
            log(self.config, 'Exported stack details successfully!', 'success');
            return resolve(response);
          })
          .catch(reject);
      });
    }
  }

  getLocales(apiDetails) {
    const self = this;
    return new Promise((resolve, reject) => {
      const result = self.stackAPIClient.locale().query(apiDetails);

      result
        .find()
        .then((response) => {
          const masterLocalObj = response.items.find((obj) => {
            if (obj.fallback_locale === null) {
              return obj;
            }
          });
          apiDetails.skip += apiDetails.limit;
          if (masterLocalObj) {
            return resolve(masterLocalObj);
          } else if (apiDetails.skip <= response.count) {
            return resolve(self.getLocales(apiDetails));
          } else {
            return reject('Master locale not found');
          }
        })
        .catch((error) => {
          return reject(error);
        });
    });
  }
}

ExportStack.prototype.getLocales = function (apiDetails) {
  let self = this;
  return new Promise((resolve, reject) => {
    const result = this.stackAPIClient.locale().query(apiDetails);

    result
      .find()
      .then((response) => {
        const masterLocalObj = response.items.find((obj) => {
          if (obj.fallback_locale === null) {
            return obj;
          }
        });
        apiDetails.skip += apiDetails.limit;
        if (masterLocalObj) {
          return resolve(masterLocalObj);
        } else if (apiDetails.skip <= response.count) {
          return resolve(self.getLocales(apiDetails));
        } else {
          return reject('Master locale not found');
        }
      })
      .catch((error) => {
        return reject(error);
      });
  });
};

module.exports = ExportStack;
