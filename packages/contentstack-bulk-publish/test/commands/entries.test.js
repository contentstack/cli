/* eslint-disable no-undef */
/* eslint-disable camelcase */
/* eslint-disable no-console */
const {expect, test} = require('@oclif/test')
const nock = require('nock')
const stack = require('../../src/util/client.js').getStack({apikey: "dummyApiKey", managementTokenAlias: "dummyManagementTokenAlias"})
const { cliux, configHandler } = require('@contentstack/cli-utilities');
const dummyConfig = configHandler
const store = require('../../src/util/store.js')

const {setConfig} = require('../../src/producer/publish-entries')
const bulkentriesResponse1 = require('../dummy/bulkentries1')
const bulkentriesResponse2 = require('../dummy/bulkentries2')
const entryPublishResponse = require('../dummy/entrypublished')
const contentTypesResponse = require('../dummy/bulkContentTypeResponse')

const bulkPublishEntriesLog = '1587758242717.bulkPublishEntries.error'

console.log('dummyConfig', JSON.stringify(dummyConfig))

describe('entries', () => {
  // const mockedlog = () => {}

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
    .post(/\/content_types\/dummyContentType\/entries\/([a-zA-Z0-9]*)\/publish/, {
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
    .reply(200, {
      content_types: [
      {
        created_at: '2019-08-16T08:18:56.914Z',
        updated_at: '2019-08-16T08:18:58.736Z',
        title: 'dummyContentType',
        uid: 'dummyContentType',
      },
      ],
    })

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
  .stub(cliux, 'confirm', () => async () => 'yes')
  .stub(this.config.userConfig, 'getRegion', () => {
    return {
      cma: "dummyCma", cda: "dummyCda", name: "dummyName"
    }
  })
  .stdout({print: true})
  .command(['cm:bulk-publish:entries', '-c', 'dummyContentType', '-l', 'en-us', '-e', 'dummyEnvironment', '--no-bulkPublish', '-k', 'dummyApiKey', '-i', 'dummyManagementTokenAlias', '-y'])
  .it('runs entries command without bulk publish', ctx => {
    expect(ctx.stdout).to.contain('published')
  })

  // test
  // .stub(stack, 'contentType', () => {
  //   return {
  //     entry: function() {
  //       return {
  //         query: function() {
  //           return {
  //             find: function() {
  //               return Promise.resolve(bulkentriesResponse1)
  //             }
  //           }
  //         },
  //         publish: function() {
  //           return Promise.resolve(entryPublishResponse)
  //         }
  //       }
  //     }
  //   }
  // })
  // .stub(cli, 'confirm', () => async () => 'yes')
  // .stdout()
  // .command(['cm:bulk-publish:entries', '-c', 'dummyContentType', '-l', 'en-us', '-e', 'dummyEnvironment'])
  // .it('runs entries command with bulk publish', ctx => {
  //   // expect(ctx.stdout).to.contain('hello jeff')
  //   // console.log(ctx.stdout)
  // })

  // test
  // .stub(stack, 'contentType', () => {
  //   return {
  //     entry: function() {
  //       return {
  //         query: function() {
  //           return {
  //             find: function() {
  //               return Promise.resolve(bulkentriesResponse1)
  //             }
  //           }
  //         },
  //         publish: function() {
  //           return Promise.resolve(entryPublishResponse)
  //         }
  //       }
  //     }
  //   }
  // })
  // .stub(cli, 'confirm', () => async () => 'yes')
  // .stdout()
  // .command(['cm:bulk-publish:entries', '-c', 'dummyContentType', '-l', 'en-us', '-e', 'dummyEnvironment'])
  // .it('runs entries command with bulk publish', ctx => {
  //   // expect(ctx.stdout).to.contain('hello jeff')
  //   console.log(ctx.stdout)
  // })

  // test
  // .stub(stack, 'contentType', () => {
  //   return {
  //     entry: function() {
  //       return {
  //         query: function() {
  //           return {
  //             find: function() {
  //               return Promise.resolve(bulkentriesResponse1)
  //             }
  //           }
  //         },
  //         publish: function() {
  //           return Promise.resolve(entryPublishResponse)
  //         }
  //       }
  //     }
  //   }
  // })
  // .stub(cli, 'confirm', () => async () => 'yes')
  // .stub(store, 'updateMissing', (key, flags) => flags)
  // .stderr()
  // .command(['cm:bulk-publish:entries'])
  // .catch(error => {
  //   expect(error.message).to.contain('Content Types')
  // })
  // .it('runs entries command without any parameters')

  // test
  // .stub(stack, 'contentType', () => {
  //   return {
  //     entry: function() {
  //       return {
  //         query: function() {
  //           return {
  //             find: function() {
  //               return Promise.resolve(bulkentriesResponse1)
  //             }
  //           }
  //         },
  //         publish: function() {
  //           return Promise.resolve(entryPublishResponse)
  //         }
  //       }
  //     }
  //   }
  // })
  // .stub(cli, 'confirm', () => async () => 'yes')
  // .stderr()
  // .command(['cm:bulk-publish:entries', '-a', '-c', 'dummyContentType'])
  // .catch(error => {
  //   expect(error.message).to.contain('contentTypes when publishAllContentTypes')
  // })
  // .it('runs entries command with publishAllContentTypes set and content type specified')

  // test
  // .stub(stack, 'contentType', () => {
  //   return {
  //     entry: function() {
  //       return {
  //         query: function() {
  //           return {
  //             find: function() {
  //               return Promise.resolve(bulkentriesResponse1)
  //             }
  //           }
  //         },
  //         publish: function() {
  //           return Promise.resolve(entryPublishResponse)
  //         }
  //       }
  //     }
  //   }
  // })
  // .stub(cli, 'confirm', () => async () => 'yes')
  // .stdout()
  // .command(['cm:bulk-publish:entries', '-a', '-l', 'en-us', '-e', 'dummyEnvironment'])
  // .it('runs entries command with bulk publish', ctx => {
  //   // expect(ctx.stdout).to.contain('hello jeff')
  //   console.log(ctx.stdout)
  // })

  // test
  // .stub(stack, 'contentType', () => {
  //   return {
  //     entry: function() {
  //       return {
  //         query: function() {
  //           return {
  //             find: function() {
  //               return Promise.resolve(bulkentriesResponse1)
  //             }
  //           }
  //         },
  //         publish: function() {
  //           return Promise.resolve(entryPublishResponse)
  //         }
  //       }
  //     }
  //   }
  // })
  // .stub(cli, 'confirm', () => async () => 'yes')
  // .stdout()
  // .command(['cm:bulk-publish:entries', '-r', bulkPublishEntriesLog])
  // .it('runs entries command with bulk publish', ctx => {
  //   // expect(ctx.stdout).to.contain('hello jeff')
  //   console.log(ctx.stdout)
  // })

  // test
  // .stub(stack, 'contentType', () => {
  //   return {
  //     entry: function() {
  //       return {
  //         query: function() {
  //           return {
  //             find: function() {
  //               return Promise.resolve(bulkentriesResponse1)
  //             }
  //           }
  //         },
  //         publish: function() {
  //           return Promise.resolve(entryPublishResponse)
  //         }
  //       }
  //     }
  //   }
  // })
  // .stub(cli, 'confirm', () => async () => 'yes')
  // .stdout()
  // .command(['cm:bulk-publish:entries', '-r', bulkPublishEntriesLog, '-b'])
  // .it('runs entries command with bulk publish', ctx => {
  //   // expect(ctx.stdout).to.contain('hello jeff')
  //   console.log(ctx.stdout)
  // })
})
