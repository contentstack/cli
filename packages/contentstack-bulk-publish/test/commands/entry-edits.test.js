/* eslint-disable no-console */
const {expect, test} = require('@oclif/test')
const nock = require('nock')
const { ux: cli } = require('@contentstack/cli-utilities');

const stack = require('../../src/util/client.js').stack
const { configHandler } = require('@contentstack/cli-utilities');
const store = require('../../src/util/store.js')

const dummyConfig = configHandler;
const bulkentriesResponse1 = require('../dummy/bulkentries1')
const bulkentriesResponse2 = require('../dummy/bulkentries2')
const entryPublishResponse = require('../dummy/entrypublished')
const contentTypesResponse = require('../dummy/bulkContentTypeResponse')
const environmentResponse = require('../dummy/environment')

const bulkPublishEntriesLog = '1587758242717.bulk_publish_edits.error'

describe('entry-edits', () => {
  // const mockedlog = () => { }
  beforeEach(() => {
    // console.log = mockedlog
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
      locale: 'en-us',
    })
    .reply(200, bulkentriesResponse1)

    nock(dummyConfig.get('apiEndPoint'), {
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
      locale: 'en-us',
    })
    .reply(200, bulkentriesResponse2)

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
    .post(/\/entries\/([a-zA-Z]*)\/publish/, {
      entry: {
        environments: ['dummyEnvironment'],
        locales: ['en-us'],
      },
    })
    .reply(200, entryPublishResponse)

    nock(dummyConfig.get('cdnEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
    .get(`/v${dummyConfig.get('apiVersion')}/content_types`)
    .query({
      include_count: true,
      skip: 0,
    })
    .reply(200, contentTypesResponse)

    nock(dummyConfig.get('cdnEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
    .get(`/v${dummyConfig.get('apiVersion')}/content_types`)
    .query({
      include_count: true,
      skip: 1,
    })
    .replyWithError('Some Error')

    nock(dummyConfig.get('cdnEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
    .get(`/v${dummyConfig.get('apiVersion')}/environments/dummyEnvironment`)
    .reply(200, environmentResponse)
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
  .stdout({print: true})
  .command(['cm:bulk-publish:entry-edits', '-s', 'dummyEnvironment', '-c', 'dummyContentType', '-e', 'dummyEnvironment'])
  .it('runs hello', ctx => {
    // expect(ctx.stdout).to.contain('hello world')
    // stack.environment('kuchbhi').fetch().then(res => console.log(res))
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
  .stub(stack, 'environment', (e) => {
    return {
      fetch: function() {
        return Promise.resolve(environmentResponse)
      }
    }
  })
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(store, 'updateMissing', (key, flags) => flags)
  .stderr()
  .command(['cm:bulk-publish:entry-edits'])
  .catch(error => {
    expect(error.message).to.contain('Content Types, SourceEnv, Environments are required for processing this command. Please check --help for more details')
  })
  .it('Run entry-edits without any flags')

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
  .stub(stack, 'environment', (e) => {
    return {
      fetch: function() {
        return Promise.resolve(environmentResponse)
      }
    }
  })
  .stub(cli, 'confirm', () => async () => 'yes')
  .stdout()
  .command(['cm:bulk-publish:entry-edits', '-r', bulkPublishEntriesLog])
  .it('runs hello', ctx => {
    // expect(ctx.stdout).to.contain('hello world')
    console.log(ctx.stdout)
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
  .stub(stack, 'environment', (e) => {
    return {
      fetch: function() {
        return Promise.resolve(environmentResponse)
      }
    }
  })
  .stub(cli, 'confirm', () => async () => 'yes')
  .stdout({print: true})
  .command(['cm:bulk-publish:entry-edits', '-s', 'dummyEnvironment', '-c', 'dummyContentType', '-e', 'dummyEnvironment', '--no-bulkPublish'])
  .it('runs command with --no-bulkPublish', ctx => {
    // expect(ctx.stdout).to.contain('hello jeff')
  })
})
