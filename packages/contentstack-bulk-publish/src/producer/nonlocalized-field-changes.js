/* eslint-disable no-console */
/* eslint-disable new-cap */
/* eslint-disable max-params */
/* eslint-disable unicorn/explicit-length-check */
/* eslint-disable camelcase */
/* eslint-disable max-depth */
/* eslint-disable complexity */
/* eslint-disable node/no-extraneous-require */
const _ = require('lodash');
const { getQueue } = require('../util/queue');
const { performBulkPublish, publishEntry, initializeLogger } = require('../consumer/publish');
const retryFailedLogs = require('../util/retryfailed');
const { validateFile } = require('../util/fs');
const { isEmpty } = require('../util');

let changedFlag = false;
const queue = getQueue();
let skipCount;
let logFileName;
let bulkPublishSet = [];
let filePath;

function setConfig(conf, bp) {
  if (bp) {
    logFileName = 'bulk-nonlocalized-field-changes';
    queue.consumer = performBulkPublish;
  } else {
    logFileName = 'nonlocalized-field-changes';
    queue.consumer = publishEntry;
  }
  config = conf;
  queue.config = conf;
  filePath = initializeLogger(logFileName);
}

async function getContentTypeSchema(stack, contentType) {
  return new Promise((resolve, reject) => {
    stack
      .contentType(contentType)
      .fetch({ include_global_field_schema: true })
      .then((content) => {
        resolve(content.schema);
      })
      .catch((error) => reject(error));
  });
}

/* eslint-disable consistent-return */

async function getLocalizedEntry(stack, entry, contentType, locale, sourceEnv) {
  return new Promise((resolve, _reject) => {
    let queryParams = {
      locale: locale,
      environment: sourceEnv,
      include_publish_details: true,
    };
    stack
      .contentType(contentType)
      .entry(entry.uid)
      .fetch(queryParams)
      .then((entryResponse) => {
        if (entryResponse) {
          resolve(entryResponse);
        }
        resolve({});
      })
      .catch((error) => {
        if (error.errorCode === 141) {
          resolve({});
        }
        if (typeof error === 'string') {
          if (JSON.parse(error).errorCode !== 141) console.log(error);
        }
      });
  });
}

function checkReferenceFieldChanges(ref1, ref2) {
  for (let i = 0; i < (ref1.length || ref2.length); i += 1) {
    if (typeof ref1[i] === 'object' && typeof ref2[i] === 'object') {
      if (ref1[i].uid !== ref2[i].uid || ref1[i]._content_type_uid !== ref2[i]._content_type_uid) {
        changedFlag = true;
      }
    } else {
      changedFlag = true;
    }
  }
}

