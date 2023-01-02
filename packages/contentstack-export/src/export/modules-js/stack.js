/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const path = require('path');
const mkdirp = require('mkdirp');
const { fileHelper, log } = require('../../utils');
const { default: config } = require('../../config');
let stackConfig = config.modules.stack;
function ExportStack(config, stackAPIClient) {
  this.requestOption = {
    uri: config.host + config.apis.stacks,
    headers: config.headers,
    json: true,
  };
  this.config = config;
  this.stackAPIClient = stackAPIClient;
}

ExportStack.prototype.start = async function () {
  const self = this;

  // NOTE get org uid
  const stack = await this.stackAPIClient.fetch().catch((error) => {
    console.log(error);
  });

  if (stack && stack.org_uid) {
    this.config.org_uid = stack.org_uid;
    this.config.sourceStackName = stack.name;
  }

  if (!this.config.preserveStackVersion && !this.config.hasOwnProperty('master_locale')) {
    const apiDetails = {
      limit: 100,
      skip: 0,
      include_count: true,
    };
    return self.getLocales(apiDetails);
  } else if (this.config.preserveStackVersion) {
    log(this.config, 'Exporting stack details', 'success');
    let stackFolderPath = path.resolve(this.config.data, stackConfig.dirName);
    let stackContentsFile = path.resolve(stackFolderPath, stackConfig.fileName);

    mkdirp.sync(stackFolderPath);

    return new Promise((resolve, reject) => {
      return this.stackAPIClient
        .fetch()
        .then((response) => {
          fileHelper.writeFileSync(stackContentsFile, response);
          log(this.config, 'Exported stack details successfully!', 'success');
          return resolve(response);
        })
        .catch(reject);
    });
  }
};

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
