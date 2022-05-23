const {expect, test} = require('@oclif/test')
const nock = require('nock')
const {cli} = require('cli-ux')
const stack = require('../../src/util/client.js').stack

const { configHandler } = require('@contentstack/cli-utilities');
const dummyConfig = configHandler
const store = require('../../src/util/store.js')

const environmentResponse = require('../dummy/environment')
const entryPublishResponse = require('../dummy/entrypublished')
const bulkentriesResponse1 = require('../dummy/bulkentries1')
const bulkentriesResponse2 = require('../dummy/bulkentries2')

const bulkPublishDraftsLog = '1587758242717.Bulk_publish_draft.error'

describe('unpublished-entries', () => {
  // const mockedlog = () => {}

  beforeEach(() => {
    // console.log = mockedlog

    nock(dummyConfig.get('cdnEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
    .get(`/v${dummyConfig.get('apiVersion')}/environments/dummyEnvironment`)
    .reply(200, environmentResponse)

    nock(dummyConfig.get('apiEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
    .get(`/v${dummyConfig.get('apiVersion')}/content_types/dummyContentType/entries`)
    .query({
      include_count: true,
      skip: 0,
      include_publish_details: true,
    })
    .reply(200, bulkentriesResponse1)

    nock(dummyConfig.get('cdnEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
    .get(`/v${dummyConfig.get('apiVersion')}/content_types/dummyContentType/entries`)
    .query({
      include_count: true,
      skip: 2,
      include_publish_details: true,
    })
    .reply(200, bulkentriesResponse2)

    nock(dummyConfig.get('cdnEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
    .get(`/v${dummyConfig.get('apiVersion')}/content_types/dummyContentType/entries`)
    .query({
      include_count: true,
      skip: 3,
      include_publish_details: true,
    })
    .replyWithError('some error')

    nock(dummyConfig.get('cdnEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
    .post(`/v${dummyConfig.get('apiVersion')}/bulk/publish`)
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
                return Promise.resolve(bulkentriesResponse1)
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
  .stub(stack, 'environment', () => {
    return {
      fetch: function() {
        return Promise.resolve(environmentResponse)
      }
    }
  })
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(store, 'updateMissing', (key, flags) => flags)
  .stderr()
  .command(['cm:bulk-publish:unpublished-entries'])
  .catch(error => {
    expect(error.message).to.contain('Content Types, SourceEnv, Environments are required for processing this command. Please check --help for more details')
  })
  .it('one')

  test
  .stub(stack, 'contentType', () => {
    return {
      entry: function() {
        return {
          query: function() {
            return {
              find: function() {
                return Promise.resolve(bulkentriesResponse1)
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
  .stub(stack, 'environment', () => {
    return {
      fetch: function() {
        return Promise.resolve(environmentResponse)
      }
    }
  })
  .stub(cli, 'confirm', () => async () => 'yes')
  .stdout()
  .command(['cm:bulk-publish:unpublished-entries', '-c', 'dummyContentType', '-e', 'dummyEnvironment', '-s', 'dummyEnvironment'])
  .it('runs hello', ctx => {
    // expect(ctx.stdout).to.contain('publish')
  })

  test
  .stub(stack, 'contentType', () => {
    return {
      entry: function() {
        return {
          query: function() {
            return {
              find: function() {
                return Promise.resolve(bulkentriesResponse1)
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
  .stub(stack, 'environment', () => {
    return {
      fetch: function() {
        return Promise.resolve(environmentResponse)
      }
    }
  })
  .stub(cli, 'confirm', () => async () => 'yes')
  .stdout()
  .command(['cm:bulk-publish:unpublished-entries', '-r', bulkPublishDraftsLog])
  .it('runs hello', ctx => {
    // expect(ctx.stdout).to.contain('publish')
  })

  test
  .stub(stack, 'contentType', () => {
    return {
      entry: function() {
        return {
          query: function() {
            return {
              find: function() {
                return Promise.resolve(bulkentriesResponse1)
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
  .stub(stack, 'environment', () => {
    return {
      fetch: function() {
        return Promise.resolve(environmentResponse)
      }
    }
  })
  .stub(cli, 'confirm', () => async () => 'yes')
  .stdout()
  .command(['cm:bulk-publish:unpublished-entries', '-c', 'dummyContentType', '-e', 'dummyEnvironment', '-s', 'dummyEnvironment', '--no-bulkPublish'])
  .it('runs command with --no-bulkPublish', ctx => {
    // expect(ctx.stdout).to.contain('publish')
  })
})
