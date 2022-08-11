/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const Promise = require('bluebird');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const { addlogs } = require('../util/log');

const helper = require('../util/helper');
const log = require('../util/log');
const stack = require('../util/contentstack-management-sdk');

let config = require('../../config/default');
let entriesConfig = config.modules.entries;
let invalidKeys = entriesConfig.invalidKeys;
let limit = entriesConfig.limit;
let content_types;
let locales;
let entryFolderPath;
let localesFilePath;
let schemaFilePath;
let client;

function exportEntries() {
  this.requestOptions = {
    headers: config.headers,
    qs: {
      include_count: true,
      include_publish_details: true,
      limit: limit,
    },
    json: true,
  };
}

exportEntries.prototype.start = function (credentialConfig) {
  let self = this;
  config = credentialConfig;
  entryFolderPath = path.resolve(config.data, config.branchName || '', config.modules.entries.dirName);
  localesFilePath = path.resolve(
    config.data,
    config.branchName || '',
    config.modules.locales.dirName,
    config.modules.locales.fileName,
  );
  schemaFilePath = path.resolve(
    config.data,
    config.branchName || '',
    config.modules.content_types.dirName,
    'schema.json',
  );
  client = stack.Client(config);
  addlogs(config, 'Starting entry migration', 'success');
  return new Promise(function (resolve) {
    locales = helper.readFile(localesFilePath);
    let apiBucket = [];
    content_types = helper.readFile(schemaFilePath);
    if (content_types.length !== 0) {
      content_types.forEach((content_type) => {
        if (Object.keys(locales).length !== 0) {
          for (let _locale in locales) {
            apiBucket.push({
              content_type: content_type.uid,
              locale: locales[_locale].code,
            });
          }
        }
        apiBucket.push({
          content_type: content_type.uid,
          locale: config.master_locale.code,
        });
      });
      return Promise.map(
        apiBucket,
        function (apiDetails) {
          return self.getEntries(apiDetails);
        },
        {
          concurrency: 1,
        },
      )
        .then(function () {
          addlogs(config, 'Entry migration completed successfully', 'success');
          return resolve();
        })
        .catch((error) => {
          console.log('Error getting entries', error && error.message);
        });
    }
    addlogs(config, 'No content_types were found in the Stack', 'success');
    return resolve();
  });
};

exportEntries.prototype.getEntry = function (apiDetails) {
  let self = this;
  return new Promise(function (resolve, reject) {
    let queryRequestObject = {
      locale: apiDetails.locale,
      except: {
        BASE: invalidKeys,
      },
      version: apiDetails.version,
    };
    client
      .stack({ api_key: config.source_stack, management_token: config.management_token })
      .contentType(apiDetails.content_type)
      .entry(apiDetails.uid)
      .fetch(queryRequestObject)
      .then((singleEntry) => {
        let entryPath = path.join(entryFolderPath, apiDetails.locale, apiDetails.content_type, singleEntry.uid);
        mkdirp.sync(entryPath);
        helper.writeFile(path.join(entryPath, 'version-' + singleEntry._version + '.json'), singleEntry);
        addlogs(
          config,
          'Completed version backup of entry: ' +
            singleEntry.uid +
            ', version: ' +
            singleEntry._version +
            ', content type: ' +
            apiDetails.content_type,
          'success',
        );
        if (--apiDetails.version !== 0) {
          return self.getEntry(apiDetails).then(resolve).catch(reject);
        }
        return resolve();
      })
      .catch((error) => {
        addlogs(config, error, 'error');
      });
  });
};

exportEntries.prototype.getEntries = function (apiDetails) {
  let self = this;
  return new Promise(function (resolve, reject) {
    if (typeof apiDetails.skip !== 'number') {
      apiDetails.skip = 0;
    }

    let queryrequestObject = {
      locale: apiDetails.locale,
      skip: apiDetails.skip,
      limit: limit,
      include_count: true,
      include_publish_details: true,
      query: {
        locale: apiDetails.locale,
      },
    };
    client
      .stack({ api_key: config.source_stack, management_token: config.management_token })
      .contentType(apiDetails.content_type)
      .entry()
      .query(queryrequestObject)
      .find()
      .then((entriesList) => {
        // /entries/content_type_uid/locale.json
        if (!fs.existsSync(path.join(entryFolderPath, apiDetails.content_type))) {
          mkdirp.sync(path.join(entryFolderPath, apiDetails.content_type));
        }
        let entriesFilePath = path.join(entryFolderPath, apiDetails.content_type, apiDetails.locale + '.json');
        let entries = helper.readFile(entriesFilePath);
        entries = entries || {};
        entriesList.items.forEach(function (entry) {
          invalidKeys.forEach((e) => delete entry[e]);
          entries[entry.uid] = entry;
        });
        helper.writeFile(entriesFilePath, entries);

        if (typeof config.versioning === 'boolean' && config.versioning) {
          for (let locale in locales) {
            // make folders for each language
            content_types.forEach(function (content_type) {
              // make folder for each content type
              let versionedEntryFolderPath = path.join(entryFolderPath, locales[locale].code, content_type.uid);
              mkdirp.sync(versionedEntryFolderPath);
            });
          }
          return Promise.map(
            entriesList.items,
            function (entry) {
              let entryDetails = {
                content_type: apiDetails.content_type,
                uid: entry.uid,
                version: entry._version,
                locale: apiDetails.locale,
              };
              return self.getEntry(entryDetails).catch(reject);
            },
            {
              concurrency: 1,
            },
          ).then(function () {
            if (apiDetails.skip > entriesList.items.length) {
              addlogs(
                config,
                'Completed fetching ' +
                  apiDetails.content_type +
                  " content type's entries in " +
                  apiDetails.locale +
                  ' locale',
                'success',
              );
              return resolve();
            }
            apiDetails.skip += limit;
            return self
              .getEntries(apiDetails)
              .then(function () {
                return resolve();
              })
              .catch(function (error) {
                return reject(error);
              });
          });
        }
        if (apiDetails.skip > entriesList.count) {
          addlogs(
            config,
            'Exported entries of ' +
              apiDetails.content_type +
              ' to the ' +
              apiDetails.locale +
              ' language successfully',
            'success',
          );
          return resolve();
        }
        apiDetails.skip += limit;
        return self
          .getEntries(apiDetails)
          .then(resolve)
          .catch((error) => {
            console.log('Get Entries errror', error && error.message);
          });
      })
      .catch((error) => {
        console.log('Entries fetch errror', error && error.message);
        addlogs(config, error, 'error');
      });
  });
};

module.exports = new exportEntries();
