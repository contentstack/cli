/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp');
const path = require('path');
const helper = require('../util/helper');
const { addlogs } = require('../util/log');
const { managementClient } = require('@contentstack/cli-utilities');
let managementAPIClient;
let config = require('../../config/default');

const stackConfig = config.modules.stack;
let client;

function ExportStack() {
  this.requestOption = {
    uri: config.host + config.apis.stacks,
    headers: config.headers,
    json: true,
  };
}

ExportStack.prototype.start = async function (credentialConfig) {
  config = credentialConfig;
  managementAPIClient = await managementClient(config);
  const self = this;

  // NOTE get org uid
  if (config.auth_token) {
    const stack = await managementAPIClient
      .stack({ api_key: config.source_stack, authtoken: config.auth_token })
      .fetch()
      .catch((error) => {
        console.log(error);
      });

    if (stack && stack.org_uid) {
      config.org_uid = stack.org_uid;
      config.sourceStackName = stack.name;
    }
  }

  if (!config.preserveStackVersion && !config.hasOwnProperty('master_locale')) {
    const apiDetails = {
      limit: 100,
      skip: 0,
      include_count: true,
    };
    return self.getLocales(apiDetails);
  } else if (config.preserveStackVersion) {
    addlogs(config, 'Exporting stack details', 'success');
    let stackFolderPath = path.resolve(config.data, stackConfig.dirName);
    let stackContentsFile = path.resolve(stackFolderPath, stackConfig.fileName);

    mkdirp.sync(stackFolderPath);

    return new Promise((resolve, reject) => {
      return managementAPIClient
        .stack({ api_key: config.source_stack })
        .fetch()
        .then((response) => {
          helper.writeFile(stackContentsFile, response);
          addlogs(config, 'Exported stack details successfully!', 'success');
          return resolve(response);
        })
        .catch(reject);
    });
  }
};

ExportStack.prototype.getLocales = function (apiDetails) {
  let self = this;
  return new Promise((resolve, reject) => {
    const result = managementAPIClient
      .stack({ api_key: config.source_stack, management_token: config.management_token })
      .locale()
      .query(apiDetails);

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

module.exports = new ExportStack();
