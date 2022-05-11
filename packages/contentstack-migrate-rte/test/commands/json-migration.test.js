const {expect, test} = require('@oclif/test')
const sinon = require('sinon')
const nock = require('nock')
const {cli} = require('cli-ux')
const qs = require('querystring')

const {getToken, getContentType, getEntries, getExpectedOutput, getGlobalField, getEntriesOnlyUID, getEntry} = require('../utils')
const omitDeep = require('omit-deep-lodash')
const {isEqual, cloneDeep} = require('lodash')
const {command} = require('../../src/lib/util')

describe('Migration Config validation', () => {
  const getTokenCallback = sinon.stub()
  getTokenCallback.withArgs('test1').returns({
    token: 'cs2f6c60355c432bc95972e068',
    apiKey: 'blt1f36f82ccc346cc5',
    type: 'management',
  }).withArgs('invalidAlias').throws("Token with alias 'invalidAlias' was not found")

  test
  .stub(cli, 'confirm', () => async () => false)
  .stdout()
  .command(['cm:migrate-rte', '-a', 'test1', '-c', 'contenttypewithsinglerte', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('User aborted the command.')
  })
  .it('deny config confirmation')

  test
  .stub(cli, 'confirm', () => async () => true)
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-p', './test/dummy/config/configWithEmptyPath.json', '-y'])
  .catch(error => {
    expect(error.message).to.contain('No value provided for the "paths" property in config.')
  })
  .it('throw error on Empty paths')

  test
  .stub(cli, 'confirm', () => async () => true)
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-p', './test/dummy/config/invalidConfig.json', '-y'])
  .catch(error => {
    expect(error.message).to.contain('Invalid key type. alias must be of string type(s).')
  })
  .it('throw error on invalid config type')

  test
  .stub(cli, 'confirm', () => async () => true)
  .stdout()
  .command(['cm:migrate-rte', '-c', 'contenttypewithsinglerte', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('Config is mandatory while defining config.')
  })
  .it('throw error on config without alias property')

  test
  .stub(cli, 'confirm', () => async () => true)
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-a', 'invalidAlias', '-c', 'contenttypewithsinglerte', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('Invalid alias provided for the management token.')
  })
  .it('throw error on invalidAlias')

  test
  .stub(cli, 'confirm', () => async () => true)
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-p', './test/dummy/config/configWithInvalidPath.json', '-y'])
  .catch(error => {
    expect(error.message).to.contain('The specified path to config file does not exist.')
  })
  .it('throw error on invalid config file')
})
describe('Content Type with Single RTE Field of Single Type', function(){
  this.timeout(1000000);
  let token = getToken('test1')
  beforeEach(() => {
    nock(`${command.cmaAPIUrl}`, {
      reqheaders: {
        api_key: token.apiKey,
        authorization: token.token,
      },
    }).persist()
    .get(/\/v3\/content_types\/(\w)*/)
    .query({
      include_global_field_schema: true,
    })
    .reply(uri => {
      var match = uri.match(/\/v3\/content_types\/((\w)*)/)
      return getContentType(match[1])
    })
    nock(`${command.cmaAPIUrl}`, {
      reqheaders: {
        api_key: token.apiKey,
        authorization: token.token,
      },
    })
    .persist()
    .get(/\/v3\/content_types\/((\w)*)\/entries/)
    .query({
      include_count: true,
      skip: 0,
      limit: 100,
      "only[BASE][]":"uid"
    })
    .reply(200, uri => {
      var match = uri.match(/\/v3\/content_types\/((\w)*)\/entries/)
      const entries = getEntriesOnlyUID(match[1])
      return entries
    })

    nock(`${command.cmaAPIUrl}`, {
      reqheaders: {
        api_key: token.apiKey,
        authorization: token.token,
      },
    })
      .persist()
      .get(/\/v3\/content_types\/((\w)*)\/entries/)
      .query(true)
      .reply(200, function(uri){
        let query = this.req.options.search
        query = query.substring(1)
        let locale = undefined
        query = qs.parse(query)
        if (query.locale) {
          locale = query.locale
        }
        var match = uri.match(/\/v3\/content_types\/((\w)*)\/entries/);
        return getEntries(match[1], locale);
      })
    // mock get locale
    nock(`${command.cmaAPIUrl}`, {
      reqheaders: {
        api_key: token.apiKey,
        authorization: token.token,
      },
    })
    .persist()
    .get(/\/v3\/content_types\/((\w)*)\/entries\/((\w)*)\/locale/)
    .query({
      deleted: false
    })
    .reply(200, uri => {
      let match = uri.match(/\/v3\/content_types\/((\w)*)\/entries\/((\w)*)/)
      return {
        "locales": [
            {
                "code": "en-in"
            },
            {
                "code": "en-us"
            }
        ]
    }
    })
    
    // mock single entry fetch
    nock(`${command.cmaAPIUrl}`, {
      reqheaders: {
        api_key: token.apiKey,
        authorization: token.token,
      },
    })
    .persist()
    .get(/\/v3\/content_types\/((\w)*)\/entries\/((\w)*)/)
    .query(true)
    .reply(200, uri => {
      let match = uri.match(/\/v3\/content_types\/((\w)*)\/entries\/((\w)*)\?locale=((\w|-)*)/)
      return getEntry(match[1], match[3], match[5])
    })
    

    nock(`${command.cmaAPIUrl}`, {
      reqheaders: {
        api_key: token.apiKey,
        authorization: token.token,
      },
    })
    .persist()
    .put(/\/v3\/content_types\/((\w)*)\/entries/)
    .reply((uri, body) => {
      let match = uri.match(/\/v3\/content_types\/((\w)*)\/entries\/((\w)*)\?locale=((\w|-)*)/)
      let responseModified = cloneDeep(omitDeep(body, ['uid']))
      let expectedResponse = omitDeep(getExpectedOutput(match[1], match[3],match[5]), ['uid'])
      expectedResponse = cloneDeep(expectedResponse)
      if (isEqual(responseModified, expectedResponse)) {
        return [
          200, {
            notice: 'Entry updated successfully.',
            entry: {},
          },
        ]
      }
      return [
        400,
        {
          notice: 'Update Failed.',
          error_message: 'Entry update failed.',
          entry: {},
        },
      ]
    })
  })
  const getTokenCallback = sinon.stub()
  getTokenCallback.withArgs('test1').returns({
    token: 'cs2f6c60355c432bc95972e068',
    apiKey: 'blt1f36f82ccc346cc5',
    type: 'management',
  })

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-p', './test/dummy/config/config.json', '-y'])
  .it('execute using config file', ctx => {
    expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 2 Entrie(s)')
  })

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-p', './test/dummy/config/config-locale.json', '-y'])
  .it('execute using config file w/ locale', ctx => {
    expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 1 Entrie(s)')
  })

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-p', './test/dummy/config/config-locale-2.json', '-y'])
  .it('execute using config file w/ locale', ctx => {
    expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 3 Entrie(s)')
  })

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-a', 'test1', '-c', 'contenttypewithsinglerte', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-d', '50'])
  .it('execute using flags', ctx => {
    expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 2 Entrie(s)')
  })

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-a', 'test1', '-c', 'contenttypewithsinglerte', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-d', '50', '-l','en-in'])
  .it('execute using flags w/ locale', ctx => {
    expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 1 Entrie(s)')
  })
  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-a', 'test1', '-c', 'contenttypewithsinglerte', '-h', 'rich_text_editor.invalidPath', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The specified path to invalidPath HTML RTE does not exist.')
  }).it('throw error on invalid html rte path')

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-a', 'test1', '-c', 'contenttypewithinvalidhtmlrteschema', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The specified path to rich_text_editor HTML RTE does not exist.')
  })
  .it('throw error on invalid html rte field schema')

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-a', 'test1', '-c', 'contenttypewithinvalidjsonrteschema', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The specified path to supercharged_rte JSON RTE does not exist.')
  })
  .it('throw error on invalid json rte field schema')
  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-a', 'test1', '-c', 'contenttypewithsinglerte', '-h', 'rich_text_editor', '-j', 'supercharged_rte.invalidPath', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The specified path to invalidPath JSON RTE does not exist.')
  }).it('throw error on invalid json rte path')

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-p', './test/dummy/config/configForInvalidContentType.json', '-y'])
  .catch(error => {
    expect(error.message).to.contain('Cannot convert "Multiple" type HTML RTE to "Single" type JSON RTE.')
  })
  .it('throw error on migration of Mutiple Html rte with single Json rte')

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-a', 'test1', '-c', 'contenttypewithemptyschema', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The contenttypewithemptyschema content type contains an empty schema.')
  })
  .it('throw error on content type with empty schema')

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-a', 'test1', '-c', 'contenttypedifferentlevelrte', '-h', 'group.rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('To complete migration, HTML RTE and JSON RTE should be present at the same field depth level.')
  })
  .it('throw error on different level rte migration')

  test
  .stub(cli, 'confirm', () => async () => true)
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-a', 'test1', '-c', 'invalidContentType', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The Content Type \'invalidContentType\' was not found. Please try again.')
  })
  .it('throw error on invalid contenttype')

  test
  .stub(cli, 'confirm', () => async () => true)
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-a', 'test1', '-c', 'contenttypewithentryupdateerror', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .it('notify user on entry update failed', ctx => {
    expect(ctx.stdout).to.contain(`Faced issue while migrating some entrie(s) for "contenttypewithentryupdateerror" Content-type in "en-us" locale,"blta9b16ac2827c54ed, blta9b16ac2827c54e1"`)
  })
})
describe('Global Field Migration', () => {
  let token = getToken('test1')
  beforeEach(() => {
    nock(`${command.cmaAPIUrl}`, {
      reqheaders: {
        api_key: token.apiKey,
        authorization: token.token,
      },
    }).persist()
    .get(/\/v3\/global_fields\/([a-zA-Z_])*/)
    .query({
      include_content_types: true,
    })
    .reply(uri => {
      var match = uri.match(/\/v3\/global_fields\/(([a-zA-Z_])*)/)
      return getGlobalField(match[1])
    })
  })

  const getTokenCallback = sinon.stub()
  getTokenCallback.withArgs('test1').returns({
    token: 'cs2f6c60355c432bc95972e068',
    apiKey: 'blt1f36f82ccc346cc5',
    type: 'management',
  })
  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-p', './test/dummy/config/configForGlobalField.json', '-y'])
  .it('execute using config file', ctx => {
    expect(ctx.stdout).to.contain('Updated 2 Content Type(s) and 2 Entrie(s)')
  })

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-a', 'test1', '-c', 'globalfieldwithemptycontenttype', '-g', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('globalfieldformigration Global field is not referred in any content type.')
  })
  .it('throw error on global field with empty referred content_types')

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-a', 'test1', '-c', 'globalfieldwithinvalidcontenttype', '-g', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The contenttypewithemptyschema content type referred in globalfieldformigration contains an empty schema.')
  })
  .it('throw error on global field with invalid content_type')

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-a', 'test1', '-c', 'globalfieldwithemptyschema', '-g', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The globalfieldwithemptyschema Global field contains an empty schema.')
  })
  .it('throw error on global field with empty schema')

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-a', 'test1', '-c', 'globalfieldwithemptyschemacontenttype', '-g', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The contenttypewithemptyschema content type referred in globalfieldwithemptyschemacontenttype contains an empty schema.')
  })
  .it('throw error on global field with empty schema content_type')

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-a', 'test1', '-c', 'invalidUidGlobalfield', '-g', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The Global Field \'invalidUidGlobalfield\' was not found. Please try again.')
  })
  .it('throw error on invalid global_field uid')
})

