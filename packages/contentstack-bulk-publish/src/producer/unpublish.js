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

function bulkAction(stack, items, bulkUnpublish, environment, locale, apiVersion) {
  return new Promise(async (resolve) => {
    for (let index = 0; index < items.length; index++) {
      changedFlag = true;

      if (bulkUnpublish) {
        if (bulkUnPublishSet.length < 10 && items[index].type === 'entry_published') {
          bulkUnPublishSet.push({
            uid: items[index].data.uid,
            content_type: items[index].content_type_uid,
            locale: items[index].data.locale || 'en-us',
            publish_details: [items[index].data.publish_details] || [],
          });
        }

        if (bulkUnPulishAssetSet.length < 10 && items[index].type === 'asset_published') {
          bulkUnPulishAssetSet.push({
            uid: items[index].data.uid,
            version: items[index].data._version,
            publish_details: [items[index].data.publish_details] || [],
          });
        }

        if (bulkUnPulishAssetSet.length === 10) {
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

        if (bulkUnPublishSet.length === 10) {
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
        if (index === items.length - 1 && bulkUnPulishAssetSet.length <= 10 && bulkUnPulishAssetSet.length > 0) {
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

        if (index === items.length - 1 && bulkUnPublishSet.length <= 10 && bulkUnPublishSet.length > 0) {
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

      const entriesResponse = await Stack.sync(syncData);

      if (entriesResponse.items.length > 0) {
        await bulkAction(stack, entriesResponse.items, bulkUnpublish, environment, locale, apiVersion);
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
          null,
        );
      }, 3000);
    } catch (error) {
      reject(error);
    }
  });
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
    await getSyncEntries(stack, config, locale, queryParams, bulkUnpublish, environment, deliveryToken, apiVersion);
  }
}

// start()

module.exports = {
  getSyncEntries,
  setConfig,
  getQueryParams,
  start,
};
