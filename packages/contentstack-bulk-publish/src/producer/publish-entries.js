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

const queue = getQueue();

let skipCount;
let logFileName;
let contentTypesList = [];
let allContentTypes = [];
let bulkPublishSet = [];
let filePath;

async function getEntries(stack, contentType, locale, bulkPublish, environments, apiVersion, skip = 0) {
  return new Promise((resolve, reject) => {
    skipCount = skip;

    let queryParams = {
      locale: locale || 'en-us',
      include_count: true,
      skip: skipCount,
      include_publish_details: true,
    };

    stack
      .contentType(contentType)
      .entry()
      .query(queryParams)
      .find()
      .then(async (entriesResponse) => {
        skipCount += entriesResponse.items.length;
        let entries = entriesResponse.items;
        for (let index = 0; index < entriesResponse.items.length; index++) {
          if (bulkPublish) {
            if (bulkPublishSet.length < 10) {
              bulkPublishSet.push({
                uid: entries[index].uid,
                content_type: contentType,
                locale,
                publish_details: entries[index].publish_details || [],
              });
            }

            if (bulkPublishSet.length === 10) {
              await queue.Enqueue({
                entries: bulkPublishSet,
                locale,
                Type: 'entry',
                environments: environments,
                stack: stack,
                apiVersion
              });
              bulkPublishSet = [];
            }

            if (
              index === entriesResponse.items.length - 1 &&
              bulkPublishSet.length <= 10 &&
              bulkPublishSet.length > 0
            ) {
              await queue.Enqueue({
                entries: bulkPublishSet,
                locale,
                Type: 'entry',
                environments: environments,
                stack: stack,
                apiVersion
              });
              bulkPublishSet = [];
            } // bulkPublish
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
        await getEntries(stack, contentType, locale, bulkPublish, environments, apiVersion, skipCount);
        return resolve();
      })
      .catch((error) => reject(error));
  });
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
  { retryFailed, bulkPublish, publishAllContentTypes, contentTypes, locales, environments, apiVersion },
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
        await getEntries(stack, allContentTypes[i].uid || allContentTypes[i], locales[loc], bulkPublish, environments, apiVersion);
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