describe('Content Type with single rte of multiple type', () => {
  const getTokenCallback = sinon.stub()
  getTokenCallback.withArgs('test1').returns({
    token: 'cs2f6c60355c432bc95972e068',
    apiKey: 'blt1f36f82ccc346cc5',
    type: 'management',
  })
  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte', '-p', './test/dummy/config/configForMultipleRte.json', '-y'])
  .it('execute using config file', ctx => {
    expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 1 Entrie(s)')
  })
})

describe('Content Type with Single RTE inside modular block', () => {
  const getTokenCallback = sinon.stub()
  getTokenCallback.withArgs('test1').returns({
    token: 'cs2f6c60355c432bc95972e068',
    apiKey: 'blt1f36f82ccc346cc5',
    type: 'management',
  })
  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte',
    '-a',
    'test1',
    '-c',
    'contenttypewithmodularblock',
    '-h',
    'modular_blocks.test1.rich_text_editor',
    '-j',
    'modular_blocks.test1.supercharged_rte',
    '-y',
    '-d',
    '50'])
  .it('execute using Flags', ctx => {
    expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 1 Entrie(s)')
  })
})

describe('Content Type with Single RTE of type multiple inside group', () => {
  const getTokenCallback = sinon.stub()
  getTokenCallback.withArgs('test1').returns({
    token: 'cs2f6c60355c432bc95972e068',
    apiKey: 'blt1f36f82ccc346cc5',
    type: 'management',
  })
  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte',
    '-a',
    'test1',
    '-c',
    'contenttypewithgroup',
    '-h',
    'group.rich_text_editor',
    '-j',
    'group.supercharged_rte',
    '-y',
    '-d',
    '50'])
  .it('execute using Flags', ctx => {
    expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 1 Entrie(s)')
  })
})

describe('Content Type with Single RTE inside group of type multiple', () => {
  const getTokenCallback = sinon.stub()
  getTokenCallback.withArgs('test1').returns({
    token: 'cs2f6c60355c432bc95972e068',
    apiKey: 'blt1f36f82ccc346cc5',
    type: 'management',
  })
  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte',
    '-a',
    'test1',
    '-c',
    'contenttypewithmultiplegroup',
    '-h',
    'group.rich_text_editor',
    '-j',
    'group.supercharged_rte',
    '-y',
    '-d',
    '50'])
  .it('execute using Flags', ctx => {
    expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 1 Entrie(s)')
  })
})

describe('Content Type with multiple file field', () => {
  const getTokenCallback = sinon.stub()
  getTokenCallback.withArgs('test1').returns({
    token: 'cs2f6c60355c432bc95972e068',
    apiKey: 'blt1f36f82ccc346cc5',
    type: 'management',
  })
  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:migrate-rte',
    '-a',
    'test1',
    '-c',
    'contenttypewithfilefield',
    '-h',
    'rich_text_editor',
    '-j',
    'json_rte',
    '-y',
    '-d',
    '50'])
  .it('execute using Flags', ctx => {
    expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 1 Entrie(s)')
  })
})
