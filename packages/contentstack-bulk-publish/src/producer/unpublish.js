/* eslint-disable max-params */
/* eslint-disable new-cap */
/* eslint-disable complexity */
/* eslint-disable no-console */
/* eslint-disable camelcase */
const { configHandler } = require('@contentstack/cli-utilities');
const { getQueue } = require('../util/queue');
const defaults = require('../config/defaults.json');
const { performBulkUnPublish, UnpublishEntry, UnpublishAsset, initializeLogger } = require('../consumer/publish');
const retryFailedLogs = require('../util/retryfailed');
const { validateFile } = require('../util/fs');
const queue = getQueue();
const entryQueue = getQueue();
const assetQueue = getQueue();
const { Command } = require('@contentstack/cli-command');
const command = new Command();
const { isEmpty } = require('../util');
const { fetchBulkPublishLimit } = require('../util/common-utility');
const VARIANTS_UNPUBLISH_API_VERSION = '3.2';

let bulkUnPublishSet = [];
let bulkUnPulishAssetSet = [];
let logFileName;
let filePath;

function setConfig(conf, bup) {
  if (bup) {
    logFileName = 'bulk-unpublish';
    queue.consumer = performBulkUnPublish;
  } else {
    logFileName = 'unpublish';
    entryQueue.consumer = UnpublishEntry;
    assetQueue.consumer = UnpublishAsset;
  }
  config = conf;
  queue.config = conf;
  entryQueue.config = conf;
  assetQueue.config = conf;
  filePath = initializeLogger(logFileName);
}

let changedFlag = false;

function getQueryParams(filter) {
  let queryString = '';
  Object.keys(filter).forEach((key) => {
    if (filter[key]) {
      queryString = `${queryString}&${key}=${filter[key]}`;
    }
  });

  return queryString;
}

function bulkAction(stack, items, bulkUnpublish, environment, locale, apiVersion, bulkPublishLimit, variantsFlag = false) {
  return new Promise(async (resolve) => {
    for (let index = 0; index < items.length; index++) {
      changedFlag = true;

      if (bulkUnpublish) {
        if (bulkUnPublishSet.length < bulkPublishLimit && items[index].type === 'entry_published') {
          const entryData = {
            uid: items[index].data.uid,
            content_type: items[index].content_type_uid,
            locale: items[index].data.locale || 'en-us',
            publish_details: items[index].data.publish_details || [],
          };
        
          if (variantsFlag && Array.isArray(items[index].data.variants) && items[index].data.variants.length > 0) {
            const entryWithVariants = { ...entryData, variants: items[index].data.variants };
            bulkUnPublishSet.push(entryWithVariants);
          } else {
            bulkUnPublishSet.push(entryData);
          }
        }

        if (bulkUnPulishAssetSet.length < bulkPublishLimit && items[index].type === 'asset_published') {
          bulkUnPulishAssetSet.push({
            uid: items[index].data.uid,
            version: items[index].data._version,
            publish_details: [items[index].data.publish_details] || [],
          });
        }

        if (bulkUnPulishAssetSet.length === bulkPublishLimit) {
          await queue.Enqueue({
            assets: bulkUnPulishAssetSet,
            Type: 'asset',
            locale: locale,
            environments: [environment],
            stack: stack,
            apiVersion,
          });
          bulkUnPulishAssetSet = [];
        }

        if (bulkUnPublishSet.length === bulkPublishLimit) {
          await queue.Enqueue({
            entries: bulkUnPublishSet,
            locale: locale,
            Type: 'entry',
            environments: [environment],
            stack: stack,
            apiVersion,
          });
          bulkUnPublishSet = [];
        }
        if (index === items.length - 1 && bulkUnPulishAssetSet.length <= bulkPublishLimit && bulkUnPulishAssetSet.length > 0) {
          await queue.Enqueue({
            assets: bulkUnPulishAssetSet,
            Type: 'asset',
            locale: locale,
            environments: [environment],
            stack: stack,
            apiVersion,
          });
          bulkUnPulishAssetSet = [];
        }

        if (index === items.length - 1 && bulkUnPublishSet.length <= bulkPublishLimit && bulkUnPublishSet.length > 0) {
          await queue.Enqueue({
            entries: bulkUnPublishSet,
            locale: locale,
            Type: 'entry',
            environments: [environment],
            stack: stack,
            apiVersion,
          });
          bulkUnPublishSet = [];
        }
      } else {
        if (items[index].type === 'entry_published') {
          await entryQueue.Enqueue({  
            content_type: items[index].content_type_uid,
            publish_details: [items[index].data.publish_details],
            environments: [environment],
            entryUid: items[index].data.uid,
            locale: items[index].data.locale || 'en-us',
            Type: 'entry',
            stack: stack,
            apiVersion,
          });
        }
        if (items[index].type === 'asset_published') {
          await assetQueue.Enqueue({
            assetUid: items[index].data.uid,
            publish_details: [items[index].data.publish_details],
            environments: [environment],
            Type: 'entry',
            stack: stack,
          });
        }
      }
    }
    return resolve();
  });
}

