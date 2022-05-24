/* eslint-disable no-console */
const {expect, test} = require('@oclif/test')
const nock = require('nock')
const { ux: cli } = require('@contentstack/cli-utilities');
const stack = require('../../src/util/client.js').stack
const { configHandler } = require('@contentstack/cli-utilities');
const dummyConfig = configHandler
const store = require('../../src/util/store.js')

// const {assetQueue} = require('../../src/producer/cross-publish.js')
// const Queue = require('../../src/util/queue.js')

const syncEntriesResponse = require('../dummy/unpublish_response')

const bulkCrossPublishLog = '1587758242717.bulk_cross_publish.error'
const deliveryToken = 'dummyDeliveryToken'
const entryPublishResponse = require('../dummy/entrypublished')
const assetPublishResponse = require('../dummy/assetpublished.js')

describe('cross-publish', () => {
  // const mockedlog = () => {}

  beforeEach(() => {
    // console.log = mockedlog

    nock(dummyConfig.get('cdnEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        access_token: deliveryToken,
      },
    })
    .get(`/v${dummyConfig.get('apiVersion')}/stacks/sync`)
    .query({
      init: true,
      type: 'asset_published,entry_published',
      locale: 'en-us',
      environment: 'dummyEnvironment',
      content_type_uid: 'dummyContentType',
    })
    .reply(200, syncEntriesResponse)

    nock(dummyConfig.get('cdnEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
        'Content-Type': 'application/json',
      },
    })
    .post(/\/content_types\/dummyContentType\/entries\/([a-zA-Z0-9]*)\/publish/)
    .reply(200, entryPublishResponse)

    nock(dummyConfig.get('cdnEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
        'Content-Type': 'application/json',
      },
    })
    .post(/\/assets\/([a-zA-Z0-9]*)\/publish/)
    .reply(200, entryPublishResponse)

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
  .stub(cli, 'prompt', () => async () => deliveryToken)
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(store, 'updateMissing', (key, flags) => flags)
  .stderr()
  .command(['cm:bulk-publish:cross-publish'])
  .catch(error => {
    expect(error.message).to.contain('Environment, Destination Environment, ContentType is required for processing this command. Please check --help for more details')
  })
  .it('runs hello')

  test
  .stub(require('../../src/util/queue.js'), 'getQueue', () => {
    return {
      Enqueue: function(data) {
        if (data.assets) 
          return console.log(`${data.assets.length} elements of type ${data.Type} has been queued to be published`)
        if (data.entries)
          return console.log(`${data.entries.length} elements of type ${data.Type} has been queued to be published`)
        return console.log(`Data of type ${data.Type} has been queued to be published`)
      }
    }
  })
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(cli, 'prompt', () => async () => deliveryToken)
  .stdout()
  .command(['cm:bulk-publish:cross-publish', '-t', 'asset_published', 'entry_published', '-e', 'dummyEnvironment', '-c', 'dummyContentType', '-d', 'dummyEnvironment'])
  .it('runs hello --name jeff', ctx => {

  })

  test
  .stub(require('../../src/util/queue.js'), 'getQueue', () => {
    return {
      Enqueue: function (data) {
        if (data.bulkPublishAssetSet)
          return console.log(`${data.bulkPublishAssetSet.length} elements of type ${data.Type} has been queued to be published`)
        if (data.bulkPublishSet)
          return console.log(`${data.bulkPublishSet.length} elements of type ${data.Type} has been queued to be published`)
        return console.log(`Data of type ${data.Type} has been queued to be published`)
      }
    }
  })
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(cli, 'prompt', () => async () => deliveryToken)
  .stdout({print: true})
  .command(['cm:bulk-publish:cross-publish', '-t', 'asset_published', 'entry_published', '-e', 'dummyEnvironment', '-c', 'dummyContentType', '-d', 'dummyEnvironment', '--no-bulkPublish'])
  .it('runs hello --name jeff', async ctx => {
    // const queue = require('../../src/util/queue.js')
    // console.log('queue()', JSON.stringify(queue.getQueue().Enqueue({nigga: 'nigga'})))
    // console.log('from test case', JSON.stringify(await stack.asset().publish()))
  })

  test
  .stub(require('../../src/util/queue.js'), 'getQueue', () => {
    return {
      Enqueue: function(data) {
        if (data.bulkPublishAssetSet) 
          return console.log(`${data.bulkPublishAssetSet.length} elements of type ${data.Type} has been queued to be published`)
        if (data.bulkPublishSet)
          return console.log(`${data.bulkPublishSet.length} elements of type ${data.Type} has been queued to be published`)
        return console.log(`Data of type ${data.Type} has been queued to be published`)
      }
    }
  })
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(cli, 'prompt', () => async () => deliveryToken)
  .stdout({print: true})
  .command(['cm:bulk-publish:cross-publish', '-r', bulkCrossPublishLog])
  .it('runs hello --name jeff', ctx => {

  })
})
