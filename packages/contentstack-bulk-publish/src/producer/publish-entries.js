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
const { fetchBulkPublishLimit } = require('../util/common-utility');
const { createSmartRateLimiter } = require('../util/smart-rate-limiter');
const VARIANTS_PUBLISH_API_VERSION = '3.2';

const queue = getQueue();

let skipCount;
let logFileName;
let contentTypesList = [];
let allContentTypes = [];
let bulkPublishSet = [];
let filePath;
let smartRateLimiter;
let pendingItems = [];

async function getEntries(
  stack,
  contentType,
  locale,
  bulkPublish,
  environments,
  apiVersion,
  bulkPublishLimit,
  variantsFlag = false,
  entry_uid = undefined,
  skip = 0,
) {
  return new Promise((resolve, reject) => {
    skipCount = skip;

    // Get smart rate limiter instance (singleton per organization)
    smartRateLimiter = createSmartRateLimiter(stack?.org_uid);

    let queryParams = {
      locale: locale || 'en-us',
      include_count: true,
      skip: skipCount,
      include_publish_details: true,
    };

    if (variantsFlag) {
      queryParams.apiVersion = VARIANTS_PUBLISH_API_VERSION;
    }
    if (entry_uid) {
      queryParams.uid = entry_uid;
    }

    stack
      .contentType(contentType)
      .entry()
      .query(queryParams)
      .find()
      .then(async (entriesResponse) => {
        // Update rate limit from server response
        smartRateLimiter.updateRateLimit(entriesResponse);
        
        skipCount += entriesResponse.items.length;
        let entries = entriesResponse.items;

        for (let index = 0; index < entries.length; index++) {
          let variants = [];
          if (bulkPublish) {
            let entry = {
              uid: entries[index].uid,
              content_type: contentType,
              locale,
              publish_details: entries[index].publish_details || [],
            };

            if (variantsFlag) {
              variants = await getVariantEntries(stack, contentType, entries, index, queryParams);
              if (variants.length > 0) {
                entry.variant_rules = {
                  publish_latest_base: false,
                  publish_latest_base_conditionally: true,
                };
                entry.variants = variants;
              }
            }
            
            // Add to pending items instead of immediate processing
            pendingItems.push(entry);
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

        // Process pending items with smart rate limiting
        if (pendingItems.length > 0) {
          await processPendingItems(stack, environments, locale, apiVersion);
        }

        if (entriesResponse.count === skipCount) {
          // Process any remaining items
          if (pendingItems.length > 0) {
            await processPendingItems(stack, environments, locale, apiVersion);
          }
          return resolve();
        }
        await getEntries(
          stack,
          contentType,
          locale,
          bulkPublish,
          environments,
          apiVersion,
          bulkPublishLimit,
          variantsFlag,
          entry_uid,
          skipCount,
        );
        return resolve();
      })
      .catch((error) => reject(error));
  });
}

async function getVariantEntries(stack, contentType, entries, index, queryParams, skip = 0) {
  try {
    let variantQueryParams = {
      locale: queryParams.locale || 'en-us',
      include_count: true,
      skip: skip, // Adding skip parameter for pagination
      limit: 100, // Set a limit to fetch up to 100 entries per request
      include_publish_details: true,
    };

    const variantsEntriesResponse = await stack
      .contentType(contentType)
      .entry(entries[index].uid)
      .variants()
      .query(variantQueryParams)
      .find();

    // Map the response items to extract variant UIDs
    const variants = variantsEntriesResponse.items.map((entry) => ({
      uid: entry.variants._variant._uid,
    }));

    // Check if there are more entries to fetch
    if (variantsEntriesResponse.items.length === variantQueryParams.limit) {
      // Recursively fetch the next set of variants with updated skip value
      const nextVariants = await getVariantEntries(
        stack,
        contentType,
        entries,
        index,
        queryParams,
        skip + variantQueryParams.limit,
      );

      // Ensure nextVariants is an array before concatenation
      return Array.isArray(nextVariants) ? variants.concat(nextVariants) : variants;
    }

    return variants;
  } catch (error) {
    // Handle error message retrieval from different properties
    const errorMessage =
      error?.errorMessage ||
      error?.message ||
      error?.errors ||
      'Falied to fetch the variant entries, Please contact the admin for support.';
    throw new Error(`Error fetching variants: ${errorMessage}`);
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

/**
 * Process pending items with smart rate limiting
 */
async function processPendingItems(stack, environments, locale, apiVersion) {
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
        entries: batch,
        locale,
        Type: 'entry',
        environments: environments,
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

async function start(
  {
    retryFailed,
    bulkPublish,
    publishAllContentTypes,
    contentTypes,
    locales,
    environments,
    apiVersion,
    includeVariants,
    entryUid,
  },
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

  if (includeVariants) {
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
    const bulkPublishLimit = fetchBulkPublishLimit(stack?.org_uid);
    for (let loc = 0; loc < locales.length; loc += 1) {
      for (let i = 0; i < allContentTypes.length; i += 1) {
        /* eslint-disable no-await-in-loop */
        await getEntries(
          stack,
          allContentTypes[i].uid || allContentTypes[i],
          locales[loc],
          bulkPublish,
          environments,
          apiVersion,
          bulkPublishLimit,
          includeVariants,
          entryUid,
        );
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
