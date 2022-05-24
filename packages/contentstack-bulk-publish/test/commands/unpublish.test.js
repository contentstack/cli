/* eslint-disable no-undef */
/* eslint-disable node/no-extraneous-require */
const nock = require('nock')
const {expect, test} = require('@oclif/test')
const { ux: cli } = require('@contentstack/cli-utilities');

const { configHandler } = require('@contentstack/cli-utilities');
const dummyConfig = configHandler
const store = require('../../src/util/store.js')

const deliveryToken = 'dummyDeliveryToken'

const syncEntriesResponse = require('../dummy/unpublish_response')
const bulkUnpublishResponse = require('../dummy/bulkUnpublishResponse')

const bulkUnpublishLog = '1587758242717.bulkUnpublish.error'

describe('unpublish', () => {
  const mockedlog = () => { }

  beforeEach(() => {
    console.log = mockedlog

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

    // for unpublish entries
    nock(dummyConfig.get('apiEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
        'Content-Type': 'application/json',
      },
    })
    .post(/content_types\/([a-zA-Z0-9]*)\/entries\/([a-zA-Z0-9]*)\/unpublish/)
    .reply(200, bulkUnpublishResponse)

    // for unpublish assets
    nock(dummyConfig.get('apiEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
        'Content-Type': 'application/json',
      },
    })
    .post(/assets\/([a-zA-Z0-9]*)\/unpublish/)
    .reply(200, bulkUnpublishResponse)

    // for bulk unpublish
    nock(dummyConfig.get('cdnEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
        'Content-Type': 'application/json',
      },
    })
    .post(`/v${dummyConfig.get('apiVersion')}/bulk/unpublish`)
    .reply(200, bulkUnpublishResponse)

    // nock(dummyConfig.get('cdnEndPoint'), {
    //   reqheaders: {
    //     api_key: dummyConfig.get('apikey'),
    //     access_token: deliveryToken,
    //   },
    // })
    //   .post(`/v${dummyConfig.get('apiVersion')}/bulk/unpublish`)
    //   .reply(200, bulkUnpublishResponse);

    // nock(dummyConfig.get('cdnEndPoint'), {
    //   reqheaders: {
    //     api_key: dummyConfig.get('apikey'),
    //     access_token: deliveryToken,
    //   },
    // })
    //   .post(`/v${dummyConfig.get('apiVersion')}/bulk/unpublish`)
    //   .reply(200, bulkUnpublishResponse);
  })

  test
  .stub(cli, 'prompt', () => async () => deliveryToken)
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(store, 'updateMissing', (key, flags) => flags)
  .stderr({print: true})
  .command(['cm:bulk-publish:unpublish'])
  .catch(error => {
    expect(error.message).to.contain('Environment, ContentType is required for processing this command. Please check --help for more details')
  })
  .it('runs unpublish command without any flags')

  test
  .stub(cli, 'prompt', () => async () => deliveryToken)
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(store, 'updateMissing', (key, flags) => flags)
  .stdout({print: true})
  .command(['cm:bulk-publish:unpublish', '-e', 'dummyEnvironment', '-t', 'asset_published', 'entry_published', '-c', 'dummyContentType'])
  .it('runs unpublish with environment', ctx => {

  })

  test
  .stub(cli, 'prompt', () => async () => deliveryToken)
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(store, 'updateMissing', (key, flags) => flags)
  .stdout({print: true})
  .command(['cm:bulk-publish:unpublish', '-e', 'dummyEnvironment', '-t', 'asset_published', 'entry_published', '-c', 'dummyContentType', '--no-bulkUnpublish'])
  .it('runs hello --name jeff', ctx => {
    // expect(ctx.stdout).to.contain('hello jeff')
  })

  test
  .stub(cli, 'prompt', () => async () => deliveryToken)
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(store, 'updateMissing', (key, flags) => flags)
  .stdout({print: true})
  .command(['cm:bulk-publish:unpublish', '-r', bulkUnpublishLog])
  .it('runs hello --name jeff', ctx => {
    // expect(ctx.stdout).to.contain('hello jeff')
  })

  test
  .stub(cli, 'prompt', () => async () => deliveryToken)
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(store, 'updateMissing', (key, flags) => flags)
  .stdout({print: true})
  .command(['cm:bulk-publish:unpublish', '-r', bulkUnpublishLog, '--no-bulkUnpublish'])
  .it('runs hello --name jeff', ctx => {
    // expect(ctx.stdout).to.contain('hello jeff')
  })
})
