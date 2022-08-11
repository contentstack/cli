/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const mkdirp = require('mkdirp');
const path = require('path');
const chalk = require('chalk');
const Promise = require('bluebird');

const helper = require('../util/helper');
const stack = require('../util/contentstack-management-sdk');
const { addlogs } = require('../util/log');

let config = require('../../config/default');
const contentTypeConfig = config.modules.content_types;
const validKeys = contentTypeConfig.validKeys;
let client;
let contentTypesFolderPath;

function ExportContentTypes() {
  this.content_types = [];

  this.requestOptions = {
    qs: {
      include_count: true,
      asc: 'updated_at',
      limit: config.modules.content_types.limit,
      include_global_field_schema: true,
    },
  };
}

ExportContentTypes.prototype = {
  start: function (credentialConfig) {
    this.content_types = [];
    let self = this;
    config = credentialConfig;
    contentTypesFolderPath = path.resolve(config.data, config.branchName || '', contentTypeConfig.dirName);

    client = stack.Client(config);
    // If content type id is provided then use it as part of query
    if (Array.isArray(config.contentTypes) && config.contentTypes.length > 0) {
      self.requestOptions.qs.uid = { $in: config.contentTypes };
    }
    // Create folder for content types
    mkdirp.sync(contentTypesFolderPath);
    addlogs(config, 'Starting content type export', 'success');
    return new Promise(function (resolve, reject) {
      return self
        .getContentTypes()
        .then(function () {
          return self
            .writeContentTypes()
            .then(() => {
              return resolve();
            })
            .catch((error) => {
              return reject(error);
            });
        })
        .catch(reject);
    });
  },
  getContentTypes: function (skip) {
    let self = this;
    if (typeof skip !== 'number') {
      skip = 0;
      self.requestOptions.qs.skip = skip;
    } else {
      self.requestOptions.qs.skip = skip;
    }

    return new Promise(function (resolve, reject) {
      client
        .stack({ api_key: config.source_stack, management_token: config.management_token })
        .contentType()
        .query(self.requestOptions.qs)
        .find()
        .then((contenttypeResponse) => {
          if (contenttypeResponse.items.length === 0) {
            addlogs(config, 'No content types were found in the Stack', 'success');
            return resolve();
          }
          contenttypeResponse.items.forEach(function (content_type) {
            for (let key in content_type) {
              if (validKeys.indexOf(key) === -1) {
                delete content_type[key];
              }
            }
            self.content_types.push(content_type);
          });

          skip += config.modules.content_types.limit;
          if (skip > contenttypeResponse.count) {
            return resolve();
          }
          return self.getContentTypes(skip).then(resolve).catch(reject);
        });
    });
  },
  writeContentTypes: function () {
    let self = this;
    return new Promise(function (resolve) {
      helper.writeFile(path.join(contentTypesFolderPath, 'schema.json'), self.content_types);
      self.content_types.forEach(function (content_type) {
        helper.writeFile(path.join(contentTypesFolderPath, content_type.uid + '.json'), content_type);
      });
      addlogs(config, chalk.green('Content type(s) exported successfully'), 'success');
      return resolve();
    });
  },
};

module.exports = new ExportContentTypes();
