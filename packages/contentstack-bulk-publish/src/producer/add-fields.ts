/* eslint-disable max-depth */
/* eslint-disable complexity */
/* eslint-disable node/no-unsupported-features/es-syntax */
/* eslint-disable camelcase */
/* eslint-disable new-cap */
/* eslint-disable no-console */
/* eslint-disable max-params */
import { Queue, isEmpty, req} from '../utils';
import {bulkPublish, publishEntry, initializeLogger} from '../consumer/publish'
import * as defaultConfig from '../config/defaults.json'
import { retryFailedLogs } from '../utils/retryfailed'
import { validateFile } from '../utils/fs';
import { Command } from '@contentstack/cli-command';

const command = new Command()
const queue = new Queue()
queue.consumer = bulkPublish
let logFileName
let bulkPublishSet = []
let filePath

let changedFlag = false

const defaults = {
  number: null,
  boolean: false,
  isodate: [],
  file: null,
  reference: [],
}

const deleteFields = ['updated_by', 'created_by', 'created_at', 'updated_at', '_version', 'ACL']

function setConfig(conf, bp) {
  if (bp) {
    logFileName = 'bulk-add-fields'
    queue.consumer = bulkPublish
  } else {
    logFileName = 'add-fields'
    queue.consumer = publishEntry
  }
  queue.config = conf
  filePath = initializeLogger(logFileName)
}

async function getContentTypeSchema(stack, contentType) {
  return new Promise((resolve, reject) => {
    stack.contentType(contentType).fetch({include_global_field_schema: true})
    .then(content => {
      resolve(content.schema)
    })
    .catch(error => reject(error))
  })
}

function removeUnwanted(entry, unwantedkeys) {
  unwantedkeys.forEach(key => {
    delete entry[key]
  })
  return entry
}

function fileFields(entry, uid, multiple) {
  if (entry[uid]) {
    if (typeof entry[uid] === 'object' || Array.isArray(entry[uid])) {
      if (multiple) {
        const temp = []
        entry[uid].forEach(file => {
          temp.push(file.uid)
        })
        entry[uid] = temp
      } else {
        entry[uid] = entry[uid].uid
      }
    }
  }
}

function addFields(contentType, entry) {
  contentType.forEach(schema => {
    if (schema.uid && !schema.schema) {
      if (Object.prototype.hasOwnProperty.call(entry, schema.uid) && schema.data_type === 'file') {
        changedFlag = true
        fileFields(entry, schema.uid, schema.multiple)
      }

      if (!Object.prototype.hasOwnProperty.call(entry, schema.uid)) {
        changedFlag = true
        if (schema.multiple) {
          if (schema.field_metadata && schema.field_metadata.default_value) {
            if (schema.data_type === 'isodate') {
              entry[schema.uid] = [schema.field_metadata.default_value.date]
            } else {
              entry[schema.uid] = [schema.field_metadata.default_value]
            }
          } else {
            entry[schema.uid] = []
          }
        } else if (schema.field_metadata && schema.field_metadata.default_value) {
          if (schema.data_type === 'isodate') {
            entry[schema.uid] = schema.field_metadata.default_value.date
          } else {
            entry[schema.uid] = schema.field_metadata.default_value
          }
        } else if (schema.enum) {
          entry[schema.uid] = null
        } else if (Object.prototype.hasOwnProperty.call(defaults, schema.data_type)) {
          entry[schema.uid] = defaults[schema.data_type]
        } else {
          entry[schema.uid] = ''
        }
      }
    }

    if (schema.uid && schema.schema) {
      if (!entry[schema.uid]) {
        if (schema.multiple) {
          entry[schema.uid] = []
        } else {
          entry[schema.uid] = {}
        }
      }
    }

    if (schema.data_type === 'group' && !schema.multiple) {
      addFields(schema.schema, entry[schema.uid])
    }
    if (schema.data_type === 'group' && schema.multiple) {
      entry[schema.uid].forEach(field => {
        addFields(schema.schema, field)
      })
    }
    if (schema.data_type === 'global_field' && !schema.multiple) {
      addFields(schema.schema, entry[schema.uid])
    }
    if (schema.data_type === 'global_field' && schema.multiple) {
      entry[schema.uid].forEach(field => {
        addFields(schema.schema, field)
      })
    }
    if (schema.data_type === 'blocks') {
      if (!entry[schema.uid] && !Array.isArray(entry[schema.uid])) {
        entry[schema.uid] = []
      }

      schema.blocks.forEach(block => {
        let filterBlockFields = entry[schema.uid].filter(blockField => {
          if (Object.prototype.hasOwnProperty.call(blockField, block.uid)) {
            return blockField
          }
          return false
        })

        if (filterBlockFields.length > 0) {
          filterBlockFields.forEach(bfield => {
            addFields(block.schema, bfield[block.uid])
          })
        } else {
          entry[schema.uid].push({[block.uid]: {}})
          filterBlockFields = entry[schema.uid].filter(blockField => {
            if (Object.prototype.hasOwnProperty.call(blockField, block.uid)) {
              return blockField
            }
            return false
          })

          if (filterBlockFields.length > 0) {
            filterBlockFields.forEach(bfield => {
              addFields(block.schema, bfield[block.uid])
            })
          }
        }
      })
    }
  })
  return {entry, changedFlag}
}

