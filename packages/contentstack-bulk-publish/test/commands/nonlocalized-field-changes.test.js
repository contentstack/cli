const { expect, test } = require('@oclif/test')
const nock = require('nock')
const stack = require('../../src/util/client.js').stack
const { cliux, configHandler } = require('@contentstack/cli-utilities');
const dummyConfig = configHandler
const store = require('../../src/util/store.js')

const languagesResponse = require('../dummy/languages')
const contentTypeResponse = require('../dummy/contentTypeResponse')
const localizedEntryResponse = require('../dummy/entry')
const masterEntry = require('../dummy/masterEntry')
const sourceEnv = 'dummyEnvironment'
const entryPublishResponse = require('../dummy/entrypublished')

const bulkNonLocalizedLog = '1587758242717.bulk_nonlocalized_field_changes.error'

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

describe('nonlocalized-field-changes', () => {
  // const mockedLog = () => { }

  beforeEach(() => {
    // console.log = mockedLog;

    // for getLanguages
    nock(`${dummyConfig.get('apiEndPoint')}`, {
      'content-Type': 'application/json',
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
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
      .get(/\/content_types\/([a-zA-Z_])/)
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
        environment: sourceEnv,
        include_count: true,
        skip: 0,
      })
      .reply(200, {
        entries: fillArray(masterEntry.entries[0], 12),
        count: 12,
      })

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

    nock(dummyConfig.get('cdnEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
      .post(`/v${dummyConfig.get('apiVersion')}/bulk/publish`)
      .reply(200, entryPublishResponse)

    nock(dummyConfig.get('cdnEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
        'Content-Type': 'application/json',
      },
    })
      .post(/\/content_types\/helloworld\/entries\/([a-zA-Z0-9]*)\/publish/)
      .reply(200, entryPublishResponse)
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
  .stub(store, 'updateMissing', (key, flags) => flags)
  .stderr()
  .command(['cm:bulk-publish:nonlocalized-field-changes'])
  .catch(error => {
    expect(error.message)
  })
  .it('runs command without flags')

  test
  .stub(stack, 'locale', () => {
    return {
      query: function () {
        return {
          find: function () {
            return Promise.resolve(languagesResponse)
          },
        }
      },
    }
  })
  .stub(stack, 'contentType', () => {
    return {
      entry: function () {
        return {
          query: function () {
            return {
              find: function () {
                return Promise.resolve({
                  items: fillArray(masterEntry.entries[0], 1),
                  count: 1,
                })
              }
            }
          },
          fetch: function() {
            return Promise.resolve(localizedEntryResponse)
          },
          publish: function () {
            return Promise.resolve(entryPublishResponse)
          }
        }
      },
      fetch: function () {
        return Promise.resolve(contentTypeResponse)
      }
    }
  })
  .stub(cliux, 'confirm', () => async () => 'yes')
  .stdout({ print: true })
  .command(['cm:bulk-publish:nonlocalized-field-changes', '-s', 'dummyEnvironment', '-c', 'helloworld', '-e', 'dummyEnvironment'])
  .it('runs command', ctx => {
    // expect(ctx.stdout).to.contain('hello jeff')
  })

  test
  .stub(stack, 'locale', () => {
    return {
      query: function () {
        return {
          find: function () {
            return Promise.resolve(languagesResponse)
          },
        }
      },
    }
  })
  .stub(stack, 'contentType', () => {
    return {
      entry: function () {
        return {
          query: function () {
            return {
              find: function () {
                return Promise.resolve({
                  items: fillArray(masterEntry.entries[0], 1),
                  count: 1,
                })
              }
            }
          },
          fetch: function() {
            return Promise.resolve(localizedEntryResponse)
          },
          publish: function () {
            return Promise.resolve(entryPublishResponse)
          }
        }
      },
      fetch: function () {
        return Promise.resolve(contentTypeResponse)
      }
    }
  })
  .stub(cliux, 'confirm', () => async () => 'yes')
  .stdout({print: true})
  .command(['cm:bulk-publish:nonlocalized-field-changes', '-s', 'dummyEnvironment', '-c', 'helloworld', '-e', 'dummyEnvironment', '--no-bulkPublish'])
  .it('runs command', ctx => {
    // expect(ctx.stdout).to.contain('hello jeff')
  })

  test
  .stub(stack, 'locale', () => {
    return {
      query: function () {
        return {
          find: function () {
            return Promise.resolve(languagesResponse)
          },
        }
      },
    }
  })
  .stub(stack, 'contentType', () => {
    return {
      entry: function () {
        return {
          query: function () {
            return {
              find: function () {
                return Promise.resolve({
                  items: fillArray(masterEntry.entries[0], 1),
                  count: 1,
                })
              }
            }
          },
          fetch: function() {
            return Promise.resolve(localizedEntryResponse)
          },
          publish: function () {
            return Promise.resolve(entryPublishResponse)
          }
        }
      },
      fetch: function () {
        return Promise.resolve(contentTypeResponse)
      }
    }
  })
  .stub(cliux, 'confirm', () => async () => 'yes')
  .stdout({print: true})
  .command(['cm:bulk-publish:nonlocalized-field-changes', '-r', bulkNonLocalizedLog])
  .it('runs command', ctx => {
    // expect(ctx.stdout).to.contain('hello jeff')
  })

  test
  .stub(stack, 'locale', () => {
    return {
      query: function () {
        return {
          find: function () {
            return Promise.resolve(languagesResponse)
          },
        }
      },
    }
  })
  .stub(stack, 'contentType', () => {
    return {
      entry: function () {
        return {
          query: function () {
            return {
              find: function () {
                return Promise.resolve({
                  items: fillArray(masterEntry.entries[0], 1),
                  count: 1,
                })
              }
            }
          },
          fetch: function() {
            return Promise.resolve(localizedEntryResponse)
          },
          publish: function () {
            return Promise.resolve(entryPublishResponse)
          }
        }
      },
      fetch: function () {
        return Promise.resolve(contentTypeResponse)
      }
    }
  })
  .stub(cliux, 'confirm', () => async () => 'yes')
  .stdout({print: true})
  .command(['cm:bulk-publish:nonlocalized-field-changes', '-r', bulkNonLocalizedLog, '--no-bulkPublish'])
  .it('runs command', ctx => {
    // expect(ctx.stdout).to.contain('hello jeff')
  })
})
