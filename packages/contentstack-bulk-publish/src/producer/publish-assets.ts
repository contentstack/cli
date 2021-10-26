/* eslint-disable no-console */
/* eslint-disable new-cap */
/* eslint-disable camelcase */
import {Queue, isEmpty} from '../utils'
import {bulkPublish, publishAsset, initializeLogger} from '../consumer/publish'
import { retryFailedLogs } from '../utils/retryfailed'
import { validateFile } from '../utils/fs';

const queue = new Queue()
let logFileName
let bulkPublishSet = []
let filePath

/* eslint-disable no-param-reassign */

async function getAssets(stack, folder, bulkPublish, environments, locale, skip = 0) {
  return new Promise((resolve, reject) => {
      let queryParams = {
        folder: folder,
        skip: skip,
        include_count: true,
        include_folders: true,
        include_publish_details: true,
      }
      stack.asset().query(queryParams).find()
      .then(async assetResponse => {
      if (assetResponse && assetResponse.items.length > 0) {
        skip += assetResponse.items.length
        let assets = assetResponse.items
        for(let index = 0; index < assetResponse.items.length; index++) {
          if (assets[index].is_dir === true) {
            await getAssets(stack, assets[index].uid, bulkPublish, environments, locale, 0)
            continue;
          }
          if (bulkPublish) {
            if (bulkPublishSet.length < 10) {
              bulkPublishSet.push({
                uid: assets[index].uid,
                locale,
                publish_details: assets[index].publish_details || [],
              })
            }
            if (bulkPublishSet.length === 10) {
              await queue.Enqueue({assets: bulkPublishSet, Type: 'asset', environments: environments, locale, stack: stack})
              bulkPublishSet = []
            }

            if (assetResponse.items.length - 1 === index && bulkPublishSet.length > 0 && bulkPublishSet.length < 10) {
              await queue.Enqueue({assets: bulkPublishSet, Type: 'asset', environments: environments, locale, stack: stack})
              bulkPublishSet = []
            }
          } else {
            await queue.Enqueue({
              assetUid: assets[index].uid, publish_details: assets[index].publish_details || [], environments: environments, Type: 'asset', locale, stack: stack
            })
          }
          // return resolve()
        }
        if (skip === assetResponse.count) {
          return resolve(true)
        }
        await getAssets(stack, folder, bulkPublish, environments, locale, skip)
        return resolve()
      } else {
        // throw new Error(JSON.stringify({errorMessage: "No Assets found"}))
      }
    })
      .catch(error => {
        reject(error)
      })
  })
  
  return true
}

function setConfig(conf, bp) {
  if (bp) {
    queue.consumer = bulkPublish
    logFileName = 'bulk-publish-assets'
  } else {
    queue.consumer = publishAsset
    logFileName = 'publish-assets'
  }
  queue.config = conf
  filePath = initializeLogger(logFileName)
}

export default async function start({retryFailed, bulkPublish, environments, folderUid, locales}, stack, config) {
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
      if (!validateFile(retryFailed, ['publish-assets', 'bulk-publish-assets'])) {
        return false
      }

      bulkPublish = retryFailed.match(new RegExp('bulk')) ? true : false
      setConfig(config, bulkPublish)

      if (bulkPublish) {
        await retryFailedLogs(retryFailed, queue, 'bulk', stack)
      } else {
        await retryFailedLogs(retryFailed, {assetQueue: queue}, 'publish', stack)
      }
    } else if (folderUid) {
      setConfig(config, bulkPublish)
      for (let loc = 0; loc < locales.length; loc += 1) {
        try {
          await getAssets(stack, folderUid, bulkPublish, environments, locales[loc])
        } catch(error) {
          throw error
        }
      }
    }
  } catch (error) {
    throw error
  }
}
