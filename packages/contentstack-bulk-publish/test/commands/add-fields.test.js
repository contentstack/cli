const {expect, test} = require('@oclif/test')
const nock = require('nock')
const stack = require('../../src/util/client.js').stack
const { cliux, configHandler } = require('@contentstack/cli-utilities');
const dummyConfig = configHandler
const store = require('../../src/util/store.js')

const languagesResponse = require('../dummy/languages')
const contentTypeResponse = require('../dummy/contentTypeResponse')
const localizedEntryResponse = require('../dummy/entry')
const masterEntry = require('../dummy/masterEntry')
const updatedEntryResponse = require('../dummy/entryUpdated')
const sourceEnv = 'dummyEnvironment'
const entryPublishResponse = require('../dummy/entrypublished')

const bulkAddFieldsLog = '1587758242717.bulk_add_fields.error'

function fillArray(value, len) {
  if (len === 0) return []
  let a = [value]
  while (a.length * 2 <= len) a = a.concat(a)
  if (a.length < len) a = a.concat(a.slice(0, len - a.length))
  return a
}

const languages = [{
  code: 'ar-eg',
  fallback_locale: 'en-us',
  uid: 'bltmockdata42069007',
  created_by: 'bltmockdata42069007',
  updated_by: 'bltmockdata42069007',
  created_at: '1970-01-01T00:00:00.000Z',
  updated_at: '1970-01-01T00:00:00.000Z',
  name: 'Arabic - Egypt',
  ACL: [],
  _version: 1,
}]

describe('add-fields', () => {
  // const mockedLog = () => { }

  beforeEach(() => {
    // console.log = mockedLog

    // for getLanguages
    nock(`${dummyConfig.get('apiEndPoint')}`, {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
        'content-Type': 'application/json',
      },
    })
    .get(`/v${dummyConfig.get('apiVersion')}/locales`)
    .reply(200, languagesResponse)

    // for getting contentType schema
    nock(`${dummyConfig.get('cdnEndPoint')}`, {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
    .get(/\/content_types\/([a-zA-Z_])*/)
    .query({
      include_global_field_schema: true,
    })
    .reply(200, contentTypeResponse)

    // for getting entry response
    nock(dummyConfig.get('apiEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
    .get(`/v${dummyConfig.get('apiVersion')}/content_types/helloworld/entries`)
    .query({
      locale: 'en-us',
      include_count: true,
      skip: 0,
      include_publish_details: true,
    })
    .reply(200, {
      entries: fillArray(masterEntry.entries[0], 1),
      count: 1,
    })

    // for updating an entry
    nock(dummyConfig.get('apiEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
    .put(`/v${dummyConfig.get('apiVersion')}/content_types/helloworld/entries/dummyEntryId?locale=en-us`)
    .reply(200, updatedEntryResponse)

    // for getting localized entry response
    nock(dummyConfig.get('cdnEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
    .get(`/v${dummyConfig.get('apiVersion')}/content_types/helloworld/entries/dummyEntryId`)
    .query({
      locale: 'ar-eg',
      environment: sourceEnv,
      include_publish_details: true,
    })
    .reply(200, localizedEntryResponse)

    // for bulk publishing entries
    nock(dummyConfig.get('cdnEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
    .post(`/v${dummyConfig.get('apiVersion')}/bulk/publish`)
    .reply(200, entryPublishResponse)

    // for publish entry call
    nock(dummyConfig.get('cdnEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
        'Content-Type': 'application/json',
      },
    })
    .post(/\/content_types\/helloworld\/entries\/([a-zA-Z0-9]*)\/publish/, {
      entry: {
        environments: ['dummyEnvironment'],
        locales: ['en-us'],
      },
    })
    .reply(200, entryPublishResponse)
  })

  test
  .stub(stack, 'contentType', () => {
    return {
      entry: function() {
        return {
          query: function() {
            return {
              find: function() {
                return Promise.resolve({
                  items: fillArray(masterEntry.entries[0], 1),
                  count: 1,
                })
              }
            }
          },
          publish: function() {
            return Promise.resolve(entryPublishResponse)
          }
        }
      },
      fetch: function() {
        return Promise.resolve(contentTypeResponse)
      }
    }
  })
  .stub(cliux, 'confirm', () => async () => 'yes')
  .stub(store, 'updateMissing', (key, flags) => flags)
  .stderr()
  .command(['cm:bulk-publish:add-fields'])
  .catch(error => {
    expect(error.message).to.contain('Content Types, Environments are required for processing this command. Please check --help for more details')
  })
  .it('runs add-fields without flags')

  test
  .stub(stack, 'contentType', () => {
    return {
      entry: function() {
        return {
          query: function() {
            return {
              find: function() {
                return Promise.resolve({
                  items: fillArray(masterEntry.entries[0], 1),
                  count: 1,
                })
              }
            }
          },
          publish: function() {
            return Promise.resolve(entryPublishResponse)
          }
        }
      },
      fetch: function() {
        return Promise.resolve(contentTypeResponse)
      }
    }
  })
  .stub(cliux, 'confirm', () => async () => 'yes')
  .stdout({print: true})
  .command(['cm:bulk-publish:add-fields', '-c', 'helloworld', '-e', 'dummyEnvironment'])
  .it('runs add-fields with flags', async ctx => {
    // stack.contentType().entry().query().find().then(res => console.log(JSON.stringify(res)))
    // let schema = await stack.contentType().fetch()
    // console.log('schema', JSON.stringify(schema))
    // expect(ctx.stdout).to.contain('hello jeff')
  })

  test
  .stub(stack, 'contentType', (c) => {
    return {
      fetch: function() {
        return Promise.resolve(contentTypeResponse)
      }
    }
  })
  .stub(stack, 'contentType', (c) => {
    return {
      entry: function() {
        return {
          query: function(p) {
            return {
              find: function() {
                return Promise.resolve({
                  items: fillArray(masterEntry.entries[0], 1),
                  count: 1,
                })
              }
            }
          },
          publish: function() {
            return Promise.resolve(entryPublishResponse)
          }
        }
      }
    }
  })
  .stub(cliux, 'confirm', () => async () => 'yes')
  .stdout()
  .command(['cm:bulk-publish:add-fields', '-c', 'helloworld', '-e', 'dummyEnvironment', '--no-bulkPublish'])
  .it('runs add-fields with flags', ctx => {
    // expect(ctx.stdout).to.contain('hello jeff')
  })

  // test
  // .stdout()
  // .command(['cm:bulk-publish:add-fields', '-r', bulkAddFieldsLog])
  // .it('runs add-fields with flags', ctx => {
  //   // expect(ctx.stdout).to.contain('hello jeff')
  // })
})