async function updateEntry(config, updatedEntry, contentType, locale) {
  const entry = {
    entry: updatedEntry,
  }
  const tokenDetails = command.getToken(config.alias)
  const conf = {
    uri: `${config.host}/v${defaultConfig.apiVersion}/content_types/${contentType}/entries/${updatedEntry.uid}?locale=${locale || 'en-us'}`,
    method: 'PUT',
    headers: {
      api_key: tokenDetails.apiKey,
      authorization: tokenDetails.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...entry,
    }),
  }
  try {
    const update = await req(conf)
    if (update.notice) {
      return Promise.resolve(true)
    }
    return Promise.resolve(false)
  } catch (error) {
    console.log(error)
  }
  return Promise.resolve(false)
}

/* eslint-disable no-param-reassign */
async function getEntries(stack, config, schema, contentType, locale, bulkPublish, environments, skipPublish, skip = 0) {
  let queryParams = {
    locale: locale || 'en-us',
    include_count: true,
    skip: skip,
    include_publish_details: true,
  }
  stack.contentType(contentType).entry().query(queryParams).find()
  .then(async entriesResponse => {
    skip += entriesResponse.items.length
    let entries = entriesResponse.items
    for (let index = 0; index < entriesResponse.items.length; index++) {
      let updatedEntry = addFields(schema, entries[index])
      if (updatedEntry.changedFlag) {
        updatedEntry = removeUnwanted(entries[index], deleteFields)
        const flag = await updateEntry(config, updatedEntry, contentType, locale)
        if (flag) {
          if (!skipPublish) {
            if (bulkPublish) {
              if (bulkPublishSet.length < 10) {
                bulkPublishSet.push({
                  uid: entries[index].uid,
                  content_type: contentType,
                  locale,
                  publish_details: entries[index].publish_details,
                })
              } 
              if (bulkPublishSet.length === 10) {
                await queue.Enqueue({
                  entries: bulkPublishSet, locale, Type: 'entry', environments: environments, stack: stack
                })
                bulkPublishSet = []
              }
            } else {
              await queue.Enqueue({
                content_type: contentType, publish_details: entries[index].publish_details || [], environments: environments, entryUid: entries[index].uid, locale, Type: 'entry', stack: stack
              })
            }
          } else {
            console.log(`Entry ${entries[index].uid} with contentType ${contentType} has been updated`)
          }
        } else {
          console.log(`Update Failed for entryUid ${entries[index].uid} with contentType ${contentType}`)
        }
      } else {
        console.log(`No change Observed for contentType ${contentType} with entry ${entries[index].uid}`)
      }

      if (index === entriesResponse.items.length - 1 && bulkPublishSet.length > 0 && bulkPublishSet.length < 10) {
        await queue.Enqueue({
          entries: bulkPublishSet, locale, Type: 'entry', environments: environments, stack: stack
        })
        bulkPublishSet = []
      }
    }
    if (skip === entriesResponse.count) {
      return Promise.resolve()
    }
    return setTimeout(async () => getEntries(stack, config, schema, contentType, locale, bulkPublish, environments, skip), 2000)
  })
  .catch(error => console.log(error))
  return true
}

/* eslint-disable no-await-in-loop */
/* eslint-disable no-loop-func */

export default async function start({contentTypes, locales, environments, retryFailed, bulkPublish, skipPublish}, stack, config): Promise<void | boolean> {
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
        if (!validateFile(retryFailed, ['bulk-add-fields', 'add-fields'])) {
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
      for (let i = 0; i < contentTypes.length; i += 1) {
        getContentTypeSchema(stack, contentTypes[i])
        .then(async schema => {
          for (let j = 0; j < locales.length; j += 1) {
            try {
              await getEntries(stack, config, schema, contentTypes[i], locales[j], bulkPublish, environments, skipPublish)
            } catch (err) {
              console.log(`Failed to get Entries with contentType ${contentTypes[i]} and locale ${locales[j]}`)
            }
          }
        })
        .catch(err => {
          console.log(`Failed to fetch schema${JSON.stringify(err)}`)
        })
      }
    }
  } catch(error) {
    throw error
  }
}