function checkNonLocalizedFieldChanges(contentType, entry, localizedEntry, isNonLocalized = false) {
  contentType.forEach((field) => {
    if ((field.non_localizable || isNonLocalized) && !field.schema && !field.blocks) {
      if ((entry[field.uid] && !localizedEntry[field.uid]) || (!entry[field.uid] && localizedEntry[field.uid])) {
        changedFlag = true;
        return;
      }
      if (entry[field.uid] && localizedEntry[field.uid]) {
        if (field.multiple) {
          if (JSON.stringify(entry[field.uid]) !== JSON.stringify(localizedEntry[field.uid])) {
            changedFlag = true;
          }
          return;
        }
        if (field.data_type === 'reference') {
          checkReferenceFieldChanges(entry[field.uid], localizedEntry[field.uid]);
          return;
        }
        if (entry[field.uid] !== localizedEntry[field.uid]) {
          changedFlag = true;
        }
      }
    }
    if (field.data_type === 'group' || field.data_type === 'global_field') {
      if (field.multiple) {
        let tempEntry = _.cloneDeep(entry[field.uid]);
        let tempLocalizedEntry = _.cloneDeep(localizedEntry[field.uid]);
        if (!tempEntry) {
          tempEntry = [];
        }
        if (!tempLocalizedEntry) {
          tempLocalizedEntry = [];
        }
        for (const element of tempEntry) {
          if (field.non_localizable || isNonLocalized) {
            checkNonLocalizedFieldChanges(field.schema, element, tempLocalizedEntry || {}, true);
          } else {
            checkNonLocalizedFieldChanges(field.schema, element, tempLocalizedEntry || {}, false);
          }
        }
      } else {
        let tempEntry = _.cloneDeep(entry[field.uid]);
        let tempLocalizedEntry = _.cloneDeep(localizedEntry[field.uid]);
        if (!tempEntry) {
          tempEntry = {};
        }
        if (!tempLocalizedEntry) {
          tempLocalizedEntry = {};
        }
        if (field.non_localizable || isNonLocalized) {
          checkNonLocalizedFieldChanges(field.schema, tempEntry, tempLocalizedEntry, true);
        } else {
          checkNonLocalizedFieldChanges(field.schema, tempEntry, tempLocalizedEntry, false);
        }
      }
    }
    if (field.data_type === 'blocks') {
      let tempEntry = _.cloneDeep(entry[field.uid]);
      let tempLocalizedEntry = _.cloneDeep(localizedEntry[field.uid]);
      if (!tempEntry) tempEntry = [];
      if (!tempLocalizedEntry) tempLocalizedEntry = [];

      if (field.non_localizable || isNonLocalized) {
        field.blocks.forEach((block) => {
          let filterTempEntryBlocks = [];
          let filterLocalizedEntryBlocks = [];
          filterTempEntryBlocks = tempEntry.filter((blockField) => {
            if (Object.prototype.hasOwnProperty.call(blockField, block.uid)) {
              return blockField;
            }
            return false;
          });

          filterLocalizedEntryBlocks = tempLocalizedEntry.filter((blockField) => {
            if (Object.prototype.hasOwnProperty.call(blockField, block.uid)) {
              return blockField;
            }
            return false;
          });

          if (filterTempEntryBlocks.length) {
            for (let iterator = 0; iterator < filterTempEntryBlocks.length; iterator += 1) {
              checkNonLocalizedFieldChanges(
                block.schema,
                filterTempEntryBlocks[iterator][block.uid],
                filterLocalizedEntryBlocks[iterator] ? filterLocalizedEntryBlocks[iterator][block.uid] : {},
                true,
              );
            }
          }
        });
      } else {
        field.blocks.forEach((block) => {
          let filterTempEntryBlocks = [];
          let filterLocalizedEntryBlocks = [];
          filterTempEntryBlocks = tempEntry.filter((blockField) => {
            if (Object.prototype.hasOwnProperty.call(blockField, block.uid)) {
              return blockField;
            }
            return false;
          });

          filterLocalizedEntryBlocks = tempLocalizedEntry.filter((blockField) => {
            if (Object.prototype.hasOwnProperty.call(blockField, block.uid)) {
              return blockField;
            }
            return false;
          });

          if (filterTempEntryBlocks.length) {
            for (let iterator = 0; iterator < filterTempEntryBlocks.length; iterator += 1) {
              checkNonLocalizedFieldChanges(
                block.schema,
                filterTempEntryBlocks[iterator][block.uid],
                filterLocalizedEntryBlocks[iterator] ? filterLocalizedEntryBlocks[iterator][block.uid] : {},
                false,
              );
            }
          }
        });
      }
    }
  });
  return changedFlag;
}

/* eslint-disable consistent-return */
/* eslint-disable no-await-in-loop */

