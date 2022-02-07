/* eslint-disable max-params */
/* eslint-disable new-cap */
/* eslint-disable camelcase */
/* eslint-disable max-depth */
/* eslint-disable no-console */
import {Queue, isEmpty} from '../utils'
import {bulkPublish, publishEntry, initializeLogger} from '../consumer/publish'
import { retryFailedLogs } from '../utils/retryfailed'
import { validateFile } from '../utils/fs';

const queue = new Queue()

let skipCount
let logFileName
let contentTypesList = []
let allContentTypes: any = []
let bulkPublishSet = []
let filePath

async function getEntries(stack, contentType, locale, bulkPublish, environments, skip = 0) {
  return new Promise((resolve, reject) => {
    skipCount = skip

    const queryParams = {
      locale: (locale || 'en-us'),
      include_count: true,
      skip: skipCount,
      include_publish_details: true,
    }

    stack.contentType(contentType).entry().query(queryParams).find()
    .then(async entriesResponse => {
      skipCount += entriesResponse.items.length
      let entries = entriesResponse.items
      for (let index = 0; index < entriesResponse.items.length; index++) {
        if (bulkPublish) {
          if (bulkPublishSet.length < 10) {
            bulkPublishSet.push({
              uid: entries[index].uid,
              content_type: contentType,
              locale,
              publish_details: entries[index].publish_details || [],
            })
          }

          if (bulkPublishSet.length === 10) {
            await queue.Enqueue({
              entries: bulkPublishSet, locale, Type: 'entry', environments: environments, stack: stack
            })
            bulkPublishSet = []
          }

          if (index === entriesResponse.items.length - 1 && bulkPublishSet.length <= 10 && bulkPublishSet.length > 0) {
            await queue.Enqueue({
              entries: bulkPublishSet, locale, Type: 'entry', environments: environments, stack: stack
            })
            bulkPublishSet = []
          } // bulkPublish
        } else {
          await queue.Enqueue({
            content_type: contentType, publish_details: entries[index].publish_details || [], environments: environments, entryUid: entries[index].uid, locale, Type: 'entry', stack: stack
          })
        }
      }

      if (entriesResponse.count === skipCount) {
        bulkPublishSet = []
        return resolve()
      }
      await getEntries(stack, contentType, locale, bulkPublish, environments, skipCount)
      return resolve()
    })
    .catch(error => reject(error))
  })
}

async function getContentTypes(stack, skip = 0, contentTypes = []) {
  return new Promise((resolve, reject) => {
    skipCount = skip
    contentTypesList = contentTypes
    stack.contentType().query({include_count: true, skip: skipCount}).find().then(contentTypeResponse => {
      if (contentTypeResponse.items.length > 0) {
        contentTypesList = [...contentTypesList, ...contentTypeResponse.items]
        skipCount += contentTypeResponse.items.length
        if (skipCount < contentTypeResponse.count) {
          getContentTypes(stack, skipCount, contentTypesList)
        }
        resolve(contentTypesList)
      }
    }).catch(error => reject(error))
  })
}

function setConfig(conf, bp) {
  if (bp) {
    queue.consumer = bulkPublish
    logFileName = 'bulk-publish-entries'
  } else {
    queue.consumer = publishEntry
    logFileName = 'publish-entries'
  }
  queue.config = conf
  filePath = initializeLogger(logFileName)
}

export default async function start({retryFailed, bulkPublish, publishAllContentTypes, contentTypes, locales, environments}, stack?, config?) {
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
      if (typeof retryFailed === 'string') {
        if (!validateFile(retryFailed, ['publish-entries', 'bulk-publish-entries'])) {
          return false
        }
        bulkPublish = retryFailed.match(new RegExp('bulk')) ? true : false
        setConfig(config, bulkPublish)
        if (bulkPublish) {
          await retryFailedLogs(retryFailed, queue, 'bulk', stack)
        } else {
          await retryFailedLogs(retryFailed, {entryQueue: queue}, 'publish', stack)
        }
      }
    } else {
      setConfig(config, bulkPublish)
      if (publishAllContentTypes) {
        allContentTypes = await getContentTypes(stack)
      } else {
        allContentTypes = contentTypes
      }
      for (let loc = 0; loc < locales.length; loc += 1) {
        for (let i = 0; i < allContentTypes.length; i += 1) {
          try {
            /* eslint-disable no-await-in-loop */
            debugger
            await getEntries(stack, allContentTypes[i].uid || allContentTypes[i], locales[loc], bulkPublish, environments)
            /* eslint-enable no-await-in-loop */
          } catch (error) {
            throw error
          }
        }
      }
    }
  } catch(error) {
    throw error
  }
}
