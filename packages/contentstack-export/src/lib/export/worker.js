const _ = require('lodash')
const { resolve } = require('path')
const { parentPort } = require('worker_threads')
const { FsUtility } = require('@contentstack/cli-utilities')
const stack = require('../util/contentstack-management-sdk')

const { addlogs: log } = require('../util/log')

let client = null
const fsUtilityInstances = {}

parentPort.on('message', (message) => {
  const { operation, env } = message

   switch (operation) {
    case 'get-entries':
      makeEntriesConcurrentCall(env)
        .then(() => {
          parentPort.postMessage({
            action: 'done',
            message: `Export of ${env.content_type} is done.`
          })
        })
      break
    case 'get-entry':
      break
    case 'get-assets':
      break
  }
})

const createFsUtilityInstance = (options) => {
  const { entryFolderPath, content_type, locale, invalidKeys } = options
  fsUtilityInstances[`${content_type}_${locale}`] = new FsUtility({
    chunkFileSize: 5,
    omitKeys: invalidKeys,
    moduleName: 'entries',
    indexFileName: 'entries.json',
    basePath: resolve(entryFolderPath, content_type, locale)
  })
}

const getClient = (config) => {
  if (!client) client = stack.Client(config)

  return client
}

const makeEntriesConcurrentCall = (env) => {
  const { config, totalCount, concurrencyLimit, limit = 100, skip = 0, locale, content_type, entryFolderPath } = env
  const queryParam = {
    limit,
    locale: locale,
    skip: skip || 100,
    include_count: true,
    query: { locale: locale },
    include_publish_details: true
  }
  const getEntriesOptions = {
    skip,
    config,
    locale,
    queryParam,
    totalCount,
    content_type,
    entryFolderPath
  }

  return new Promise(async (resolve) => {
    let batchNo = 0
    const batch = _.fill(new Array(parseInt(totalCount / 100)), 100)

    if (totalCount % 100) batch.push(100)

    const apiBatches = _.chunk(
      _.map(batch, (skip, i) => (skip * i)),
      concurrencyLimit
    )

    if (_.isEmpty(apiBatches)) return resolve()

    for (const skipBatch of apiBatches) {
      batchNo += 1
      const allPromise = []

      for (const skip of skipBatch) {
        const promise = getEntries(getEntriesOptions, skip)
        allPromise.push(promise)
      }

      await Promise.all(allPromise)
        .then((val) => {
          console.log(val.length)
        })

      parentPort.postMessage({
        action: 'log',
        message: `Export of ${env.content_type} with batch no ${batchNo} is done.`
      })

      if (_.isEqual(_.last(apiBatches), skipBatch)) {
        delete fsUtilityInstances[`${content_type}_${locale}`]
        resolve()
      }
    }
  })
}

const getEntries = (options = {}, skip = 0) => {
  const { totalCount, config, queryParam, locale, content_type, entryFolderPath } = options
  queryParam.skip = skip

  if (_.isEmpty(fsUtilityInstances[`${content_type}_${locale}`])) {
    createFsUtilityInstance({ entryFolderPath, content_type, locale })
  }

  return getClient(config)
    .stack({ api_key: config.source_stack, management_token: config.management_token })
    .contentType(content_type)
    .entry()
    .query(queryParam)
    .find()
    .then(({ items }) => {
      // NOTE write into file
      const closeFile = (
        ((queryParam.skip + items.length) >= totalCount) ||
        (totalCount <= 100)
      )

      if (_.isEmpty(items)) {
        fsUtilityInstances[`${content_type}_${locale}`].closeFile()
      } else {
        fsUtilityInstances[`${content_type}_${locale}`].writeIntoFile(
          items,
          { closeFile, mapKeyVal: true }
        )
      }
      // NOTE end file operation

      return items
    }).catch((error) => {
      console.log('Entries fetch error', error && error.message)
      log(config, error, 'error')
    })
}
