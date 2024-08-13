/* eslint-disable max-params */
/* eslint-disable new-cap */
/* eslint-disable camelcase */
/* eslint-disable max-depth */
/* eslint-disable no-console */
const { getQueue } = require('../util/queue');
const { performBulkPublish, publishEntry, initializeLogger } = require('../consumer/publish');
const retryFailedLogs = require('../util/retryfailed');
const { validateFile } = require('../util/fs');
const { isEmpty } = require('../util');
const VARIANTS_PUBLISH_API_VERSION = '3.2';

const queue = getQueue();

let skipCount;
let logFileName;
let contentTypesList = [];
let allContentTypes = [];
let bulkPublishSet = [];
let filePath;

async function getEntries(stack, contentType, locale, bulkPublish, environments, apiVersion, variantsFlag = false, skip = 0) {
  return new Promise((resolve, reject) => {
    skipCount = skip;

    let queryParams = {
      locale: locale || 'en-us',
      include_count: true,
      skip: skipCount,
      include_publish_details: true,
    };

    if (variantsFlag) {
      queryParams.apiVersion = VARIANTS_PUBLISH_API_VERSION;
    }

    stack
      .contentType(contentType)
      .entry()
      .query(queryParams)
      .find()
      .then(async (entriesResponse) => {
        skipCount += entriesResponse.items.length;
        let entries = entriesResponse.items;

        for (let index = 0; index < entries.length; index++) {
          let variants = [];

          

          if (bulkPublish) {
            let entry;
            if (bulkPublishSet.length < 10) {
              entry = {
                uid: entries[index].uid,
                content_type: contentType,
                locale,
                publish_details: entries[index].publish_details || [],
              };

              if (variantsFlag) {
                variants = await getVariantEntries(stack, contentType, entries, index, queryParams);
                if(variants.length > 0){
                  entry.publish_with_base_entry = true;
                  entry.variants = variants;
                }
                
              } 
            }
            bulkPublishSet.push(entry);

            if (bulkPublishSet.length === 10) {
              await queue.Enqueue({
                entries: bulkPublishSet,
                locale,
                Type: 'entry',
                environments: environments,
                stack: stack,
                apiVersion,
              });
              bulkPublishSet = [];
            }

            if (
              index === entries.length - 1 &&
              bulkPublishSet.length <= 10 &&
              bulkPublishSet.length > 0
            ) {
              await queue.Enqueue({
                entries: bulkPublishSet,
                locale,
                Type: 'entry',
                environments: environments,
                stack: stack,
                apiVersion,
              });
              bulkPublishSet = [];
            }
          } else {
            await queue.Enqueue({
              content_type: contentType,
              publish_details: entries[index].publish_details || [],
              environments: environments,
              entryUid: entries[index].uid,
              locale,
              Type: 'entry',
              stack: stack,
            });
          }
        }

        if (entriesResponse.count === skipCount) {
          bulkPublishSet = [];
          return resolve();
        }
        await getEntries(stack, contentType, locale, bulkPublish, environments, apiVersion, variantsFlag, skipCount);
        return resolve();
      })
      .catch((error) => reject(error));
  });
}

async function getVariantEntries(stack, contentType, entries, index, queryParams) {
  try {
    const variantsEntriesResponse = await stack
      .contentType(contentType)
      .entry(entries[index].uid)
      .variants()
      .query(queryParams)
      .find();

    const variants = variantsEntriesResponse.items.map(entry => ({
      uid: entry.variants_uid,
    }));
    
    return variants;
  } catch (error) {
    throw new Error(`Error fetching variants: ${error.message}`);
  }
}

async function getContentTypes(stack, skip = 0, contentTypes = []) {
  return new Promise((resolve, reject) => {
    skipCount = skip;
    contentTypesList = contentTypes;
    stack
      .contentType()
      .query({ include_count: true, skip: skipCount })
      .find()
      .then((contentTypeResponse) => {
        if (contentTypeResponse.items.length > 0) {
          contentTypesList = [...contentTypesList, ...contentTypeResponse.items];
          skipCount += contentTypeResponse.items.length;
          if (skipCount < contentTypeResponse.count) {
            getContentTypes(stack, skipCount, contentTypesList);
          }
          resolve(contentTypesList);
        }
      })
      .catch((error) => reject(error));
  });
}

function setConfig(conf, bp) {
  if (bp) {
    queue.consumer = performBulkPublish;
    logFileName = 'bulk-publish-entries';
  } else {
    queue.consumer = publishEntry;
    logFileName = 'publish-entries';
  }
  config = conf;
  queue.config = conf;
  filePath = initializeLogger(logFileName);
}

async function start(
  { retryFailed, bulkPublish, publishAllContentTypes, contentTypes, locales, environments, apiVersion, includeVariantsFlag },
  stack,
  config,
) {
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

  if (includeVariantsFlag) {
    apiVersion = VARIANTS_PUBLISH_API_VERSION;
  }

  if (retryFailed) {
    if (typeof retryFailed === 'string') {
      if (!validateFile(retryFailed, ['publish-entries', 'bulk-publish-entries'])) {
        return false;
      }

      bulkPublish = retryFailed.match(new RegExp('bulk')) ? true : false;
      setConfig(config, bulkPublish);
      if (bulkPublish) {
        await retryFailedLogs(retryFailed, queue, 'bulk');
      } else {
        await retryFailedLogs(retryFailed, { entryQueue: queue }, 'publish');
      }
    }
  } else {
    setConfig(config, bulkPublish);
    if (publishAllContentTypes) {
      allContentTypes = await getContentTypes(stack);
    } else {
      allContentTypes = contentTypes;
    }
    for (let loc = 0; loc < locales.length; loc += 1) {
      for (let i = 0; i < allContentTypes.length; i += 1) {
        /* eslint-disable no-await-in-loop */
        await getEntries(stack, allContentTypes[i].uid || allContentTypes[i], locales[loc], bulkPublish, environments, apiVersion, includeVariantsFlag);
        /* eslint-enable no-await-in-loop */
      }
    }
  }
}

module.exports = {
  getEntries,
  setConfig,
  getContentTypes,
  start,
};
