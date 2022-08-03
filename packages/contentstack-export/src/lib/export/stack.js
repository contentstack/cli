/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

var chalk = require('chalk');
var mkdirp = require('mkdirp');
var path = require('path');

var app = require('../../app');
var helper = require('../util/helper');
var { addlogs } = require('../util/log');
const stack = require('../util/contentstack-management-sdk');

let config = require('../../config/default');

var stackConfig = config.modules.stack;
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
  client = stack.Client(config);
  const self = this

  // NOTE get org uid
  if (config.auth_token) {
    const stack = await client
      .stack({ api_key: config.source_stack, authtoken: config.auth_token })
      .fetch()
      .catch((error) => {
        console.log(error)
      })

    if (stack && stack.org_uid) {
      config.org_uid = stack.org_uid
    }
  }

  if (!config.preserveStackVersion && !config.hasOwnProperty('master_locale')) {
    const apiDetails = {
      limit: 100,
      skip: 0,
      include_count: true,
    }
    return self.getLocales(apiDetails)
  } else if (config.preserveStackVersion) {
    addlogs(config, 'Exporting stack details', 'success');
    let stackFolderPath = path.resolve(config.data, stackConfig.dirName);
    let stackContentsFile = path.resolve(stackFolderPath, stackConfig.fileName);

    mkdirp.sync(stackFolderPath);

    return new Promise((resolve, reject) => {
      return client
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
  let self = this
  return new Promise((resolve, reject) => {
    const result = client
      .stack({ api_key: config.source_stack, management_token: config.management_token })
      .locale()
      .query(apiDetails)

    result
      .find()
      .then((response) => {
        const masterLocalObj = response.items.find((obj) => {
          if (obj.fallback_locale === null) {
            return obj;
          }
        });
        apiDetails.skip += apiDetails.limit;
        if (masterLocalObj) { return resolve(masterLocalObj); }
        else if (apiDetails.skip <= response.count) {
          return resolve(self.getLocales(apiDetails))
        }
        else {
          return reject('Master locale not found');
        }
      })
      .catch((error) => {
        return reject(error);
      });
  });
}

module.exports = new ExportStack();