async function getSyncEntries(
  stack,
  config,
  locale,
  queryParams,
  bulkUnpublish,
  environment,
  deliveryToken,
  apiVersion,
  bulkPublishLimit,
  variantsFlag,
  paginationToken = null,
) {
  return new Promise(async (resolve, reject) => {
    try {
      let tokenDetails;
      if (config.stackApiKey) {
        tokenDetails = { apiKey: config.stackApiKey };
      } else {
        tokenDetails = command.getToken(config.alias);
      }
      const queryParamsObj = {};
      const pairs = queryParams.split('&');
      for (let i in pairs) {
        const split = pairs[i].split('=');
        queryParamsObj[decodeURIComponent(split[0])] = decodeURIComponent(split[1]);
      }

      const deliveryAPIOptions = {
        api_key: tokenDetails.apiKey,
        delivery_token: deliveryToken,
        environment: queryParamsObj.environment,
        branch: config.branch,
      };

      const earlyAccessHeaders = configHandler.get(`earlyAccessHeaders`);
      if (earlyAccessHeaders && Object.keys(earlyAccessHeaders).length > 0) {
        deliveryAPIOptions.early_access = Object.values(earlyAccessHeaders);
      }

      const Stack = new command.deliveryAPIClient.Stack(deliveryAPIOptions);

      Stack.setHost(config.cda);

      const syncData = {};

      if (paginationToken) {
        syncData['pagination_token'] = paginationToken;
      } else {
        syncData['init'] = true;
      }
      if (queryParamsObj.locale) {
        syncData['locale'] = queryParamsObj.locale;
      }
      if (queryParamsObj.type) {
        syncData['type'] = queryParamsObj.type;
      }
      if(queryParamsObj.content_type_uid) {
        syncData['content_type_uid'] = queryParamsObj.content_type_uid;
      }

      const entriesResponse = await Stack.sync(syncData);
      if (entriesResponse.items.length > 0) {
        if (variantsFlag) {
          queryParamsObj.apiVersion = VARIANTS_UNPUBLISH_API_VERSION;
          const itemsWithVariants = await attachVariantsToItems(stack, entriesResponse.items, queryParamsObj);
          // Call bulkAction for entries with variants
          await bulkAction(stack, itemsWithVariants, bulkUnpublish, environment, locale, apiVersion, bulkPublishLimit, variantsFlag);
        }
        // Call bulkAction for entries without variants
        await bulkAction(stack, entriesResponse.items, bulkUnpublish, environment, locale, apiVersion, bulkPublishLimit, false);
      }
      
      if (entriesResponse.items.length === 0) {
        if (!changedFlag) console.log('No Entries/Assets Found published on specified environment');
        return resolve();
      }
      setTimeout(async () => {
        await getSyncEntries(
          stack,
          config,
          locale,
          queryParams,
          bulkUnpublish,
          environment,
          deliveryToken,
          apiVersion,
          bulkPublishLimit,
          variantsFlag,
          null,
        );
      }, 3000);
    } catch (error) {
      reject(error);
    }
  });
}
async function attachVariantsToItems(stack, items, queryParams) {
  for (const item of items) {
    const { content_type_uid, data } = item;
    const variantEntries = await getVariantEntries(stack, content_type_uid, item, queryParams); // Fetch the variants using fetchVariants method
    item.data.variants = variantEntries; // Attach the fetched variants to the data object in the item
  }
  return items;
}

