const {expect, test} = require('@oclif/test')
const nock = require('nock')

const stack = require('../../src/util/client.js').stack
const { cliux, configHandler } = require('@contentstack/cli-utilities');
const dummyConfig = configHandler
const store = require('../../src/util/store.js')

const entriesLogFileName = '1587758242717.PublishEntries.success'
const assetLogFileName = '1587956283100.PublishAssets.success'

const entryPublishResponse = require('../dummy/entrypublished')
const environmentsResponse = require('../dummy/environments')

const retryFailedLog = '1587758242717.revert.error'

describe('revert', () => {
  // const mockedlog = () => { }

  beforeEach(() => {
    // console.log = mockedlog

    nock(dummyConfig.get('apiEndPoint'), {
      reqheaders: {
        api_key: dummyConfig.get('apikey'),
        authorization: dummyConfig.get('manageToken'),
      },
    })
    .get(`/v${dummyConfig.get('apiVersion')}/environments`)
    .reply(200, environmentsResponse)

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
    .post(/\/content_types\/dummyContentType\/entries\/([a-zA-Z0-9]*)\/publish/)
    .reply(200, entryPublishResponse)
  })

  // test
  // .stub(cli, 'confirm', () => async () => 'yes')
  // .stub(store, 'updateMissing', (key, flags) => flags)
  // .stderr()
  // .command(['cm:bulk-publish:revert'])
  // .catch(error => {
  //   expect(error.message).to.contain('Logfile is required for processing this command. Please check --help for more details')
  // })
  // .it('runs hello')

  test
  .stub(stack, 'environment', () => {
    return {
      query: function() {
        return {
          find: function() {
            return Promise.resolve(environmentsResponse)
          }
        }
      }
    }
  })
  .stub(cliux, 'confirm', () => async () => 'yes')
  .stdout({print: true})
  .command(['cm:bulk-publish:revert', '-l', entriesLogFileName])
  .it('revert entries', ctx => {
    // stack.environment().query().find().then(res => {
    //   console.log(res.items.length)
    // })
    // console.log(stack.environment())
  })

  // test
  // .stdout()
  // .command(['cm:bulk-publish:revert', '-l', assetLogFileName])
  // .it('revert assets', ctx => {

  // })

  // test
  // .stdout()
  // .command(['cm:bulk-publish:revert', '-l', '1587758242717.PublishEntries.txt'])
  // .it('runs revert with a txt file', ctx => {

  // })

  // test
  // .stdout()
  // .command(['cm:bulk-publish:revert', '-l', '1587758242717.PublishEntries'])
  // .it('runs hello --name jeff', ctx => {

  // })

  // test
  // .stdout()
  // .command(['cm:bulk-publish:revert', '-l', '1587758242717.publishentries.success'])
  // .it('runs hello --name jeff', ctx => {

  // })

  // test
  // .stdout()
  // .command(['cm:bulk-publish:revert', '-r', retryFailedLog])
  // .it('runs hello --name jeff', ctx => {

  // })
})
