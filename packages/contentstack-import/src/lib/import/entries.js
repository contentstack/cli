/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */
const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const mkdirp = require('mkdirp');
const chalk = require('chalk');

const util = require('../util');
const helper = require('../util/fs');
const { addlogs } = require('../util/log');
const suppress = require('../util/supress-mandatory-fields');
const stack = require('../util/contentstack-management-sdk');
const extension_suppress = require('../util/extensionsUidReplace');
const lookupReplaceAssets = require('../util/lookupReplaceAssets');
const lookupReplaceEntries = require('../util/lookupReplaceEntries');
const { getInstalledExtensions } = require('../util/marketplace-app-helper');

let client;
let config = util.getConfig();

let reqConcurrency = config.concurrency;
let eConfig = config.modules.entries;
let ePath = path.resolve(config.data, eConfig.dirName);
let ctPath = path.resolve(config.data, config.modules.content_types.dirName);
let lPath = path.resolve(config.data, config.modules.locales.dirName, config.modules.locales.fileName);

let mappedAssetUidPath;
let mappedAssetUrlPath;
let entryMapperPath;
let environmentPath;
let entryUidMapperPath;
let uniqueUidMapperPath;
let modifiedSchemaPath;
let createdEntriesWOUidPath;
let failedWOPath;
let masterLanguage;

let skipFiles = ['__master.json', '__priority.json', 'schema.json'];
let entryBatchLimit = config.rateLimit || 10;
const importConcurrency = eConfig.importConcurrency || config.importConcurrency;
const writeConcurrency = eConfig.writeConcurrency || config.writeConcurrency;

function EntriesImport() {
  let self = this;
  mappedAssetUidPath = path.resolve(config.data, 'mapper', 'assets', 'uid-mapping.json');
  mappedAssetUrlPath = path.resolve(config.data, 'mapper', 'assets', 'url-mapping.json');

  entryMapperPath = path.resolve(config.data, 'mapper', 'entries');
  environmentPath = path.resolve(config.data, 'environments', 'environments.json');
  mkdirp.sync(entryMapperPath);

  entryUidMapperPath = path.join(entryMapperPath, 'uid-mapping.json');
  uniqueUidMapperPath = path.join(entryMapperPath, 'unique-mapping.json');
  modifiedSchemaPath = path.join(entryMapperPath, 'modified-schemas.json');

  createdEntriesWOUidPath = path.join(entryMapperPath, 'created-entries-wo-uid.json');
  failedWOPath = path.join(entryMapperPath, 'failedWO.json');

  // Object of Schemas, referred to by their content type uid
  this.ctSchemas = {};
  // Array of content type uids, that have reference fields
  this.refSchemas = [];
  // map of content types uids and their json-rte fields
  this.ctJsonRte = [];
  // map of content types uids and their json-rte fields
  this.ctJsonRteWithEntryRefs = [];
  // Entry refs that are held back to resolve after all entries have been created
  this.jsonRteEntryRefs = {};
  // Collection of entries, that were not created, as they already exist on Stack
  this.createdEntriesWOUid = [];
  // Collection of entry uids, mapped to the language they exist in
  this.uniqueUids = {};
  // Map of old entry uid to new
  this.mappedUids = {};
  // Entries that were created successfully
  this.success = [];
  // Entries that failed to get created OR updated
  this.fails = [];
  // List of installed extensions to replace uid
  this.installedExtensions = [];

  let files = fs.readdirSync(ctPath);
  this.environment = helper.readFileSync(environmentPath);
  for (let index in files) {
    if (index) {
      try {
        if (skipFiles.indexOf(files[index]) === -1) {
          if (files[index] != 'field_rules_uid.json') {
            let schema = require(path.resolve(path.join(ctPath, files[index])));
            self.ctSchemas[schema.uid] = schema;
          }
        }
      } catch (error) {
        addlogs(config, `Failed to read the content types to import entries ${util.formatError(error)}`);
        process.exit(0);
      }
    }
  }
}