async function getEntries(
  stack,
  schema,
  contentType,
  languages,
  masterLocale,
  bulkPublish,
  environments,
  sourceEnv,
  apiVersion,
  skip = 0,
) {
  return new Promise((resolve, reject) => {
    skipCount = skip;
    let queryParams = {
      locale: masterLocale || 'en-us',
      environment: sourceEnv,
      include_count: true,
      skip: skipCount,
    };
    stack
      .contentType(contentType)
      .entry()
      .query(queryParams)
      .find()
      .then(async (entriesResponse) => {
        skipCount += entriesResponse.items.length;
        if (entriesResponse && entriesResponse.items.length > 0) {
          for (const language of languages) {
            const locale = language;
            for (const element of entriesResponse.items) {
              const entry = element;
              try {
                let localizedEntry = await getLocalizedEntry(stack, entry, contentType, locale.code, sourceEnv);
                localizedEntry = localizedEntry || {};
                if (checkNonLocalizedFieldChanges(schema, entry, localizedEntry)) {
                  if (bulkPublish) {
                    if (bulkPublishSet.length < 10) {
                      bulkPublishSet.push({
                        uid: entry.uid,
                        content_type: contentType,
                        locale: locale.code,
                        publish_details: localizedEntry.publish_details || [],
                      });
                    }
                    if (bulkPublishSet.length === 10) {
                      await queue.Enqueue({
                        entries: bulkPublishSet,
                        locale: locale.code,
                        Type: 'entry',
                        environments: environments,
                        stack: stack,
                        apiVersion
                      });
                      bulkPublishSet = [];
                    }
                  } else {
                    await queue.Enqueue({
                      content_type: contentType,
                      publish_details: entry.publish_details || [],
                      environments: environments,
                      entryUid: entry.uid,
                      locale: locale.code,
                      Type: 'entry',
                      stack: stack,
                    });
                  }
                } else {
                  console.log(
                    `No Change in NonLocalized field for contentType ${contentType} entryUid ${entry.uid} with locale ${locale.code}`,
                  );
                }
                changedFlag = false;
              } catch (error) {
                reject(error);
              }
            }
            if (bulkPublishSet.length > 0 && bulkPublishSet.length < 10) {
              await queue.Enqueue({
                entries: bulkPublishSet,
                locale: locale.code,
                Type: 'entry',
                environments: environments,
                stack: stack,
                apiVersion
              });
              bulkPublishSet = [];
            }
          }
        }
        if (skipCount === entriesResponse.count) {
          changedFlag = false;
          bulkPublishSet = [];
          return resolve();
        }
        await getEntries(stack, schema, contentType, languages, masterLocale, bulkPublish, environments, sourceEnv, apiVersion, skipCount);
        return resolve();
      })
      .catch((error) => reject(error));
    return resolve();
  });
}

async function getLanguages(stack) {
  return new Promise((resolve, reject) => {
    stack
      .locale()
      .query()
      .find()
      .then((languages) => {
        resolve(languages.items);
      })
      .catch((error) => reject(error));
  });
}

async function start({ retryFailed, bulkPublish, sourceEnv, contentTypes, environments, apiVersion }, stack, config) {
  process.on('beforeExit', async () => {
    const isErrorLogEmpty = await isEmpty(`${filePath}.error`);
    const isSuccessLogEmpty = await isEmpty(`${filePath}.success`);
    if (!isErrorLogEmpty) {
      console.log(`The error log for this session is stored at ${filePath}.error`);
    } else if (!isSuccessLogEmpty) {
      console.log(`The success log for this session is stored at ${filePath}.success`);
    }
    process.exit(0);
  });

  if (retryFailed) {
    if (typeof retryFailed === 'string') {
      if (!validateFile(retryFailed, ['nonlocalized-field-changes', 'bulk-nonlocalized-field-changes'])) {
        return false;
      }

      bulkPublish = retryFailed.match(/bulk/) ? true : false;
      setConfig(config, bulkPublish);

      if (bulkPublish) {
        await retryFailedLogs(retryFailed, queue, 'bulk');
      } else {
        await retryFailedLogs(retryFailed, { entryQueue: queue }, 'publish');
      }
    }
  } else {
    setConfig(config, bulkPublish);
    const masterLocale = 'en-us';
    const languages = await getLanguages(stack);
    for (const element of contentTypes) {
      /* eslint-disable no-await-in-loop */
      const schema = await getContentTypeSchema(stack, element);
      await getEntries(stack, schema, element, languages, masterLocale, bulkPublish, environments, sourceEnv, apiVersion);
      /* eslint-enable no-await-in-loop */
    }
  }
}

module.exports = {
  start,
  setConfig,
  getLanguages,
  getEntries,
  getLocalizedEntry,
  getContentTypeSchema,
  checkNonLocalizedFieldChanges,
};
