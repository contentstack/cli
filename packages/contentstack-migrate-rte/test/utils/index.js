const contentTypeResponse = require('../dummy/contentTypeResponse.json')
const entriesResponse = require('../dummy/entriesResponse.json')
const expectedResponse = require('../dummy/expectedEntriesResponse.json')
const globalFieldResponse = require('../dummy/globalFieldResponse.json')
const dummyToken = {
  test1: {
    token: '***REMOVED***',
    apiKey: 'blt1f36f82ccc346cc5',
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
function getEntries(contentstackTypeUid) {
  if (entriesResponse[contentstackTypeUid]) {
    return entriesResponse[contentstackTypeUid]
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
function getExpectedOutput(contentTypeUid, entryUid) {
  if (expectedResponse[contentTypeUid] && expectedResponse[contentTypeUid][entryUid]) {
    return expectedResponse[contentTypeUid][entryUid]
  }
  return {}
}
module.exports = {
  getToken,
  getContentType,
  getEntries,
  getExpectedOutput,
  getGlobalField,
}
