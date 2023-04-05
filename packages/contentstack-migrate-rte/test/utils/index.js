const { find } = require('lodash')
const contentTypeResponse = require('../dummy/contentTypeResponse.json')
const entriesResponse = require('../dummy/entriesResponse.json')
const expectedResponse = require('../dummy/expectedEntriesResponse.json')
const globalFieldResponse = require('../dummy/globalFieldResponse.json')
const dummyToken = {
  test1: {
    token: 'testManagementToken',
    apiKey: 'testApiKey',
    type: 'management',
  },
}
function getToken(alias) {
  if (dummyToken[alias]) {
    return dummyToken[alias]
  }
  throw new Error('Token with alias ' + "'" + alias + "'" + ' was not found')
}
function getGlobalField(uid) {
  if (globalFieldResponse[uid]) {
    return [200, globalFieldResponse[uid]]
  }
  return [422, {
    error_message: `The Global Field '${uid}' was not found. Please try again.`,
    error_code: 118,
    errors: {
      uid: [
        'is not valid.',
      ],
    },
  }]
}
function getContentType(uid) {
  if (contentTypeResponse[uid]) {
    return [200, contentTypeResponse[uid]]
  }

  return [422, {
    error_message: `The Content Type '${uid}' was not found. Please try again.`,
    error_code: 118,
    errors: {
      uid: [
        'is not valid.',
      ],
    },
  }]
}
function getEntriesOnlyUID(contentstackTypeUid,locale = 'en-us') {
  if (entriesResponse[contentstackTypeUid]) {
    const entries = entriesResponse[contentstackTypeUid]
    const allEntries = entries.entries.filter(entry => entry.locale === locale).map(entry => ({uid:entry.uid}))
    return {
      entries: allEntries,
      count: allEntries.length
    }
  }
  return {
    error_message: `The Content Type '${contentstackTypeUid}' was not found. Please try again.`,
    error_code: 118,
    errors: {
      uid: [
        'is not valid.',
      ],
    },
  }
}
function getEntries(contentstackTypeUid,locale = "en-us") {
  if (entriesResponse[contentstackTypeUid]) {
    const entries = entriesResponse[contentstackTypeUid]
    return {
      entries: entries.entries.filter(entry => entry.locale === locale),
      count: entries.entries.filter(entry => entry.locale === locale).length
    }
  }
  return {
    error_message: `The Content Type '${contentstackTypeUid}' was not found. Please try again.`,
    error_code: 118,
    errors: {
      uid: [
        'is not valid.',
      ],
    },
  }
}
function getEntry(contentstackTypeUid, entryUid, locale = "en-us") {
  if (entriesResponse[contentstackTypeUid]) {
    const entries = entriesResponse[contentstackTypeUid]
    const entry = find(entries.entries, { uid: entryUid, locale })
    const masterEntry = find(entries.entries, { uid: entryUid, locale: 'en-us' })
    if (entry) {
      return {
        entry
      }
    } else {
      if (masterEntry) {
        return {
          entry: masterEntry
        }
      } else {
        return {
          "error_message": "The requested object doesn't exist.",
          "error_code": 141,
          "errors": {
            "uid": [
              "is not valid."
            ]
          }
        }
      }
    }
  }
  return {
    "error_message": "The requested object doesn't exist.",
    "error_code": 141,
    "errors": {
      "uid": [
        "is not valid."
      ]
    }
  }
}
function getExpectedOutput(contentTypeUid, entryUid,locale = "en-us") {
  let entrySuffix = ''
  if (locale !== 'en-us') {
    entrySuffix = '_' + locale
  }
  if (expectedResponse[contentTypeUid] && expectedResponse[contentTypeUid][`${entryUid}${entrySuffix}`]) {
    return expectedResponse[contentTypeUid][`${entryUid}${entrySuffix}`]
  }
  return {}
}
module.exports = {
  getToken,
  getContentType,
  getEntries,
  getExpectedOutput,
  getGlobalField,
  getEntriesOnlyUID,
  getEntry
}
