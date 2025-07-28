/* eslint-disable no-console */
/* eslint-disable new-cap */
/* eslint-disable camelcase */
const { getQueue } = require('../util/queue');
const { performBulkPublish, publishAsset, initializeLogger } = require('../consumer/publish');
const retryFailedLogs = require('../util/retryfailed');
const { validateFile } = require('../util/fs');
const { isEmpty } = require('../util');
const { fetchBulkPublishLimit } = require('../util/common-utility');
const { createSmartRateLimiter } = require('../util/smart-rate-limiter');

const queue = getQueue();
let logFileName;
let bulkPublishSet = [];
let filePath;
let smartRateLimiter;
let pendingItems = [];

/* eslint-disable no-param-reassign */

async function getAssets(stack, folder, bulkPublish, environments, locale, apiVersion, bulkPublishLimit, skip = 0) {
  return new Promise((resolve, reject) => {
    // Get smart rate limiter instance (singleton per organization)
    smartRateLimiter = createSmartRateLimiter(stack?.org_uid);

    let queryParams = {
      folder: folder,
      skip: skip,
      include_count: true,
      include_folders: true,
      include_publish_details: true,
    };
    stack
      .asset()
      .query(queryParams)
      .find()
      .then(async (assetResponse) => {
        // Update rate limit from server response
        smartRateLimiter.updateRateLimit(assetResponse);
        
        if (assetResponse && assetResponse.items.length > 0) {
          skip += assetResponse.items.length;
          let assets = assetResponse.items;
          for (let index = 0; index < assetResponse.items.length; index++) {
            if (assets[index].is_dir === true) {
              await getAssets(
                stack,
                assets[index].uid,
                bulkPublish,
                environments,
                locale,
                apiVersion,
                bulkPublishLimit,
                0,
              );
              continue;
            }
            if (bulkPublish) {
              // Add to pending items instead of immediate processing
              pendingItems.push({
                uid: assets[index].uid,
                locale,
                publish_details: assets[index].publish_details || [],
              });
            } else {
              await queue.Enqueue({
                assetUid: assets[index].uid,
                publish_details: assets[index].publish_details || [],
                environments: environments,
                Type: 'asset',
                locale,
                stack: stack,
              });
            }
          }
          
          // Process pending items with smart rate limiting
          if (pendingItems.length > 0) {
            await processPendingAssets(stack, environments, locale, apiVersion);
          }
          
          if (skip === assetResponse.count) {
            // Process any remaining items
            if (pendingItems.length > 0) {
              await processPendingAssets(stack, environments, locale, apiVersion);
            }
            return resolve(true);
          }
          await getAssets(stack, folder, bulkPublish, environments, locale, apiVersion, bulkPublishLimit, skip);
          return resolve();
        } else {
          resolve();
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
}

/**
 * Process pending assets with smart rate limiting
 */
async function processPendingAssets(stack, environments, locale, apiVersion) {
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  while (pendingItems.length > 0) {
    const optimalBatchSize = smartRateLimiter.getOptimalBatchSize(pendingItems.length);
    
    if (optimalBatchSize === 0) {
      // Rate limit exhausted, wait and retry
      smartRateLimiter.logStatus();
      await delay(1000);
      continue;
    }
    
    // Take the optimal batch size
    const batch = pendingItems.splice(0, optimalBatchSize);
    
    try {
      await queue.Enqueue({
        assets: batch,
        Type: 'asset',
        environments: environments,
        locale,
        stack: stack,
        apiVersion,
      });
      
      smartRateLimiter.logStatus();
      
    } catch (error) {
      if (error.errorCode === 429) {
        // Rate limit error, put items back and wait
        pendingItems.unshift(...batch);
        smartRateLimiter.logStatus();
        await delay(1000);
      } else {
        // Other error, log and continue
        console.log(`Error processing batch: ${error.message}`);
      }
    }
  }
}

function setConfig(conf, bp) {
  if (bp) {
    queue.consumer = performBulkPublish;
    logFileName = 'bulk-publish-assets';
  } else {
    queue.consumer = publishAsset;
    logFileName = 'publish-assets';
  }
  config = conf;
  queue.config = conf;
  filePath = initializeLogger(logFileName);
}

async function start({ retryFailed, bulkPublish, environments, folderUid, locales, apiVersion }, stack, config) {
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
    if (!validateFile(retryFailed, ['publish-assets', 'bulk-publish-assets'])) {
      return false;
    }

    bulkPublish = retryFailed.match(new RegExp('bulk')) ? true : false;
    setConfig(config, bulkPublish);

    if (bulkPublish) {
      await retryFailedLogs(retryFailed, queue, 'bulk');
    } else {
      await retryFailedLogs(retryFailed, { assetQueue: queue }, 'publish');
    }
  } else if (folderUid) {
    setConfig(config, bulkPublish);
    const bulkPublishLimit = fetchBulkPublishLimit(stack?.org_uid);
    for (const locale of locales) {
      await getAssets(stack, folderUid, bulkPublish, environments, locale, apiVersion, bulkPublishLimit);
    }
  }
}

module.exports = {
  getAssets,
  setConfig,
  start,
};
