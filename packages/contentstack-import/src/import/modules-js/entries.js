/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const mkdirp = require('mkdirp');
const chalk = require('chalk');
const {
  fileHelper,
  log,
  formatError,
  lookupExtension,
  suppressSchemaReference,
  lookupAssets,
  lookupEntries,
} = require('../../utils');
const { default: config } = require('../../config');
const { sanitizePath } = require('@contentstack/cli-utilities');
const addlogs = log;
module.exports = class ImportEntries {
  mappedAssetUidPath;
  mappedAssetUrlPath;
  entryMapperPath;
  environmentPath;
  entryUidMapperPath;
  uniqueUidMapperPath;
  modifiedSchemaPath;
  createdEntriesWOUidPath;
  failedWOPath;
  masterLanguage;
  reqConcurrency;
  eConfig;
  ePath;
  ctPath;
  lPath;
  importConcurrency;
  skipFiles = ['__master.json', '__priority.json', 'schema.json','.DS_Store'];

  constructor(importConfig, stackAPIClient) {
    this.config = _.merge(config, importConfig);
    this.stackAPIClient = stackAPIClient;
    this.mappedAssetUidPath = path.resolve(this.config.data, 'mapper', 'assets', 'uid-mapping.json');
    this.mappedAssetUrlPath = path.resolve(this.config.data, 'mapper', 'assets', 'url-mapping.json');

    this.entryMapperPath = path.resolve(this.config.data, 'mapper', 'entries');
    this.environmentPath = path.resolve(this.config.data, 'environments', 'environments.json');
    mkdirp.sync(this.entryMapperPath);

    this.entryUidMapperPath = path.join(this.entryMapperPath, 'uid-mapping.json');
    this.uniqueUidMapperPath = path.join(this.entryMapperPath, 'unique-mapping.json');
    this.modifiedSchemaPath = path.join(this.entryMapperPath, 'modified-schemas.json');

    this.createdEntriesWOUidPath = path.join(this.entryMapperPath, 'created-entries-wo-uid.json');
    this.failedWOPath = path.join(this.entryMapperPath, 'failedWO.json');

    this.reqConcurrency = this.config.concurrency;
    this.eConfig = this.config.modules.entries;
    this.ePath = path.resolve(this.config.data, this.eConfig.dirName);
    this.ctPath = path.resolve(this.config.data, this.config.modules.content_types.dirName);
    this.lPath = path.resolve(
      this.config.data,
      this.config.modules.locales.dirName,
      this.config.modules.locales.fileName,
    );

    this.importConcurrency = this.eConfig.importConcurrency || this.config.importConcurrency;

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

    let files = fs.readdirSync(this.ctPath);
    this.environment = fileHelper.readFileSync(this.environmentPath);
    for (let index in files) {
      if (index) {
        try {
          if (this.skipFiles.indexOf(files[index]) === -1) {
            if (files[index] != 'field_rules_uid.json') {
              let schema = require(path.resolve(path.join(this.ctPath, files[index])));
              this.ctSchemas[schema.uid] = schema;
            }
          }
        } catch (error) {
          addlogs(this.config, `Failed to read the content types to import entries ${formatError(error)}`, 'error');
          process.exit(0);
        }
      }
    }
  }

  async start() {
    let self = this;
    this.masterLanguage = this.config.master_locale;
    log(this.config, 'Migrating entries', 'success');
    let languages = fileHelper.readFileSync(this.lPath);
    const appMapperPath = path.join(this.config.data, 'mapper', 'marketplace_apps', 'uid-mapping.json');
    this.installedExtensions = ((await fileHelper.readFileSync(appMapperPath)) || { extension_uid: {} }).extension_uid;

    return new Promise((resolve, reject) => {
      let langs = [self.masterLanguage.code];
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
        .then(async () => {
          log(this.config, 'Completed suppressing content type reference fields', 'success');
          let mappedAssetUids = fileHelper.readFileSync(this.mappedAssetUidPath) || {};
          let mappedAssetUrls = fileHelper.readFileSync(this.mappedAssetUrlPath) || {};

          // Step 2: Iterate over available languages to create entries in each.
          let counter = 0;
          return Promise.map(
            langs,
            async () => {
              let lang = langs[counter];
              if (
                (self.config.hasOwnProperty('onlylocales') && self.config.onlylocales.indexOf(lang) !== -1) ||
                !self.config.hasOwnProperty('onlylocales')
              ) {
                addlogs(self.config, `Starting to create entries ${lang} locale`, 'info');
                await self.createEntries(lang, mappedAssetUids, mappedAssetUrls);
                log(this.config, 'Entries created successfully', 'info');
                try {
                  await self.getCreatedEntriesWOUid();
                } catch (error) {
                  addlogs(
                    self.config,
                    `Failed get the existing entries to update the mapper ${formatError(error)}, 'error`,
                  );
                }
                log(this.config, 'Starting to update entries with references', 'info');
                await self.repostEntries(lang);
                log(this.config, "Successfully imported '" + lang + "' entries!", 'success');
                counter++;
              } else {
                addlogs(self.config, `'${lang}' has not been configured for import, thus skipping it`, 'success');
                counter++;
              }
            },
            {
              concurrency: 1,
            },
          ).then(async () => {
            // Step 3: Revert all the changes done in content type in step 1
            log(this.config, 'Restoring content type changes', 'info');
            await self.unSuppressFields();
            log(this.config, 'Removing entries from master language which got created by default', 'info');
            await self.removeBuggedEntries();
            log(this.config, 'Updating the field rules of content type', 'info');
            let ct_field_visibility_uid = fileHelper.readFileSync(path.join(this.ctPath + '/field_rules_uid.json'));
            let ct_files = fs.readdirSync(this.ctPath);
            if (ct_field_visibility_uid && ct_field_visibility_uid != 'undefined') {
              for (const element of ct_field_visibility_uid) {
                if (ct_files.indexOf(element + '.json') > -1) {
                  let schema = require(path.resolve(this.ctPath, element));
                  try {
                    await self.field_rules_update(schema);
                  } catch (error) {
                    addlogs(
                      self.config,
                      `Failed to update the field rules for content type '${schema.uid}' ${formatError(error)}`,
                      'error',
                    );
                  }
                }
              }
            }
            log(this.config, chalk.green('Entries have been imported successfully!'), 'success');
            if (this.config.entriesPublish) {
              log(this.config, chalk.green('Publishing entries'), 'success');
              return self
                .publish(langs)
                .then(() => {
                  log(this.config, chalk.green('All the entries have been published successfully'), 'success');
                  return resolve();
                })
                .catch((error) => {
                  log(this.config, `Error in publishing entries ${formatError(error)}`, 'error');
                });
            }
            return resolve();
          });
        })
        .catch((error) => {
          log(self.config, formatError(error), 'error');
          reject('Failed import entries');
        });
    });
  }

  createEntries(lang, mappedAssetUids, mappedAssetUrls) {
    let self = this;
    return new Promise(async (resolve, reject) => {
      let contentTypeUids = Object.keys(self.ctSchemas);
      if (fs.existsSync(this.entryUidMapperPath)) {
        self.mappedUids = await fileHelper.readLargeFile(this.entryUidMapperPath);
      }
      self.mappedUids = self.mappedUids || {};
      return Promise.map(
        contentTypeUids,
        async (ctUid) => {
          let eLangFolderPath = path.join(this.entryMapperPath, lang);
          let eLogFolderPath = path.join(this.entryMapperPath, lang, ctUid);
          mkdirp.sync(eLogFolderPath);
          // entry file path
          let eFilePath = path.resolve(this.ePath, ctUid, lang + '.json');

          // log created/updated entries
          let successEntryLogPath = path.join(eLogFolderPath, 'success.json');
          let failedEntryLogPath = path.join(eLogFolderPath, 'fails.json');
          let createdEntriesPath = path.join(eLogFolderPath, 'created-entries.json');
          let createdEntries = {};

          if (fs.existsSync(createdEntriesPath)) {
            createdEntries = await fileHelper.readLargeFile(createdEntriesPath);
            createdEntries = createdEntries || {};
          }
          if (fs.existsSync(eFilePath)) {
            let entries = await fileHelper.readLargeFile(eFilePath);
            if (!_.isPlainObject(entries) || _.isEmpty(entries)) {
              log(
                this.config,
                chalk.white("No entries were found for Content type:'" + ctUid + "' in '" + lang + "' language!"),
                'success',
              );
            } else {
              addlogs(this.config, `Creating entries for content type ${ctUid} in language ${lang} ...`, 'success');
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
                    entries[eUid] = lookupAssets(
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
                    addlogs(this.config, 'Failed to update entry while creating entry id ' + eUid);
                    addlogs(this.config, formatError(error), 'error');
                  }
                }
              }
              let eUids = Object.keys(entries);
              let batches = [];

              let entryBatchLimit = this.eConfig.batchLimit || 10;
              let batchSize = Math.round(entryBatchLimit / 3);

              // Run entry creation in batches of ~16~ entries
              for (let i = 0; i < eUids.length; i += batchSize) {
                batches.push(eUids.slice(i, i + batchSize));
              }
              return Promise.map(
                batches,
                async (batch) => {
                  return Promise.map(
                    batch,
                    async (eUid, batchIndex) => {
                      // if entry is already created
                      if (createdEntries.hasOwnProperty(eUid)) {
                        log(
                          this.config,
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
                        if (lang !== this.masterLanguage.code) {
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
                        let entryToUpdate = self.stackAPIClient.contentType(ctUid).entry(self.mappedUids[eUid]);
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
                              if (lang !== this.masterLanguage.code) {
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
                          .catch((error) => {
                            log(this.config, `Failed to update an entry ${eUid} ${formatError(error)}`, 'error');
                            self.fails.push({
                              content_type: ctUid,
                              locale: lang,
                              entry: entries[eUid],
                              error: formatError(error),
                            });
                            return error;
                          });
                      }
                      delete requestObject.json.entry.publish_details;
                      return self.stackAPIClient
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
                            if (lang !== this.masterLanguage.code) {
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
                        .catch((error) => {
                          if (error.hasOwnProperty('errorCode') && error.errorCode === 119) {
                            if (error.errors.title) {
                              log(
                                this.config,
                                'Entry ' + eUid + ' already exist, skip to avoid creating a duplicate entry',
                                'error',
                              );
                            } else {
                              log(
                                this.config,
                                `Failed to create an entry '${eUid}' ${formatError(
                                  error,
                                )} Title of the failed entry: '${entries[eUid].title}'`,
                                'error',
                              );
                            }
                            self.createdEntriesWOUid.push({
                              content_type: ctUid,
                              locale: lang,
                              entry: entries[eUid],
                              error: error,
                            });
                            fileHelper.writeFileSync(this.createdEntriesWOUidPath, self.createdEntriesWOUid);
                            return;
                          }
                          // TODO: if status code: 422, check the reason
                          // 429 for rate limit
                          log(
                            this.config,
                            `Failed to create an entry '${eUid}' ${formatError(error)}. Title of the failed entry: '${
                              entries[eUid].title
                            }'`,
                            'error',
                          );
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
                      concurrency: this.importConcurrency,
                    },
                  ).then(() => {
                    fileHelper.writeFileSync(successEntryLogPath, self.success[ctUid]);
                    fileHelper.writeFileSync(failedEntryLogPath, self.fails[ctUid]);
                    fileHelper.writeFileSync(this.entryUidMapperPath, self.mappedUids);
                    fileHelper.writeFileSync(this.uniqueUidMapperPath, self.uniqueUids);
                    fileHelper.writeFileSync(createdEntriesPath, createdEntries);
                  });
                  // process one batch at a time
                },
                {
                  concurrency: 1,
                },
              ).then(() => {
                if (self.success && self.success[ctUid] && self.success[ctUid].length > 0)
                  log(
                    this.config,
                    self.success[ctUid].length +
                      ' entries created successfully in ' +
                      ctUid +
                      ' content type in ' +
                      lang +
                      ' locale!',
                    'success',
                  );
                if (self.fails && self.fails[ctUid] && self.fails[ctUid].length > 0)
                  log(
                    this.config,
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
            log(
              this.config,
              `Unable to find entry file path for '${ctUid}' content type!\nThe file '${eFilePath}' does not exist!`,
              'error',
            );
          }
        },
        {
          concurrency: 1,
        },
      )
        .then(() => {
          log(this.config, chalk.green("Entries created successfully in '" + lang + "' language"), 'success');
          return resolve();
        })
        .catch((error) => {
          let title = JSON.parse(error?.request?.data || '{}').entry?.title;
          addlogs(
            this.config,
            chalk.red(
              "Failed to create entries in '" +
                lang +
                "' language. " +
                'Title of the failed entry: ' +
                `'${title || ''}'`,
            ),
            'error',
          );
          return reject(error);
        });
    });
  }
  getCreatedEntriesWOUid() {
    let self = this;
    return new Promise((resolve) => {
      self.createdEntriesWOUid = fileHelper.readFileSync(this.createdEntriesWOUidPath);
      self.failedWO = [];
      if (_.isArray(self.createdEntriesWOUid) && self.createdEntriesWOUid.length > 0) {
        return Promise.map(
          self.createdEntriesWOUid,
          (entry) => {
            return self.fetchEntry(entry);
          },
          {
            concurrency: this.importConcurrency,
          },
        ).then(() => {
          fileHelper.writeFileSync(this.failedWOPath, self.failedWO);
          log(this.config, 'Mapped entries without mapped uid successfully!', 'success');
          return resolve();
        });
      }
      log(this.config, 'No entries without mapped uid found!', 'success');
      return resolve();
    });
  }
  repostEntries(lang) {
    let self = this;
    return new Promise(async (resolve, reject) => {
      let _mapped_ = await fileHelper.readLargeFile(path.join(this.entryMapperPath, 'uid-mapping.json'));
      if (_.isPlainObject(_mapped_)) {
        self.mappedUids = _.merge(_mapped_, self.mappedUids);
      }
      return Promise.map(
        self.refSchemas,
        async (ctUid) => {
          let eFolderPath = path.join(this.entryMapperPath, lang, ctUid);
          let eSuccessFilePath = path.join(eFolderPath, 'success.json');
          let eFilePath = path.resolve(this.ePath, ctUid, lang + '.json');
          let sourceStackEntries = await fileHelper.readLargeFile(eFilePath);

          if (!fs.existsSync(eSuccessFilePath)) {
            log(this.config, 'Success file was not found at: ' + eSuccessFilePath, 'success');
            return;
          }

          let entries = await fileHelper.readLargeFile(eSuccessFilePath, { type: 'array' }); // TBD LARGE
          entries = entries || [];
          if (entries.length === 0) {
            log(this.config, "No entries were created to be updated in '" + lang + "' language!", 'success');
            return;
          }

          // Keep track of entries that have their references updated
          let refsUpdatedUids = fileHelper.readFileSync(path.join(eFolderPath, 'refsUpdatedUids.json'));
          let refsUpdateFailed = fileHelper.readFileSync(path.join(eFolderPath, 'refsUpdateFailed.json'));
          let schema = self.ctSchemas[ctUid];

          let batches = [];
          refsUpdatedUids = refsUpdatedUids || [];
          refsUpdateFailed = refsUpdateFailed || [];

          // map reference uids @mapper/language/mapped-uids.json
          // map failed reference uids @mapper/language/unmapped-uids.json
          let refUidMapperPath = path.join(this.entryMapperPath, lang);

          addlogs(this.config, 'staring to update the entry for reposting');

          entries = _.map(entries, (entry) => {
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

              let _entry = lookupEntries(
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
                this.config,
                `Failed to update the entry '${uid}' references while reposting ${formatError(error)}`,
                'error',
              );
            }
          });

          log(this.config, 'Starting the reposting process for entries');

          const entryBatchLimit = this.eConfig.batchLimit || 10;
          const batchSize = Math.round(entryBatchLimit / 3);
          // Run entry creation in batches
          for (let i = 0; i < entries.length; i += batchSize) {
            batches.push(entries.slice(i, i + batchSize));
          }
          return Promise.map(
            batches,
            async (batch, index) => {
              return Promise.map(
                batch,
                async (entry) => {
                  entry.uid = self.mappedUids[entry.uid];
                  if (refsUpdatedUids.indexOf(entry.uid) !== -1) {
                    log(
                      this.config,
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
                    let entryResponse = self.stackAPIClient.contentType(ctUid).entry(entry.uid);
                    Object.assign(entryResponse, entry);
                    delete entryResponse.publish_details;
                    return entryResponse
                      .update({ locale: lang })
                      .then((response) => {
                        refsUpdatedUids.push(response.uid);
                        return resolveUpdatedUids();
                      })
                      .catch((error) => {
                        log(
                          this.config,
                          `Entry Uid '${entry.uid}' of Content Type '${ctUid}' failed to update in locale '${lang}'`,
                          'error',
                        );

                        log(this.config, formatError(error), 'error');
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
                  concurrency: this.importConcurrency,
                },
              )
                .then(() => {
                  // batch completed successfully
                  fileHelper.writeFileSync(path.join(eFolderPath, 'success.json'), entries);
                  fileHelper.writeFileSync(path.join(eFolderPath, 'refsUpdatedUids.json'), refsUpdatedUids);
                  fileHelper.writeFileSync(path.join(eFolderPath, 'refsUpdateFailed.json'), refsUpdateFailed);
                  log(this.config, 'Completed re-post entries batch no: ' + (index + 1) + ' successfully!', 'success');
                })
                .catch((error) => {
                  // error while executing entry in batch
                  addlogs(this.config, `Failed re-post entries at batch no: '${index + 1}`, 'error');
                  addlogs(this.config, formatError(error), 'error');
                  // throw error;
                });
            },
            {
              concurrency: 1,
            },
          )
            .then(() => {
              // finished updating entries with references
              log(
                this.config,
                "Imported entries of Content Type: '" + ctUid + "' in language: '" + lang + "' successfully!",
                'success',
              );
            })
            .catch((error) => {
              // error while updating entries with references
              addlogs(this.config, `Failed re-post entries of content type '${ctUid}' locale '${lang}'`, 'error');
              addlogs(this.config, formatError(error), 'error');
              // throw error;
            });
        },
        {
          concurrency: 1,
        },
      )
        .then(() => {
          // completed updating entry references
          log(this.config, chalk.green("Imported entries in '" + lang + "' language successfully!"), 'success');
          return resolve();
        })
        .catch((error) => {
          // error while updating entry references
          addlogs(this.config, chalk.red('Failed to re post entries in ' + lang + ' language'), 'error');
          return reject(error);
        });
    });
  }
  supressFields() {
    // it should be spelled as suppressFields
    log(this.config, 'Suppressing content type reference fields', 'success');
    let self = this;
    return new Promise(async (resolve, reject) => {
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
          suppressSchemaReference(contentTypeSchema.schema, flag);
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

          // Replace extensions with new UID
          lookupExtension(
            this.config,
            contentTypeSchema.schema,
            this.config.preserveStackVersion,
            self.installedExtensions,
          );
        }
      }

      // write modified schema in backup file
      fileHelper.writeFileSync(this.modifiedSchemaPath, modifiedSchemas);

      return Promise.map(
        suppressedSchemas,
        async (schema) => {
          let contentTypeResponse = self.stackAPIClient.contentType(schema.uid);
          Object.assign(contentTypeResponse, _.cloneDeep(schema));
          return contentTypeResponse
            .update()
            .then((_updatedcontentType) => {
              // empty function
            })
            .catch((_error) => {
              addlogs(this.config, formatError(_error), 'error');
              reject(`Failed suppress content type '${schema.uid}' reference fields`);
            });
          // update 5 content types at a time
        },
        {
          // update reqConcurrency content types at a time
          concurrency: this.importConcurrency,
        },
      )
        .then(() => {
          return resolve();
        })
        .catch((error) => {
          log(this.config, formatError(error), 'error');
          return reject('Failed to suppress reference fields in content type');
        });
    });
  }
  fetchEntry(query) {
    let self = this;
    return new Promise((resolve, _reject) => {
      let requestObject = {
        qs: {
          query: {
            title: query.entry.title,
          },
          locale: query.locale,
        },
      };

      return self.stackAPIClient
        .contentType(query.content_type)
        .entry()
        .query(requestObject.qs)
        .find()
        .then((response) => {
          if (response.body.entries.length <= 0) {
            log(this.config, 'Unable to map entry WO uid: ' + query.entry.uid, 'error');
            self.failedWO.push(query);
            return resolve();
          }
          self.mappedUids[query.entry.uid] = response.body.entries[0].uid;
          let _ePath = path.join(sanitizePath(this.entryMapperPath), sanitizePath(query.locale), sanitizePath(query.content_type), 'success.json');
          let entries = fileHelper.readFileSync(_ePath);
          entries.push(query.entry);
          fileHelper.writeFileSync(_ePath, entries);
          log(
            this.config,
            'Completed mapping entry wo uid: ' + query.entry.uid + ': ' + response.body.entries[0].uid,
            'clientsuccess',
          );
          return resolve();
        })
        .catch((_error) => {
          return resolve();
        });
    });
  }
  unSuppressFields() {
    let self = this;
    return new Promise(async (resolve, reject) => {
      let modifiedSchemas = fileHelper.readFileSync(this.modifiedSchemaPath);
      let modifiedSchemasUids = [];
      let updatedExtensionUidsSchemas = [];
      for (let uid in modifiedSchemas) {
        if (uid) {
          let _contentTypeSchema = _.cloneDeep(modifiedSchemas[uid]);
          if (_contentTypeSchema.field_rules) {
            delete _contentTypeSchema.field_rules;
          }

          lookupExtension(
            this.config,
            _contentTypeSchema.schema,
            this.config.preserveStackVersion,
            self.installedExtensions,
          );
          updatedExtensionUidsSchemas.push(_contentTypeSchema);
        }
      }

      return Promise.map(
        updatedExtensionUidsSchemas,
        async (schema) => {
          let promise = new Promise((resolveContentType, rejectContentType) => {
            self.stackAPIClient
              .contentType(schema.uid)
              .fetch()
              .then((contentTypeResponse) => {
                contentTypeResponse.schema = schema.schema;
                contentTypeResponse
                  .update()
                  .then((_updatedcontentType) => {
                    modifiedSchemasUids.push(schema.uid);
                    log(
                      this.config,
                      chalk.white("Content type: '" + schema.uid + "' has been restored to its previous glory!"),
                    );
                    return resolveContentType();
                  })
                  .catch((error) => {
                    addlogs(this.config, chalk.red('Failed to re-update ' + schema.uid), 'error');
                    addlogs(this.config, error, 'error');
                    return rejectContentType(error);
                  });
              })
              .catch((error) => {
                log(this.config, error, 'error');
                return rejectContentType(error);
              });
          });
          await promise;
        },
        {
          concurrency: this.reqConcurrency,
        },
      )
        .then(() => {
          for (let i = 0; i < modifiedSchemas.length; i++) {
            if (modifiedSchemasUids.indexOf(modifiedSchemas[i].uid) !== -1) {
              modifiedSchemas.splice(i, 1);
              i--;
            }
          }
          // re-write, in case some schemas failed to update
          fileHelper.writeFileSync(this.modifiedSchemaPath, _.compact(modifiedSchemas));
          log(this.config, 'Re-modified content type schemas to their original form!', 'success');
          return resolve();
        })
        .catch((error) => {
          // failed to update modified schemas back to their original form
          return reject(error);
        });
    });
  }
  removeBuggedEntries() {
    let self = this;
    return new Promise((resolve, reject) => {
      let entries = fileHelper.readFileSync(this.uniqueUidMapperPath);
      let bugged = [];
      let removed = [];
      for (let uid in entries) {
        if (entries[uid].locales.indexOf(this.masterLanguage.code) === -1) {
          bugged.push({
            content_type: entries[uid].content_type,
            uid: uid,
          });
        }
      }

      return Promise.map(
        bugged,
        (entry) => {
          return self.stackAPIClient
            .contentType(entry.content_type)
            .entry(self.mappedUids[entry.uid])
            .delete({ locale: this.masterLanguage.code })
            .then(() => {
              removed.push(self.mappedUids[entry.uid]);
              log(this.config, 'Removed bugged entry from master ' + JSON.stringify(entry), 'success');
            })
            .catch((error) => {
              addlogs(this.config, chalk.red('Failed to remove bugged entry from master language'), 'error');
              addlogs(this.config, formatError(error), 'error');
            });
        },
        {
          concurrency: this.importConcurrency,
        },
      )
        .then(() => {
          for (let i = 0; i < bugged.length; i++) {
            if (removed.indexOf(bugged[i].uid) !== -1) {
              bugged.splice(i, 1);
              i--;
            }
          }

          fileHelper.writeFileSync(path.join(this.entryMapperPath, 'removed-uids.json'), removed);
          fileHelper.writeFileSync(path.join(this.entryMapperPath, 'pending-uids.json'), bugged);

          log(this.config, chalk.green('The stack has been eradicated from bugged entries!'), 'success');
          return resolve();
        })
        .catch((error) => {
          // error while removing bugged entries from stack
          addlogs(this.config, formatError(error), 'error');
        });
    });
  }
  field_rules_update(schema) {
    return new Promise((resolve, reject) => {
      if (schema.field_rules) {
        let fieldRuleLength = schema.field_rules.length;
        const fieldDatatypeMap = {};
        for (let i = 0; i < schema.schema.length; i++) {
          const field = schema.schema[i].uid;
          fieldDatatypeMap[field] = schema.schema[i].data_type;
        }
        for (let k = 0; k < fieldRuleLength; k++) {
          let fieldRuleConditionLength = schema.field_rules[k].conditions.length;
          for (let i = 0; i < fieldRuleConditionLength; i++) {
            if (fieldDatatypeMap[schema.field_rules[k].conditions[i].operand_field] === 'reference') {
              let fieldRulesValue = schema.field_rules[k].conditions[i].value;
              let fieldRulesArray = fieldRulesValue.split('.');
              let updatedValue = [];
              for (const element of fieldRulesArray) {
                let splitedFieldRulesValue = element;
                let oldUid = fileHelper.readFileSync(path.join(this.entryUidMapperPath));
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
        log(this.config, 'field_rules is not available', 'error');
      }

      this.stackAPIClient
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
        .catch((error) => {
          log(this.config, `failed to update the field rules ${formatError(error)}`);
          return reject(error);
        });
    });
  }
  publish(langs) {
    let self = this;
    let requestObject = {
      entry: {},
    };

    let contentTypeUids = Object.keys(self.ctSchemas);
    let entryMapper = fileHelper.readFileSync(this.entryUidMapperPath);

    return new Promise((resolve, reject) => {
      return Promise.map(
        langs,
        (_lang, counter) => {
          let lang = langs[counter];
          return Promise.map(
            contentTypeUids,
            async (ctUid) => {
              let eFilePath = path.resolve(this.ePath, ctUid, lang + '.json');
              let entries = await fileHelper.readLargeFile(eFilePath);
              if (entries === undefined) {
                addlogs(this.config, `No entries were found for Content type: ${ctUid} in language: ${lang}`, 'info');
              } else {
                let eUids = Object.keys(entries);
                let batches = [];
                let batchSize;

                if (eUids.length > 0) {
                  let entryBatchLimit = this.eConfig.batchLimit || 10;
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
                  async (batch, index) => {
                    return Promise.map(
                      batch,
                      async (eUid) => {
                        let entry = entries[eUid];
                        let envId = [];
                        let locales = [];
                        if (entry.publish_details && entry.publish_details.length > 0) {
                          _.forEach(entries[eUid].publish_details, (pubObject) => {
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
                              self.stackAPIClient
                                .contentType(ctUid)
                                .entry(entryUid)
                                .publish({ publishDetails: requestObject.entry, locale: lang })
                                // eslint-disable-next-line max-nested-callbacks
                                .then((result) => {
                                  // addlogs(this.config, 'Entry ' + eUid + ' published successfully in ' + ctUid + ' content type', 'success')
                                  addlogs(
                                    this.config,
                                    `Entry '${eUid}' published successfully in '${ctUid}' content type`,
                                    'success',
                                  );
                                  return resolveEntryPublished(result);
                                  // eslint-disable-next-line max-nested-callbacks
                                })
                                .catch((err) => {
                                  addlogs(
                                    this.config,
                                    `failed to publish entry '${eUid}' content type '${ctUid}' ${formatError(err)}`,
                                    'error',
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
                      .then(() => {
                        // empty function
                      })
                      .catch((error) => {
                        // error while executing entry in batch
                        addlogs(this.config, formatError(error), 'error');
                        addlogs(this.config, error, 'error');
                      });
                  },
                  {
                    concurrency: 1,
                  },
                )
                  .then(() => {
                    // addlogs(this.config, 'Entries published successfully in ' + ctUid + ' content type', 'success')
                    addlogs(this.config, `Entries published successfully in '${ctUid}' content type`, 'info');
                  })
                  .catch((error) => {
                    console.log(error);
                    addlogs(
                      this.config,
                      `failed to publish entry in content type '${ctUid}' ${formatError(error)}`,
                      'error',
                    );
                  });
              }
            },
            {
              concurrency: 1,
            },
          )
            .then(() => {
              // empty function
              // log('Published entries successfully in ' +);
            })
            .catch((error) => {
              addlogs(this.config, `Failed to publish few entries in ${lang} ${formatError(error)}`, 'error');
            });
        },
        {
          concurrency: 1,
        },
      )
        .then(() => {
          return resolve();
        })
        .catch((error) => {
          addlogs(this.config, `Failed to publish entries ${formatError(error)}`, 'error');
        });
    });
  }
  removeEntryRefsFromJSONRTE(entry, ctSchema) {
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
          const structuredPTag = '{"type":"p","attrs":{},"children":[{"text":""}]}';
          if (entry[element.uid] && element.field_metadata.rich_text_type) {
            if (element.multiple) {
              entry[element.uid] = entry[element.uid].map((jsonRteData) => {
                // repeated code from else block, will abstract later
                let entryReferences = jsonRteData.children.filter((e) => this.doEntryReferencesExist(e));
                if (entryReferences.length > 0) {
                  jsonRteData.children = jsonRteData.children.filter((e) => !this.doEntryReferencesExist(e));
                  if (jsonRteData.children.length === 0) {
                    jsonRteData.children.push(JSON.parse(structuredPTag)); 
                  }
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
                if (entry[element.uid].children.length === 0) {
                  entry[element.uid].children.push(JSON.parse(structuredPTag)); 
                }
              }
            }
          }
          break;
        }
      }
    }
    return entry;
  }
  doEntryReferencesExist(element) {
    // checks if the children of p element contain any references
    // only checking one level deep, not recursive

    if (element.length) {
      for (const item of element) {
        if ((item.type === 'p' || item.type === 'a' || item.type === 'span') && item.children && item.children.length > 0) {
          return this.doEntryReferencesExist(item.children);
        } else if (this.isEntryRef(item)) {
          return true;
        }
      }
    } else {
      if (this.isEntryRef(element)) {
        return true;
      }

      if ((element.type === 'p' || element.type === 'a' || element.type ==='span') && element.children && element.children.length > 0) {
        return this.doEntryReferencesExist(element.children);
      }
    }
    return false;
  }
  restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema) {
    let mappedAssetUids = fileHelper.readFileSync(this.mappedAssetUidPath) || {};
    let mappedAssetUrls = fileHelper.readFileSync(this.mappedAssetUrlPath) || {};
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
                  if (!_.isEmpty(entry[element.uid]) && entry[element.uid].children) {
                    entry[element.uid].children.splice(entryRef.index, 0, entryRef.value);
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
  }
  isEntryRef(element) {
    return element.type === 'reference' && element.attrs.type === 'entry';
  }
  removeUidsFromJsonRteFields(entry, ctSchema) {
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

                if (_.isObject(jsonRteData.attrs)) {
                  jsonRteData.attrs.dirty = true;
                }

                if (!_.isEmpty(jsonRteData.children)) {
                  jsonRteData.children = _.map(jsonRteData.children, (child) => this.removeUidsFromChildren(child));
                }

                return jsonRteData;
              });
            } else {
              delete entry[element.uid].uid; // remove uid
              if (entry[element.uid] && _.isObject(entry[element.uid].attrs)) {
                entry[element.uid].attrs.dirty = true;
              }
              if (entry[element.uid] && !_.isEmpty(entry[element.uid].children)) {
                entry[element.uid].children = _.map(entry[element.uid].children, (child) =>
                  this.removeUidsFromChildren(child),
                );
              }
            }
          }
          break;
        }
      }
    }
    return entry;
  }
  removeUidsFromChildren(children) {
    if (children.length && children.length > 0) {
      return children.map((child) => {
        if (child.type && child.type.length > 0) {
          delete child.uid; // remove uid

          if (_.isObject(child.attrs)) {
            child.attrs.dirty = true;
          }
        }
        if (child.children && child.children.length > 0) {
          child.children = this.removeUidsFromChildren(child.children);
        }
        return child;
      });
    } else {
      if (children.type && children.type.length > 0) {
        delete children.uid; // remove uid
        if (_.isObject(children.attrs)) {
          children.attrs.dirty = true;
        }
      }
      if (children.children && children.children.length > 0) {
        children.children = this.removeUidsFromChildren(children.children);
      }
      return children;
    }
  }
  setDirtyTrue(jsonRteChild) {
    // also removing uids in this function
    if (jsonRteChild.type) {
      if (_.isObject(jsonRteChild.attrs)) {
        jsonRteChild.attrs['dirty'] = true;
      }
      delete jsonRteChild.uid;

      if (jsonRteChild.children && jsonRteChild.children.length > 0) {
        jsonRteChild.children = jsonRteChild.children.map((subElement) => this.setDirtyTrue(subElement));
      }
    }
    return jsonRteChild;
  }
  resolveAssetRefsInEntryRefsForJsonRte(jsonRteChild, mappedAssetUids, mappedAssetUrls) {
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
  }
};
