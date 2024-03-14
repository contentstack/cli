/* eslint-disable max-params */
/* eslint-disable max-depth */
/* eslint-disable unicorn/catch-error-name */
/* eslint-disable no-console */
/* eslint-disable new-cap */
/* eslint-disable camelcase */
const { getQueue } = require('../util/queue');
const { performBulkPublish, publishEntry, initializeLogger } = require('../consumer/publish');
const retryFailedLogs = require('../util/retryfailed');
const { validateFile } = require('../util/fs');
const { isEmpty } = require('../util');

const queue = getQueue();
let skipCount;
let changedFlag = false;
let logFileName = 'publish-unpublished-env';
let bulkPublishSet = [];
let filePath;

function setConfig(conf, bp) {
  if (bp) {
    logFileName = 'bulk-publish-draft';
    queue.consumer = performBulkPublish;
  } else {
    logFileName = 'publish-draft';
    queue.consumer = publishEntry;
  }
  config = conf;
  queue.config = config;
  filePath = initializeLogger(logFileName);
}

async function getEnvironment(stack, environmentName) {
  return new Promise((resolve, reject) => {
    stack
      .environment(environmentName)
      .fetch()
      .then((env) => {
        resolve(env);
      })
      .catch((error) => reject(error));
  });
}

async function getEntries(stack, contentType, environmentUid, locale, bulkPublish, environments, apiVersion, skip = 0) {
  return new Promise((resolve, reject) => {
    skipCount = skip;

    let queryParams = {
      include_count: true,
      skip: skipCount,
      include_publish_details: true,
    };

    stack
      .contentType(contentType)
      .entry()
      .query(queryParams)
      .find()
      .then(async (responseEntries) => {
        skipCount += responseEntries.items.length;
        if (responseEntries.items.length > 0) {
          let entries = responseEntries.items;
          for (let index = 0; index < responseEntries.items.length; index++) {
            const publishedEntry = entries[index].publish_details.find(
              (publishEnv) => publishEnv.environment === environmentUid && publishEnv.locale === locale,
            );
            if (!publishedEntry) {
              changedFlag = true;
              if (bulkPublish) {
                if (bulkPublishSet.length < 10) {
                  bulkPublishSet.push({
                    uid: entries[index].uid,
                    content_type: contentType,
                    locale,
                    publish_details: entries[index].publish_details || [],
                  });
                }
              } else {
                await queue.Enqueue({
                  content_type: contentType,
                  publish_details: entries[index].publish_details,
                  environments: environments,
                  entryUid: entries[index].uid,
                  locale,
                  Type: 'entry',
                  stack: stack,
                });
              }
            }
            if (bulkPublish) {
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
                index === responseEntries.items.length - 1 &&
                bulkPublishSet.length < 10 &&
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
              }
            }
          }
        }
        if (responseEntries.count === skipCount) {
          if (!changedFlag) console.log(`No Draft Entries of contentType ${contentType} was found`);
          bulkPublishSet = [];
          return resolve();
        }
        await getEntries(stack, contentType, environmentUid, locale, bulkPublish, environments, apiVersion, skipCount);
        return resolve();
      })
      .catch((error) => {
        reject(error);
      });
  });
}

async function start({ sourceEnv, environments, locale, contentTypes, bulkPublish, retryFailed, apiVersion }, stack, config) {
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
      if (!validateFile(retryFailed, ['publish-draft', 'bulk-publish-draft'])) {
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
    if (sourceEnv) {
      const environmentDetails = await getEnvironment(stack, sourceEnv);
      for (let i = 0; i < contentTypes.length; i += 1) {
        /* eslint-disable no-await-in-loop */
        await getEntries(stack, contentTypes[i], environmentDetails.uid, locale, bulkPublish, environments, apiVersion);
        /* eslint-enable no-await-in-loop */
        changedFlag = false;
      }
    }
  }
}

// start()

module.exports = {
  getEntries,
  getEnvironment,
  setConfig,
  start,
};
