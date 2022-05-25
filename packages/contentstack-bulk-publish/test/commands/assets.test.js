const nock = require('nock')
const {expect, test} = require('@oclif/test')
const { cliux, configHandler } = require('@contentstack/cli-utilities');

const store = require('../../src/util/store.js')
const stack = require('../../src/util/client.js').stack

const bulkassetResponse1 = require('../dummy/bulkasset1')
const bulkassetResponse2 = require('../dummy/bulkasset2')
const assetPublishResponse = require('../dummy/assetpublished')

const dummyConfig = configHandler
const bulkPublishAssetsLog = '1587758242717.bulkPublishAssets.error'

describe('assets', () => {
  // const mockedlog = () => {}

  beforeEach(() => {
    // console.log = mockedlog
    nock(dummyConfig.get('apiEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
    .get(`/v${dummyConfig.get('apiVersion')}/assets`)
    .query({
      folder: 'cs_root',
      include_count: true,
      skip: 0,
      include_folders: true,
      include_publish_details: true,
    })
    .reply(200, bulkassetResponse1)

    nock(dummyConfig.get('apiEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
    .get(`/v${dummyConfig.get('apiVersion')}/assets`)
    .query({
      folder: 'cs_root',
      include_count: true,
      skip: 2,
      include_folders: true,
      include_publish_details: true,
    })
    .reply(200, bulkassetResponse2)

    nock(dummyConfig.get('cdnEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
    .post(`/v${dummyConfig.get('apiVersion')}/bulk/publish`)
    .reply(200, assetPublishResponse)

    nock(dummyConfig.get('apiEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
    .get(`/v${dummyConfig.get('apiVersion')}/assets`)
    .query({
      folder: 'cs_root',
      include_count: true,
      skip: 3,
      include_folders: true,
      include_publish_details: true,
    })
    .reply(200, bulkassetResponse2)

    // nock(dummyConfig.get('cdnEndPoint'), {
    //   reqheaders: {
    //     api_key: dummyConfig.get('apikey'),
    //     authorization: dummyConfig.get('manageToken'),
    //   },
    // })
    //   .post(`/v${dummyConfig.get('apiVersion')}/bulk/publish`, {
    //     assets: [{
    //       uid: 'dummyAssetId',
    //     }, {
    //       uid: 'dummyAssetId2',
    //     }],
    //     locales: ['en-us'],
    //     environments: ['dummyEnvironment'],
    //   })
    //   .replyWithError('Some Error');
  })

  test
  .stub(stack, 'asset', () => {
    return {
      query: function() {
        return {
          find: function() {
            return Promise.resolve(bulkassetResponse1)
          }
        }
      },
      publish: function() {
        return Promise.resolve(assetPublishResponse)
      }
    }
  })
  .stub(cliux, 'confirm', () => async () => 'yes')
  .stub(store, 'updateMissing', (key, flags) => flags)
  .stderr()
  .command(['cm:bulk-publish:assets'])
  .catch(error => {
    expect(error.message).to.contain('Environments are required for processing this command. Please check --help for more details')
  })
  .it('runs assets command without parameters')

  test
  .stub(stack, 'asset', () => {
    return {
      query: function() {
        return {
          find: function() {
            return Promise.resolve(bulkassetResponse1)
          }
        }
      },
      publish: function() {
        return Promise.resolve(assetPublishResponse)
      }
    }
  })
  .stub(cliux, 'confirm', () => async () => 'yes')
  .stdout({print: true})
  .command(['cm:bulk-publish:assets', '-e', 'dummyEnvironment'])
  .it('runs assets with environment', ctx => {
    // expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stub(stack, 'asset', () => {
    return {
      query: function() {
        return {
          find: function() {
            return Promise.resolve(bulkassetResponse1)
          }
        }
      },
      publish: function() {
        return Promise.resolve(assetPublishResponse)
      }
    }
  })
  .stub(cliux, 'confirm', () => async () => 'yes')
  .stdout()
  .command(['cm:bulk-publish:assets', '-e', 'dummyEnvironment', '--no-bulkPublish'])
  .it('runs assets with environment', ctx => {
    // expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stub(stack, 'asset', () => {
    return {
      query: function() {
        return {
          find: function() {
            return Promise.resolve(bulkassetResponse1)
          }
        }
      },
      publish: function() {
        return Promise.resolve(assetPublishResponse)
      }
    }
  })
  .stub(cliux, 'confirm', () => async () => 'yes')
  .stdout()
  .command(['cm:bulk-publish:assets', '--retryFailed', bulkPublishAssetsLog])
  .it('runs assets with retryFailed', ctx => {
    // expect(ctx.stdout).to.contain('hello jeff')
  })

  // test
  // .stdout()
  // .command(['cm:bulk-publish:assets', '--retryFailed', bulkPublishAssetsLog, '--no-bulkPublish'])
  // .it('runs assets with retryFailed', ctx => {
  //   // expect(ctx.stdout).to.contain('hello jeff')
  // })
})
