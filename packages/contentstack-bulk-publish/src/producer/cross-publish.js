/* eslint-disable no-console */
/* eslint-disable new-cap */
/* eslint-disable camelcase */
/* eslint-disable complexity */
/* eslint-disable max-params */
const { configHandler } = require('@contentstack/cli-utilities');
const { getQueue } = require('../util/queue');
const { performBulkPublish, publishEntry, publishAsset, initializeLogger } = require('../consumer/publish');
const retryFailedLogs = require('../util/retryfailed');
const { validateFile } = require('../util/fs');
const queue = getQueue();
const entryQueue = getQueue();
const assetQueue = getQueue();
const { Command } = require('@contentstack/cli-command');
const command = new Command();
const { isEmpty } = require('../util');
const { fetchBulkPublishLimit } = require('../util/common-utility');
const VARIANTS_PUBLISH_API_VERSION = '3.2';

let bulkPublishSet = [];
let bulkPublishAssetSet = [];
let changedFlag = false;
let logFileName;
let filePath;

function getQueryParams(filter) {
  let queryString = '';
  Object.keys(filter).forEach((key) => {
    if (filter[key]) {
      queryString = `${queryString}&${key}=${filter[key]}`;
    }
  });

  return queryString;
}

async function bulkAction(stack, items, bulkPublish, filter, destEnv, apiVersion, bulkPublishLimit, variantsFlag = false) {
  return new Promise(async (resolve) => {
    for (let index = 0; index < items.length; index++) {
      changedFlag = true;

      if (bulkPublish) {
        if (bulkPublishSet.length < bulkPublishLimit && items[index].type === 'entry_published') {
          const entry = {
            uid: items[index].data.uid,
            content_type: items[index].content_type_uid,
            locale: items[index].data.locale || 'en-us',
            version: items[index].data._version,
            publish_details: [items[index].data.publish_details] || [],
          };

          if (variantsFlag && Array.isArray(items[index].data.variants) && items[index].data.variants.length > 0) {
            entry.variants = items[index].data.variants || [];
            entry.variant_rules = {
              publish_latest_base: false,
              publish_latest_base_conditionally: true
            };
          }

          bulkPublishSet.push(JSON.parse(JSON.stringify(entry)));
        }

        if (bulkPublishAssetSet.length < bulkPublishLimit && items[index].type === 'asset_published') {
          bulkPublishAssetSet.push({
            uid: items[index].data.uid,
            version: items[index].data._version,
            publish_details: [items[index].data.publish_details] || [],
          });
        }

        if (bulkPublishAssetSet.length === bulkPublishLimit) {
          await queue.Enqueue({
            assets: bulkPublishAssetSet,
            Type: 'asset',
            locale: filter.locale,
            environments: destEnv,
            stack: stack,
            apiVersion,
          });
          bulkPublishAssetSet = [];
        }

        if (bulkPublishSet.length === bulkPublishLimit) {
          await queue.Enqueue({
            entries: bulkPublishSet,
            locale: filter.locale,
            Type: 'entry',
            environments: destEnv,
            stack: stack,
            apiVersion,
          });
          bulkPublishSet = [];
        }

        if (index === items.length - 1 && bulkPublishAssetSet.length <= bulkPublishLimit && bulkPublishAssetSet.length > 0) {
          await queue.Enqueue({
            assets: bulkPublishAssetSet,
            Type: 'asset',
            locale: filter.locale,
            environments: destEnv,
            stack: stack,
            apiVersion,
          });
          bulkPublishAssetSet = [];
        }

        if (index === items.length - 1 && bulkPublishSet.length <= bulkPublishLimit && bulkPublishSet.length > 0) {
          await queue.Enqueue({
            entries: bulkPublishSet,
            locale: filter.locale,
            Type: 'entry',
            environments: destEnv,
            stack: stack,
            apiVersion,
          });
          bulkPublishSet = [];
        }
      } else {
        if (items[index].type === 'entry_published') {
          await entryQueue.Enqueue({
            content_type: items[index].content_type_uid,
            publish_details: [items[index].data.publish_details],
            environments: destEnv,
            entryUid: items[index].data.uid,
            version: items[index].data._version,
            locale: items[index].data.locale || 'en-us',
            version: items[index].data._version,
            Type: 'entry',
            stack: stack,
          });
        }
        if (items[index].type === 'asset_published') {
          await assetQueue.Enqueue({
            assetUid: items[index].data.uid,
            publish_details: [items[index].data.publish_details],
            locale: filter.locale,
            environments: destEnv,
            Type: 'asset',
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
  queryParams,
  bulkPublish,
  filter,
  deliveryToken,
  destEnv,
  apiVersion,
  bulkPublishLimit,
  variantsFlag = false,
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
      const pairs = queryParams.split('&').filter((e) => e !== null && e !== '' && e !== undefined);
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

      const entriesResponse = await Stack.sync(syncData);

      if (filter?.content_type_uid?.length) {
        entriesResponse.items = entriesResponse.items.filter((entry) =>
          filter?.content_type_uid.includes(entry.content_type_uid),
        );
      }

      if (variantsFlag) {
        for (let index = 0; index < entriesResponse?.items?.length; index++) {
          let variants = [];
          const entries = entriesResponse.items[index];
          variants = await getVariantEntries(stack, entries.content_type_uid, entriesResponse, index, queryParamsObj);
          if (variants.length > 0) {
            entriesResponse.items[index].data.variants = variants;
          }
        }
      }

      if (entriesResponse.items.length > 0) {
        await bulkAction(stack, entriesResponse.items, bulkPublish, filter, destEnv, apiVersion, bulkPublishLimit, variantsFlag);
      }
      if (!entriesResponse.pagination_token) {
        if (!changedFlag) console.log('No Entries/Assets Found published on specified environment');
        return resolve();
      }
      setTimeout(async () => {
        await getSyncEntries(
          stack,
          config,
          queryParams,
          bulkPublish,
          filter,
          deliveryToken,
          destEnv,
          apiVersion,
          bulkPublishLimit,
          entriesResponse.pagination_token,
        );
      }, 3000);
      return resolve();
    } catch (error) {
      reject(error);
    }
  });
}

function setConfig(conf, bp) {
  if (bp) {
    logFileName = 'bulk-cross-publish';
    queue.consumer = performBulkPublish;
  } else {
    logFileName = 'cross-publish';
    entryQueue.consumer = publishEntry;
    assetQueue.consumer = publishAsset;
  }

  queue.config = conf;
  entryQueue.config = conf;
  assetQueue.config = conf;
  filePath = initializeLogger(logFileName);
}

async function getVariantEntries(stack, contentType, entries, index, queryParams, skip = 0) {
  try {
    let variantQueryParams = {
      locale: queryParams.locale || 'en-us',
      include_count: true,
      skip: skip, // Adding skip parameter for pagination
      limit: 100, // Set a limit to fetch up to 100 entries per request
    };
    const entryUid = entries.items[index].data.uid
    const variantsEntriesResponse = await stack
      .contentType(contentType)
      .entry(entryUid)
      .variants()
      .query(variantQueryParams)
      .find();

    const variants = variantsEntriesResponse.items.map((entry) => ({
      uid: entry.variants._variant._uid,
    }));

    if (variantsEntriesResponse.items.length === variantQueryParams.limit) {
      const nextVariants = await getVariantEntries(
        stack,
        contentType,
        entries,
        index,
        queryParams,
        skip + variantQueryParams.limit,
      );
      return Array.isArray(nextVariants) ? variants.concat(nextVariants) : variants;
    }
    return variants;
  } catch (error) {
    const errorMessage =
      error?.errorMessage ||
      error?.message ||
      error?.errors ||
      'Falied to fetch the variant entries, Please contact the admin for support.';
    throw new Error(`Error fetching variants: ${errorMessage}`);
  }
}

async function start(
  {
    retryFailed,
    bulkPublish,
    deliveryToken,
    contentTypes,
    environment,
    locale,
    onlyAssets,
    onlyEntries,
    destEnv,
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

  if (retryFailed) {
    if (typeof retryFailed === 'string' && retryFailed.length > 0) {
      if (!validateFile(retryFailed, ['cross-publish', 'bulk-cross-publish'])) {
        return false;
      }

      const bulkPublishFlag = retryFailed.match(/bulk/) ? true : false;
      setConfig(config, bulkPublishFlag);

      if (bulkPublishFlag) {
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
    if (f_types) filter.type = f_types;
    // filter.type = (f_types) ? f_types : types // types mentioned in the config file (f_types) are given preference
    if (contentTypes) {
      filter.content_type_uid = contentTypes;
      filter.type = 'entry_published';
    }
    if (onlyAssets) {
      filter.type = 'asset_published';
      delete filter.content_type_uid;
    }
    if (onlyEntries) {
      filter.type = 'entry_published';
    }
    setConfig(config, bulkPublish);
    // filter.type = (f_types) ? f_types : types // types mentioned in the config file (f_types) are given preference
    const queryParams = getQueryParams(filter);
    const bulkPublishLimit = fetchBulkPublishLimit(stack?.org_uid);
    if (includeVariants) {
      apiVersion = VARIANTS_PUBLISH_API_VERSION;
    }
    await getSyncEntries(
      stack,
      config,
      queryParams,
      bulkPublish,
      filter,
      deliveryToken,
      destEnv,
      apiVersion, bulkPublishLimit,
      includeVariants,
    );
  }
}

module.exports = {
  getSyncEntries,
  setConfig,
  getQueryParams,
  start,
};