EntriesImport.prototype = {
  /**
   * Start point for entry import
   * @return promise
   */
  start: async function (credentialConfig) {
    let self = this;
    config = credentialConfig;
    client = stack.Client(config);
    masterLanguage = config.master_locale;
    addlogs(config, 'Migrating entries', 'success');
    let languages = helper.readFileSync(lPath);
    const appMapperFolderPath = path.join(config.data, 'mapper', 'marketplace_apps');

    if (fs.existsSync(path.join(appMapperFolderPath, 'marketplace-apps.json'))) {
      self.installedExtensions = helper.readFileSync(path.join(appMapperFolderPath, 'marketplace-apps.json')) || {};
    }

    if (_.isEmpty(self.installedExtensions)) {
      self.installedExtensions = await getInstalledExtensions(config);
    }

    return new Promise(function (resolve, reject) {
      let langs = [masterLanguage.code];
      for (let i in languages) {
        if (i) {
          langs.push(languages[i].code);
        }
      }

      // Step 1: Removes field rules from content type
      // This allows to handle cases like self references and circular reference
      // if mandatory reference fields are not filed in entries then avoids the error
      // Also remove field visibility rules
      return self
        .supressFields()
        .then(async function () {
          addlogs(config, 'Completed suppressing content type reference fields', 'success');

          let mappedAssetUids = helper.readFileSync(mappedAssetUidPath) || {};
          let mappedAssetUrls = helper.readFileSync(mappedAssetUrlPath) || {};

          // Step 2: Iterate over available languages to create entries in each.
          let counter = 0;
          return Promise.map(
            langs,
            async function () {
              let lang = langs[counter];
              if (
                (config.hasOwnProperty('onlylocales') && config.onlylocales.indexOf(lang) !== -1) ||
                !config.hasOwnProperty('onlylocales')
              ) {
                addlogs(config, `Starting to create entries ${lang} locale`, 'info');
                await self.createEntries(lang, mappedAssetUids, mappedAssetUrls);
                addlogs(config, 'Entries created successfully', 'info');
                try {
                  await self.getCreatedEntriesWOUid();
                } catch (error) {
                  addlogs(
                    config,
                    `Failed get the existing entries to update the mapper ${util.formatError(error)}, 'error`,
                  );
                }
                addlogs(config, 'Starting to update entries with references', 'info');
                await self.repostEntries(lang);
                addlogs(config, "Successfully imported '" + lang + "' entries!", 'success');
                counter++;
              } else {
                addlogs(config, lang + ' has not been configured for import, thus skipping it', 'success');
                counter++;
              }
            },
            {
              concurrency: 1,
            },
          ).then(async function () {
            // Step 3: Revert all the changes done in content type in step 1
            addlogs(config, 'Restoring content type changes', 'info');
            await self.unSuppressFields();
            addlogs(config, 'Removing entries from master language which got created by default', 'info');
            await self.removeBuggedEntries();
            addlogs(config, 'Updating the field rules of content type', 'info');
            let ct_field_visibility_uid = helper.readFileSync(path.join(ctPath + '/field_rules_uid.json'));
            let ct_files = fs.readdirSync(ctPath);
            if (ct_field_visibility_uid && ct_field_visibility_uid != 'undefined') {
              for (const element of ct_field_visibility_uid) {
                if (ct_files.indexOf(element + '.json') > -1) {
                  let schema = require(path.resolve(ctPath, element));
                  try {
                    await self.field_rules_update(schema);
                  } catch (error) {
                    addlogs(
                      config,
                      `Failed to update the field rules for content type ${schema.uid} ${util.formatError(error)}`,
                    );
                  }
                }
              }
            }
            addlogs(config, chalk.green('Entries have been imported successfully!'), 'success');
            if (config.entriesPublish) {
              addlogs(config, chalk.green('Publishing entries'), 'success');
              return self
                .publish(langs)
                .then(function () {
                  addlogs(config, chalk.green('All the entries have been published successfully'), 'success');
                  return resolve();
                })
                .catch((error) => {
                  addlogs(config, `Error in publishing entries ${util.formatError(error)}`, 'error');
                });
            }
            return resolve();
          });
        })
        .catch(function (error) {
          addlogs.log(config, util.formatError(error), 'error');
          reject('Failed import entries');
        });
    });
  },

  createEntries: function (lang, mappedAssetUids, mappedAssetUrls) {
    let self = this;
    return new Promise(async function (resolve, reject) {
      let contentTypeUids = Object.keys(self.ctSchemas);
      if (fs.existsSync(entryUidMapperPath)) {
        self.mappedUids = await helper.readLargeFile(entryUidMapperPath);
      }
      self.mappedUids = self.mappedUids || {};
      return Promise.map(
        contentTypeUids,
        async function (ctUid) {
          let eLangFolderPath = path.join(entryMapperPath, lang);
          let eLogFolderPath = path.join(entryMapperPath, lang, ctUid);
          mkdirp.sync(eLogFolderPath);
          // entry file path
          let eFilePath = path.resolve(ePath, ctUid, lang + '.json');

          // log created/updated entries
          let successEntryLogPath = path.join(eLogFolderPath, 'success.json');
          let failedEntryLogPath = path.join(eLogFolderPath, 'fails.json');
          let createdEntriesPath = path.join(eLogFolderPath, 'created-entries.json');
          let createdEntries = {};
          let stackForEntries = client.stack({
            api_key: config.target_stack,
            management_token: config.management_token,
          });

          if (fs.existsSync(createdEntriesPath)) {
            createdEntries = await helper.readLargeFile(createdEntriesPath);
            createdEntries = createdEntries || {};
          }
          if (fs.existsSync(eFilePath)) {
            let entries = await helper.readLargeFile(eFilePath);
            if (!_.isPlainObject(entries) || _.isEmpty(entries)) {
              addlogs(
                config,
                chalk.white("No entries were found for Content type:'" + ctUid + "' in '" + lang + "' language!"),
                'success',
              );
            } else {
              addlogs(config, `Creating entries for content type ${ctUid} in language ${lang} ...`, 'success');
              for (let eUid in entries) {
                if (eUid) {
                  try {
                    // check ctUid in self.ctJsonRte array, if ct exists there... only then remove entry references for json rte
                    // also with json rte, api creates the json-rte field with the same uid as passed in the payload.

                    if (self.ctJsonRte.indexOf(ctUid) > -1) {
                      entries[eUid] = self.removeUidsFromJsonRteFields(entries[eUid], self.ctSchemas[ctUid].schema);
                    }

                    // remove entry references from json-rte fields
                    if (self.ctJsonRteWithEntryRefs.indexOf(ctUid) > -1) {
                      entries[eUid] = self.removeEntryRefsFromJSONRTE(entries[eUid], self.ctSchemas[ctUid].schema);
                    }
                    // will replace all old asset uid/urls with new ones
                    entries[eUid] = lookupReplaceAssets(
                      {
                        content_type: self.ctSchemas[ctUid],
                        entry: entries[eUid],
                      },
                      mappedAssetUids,
                      mappedAssetUrls,
                      eLangFolderPath,
                      self.installedExtensions,
                    );
                  } catch (error) {
                    addlogs(config, 'Failed to update entry while creating entry id ' + eUid);
                    addlogs(config, util.formatError(error), 'error');
                  }
                }
              }
              let eUids = Object.keys(entries);
              let batches = [];

              let entryBatchLimit = eConfig.batchLimit || 10;
              let batchSize = Math.round(entryBatchLimit / 3);

              // Run entry creation in batches of ~16~ entries
              for (let i = 0; i < eUids.length; i += batchSize) {
                batches.push(eUids.slice(i, i + batchSize));
              }
              return Promise.map(
                batches,
                async function (batch) {
                  return Promise.map(
                    batch,
                    async function (eUid, batchIndex) {
                      // if entry is already created
                      if (createdEntries.hasOwnProperty(eUid)) {
                        addlogs(
                          config,
                          'Skipping ' +
                            JSON.stringify({
                              content_type: ctUid,
                              locale: lang,
                              oldEntryUid: eUid,
                              newEntryUid: createdEntries[eUid],
                            }) +
                            ' as it is already created',
                          'success',
                        );
                        self.success[ctUid] = createdEntries[eUid];
                        // if its a non-master language, i.e. the entry isn't present in the master language
                        if (lang !== masterLanguage.code) {
                          self.uniqueUids[eUid] = self.uniqueUids[eUid] || {};
                          if (self.uniqueUids[eUid].locales) {
                            self.uniqueUids[eUid].locales.push(lang);
                          } else {
                            self.uniqueUids[eUid].locales = [lang];
                          }
                          self.uniqueUids[eUid].content_type = ctUid;
                        }
                        return;
                      }
                      let requestObject = {
                        qs: {
                          locale: lang,
                        },
                        json: {
                          entry: entries[eUid],
                        },
                      };
                      if (self.mappedUids.hasOwnProperty(eUid)) {
                        let entryToUpdate = stackForEntries.contentType(ctUid).entry(self.mappedUids[eUid]);
                        Object.assign(entryToUpdate, _.cloneDeep(entries[eUid]));
                        return entryToUpdate
                          .update({ locale: entryToUpdate.locale })
                          .then(async (entryResponse) => {
                            self.success[ctUid] = self.success[ctUid] || [];
                            self.success[ctUid].push(entries[eUid]);
                            if (!self.mappedUids.hasOwnProperty(eUid)) {
                              self.mappedUids[eUid] = entryResponse.uid;
                              createdEntries = entryResponse;
                              // if its a non-master language, i.e. the entry isn't present in the master language
                              if (lang !== masterLanguage.code) {
                                self.uniqueUids[eUid] = self.uniqueUids[eUid] || {};
                                if (self.uniqueUids[eUid].locales) {
                                  self.uniqueUids[eUid].locales.push(lang);
                                } else {
                                  self.uniqueUids[eUid].locales = [lang];
                                }
                                self.uniqueUids[eUid].content_type = ctUid;
                              }
                            }
                          })
                          .catch(function (error) {
                            addlogs(config, `Failed to update an entry ${eUid} ${util.formatError(error)}`, 'error');
                            self.fails.push({
                              content_type: ctUid,
                              locale: lang,
                              entry: entries[eUid],
                              error: util.formatError(error),
                            });
                            return error;
                          });
                      }
                      delete requestObject.json.entry.publish_details;
                      return client
                        .stack({ api_key: config.target_stack, management_token: config.management_token })
                        .contentType(ctUid)
                        .entry()
                        .create(requestObject.json, { locale: lang })
                        .then(async (entryResponse) => {
                          self.success[ctUid] = self.success[ctUid] || [];
                          self.success[ctUid].push(entries[eUid]);
                          if (!self.mappedUids.hasOwnProperty(eUid)) {
                            self.mappedUids[eUid] = entryResponse.uid;
                            createdEntries = entryResponse;
                            // if its a non-master language, i.e. the entry isn't present in the master language
                            if (lang !== masterLanguage.code) {
                              self.uniqueUids[eUid] = self.uniqueUids[eUid] || {};
                              if (self.uniqueUids[eUid].locales) {
                                self.uniqueUids[eUid].locales.push(lang);
                              } else {
                                self.uniqueUids[eUid].locales = [lang];
                              }
                              self.uniqueUids[eUid].content_type = ctUid;
                            }
                          }
                        })
                        .catch(function (error) {
                          if (error.hasOwnProperty('error_code') && error.error_code === 119) {
                            if (error.errors.title) {
                              addlogs(
                                config,
                                'Entry ' + eUid + ' already exist, skip to avoid creating a duplicate entry',
                                'error',
                              );
                            } else {
                              addlogs(config, `Failed to create an entry ${eUid} ${util.formatError(error)}`, 'error');
                            }
                            self.createdEntriesWOUid.push({
                              content_type: ctUid,
                              locale: lang,
                              entry: entries[eUid],
                              error: error,
                            });
                            helper.writeFileSync(createdEntriesWOUidPath, self.createdEntriesWOUid);
                            return;
                          }
                          // TODO: if status code: 422, check the reason
                          // 429 for rate limit
                          addlogs(config, `Failed to create an entry ${eUid} ${util.formatError(error)}`, 'error');
                          self.fails.push({
                            content_type: ctUid,
                            locale: lang,
                            entry: entries[eUid],
                            error: error,
                          });
                        });
                      // create/update 5 entries at a time
                    },
                    {
                      concurrency: importConcurrency,
                    },
                  ).then(function () {
                    helper.writeFileSync(successEntryLogPath, self.success[ctUid]);
                    helper.writeFileSync(failedEntryLogPath, self.fails[ctUid]);
                    helper.writeFileSync(entryUidMapperPath, self.mappedUids);
                    helper.writeFileSync(uniqueUidMapperPath, self.uniqueUids);
                    helper.writeFileSync(createdEntriesPath, createdEntries);
                  });
                  // process one batch at a time
                },
                {
                  concurrency: 1,
                },
              ).then(function () {
                if (self.success && self.success[ctUid] && self.success[ctUid].length > 0)
                  addlogs(
                    config,
                    self.success[ctUid].length +
                      ' entries created successfully in ' +
                      ctUid +
                      ' content type in ' +
                      lang +
                      ' locale!',
                    'success',
                  );
                if (self.fails && self.fails[ctUid] && self.fails[ctUid].length > 0)
                  addlogs(
                    config,
                    self.fails[ctUid].length +
                      ' entries failed to create in ' +
                      ctUid +
                      ' content type in ' +
                      lang +
                      ' locale!',
                    'error',
                  );
                self.success[ctUid] = [];
                self.fails[ctUid] = [];
              });
            }
          } else {
            addlogs(
              config,
              chalk.white(
                'Unable to find entry file path for ' +
                  ctUid +
                  " content type!\nThe file '" +
                  eFilePath +
                  "' does not exist!",
              ),
              'error',
            );
          }
        },
        {
          concurrency: 1,
        },
      )
        .then(function () {
          addlogs(config, chalk.green("Entries created successfully in '" + lang + "' language"), 'success');
          return resolve();
        })
        .catch(function (error) {
          addlogs(config, chalk.red("Failed to create entries in '" + lang + "' language"), 'error');
          return reject(error);
        });
    });
  },
  getCreatedEntriesWOUid: function () {
    let self = this;
    return new Promise(function (resolve) {
      self.createdEntriesWOUid = helper.readFileSync(createdEntriesWOUidPath);
      self.failedWO = [];
      if (_.isArray(self.createdEntriesWOUid) && self.createdEntriesWOUid.length > 0) {
        return Promise.map(
          self.createdEntriesWOUid,
          function (entry) {
            return self.fetchEntry(entry);
          },
          {
            concurrency: importConcurrency,
          },
        ).then(function () {
          helper.writeFileSync(failedWOPath, self.failedWO);
          addlogs(config, 'Mapped entries without mapped uid successfully!', 'success');
          return resolve();
        });
      }
      addlogs(config, 'No entries without mapped uid found!', 'success');
      return resolve();
    });
  },
  repostEntries: function (lang) {
    let self = this;
    return new Promise(async function (resolve, reject) {
      let _mapped_ = await helper.readLargeFile(path.join(entryMapperPath, 'uid-mapping.json'));
      if (_.isPlainObject(_mapped_)) {
        self.mappedUids = _.merge(_mapped_, self.mappedUids);
      }
      return Promise.map(
        self.refSchemas,
        async function (ctUid) {
          let eFolderPath = path.join(entryMapperPath, lang, ctUid);
          let eSuccessFilePath = path.join(eFolderPath, 'success.json');
          let eFilePath = path.resolve(ePath, ctUid, lang + '.json');
          let sourceStackEntries = await helper.readLargeFile(eFilePath);

          if (!fs.existsSync(eSuccessFilePath)) {
            addlogs(config, 'Success file was not found at: ' + eSuccessFilePath, 'success');
            return;
          }

          let entries = await helper.readLargeFile(eSuccessFilePath, { type: 'array' }); // TBD LARGE
          entries = entries || [];
          if (entries.length === 0) {
            addlogs(config, "No entries were created to be updated in '" + lang + "' language!", 'success');
            return;
          }

          // Keep track of entries that have their references updated
          let refsUpdatedUids = helper.readFileSync(path.join(eFolderPath, 'refsUpdatedUids.json'));
          let refsUpdateFailed = helper.readFileSync(path.join(eFolderPath, 'refsUpdateFailed.json'));
          let schema = self.ctSchemas[ctUid];

          let batches = [];
          refsUpdatedUids = refsUpdatedUids || [];
          refsUpdateFailed = refsUpdateFailed || [];

          // map reference uids @mapper/language/mapped-uids.json
          // map failed reference uids @mapper/language/unmapped-uids.json
          let refUidMapperPath = path.join(entryMapperPath, lang);

          addlogs(config, 'staring to update the entry for reposting');

          entries = _.map(entries, function (entry) {
            try {
              let uid = entry.uid;
              let updatedEntry;

              // restores json rte entry refs if they exist
              if (self.ctJsonRte.indexOf(ctUid) > -1) {
                // the entries stored in eSuccessFilePath, have the same uids as the entries from source data
                updatedEntry = self.restoreJsonRteEntryRefs(entry, sourceStackEntries[entry.uid], schema.schema);
              } else {
                updatedEntry = entry;
              }

              let _entry = lookupReplaceEntries(
                {
                  content_type: schema,
                  entry: updatedEntry,
                },
                _.clone(self.mappedUids),
                refUidMapperPath,
              );
              // if there's self references, the uid gets replaced
              _entry.uid = uid;
              return _entry;
            } catch (error) {
              addlogs(
                config,
                `Failed to update the entry ${uid} references while reposting ${util.formatError(error)}`,
              );
            }
          });

          addlogs(config, 'Starting the reposting process for entries');

          const entryBatchLimit = eConfig.batchLimit || 10;
          const batchSize = Math.round(entryBatchLimit / 3);
          // Run entry creation in batches
          for (let i = 0; i < entries.length; i += batchSize) {
            batches.push(entries.slice(i, i + batchSize));
          }
          return Promise.map(
            batches,
            async function (batch, index) {
              return Promise.map(
                batch,
                async function (entry) {
                  entry.uid = self.mappedUids[entry.uid];
                  if (refsUpdatedUids.indexOf(entry.uid) !== -1) {
                    addlogs(
                      config,
                      'Entry: ' +
                        entry.uid +
                        ' in Content Type: ' +
                        ctUid +
                        ' in lang: ' +
                        lang +
                        ' references fields are already updated.',
                      'success',
                    );
                    return;
                  }

                  let promiseResult = new Promise((resolveUpdatedUids, rejectUpdatedUids) => {
                    let entryResponse = client
                      .stack({ api_key: config.target_stack, management_token: config.management_token })
                      .contentType(ctUid)
                      .entry(entry.uid);
                    Object.assign(entryResponse, entry);
                    delete entryResponse.publish_details;
                    return entryResponse
                      .update({ locale: lang })
                      .then((response) => {
                        // for (let j = 0; j < entries.length; j++) {
                        //   if (entries[j].uid === response.uid) {
                        //     entries[j] = response;
                        //     break;
                        //   }
                        // }
                        refsUpdatedUids.push(response.uid);
                        return resolveUpdatedUids();
                      })
                      .catch(function (error) {
                        addlogs(
                          config,
                          chalk.red(
                            'Entry Uid: ' +
                              entry.uid +
                              ' of Content Type: ' +
                              ctUid +
                              ' failed to update in locale: ' +
                              lang,
                          ),
                          'error',
                        );

                        addlogs(config, util.formatError(error), 'error');
                        refsUpdateFailed.push({
                          content_type: ctUid,
                          entry: entry,
                          locale: lang,
                          error: error,
                        });
                        return rejectUpdatedUids(error);
                      });
                  });
                  await promiseResult;
                },
                {
                  concurrency: importConcurrency,
                },
              )
                .then(function () {
                  // batch completed successfully
                  helper.writeFileSync(path.join(eFolderPath, 'success.json'), entries);
                  helper.writeFileSync(path.join(eFolderPath, 'refsUpdatedUids.json'), refsUpdatedUids);
                  helper.writeFileSync(path.join(eFolderPath, 'refsUpdateFailed.json'), refsUpdateFailed);
                  addlogs(config, 'Completed re-post entries batch no: ' + (index + 1) + ' successfully!', 'success');
                })
                .catch(function (error) {
                  // error while executing entry in batch
                  addlogs(config, chalk.red('Failed re-post entries at batch no: ' + (index + 1)), 'error');
                  addlogs(config, util.formatError(error), 'error');
                  // throw error;
                });
            },
            {
              concurrency: 1,
            },
          )
            .then(function () {
              // finished updating entries with references
              addlogs(
                config,
                "Imported entries of Content Type: '" + ctUid + "' in language: '" + lang + "' successfully!",
                'success',
              );
            })
            .catch(function (error) {
              // error while updating entries with references
              addlogs(config, chalk.red(`Failed re-post entries of content type ${ctUid} locale ${lang}`, 'error'));
              addlogs(config, util.formatError(error), 'error');
              // throw error;
            });
        },
        {
          concurrency: 1,
        },
      )
        .then(function () {
          // completed updating entry references
          addlogs(config, chalk.green("Imported entries in '" + lang + "' language successfully!"), 'success');
          return resolve();
        })
        .catch(function (error) {
          // error while updating entry references
          addlogs(config, chalk.red('Failed to re post entries in ' + lang + ' language'), 'error');
          return reject(error);
        });
    });
  },
  supressFields: async function () {
    // it should be spelled as suppressFields
    addlogs(config, 'Suppressing content type reference fields', 'success');
    let self = this;
    return new Promise(async function (resolve, reject) {
      let modifiedSchemas = [];
      let suppressedSchemas = [];

      for (let uid in self.ctSchemas) {
        if (uid) {
          let contentTypeSchema = _.cloneDeep(self.ctSchemas[uid]);
          let flag = {
            suppressed: false,
            references: false,
            jsonRte: false,
            jsonRteEmbeddedEntries: false,
          };
          if (contentTypeSchema.field_rules) {
            delete contentTypeSchema.field_rules;
          }

          // Set mandatory or unique flag to false
          suppress(contentTypeSchema.schema, flag);
          // Check if suppress modified flag
          if (flag.suppressed) {
            suppressedSchemas.push(contentTypeSchema);
            modifiedSchemas.push(self.ctSchemas[uid]);
          }

          if (flag.references) {
            self.refSchemas.push(uid);
          }

          if (flag.jsonRte) {
            self.ctJsonRte.push(uid);
            if (flag.jsonRteEmbeddedEntries) {
              self.ctJsonRteWithEntryRefs.push(uid);
              // pushing ct uid to refSchemas, because
              // repostEntries uses refSchemas content types for
              // reposting entries
              if (self.refSchemas.indexOf(uid) === -1) {
                self.refSchemas.push(uid);
              }
            }
          }

          if (flag.jsonRte) {
            self.ctJsonRte.push(uid);
            if (flag.jsonRteEmbeddedEntries) {
              self.ctJsonRteWithEntryRefs.push(uid);
              // pushing ct uid to refSchemas, because
              // repostEntries uses refSchemas content types for
              // reposting entries
              if (self.refSchemas.indexOf(uid) === -1) {
                self.refSchemas.push(uid);
              }
            }
          }

          // Replace extensions with new UID
          extension_suppress(contentTypeSchema.schema, config.preserveStackVersion, self.installedExtensions);
        }
      }

      // write modified schema in backup file
      helper.writeFileSync(modifiedSchemaPath, modifiedSchemas);

      return Promise.map(
        suppressedSchemas,
        async function (schema) {
          let contentTypeResponse = client
            .stack({ api_key: config.target_stack, management_token: config.management_token })
            .contentType(schema.uid);
          Object.assign(contentTypeResponse, _.cloneDeep(schema));
          return contentTypeResponse
            .update()
            .then((_updatedcontentType) => {
              // empty function
            })
            .catch(function (_error) {
              addlogs(config, util.formatError(error), 'error');
              reject(`Failed suppress content type ${schema.uid} reference fields`);
            });
          // update 5 content types at a time
        },
        {
          // update reqConcurrency content types at a time
          concurrency: importConcurrency,
        },
      )
        .then(function () {
          return resolve();
        })
        .catch(function (error) {
          addlogs(config, util.formatError(error), 'error');
          return reject('Failed to suppress reference fields in content type');
        });
    });
  },
  fetchEntry: function (query) {
    let self = this;
    return new Promise(function (resolve, _reject) {
      let requestObject = {
        qs: {
          query: {
            title: query.entry.title,
          },
          locale: query.locale,
        },
      };

      return client
        .stack({ api_key: config.target_stack, management_token: config.management_token })
        .contentType(query.content_type)
        .entry()
        .query(requestObject.qs)
        .find()
        .then(function (response) {
          if (response.body.entries.length <= 0) {
            addlogs(config, 'Unable to map entry WO uid: ' + query.entry.uid, 'error');
            self.failedWO.push(query);
            return resolve();
          }
          self.mappedUids[query.entry.uid] = response.body.entries[0].uid;
          let _ePath = path.join(entryMapperPath, query.locale, query.content_type, 'success.json');
          let entries = helper.readFileSync(_ePath);
          entries.push(query.entry);
          helper.writeFileSync(_ePath, entries);
          addlogs(
            config,
            'Completed mapping entry wo uid: ' + query.entry.uid + ': ' + response.body.entries[0].uid,
            'clientsuccess',
          );
          return resolve();
        })
        .catch(function (_error) {
          return resolve();
        });
    });
  },
  unSuppressFields: function () {
    let self = this;
    return new Promise(async function (resolve, reject) {
      let modifiedSchemas = helper.readFileSync(modifiedSchemaPath);
      let modifiedSchemasUids = [];
      let updatedExtensionUidsSchemas = [];
      for (let uid in modifiedSchemas) {
        if (uid) {
          let _contentTypeSchema = _.cloneDeep(modifiedSchemas[uid]);
          if (_contentTypeSchema.field_rules) {
            delete _contentTypeSchema.field_rules;
          }

          extension_suppress(_contentTypeSchema.schema, config.preserveStackVersion, self.installedExtensions);
          updatedExtensionUidsSchemas.push(_contentTypeSchema);
        }
      }

      return Promise.map(
        updatedExtensionUidsSchemas,
        async function (schema) {
          let promise = new Promise((resolveContentType, rejectContentType) => {
            client
              .stack({ api_key: config.target_stack, management_token: config.management_token })
              .contentType(schema.uid)
              .fetch()
              .then((contentTypeResponse) => {
                contentTypeResponse.schema = schema.schema;
                contentTypeResponse
                  .update()
                  .then((_updatedcontentType) => {
                    modifiedSchemasUids.push(schema.uid);
                    addlogs(
                      config,
                      chalk.white("Content type: '" + schema.uid + "' has been restored to its previous glory!"),
                    );
                    return resolveContentType();
                  })
                  .catch(function (error) {
                    addlogs(config, chalk.red('Failed to re-update ' + schema.uid), 'error');
                    addlogs(config, error, 'error');
                    return rejectContentType(error);
                  });
              })
              .catch(function (error) {
                addlogs(config, error, 'error');
                return rejectContentType(error);
              });
          });
          await promise;
        },
        {
          concurrency: reqConcurrency,
        },
      )
        .then(function () {
          for (let i = 0; i < modifiedSchemas.length; i++) {
            if (modifiedSchemasUids.indexOf(modifiedSchemas[i].uid) !== -1) {
              modifiedSchemas.splice(i, 1);
              i--;
            }
          }
          // re-write, in case some schemas failed to update
          helper.writeFileSync(modifiedSchemaPath, _.compact(modifiedSchemas));
          addlogs(config, 'Re-modified content type schemas to their original form!', 'success');
          return resolve();
        })
        .catch(function (error) {
          // failed to update modified schemas back to their original form
          return reject(error);
        });
    });
  },
  removeBuggedEntries: function () {
    let self = this;
    return new Promise(function (resolve, reject) {
      let entries = helper.readFileSync(uniqueUidMapperPath);
      let bugged = [];
      let removed = [];
      for (let uid in entries) {
        if (entries[uid].locales.indexOf(masterLanguage.code) === -1) {
          bugged.push({
            content_type: entries[uid].content_type,
            uid: uid,
          });
        }
      }

      return Promise.map(
        bugged,
        function (entry) {
          return client
            .stack({ api_key: config.target_stack, management_token: config.management_token })
            .contentType(entry.content_type)
            .entry(self.mappedUids[entry.uid])
            .delete({ locale: masterLanguage.code })
            .then(function () {
              removed.push(self.mappedUids[entry.uid]);
              addlogs(config, 'Removed bugged entry from master ' + JSON.stringify(entry), 'success');
            })
            .catch(function (error) {
              addlogs(config, chalk.red('Failed to remove bugged entry from master language'), 'error');
              addlogs(config, util.formatError(error), 'error');
            });
        },
        {
          concurrency: importConcurrency,
        },
      )
        .then(function () {
          for (let i = 0; i < bugged.length; i++) {
            if (removed.indexOf(bugged[i].uid) !== -1) {
              bugged.splice(i, 1);
              i--;
            }
          }

          helper.writeFileSync(path.join(entryMapperPath, 'removed-uids.json'), removed);
          helper.writeFileSync(path.join(entryMapperPath, 'pending-uids.json'), bugged);

          addlogs(config, chalk.green('The stack has been eradicated from bugged entries!'), 'success');
          return resolve();
        })
        .catch(function (error) {
          // error while removing bugged entries from stack
          addlogs(config, util.formatError(error), 'error');
        });
    });
  },
  field_rules_update: function (schema) {
    return new Promise(function (resolve, reject) {
      if (schema.field_rules) {
        let fieldRuleLength = schema.field_rules.length;
        for (let k = 0; k < fieldRuleLength; k++) {
          let fieldRuleConditionLength = schema.field_rules[k].conditions.length;
          for (let i = 0; i < fieldRuleConditionLength; i++) {
            if (schema.field_rules[k].conditions[i].operand_field === 'reference') {
              let fieldRulesValue = schema.field_rules[k].conditions[i].value;
              let fieldRulesArray = fieldRulesValue.split('.');
              let updatedValue = [];
              for (const element of fieldRulesArray) {
                let splitedFieldRulesValue = element;
                let oldUid = helper.readFileSync(path.join(entryUidMapperPath));
                if (oldUid.hasOwnProperty(splitedFieldRulesValue)) {
                  updatedValue.push(oldUid[splitedFieldRulesValue]);
                } else {
                  updatedValue.push(element);
                }
              }
              schema.field_rules[k].conditions[i].value = updatedValue.join('.');
            }
          }
        }
      } else {
        addlogs(config, 'field_rules is not available', 'error');
      }

      client
        .stack({ api_key: config.target_stack, management_token: config.management_token })
        .contentType(schema.uid)
        .fetch()
        .then((contentTypeResponse) => {
          // Object.assign(ctObj, _.cloneDeep(schema))
          contentTypeResponse.field_rules = schema.field_rules;
          return contentTypeResponse.update();
        })
        .then(() => {
          return resolve();
        })
        .catch(function (error) {
          addlogs(config, `failed to update the field rules ${util.formatError(error)}`);
        });
    });
  },
  publish: function (langs) {
    let self = this;
    let requestObject = {
      entry: {},
    };

    let contentTypeUids = Object.keys(self.ctSchemas);
    let entryMapper = helper.readFileSync(entryUidMapperPath);

    return new Promise(function (resolve, reject) {
      return Promise.map(
        langs,
        function (_lang, counter) {
          let lang = langs[counter];
          return Promise.map(
            contentTypeUids,
            async function (ctUid) {
              let eFilePath = path.resolve(ePath, ctUid, lang + '.json');
              let entries = await helper.readLargeFile(eFilePath);

              let eUids = Object.keys(entries);
              let batches = [];
              let batchSize;

              if (eUids.length > 0) {
                let entryBatchLimit = eConfig.batchLimit || 10;
                batchSize = Math.round(entryBatchLimit / 3);
                // Run entry creation in batches
                for (let i = 0; i < eUids.length; i += batchSize) {
                  batches.push(eUids.slice(i, i + batchSize));
                }
              } else {
                return;
              }

              return Promise.map(
                batches,
                async function (batch, index) {
                  return Promise.map(
                    batch,
                    async function (eUid) {
                      let entry = entries[eUid];
                      let envId = [];
                      let locales = [];
                      if (entry.publish_details && entry.publish_details.length > 0) {
                        _.forEach(entries[eUid].publish_details, function (pubObject) {
                          if (
                            self.environment.hasOwnProperty(pubObject.environment) &&
                            _.indexOf(envId, self.environment[pubObject.environment].name) === -1
                          ) {
                            envId.push(self.environment[pubObject.environment].name);
                          }
                          if (pubObject.locale) {
                            let idx = _.indexOf(locales, pubObject.locale);
                            if (idx === -1) {
                              locales.push(pubObject.locale);
                            }
                          }
                        });

                        let entryUid = entryMapper[eUid];
                        if (entryUid) {
                          requestObject.entry.environments = envId;
                          requestObject.entry.locales = locales;
                          return new Promise((resolveEntryPublished, rejectEntryPublished) => {
                            client
                              .stack({ api_key: config.target_stack, management_token: config.management_token })
                              .contentType(ctUid)
                              .entry(entryUid)
                              .publish({ publishDetails: requestObject.entry, locale: lang })
                              // eslint-disable-next-line max-nested-callbacks
                              .then((result) => {
                                // addlogs(config, 'Entry ' + eUid + ' published successfully in ' + ctUid + ' content type', 'success')
                                addlogs(
                                  config,
                                  'Entry ' + eUid + ' published successfully in ' + ctUid + ' content type',
                                  'success',
                                );
                                return resolveEntryPublished(result);
                                // eslint-disable-next-line max-nested-callbacks
                              })
                              .catch(function (err) {
                                addlogs(
                                  config,
                                  `failed to publish entry ${eUid} content type ${ctUid} ${util.formatError(err)}`,
                                );
                                return resolveEntryPublished('');
                              });
                          });
                        }
                      } else {
                        return {};
                      }
                    },
                    {
                      concurrency: 1,
                    },
                  )
                    .then(function () {
                      // empty function
                    })
                    .catch(function (error) {
                      // error while executing entry in batch
                      addlogs(config, util.formatError(error), 'error');
                    });
                },
                {
                  concurrency: 1,
                },
              )
                .then(function () {
                  // addlogs(config, 'Entries published successfully in ' + ctUid + ' content type', 'success')
                  addlogs('Entries published successfully in ' + ctUid + ' content type');
                })
                .catch(function (error) {
                  addlogs(config, `failed to publish entry in content type ${ctUid} ${util.formatError(error)}`);
                });
            },
            {
              concurrency: 1,
            },
          )
            .then(function () {
              // empty function
              // addlogs('Published entries successfully in ' +);
            })
            .catch(function (error) {
              addlogs(`Failed to publish few entries in ${lang} ${util.formatError(error)}`);
            });
        },
        {
          concurrency: 1,
        },
      )
        .then(function () {
          return resolve();
        })
        .catch((error) => {
          addlogs(`Failed to publish entries ${util.formatError(error)}`);
          // return reject(error);
        });
    });
  },
  removeEntryRefsFromJSONRTE: function (entry, ctSchema) {
    for (const element of ctSchema) {
      switch (element.data_type) {
        case 'blocks': {
          if (entry[element.uid]) {
            if (element.multiple) {
              entry[element.uid] = entry[element.uid].map((e) => {
                let key = Object.keys(e).pop();
                let subBlock = element.blocks.filter((block) => block.uid === key).pop();
                e[key] = this.removeEntryRefsFromJSONRTE(e[key], subBlock.schema);
                return e;
              });
            }
          }
          break;
        }
        case 'global_field':
        case 'group': {
          if (entry[element.uid]) {
            if (element.multiple) {
              entry[element.uid] = entry[element.uid].map((e) => {
                e = this.removeEntryRefsFromJSONRTE(e, element.schema);
                return e;
              });
            } else {
              entry[element.uid] = this.removeEntryRefsFromJSONRTE(entry[element.uid], element.schema);
            }
          }
          break;
        }
        case 'json': {
          if (entry[element.uid] && element.field_metadata.rich_text_type) {
            if (element.multiple) {
              entry[element.uid] = entry[element.uid].map((jsonRteData) => {
                // repeated code from else block, will abstract later
                let entryReferences = jsonRteData.children.filter((e) => this.doEntryReferencesExist(e));
                if (entryReferences.length > 0) {
                  jsonRteData.children = jsonRteData.children.filter((e) => !this.doEntryReferencesExist(e));
                  return jsonRteData; // return jsonRteData without entry references
                } else {
                  return jsonRteData; // return jsonRteData as it is, because there are no entry references
                }
              });
            } else {
              let entryReferences = entry[element.uid].children.filter((e) => this.doEntryReferencesExist(e));
              if (entryReferences.length > 0) {
                entry[element.uid].children = entry[element.uid].children.filter(
                  (e) => !this.doEntryReferencesExist(e),
                );
              }
            }
          }
          break;
        }
      }
    }
    return entry;
  },
  doEntryReferencesExist: function (element) {
    // checks if the children of p element contain any references
    // only checking one level deep, not recursive

    if (element.length) {
      for (const item of element) {
        if ((item.type === 'p' || item.type === 'a') && item.children && item.children.length > 0) {
          return this.doEntryReferencesExist(item.children);
        } else if (this.isEntryRef(item)) {
          return true;
        }
      }
    } else {
      if (this.isEntryRef(element)) {
        return true;
      }

      if ((element.type === 'p' || element.type === 'a') && element.children && element.children.length > 0) {
        return this.doEntryReferencesExist(element.children);
      }
    }
    return false;
  },
  restoreJsonRteEntryRefs: function (entry, sourceStackEntry, ctSchema) {
    let mappedAssetUids = helper.readFileSync(mappedAssetUidPath) || {};
    let mappedAssetUrls = helper.readFileSync(mappedAssetUrlPath) || {};
    for (const element of ctSchema) {
      switch (element.data_type) {
        case 'blocks': {
          if (entry[element.uid]) {
            if (element.multiple) {
              entry[element.uid] = entry[element.uid].map((e, eIndex) => {
                let key = Object.keys(e).pop();
                let subBlock = element.blocks.filter((block) => block.uid === key).pop();
                let sourceStackElement = sourceStackEntry[element.uid][eIndex][key];
                e[key] = this.restoreJsonRteEntryRefs(e[key], sourceStackElement, subBlock.schema);
                return e;
              });
            }
          }
          break;
        }
        case 'global_field':
        case 'group': {
          if (entry[element.uid]) {
            if (element.multiple) {
              entry[element.uid] = entry[element.uid].map((e, eIndex) => {
                let sourceStackElement = sourceStackEntry[element.uid][eIndex];
                e = this.restoreJsonRteEntryRefs(e, sourceStackElement, element.schema);
                return e;
              });
            } else {
              let sourceStackElement = sourceStackEntry[element.uid];
              entry[element.uid] = this.restoreJsonRteEntryRefs(entry[element.uid], sourceStackElement, element.schema);
            }
          }
          break;
        }
        case 'json': {
          if (entry[element.uid] && element.field_metadata.rich_text_type) {
            if (element.multiple) {
              entry[element.uid] = entry[element.uid].map((field, index) => {
                // i am facing a Maximum call stack exceeded issue,
                // probably because of this loop operation

                let entryRefs = sourceStackEntry[element.uid][index].children
                  .map((e, i) => {
                    return { index: i, value: e };
                  })
                  .filter((e) => this.doEntryReferencesExist(e.value))
                  .map((e) => {
                    // commenting the line below resolved the maximum call stack exceeded issue
                    // e.value = this.setDirtyTrue(e.value)
                    this.setDirtyTrue(e.value);
                    return e;
                  })
                  .map((e) => {
                    // commenting the line below resolved the maximum call stack exceeded issue
                    // e.value = this.resolveAssetRefsInEntryRefsForJsonRte(e, mappedAssetUids, mappedAssetUrls)
                    this.resolveAssetRefsInEntryRefsForJsonRte(e.value, mappedAssetUids, mappedAssetUrls);
                    return e;
                  });

                if (entryRefs.length > 0) {
                  entryRefs.forEach((entryRef) => {
                    field.children.splice(entryRef.index, 0, entryRef.value);
                  });
                }
                return field;
              });
            } else {
              let entryRefs = sourceStackEntry[element.uid].children
                .map((e, index) => {
                  return { index: index, value: e };
                })
                .filter((e) => this.doEntryReferencesExist(e.value))
                .map((e) => {
                  this.setDirtyTrue(e.value);
                  return e;
                })
                .map((e) => {
                  this.resolveAssetRefsInEntryRefsForJsonRte(e.value, mappedAssetUids, mappedAssetUrls);
                  return e;
                });

              if (entryRefs.length > 0) {
                entryRefs.forEach((entryRef) => {
                  if (!_.isEmpty(entry[entryRef.uid]) && entry[entryRef.uid].children) {
                    entry[entryRef.uid].children.splice(entryRef.index, 0, entryRef.value);
                  }
                });
              }
            }
          }
          break;
        }
      }
    }
    return entry;
  },
  isEntryRef: function (element) {
    return element.type === 'reference' && element.attrs.type === 'entry';
  },
  removeUidsFromJsonRteFields: function (entry, ctSchema) {
    for (const element of ctSchema) {
      switch (element.data_type) {
        case 'blocks': {
          if (entry[element.uid]) {
            if (element.multiple) {
              entry[element.uid] = entry[element.uid].map((e) => {
                let key = Object.keys(e).pop();
                let subBlock = element.blocks.filter((block) => block.uid === key).pop();
                e[key] = this.removeUidsFromJsonRteFields(e[key], subBlock.schema);
                return e;
              });
            }
          }
          break;
        }
        case 'global_field':
        case 'group': {
          if (entry[element.uid]) {
            if (element.multiple) {
              entry[element.uid] = entry[element.uid].map((e) => {
                e = this.removeUidsFromJsonRteFields(e, element.schema);
                return e;
              });
            } else {
              entry[element.uid] = this.removeUidsFromJsonRteFields(entry[element.uid], element.schema);
            }
          }
          break;
        }
        case 'json': {
          if (entry[element.uid] && element.field_metadata.rich_text_type) {
            if (element.multiple) {
              entry[element.uid] = entry[element.uid].map((jsonRteData) => {
                delete jsonRteData.uid; // remove uid
                jsonRteData.attrs.dirty = true;
                jsonRteData.children = jsonRteData.children.map((child) => this.removeUidsFromChildren(child));
                return jsonRteData;
              });
            } else {
              delete entry[element.uid].uid; // remove uid
              entry[element.uid].attrs.dirty = true;
              entry[element.uid].children = entry[element.uid].children.map((child) =>
                this.removeUidsFromChildren(child),
              );
            }
          }
          break;
        }
      }
    }
    return entry;
  },
  removeUidsFromChildren: function (children) {
    if (children.length && children.length > 0) {
      return children.map((child) => {
        if (child.type && child.type.length > 0) {
          delete child.uid; // remove uid
          child.attrs.dirty = true;
        }
        if (child.children && child.children.length > 0) {
          child.children = this.removeUidsFromChildren(child.children);
        }
        return child;
      });
    } else {
      if (children.type && children.type.length > 0) {
        delete children.uid; // remove uid
        children.attrs.dirty = true;
      }
      if (children.children && children.children.length > 0) {
        children.children = this.removeUidsFromChildren(children.children);
      }
      return children;
    }
  },
  setDirtyTrue: function (jsonRteChild) {
    // also removing uids in this function
    if (jsonRteChild.type) {
      jsonRteChild.attrs['dirty'] = true;
      delete jsonRteChild.uid;

      if (jsonRteChild.children && jsonRteChild.children.length > 0) {
        jsonRteChild.children = jsonRteChild.children.map((subElement) => this.setDirtyTrue(subElement));
      }
    }
    return jsonRteChild;
  },
  resolveAssetRefsInEntryRefsForJsonRte: function (jsonRteChild, mappedAssetUids, mappedAssetUrls) {
    if (jsonRteChild.type) {
      if (jsonRteChild.attrs.type === 'asset') {
        let assetUrl;
        if (mappedAssetUids[jsonRteChild.attrs['asset-uid']]) {
          jsonRteChild.attrs['asset-uid'] = mappedAssetUids[jsonRteChild.attrs['asset-uid']];
        }

        if (jsonRteChild.attrs['display-type'] !== 'link') {
          assetUrl = jsonRteChild.attrs['asset-link'];
        } else {
          assetUrl = jsonRteChild.attrs['href'];
        }

        if (mappedAssetUrls[assetUrl]) {
          if (jsonRteChild.attrs['display-type'] !== 'link') {
            jsonRteChild.attrs['asset-link'] = mappedAssetUrls[assetUrl];
          } else {
            jsonRteChild.attrs['href'] = mappedAssetUrls[assetUrl];
          }
        }
      }

      if (jsonRteChild.children && jsonRteChild.children.length > 0) {
        jsonRteChild.children = jsonRteChild.children.map((subElement) =>
          this.resolveAssetRefsInEntryRefsForJsonRte(subElement, mappedAssetUids, mappedAssetUrls),
        );
      }
    }

    return jsonRteChild;
  },
};

module.exports = EntriesImport;