async function getVariantEntries(stack, contentType, entries, queryParams, skip = 0) {
  try {
    let variantQueryParams = {
      locale: queryParams.locale || 'en-us',
      include_count: true,
      skip: skip,  // Adding skip parameter for pagination
      limit: 100,  // Set a limit to fetch up to 100 entries per request
    };

    const variantsEntriesResponse = await stack
      .contentType(contentType)
      .entry(entries.data.uid)
      .variants()
      .query(variantQueryParams)
      .find();

    // Map the response items to extract variant UIDs
    const variants = variantsEntriesResponse.items.map(entry => ({
      uid: entry.variants._variant._uid,
    }));

    // Check if there are more entries to fetch
    if (variantsEntriesResponse.items.length === variantQueryParams.limit) {
      // Recursively fetch the next set of variants with updated skip value
      const nextVariants = await getVariantEntries(stack, contentType, entries, queryParams, skip + variantQueryParams.limit);
      
      // Ensure nextVariants is an array before concatenation
      return Array.isArray(nextVariants) ? variants.concat(nextVariants) : variants;
    }

    return variants;
  } catch (error) {
    // Handle error message retrieval from different properties
    const errorMessage = error?.errorMessage || error?.message || error?.errors || 'Falied to fetch the variant entries, Please contact the admin for support.';
    throw new Error(`Error fetching variants: ${errorMessage}`);
  }
}

async function start(
  {
    retryFailed,
    bulkUnpublish,
    contentType,
    locale,
    environment,
    deliveryToken,
    onlyAssets,
    onlyEntries,
    f_types,
    apiVersion,
    includeVariants,
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
    apiVersion = VARIANTS_UNPUBLISH_API_VERSION;
  }
  if (retryFailed) {
    if (typeof retryFailed === 'string' && retryFailed.length > 0) {
      if (!validateFile(retryFailed, ['unpublish', 'bulk-unpublish'])) {
        return false;
      }

      bulkUnpublish = retryFailed.match(new RegExp('bulk')) ? true : false;
      setConfig(config, bulkUnpublish);

      if (bulkUnpublish) {
        await retryFailedLogs(retryFailed, queue, 'bulk');
      } else {
        await retryFailedLogs(retryFailed, { entryQueue, assetQueue }, 'publish');
      }
    }
  } else {
    let filter = {
      environment,
      locale,
    };
    if (f_types) {
      filter.type = f_types;
    }
    // filter.type = (f_types) ? f_types : types // types mentioned in the config file (f_types) are given preference
    if (contentType) {
      filter.content_type_uid = contentType;
      filter.type = 'entry_published';
    }
    if (onlyAssets) {
      filter.type = 'asset_published';
      delete filter.content_type_uid;
    }
    if (onlyEntries) {
      filter.type = 'entry_published';
    }
    setConfig(config, bulkUnpublish);
    const queryParams = getQueryParams(filter);
    const bulkPublishLimit = fetchBulkPublishLimit(stack?.org_uid);
    await getSyncEntries(stack, config, locale, queryParams, bulkUnpublish, environment, deliveryToken, apiVersion, bulkPublishLimit, includeVariants);
  }
}

// start()

module.exports = {
  getSyncEntries,
  setConfig,
  getQueryParams,
  start,
};