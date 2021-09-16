/* eslint-disable no-console */
/* eslint-disable new-cap */
/* eslint-disable camelcase */
/* eslint-disable complexity */
/* eslint-disable max-params */
const {getQueue} = require('../util/queue')
const defaults = require('../config/defaults.json')
const req = require('../util/request')
const {
  bulkPublish, publishEntry, publishAsset, initializeLogger,
} = require('../consumer/publish')
const retryFailedLogs = require('../util/retryfailed')
const {validateFile} = require('../util/fs')
const types = 'asset_published,entry_published'
const queue = getQueue()
const entryQueue = getQueue()
const assetQueue = getQueue()
const {setDelayForBulkPublish} = require('../util')
const {Command} = require('@contentstack/cli-command')
const command = new Command()
const {isEmpty} = require('../util')

let bulkPublishSet = []
let bulkPublishAssetSet = []
let changedFlag = false
let logFileName
let filePath

function getQueryParams(filter) {
  let queryString = ''
  Object.keys(filter).forEach(key => {
    if (filter[key]) {
      queryString = `${queryString}&${key}=${filter[key]}`
    }
  })

  return queryString
}

async function bulkAction(stack, items, bulkPublish, filter, destEnv) {
  return new Promise(async resolve => {
    for (let index = 0; index < items.length; index++) {
      changedFlag = true

      if (bulkPublish) {
        if (bulkPublishSet.length < 10 && items[index].type === 'entry_published') {
          bulkPublishSet.push({
            uid: items[index].data.uid,
            content_type: items[index].content_type_uid,
            locale: items[index].data.locale || 'en-us',
            publish_details: [items[index].data.publish_details] || [],
          })
        }

        if (bulkPublishAssetSet.length < 10 && items[index].type === 'asset_published') {
          bulkPublishAssetSet.push({
            uid: items[index].data.uid,
            version: items[index].data._version,
            publish_details: [items[index].data.publish_details] || [],
          })
        }

        if (bulkPublishAssetSet.length === 10) {
          await queue.Enqueue({
            assets: bulkPublishAssetSet, Type: 'asset', locale: filter.locale, environments: destEnv, stack: stack
          })
          bulkPublishAssetSet = []
        }

        if (bulkPublishSet.length === 10) {
          await queue.Enqueue({
            entries: bulkPublishSet, locale: filter.locale, Type: 'entry', environments: destEnv, stack: stack
          })
          bulkPublishSet = []
        }

        if (index === items.length - 1 && bulkPublishAssetSet.length <= 10 && bulkPublishAssetSet.length > 0) {
          await queue.Enqueue({
            assets: bulkPublishAssetSet, Type: 'asset', locale: filter.locale, environments: destEnv, stack: stack
          })
          bulkPublishAssetSet = []
        }

        if (index === items.length - 1 && bulkPublishSet.length <= 10 && bulkPublishSet.length > 0) {
          await queue.Enqueue({
            entries: bulkPublishSet, locale: filter.locale, Type: 'entry', environments: destEnv, stack: stack
          })
          bulkPublishSet = []
        }
      } else {
        if (items[index].type === 'entry_published') {
          await entryQueue.Enqueue({
            content_type: items[index].content_type_uid, publish_details: [items[index].data.publish_details], environments: destEnv, entryUid: items[index].data.uid, locale: items[index].data.locale || 'en-us', Type: 'entry', stack: stack
          })
        }
        if (items[index].type === 'asset_published') {
          await assetQueue.Enqueue({
            assetUid: items[index].data.uid, publish_details: [items[index].data.publish_details], environments: destEnv, Type: 'asset', stack: stack
          })
        }
      }
    }
    return resolve()
  })
}

async function getSyncEntries(stack, config, queryParams, bulkPublish, filter, deliveryToken, destEnv, paginationToken = null) {
  return new Promise(async (resolve, reject) => {
    try {
      let tokenDetails = command.getToken(config.alias)
      const conf = {
        uri: `${config.cda}/v${defaults.apiVersion}/stacks/sync?${paginationToken ? `pagination_token=${paginationToken}` : 'init=true'}${queryParams}`,
        headers: {
          api_key: tokenDetails.apiKey,
          access_token: deliveryToken,
          branch: config.branch,
        },
      }
      const entriesResponse = await req(conf)
      if (entriesResponse.items.length > 0) {
        await bulkAction(stack, entriesResponse.items, bulkPublish, filter, destEnv)
      }
      if (!entriesResponse.pagination_token) {
        if (!changedFlag) console.log('No Entries/Assets Found published on specified environment')
        return resolve()
      }
      setTimeout(async () => {
        await getSyncEntries(stack, config, queryParams, bulkPublish, filter, deliveryToken, destEnv, entriesResponse.pagination_token)
      }, 3000)
    } catch (error) {
      reject(error)
    }
  })
  return resolve()
}

function setConfig(conf, bp) {
  if (bp) {
    logFileName = 'bulk-cross-publish'
    queue.consumer = bulkPublish
  } else {
    logFileName = 'cross-publish'
    entryQueue.consumer = publishEntry
    assetQueue.consumer = publishAsset
  }

  config = conf
  queue.config = conf
  entryQueue.config = conf
  assetQueue.config = conf
  filePath = initializeLogger(logFileName)
}

async function start({retryFailed, bulkPublish, filter, deliveryToken, destEnv, f_types}, stack, config) {
  process.on('beforeExit', async () => {
    const isErrorLogEmpty = await isEmpty(`${filePath}.error`)
    const isSuccessLogEmpty = await isEmpty(`${filePath}.success`)
    if (!isErrorLogEmpty) {
      console.log(`The error log for this session is stored at ${filePath}.error`)
    } else if (!isSuccessLogEmpty) {
      console.log(`The success log for this session is stored at ${filePath}.success`)
    }
    process.exit(0)
  })

  try {
    if (retryFailed) {
      if (typeof retryFailed === 'string' && retryFailed.length > 0) {
        if (!validateFile(retryFailed, ['cross-publish', 'bulk-cross-publish'])) {
          return false
        }

        bulkPublish = retryFailed.match(new RegExp('bulk')) ? true : false
        setConfig(config, bulkPublish)

        if (bulkPublish) {
          await retryFailedLogs(retryFailed, queue, 'bulk')
        } else {
          await retryFailedLogs(retryFailed, {entryQueue, assetQueue}, 'publish')
        }
      }
    } else {
      setConfig(config, bulkPublish)  
      filter.type = (f_types) ? f_types : types // types mentioned in the config file (f_types) are given preference
      const queryParams = getQueryParams(filter)
      try {
        await getSyncEntries(stack, config, queryParams, bulkPublish, filter, deliveryToken, destEnv)
      } catch (error) {
        throw error
      }
    }
  } catch(error) {
    throw error
  }
}

module.exports = {
  getSyncEntries,
  setConfig,
  getQueryParams,
  start,
}
