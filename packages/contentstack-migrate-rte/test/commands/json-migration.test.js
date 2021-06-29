const {expect, test} = require('@oclif/test')
const sinon = require('sinon')
const nock = require('nock')
const {cli} = require('cli-ux')
const defaultConfig = require('../dummy/defaultConfig.json')
const {getToken, getContentType, getEntries, getExpectedOutput, getGlobalField} = require('../utils')
const omitDeep = require('omit-deep-lodash')
const {isEqual} = require('lodash')
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
  .command(['cm:stack:entries:migrate-rte', '-a', 'test1', '-c', 'contenttypewithsinglerte', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('User aborted the command.')
  })
  .it('deny config confirmation')

  test
  .stub(cli, 'confirm', () => async () => true)
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-p', './test/dummy/config/configWithEmptyPath.json', '-y'])
  .catch(error => {
    expect(error.message).to.contain('No value provided for the "paths" property in config.')
  })
  .it('throw error on Empty paths')

  test
  .stub(cli, 'confirm', () => async () => true)
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-p', './test/dummy/config/invalidConfig.json', '-y'])
  .catch(error => {
    expect(error.message).to.contain('Invalid key type. alias must be of string type(s).')
  })
  .it('throw error on invalid config type')

  test
  .stub(cli, 'confirm', () => async () => true)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-c', 'contenttypewithsinglerte', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('Config is mandatory while defining config.')
  })
  .it('throw error on config without alias property')

  test
  .stub(cli, 'confirm', () => async () => true)
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-a', 'invalidAlias', '-c', 'contenttypewithsinglerte', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('Invalid alias provided for the management token.')
  })
  .it('throw error on invalidAlias')

  test
  .stub(cli, 'confirm', () => async () => true)
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-p', './test/dummy/config/configWithInvalidPath.json', '-y'])
  .catch(error => {
    expect(error.message).to.contain('The specified path to config file does not exist.')
  })
  .it('throw error on invalid config file')
})

describe('Content Type with Single RTE Field of Single Type', () => {
  let token = getToken('test1')
  beforeEach(() => {
    nock(`${defaultConfig.apiEndpoint}`, {
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

    nock(`${defaultConfig.apiEndpoint}`, {
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
    })
    .reply(200, uri => {
      var match = uri.match(/\/v3\/content_types\/((\w)*)\/entries/)
      return getEntries(match[1])
    })

    nock(`${defaultConfig.apiEndpoint}`, {
      reqheaders: {
        api_key: token.apiKey,
        authorization: token.token,
      },
    })
    .persist()
    .put(/\/v3\/content_types\/((\w)*)\/entries/)
    .reply((uri, body) => {
      let match = uri.match(/\/v3\/content_types\/((\w)*)\/entries\/((\w)*)/)
      let responseModified = omitDeep(body, ['uid'])
      let expectedResponse = omitDeep(getExpectedOutput(match[1], match[3]), ['uid'])
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
  .command(['cm:stack:entries:migrate-rte', '-p', './test/dummy/config/config.json', '-y'])
  .it('execute using config file', ctx => {
    expect(ctx.stdout).to.contain('Updated 1 ContentType(s) and 2 Entries')
  })

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-a', 'test1', '-c', 'contenttypewithsinglerte', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-d', '50'])
  .it('execute using flags', ctx => {
    expect(ctx.stdout).to.contain('Updated 1 ContentType(s) and 2 Entries')
  })

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-a', 'test1', '-c', 'contenttypewithsinglerte', '-h', 'rich_text_editor.invalidPath', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The specified path to invalidPath HTML RTE does not exist.')
  }).it('throw error on invalid html rte path')

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-a', 'test1', '-c', 'contenttypewithinvalidhtmlrteschema', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The specified path to rich_text_editor HTML RTE does not exist.')
  })
  .it('throw error on invalid html rte field schema')

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-a', 'test1', '-c', 'contenttypewithinvalidjsonrteschema', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The specified path to supercharged_rte JSON RTE does not exist.')
  })
  .it('throw error on invalid json rte field schema')
  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-a', 'test1', '-c', 'contenttypewithsinglerte', '-h', 'rich_text_editor', '-j', 'supercharged_rte.invalidPath', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The specified path to invalidPath JSON RTE does not exist.')
  }).it('throw error on invalid json rte path')

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-p', './test/dummy/config/configForInvalidContentType.json', '-y'])
  .catch(error => {
    expect(error.message).to.contain('Cannot convert "Multiple" type HTML RTE to "Single" type JSON RTE.')
  })
  .it('throw error on migration of Mutiple Html rte with single Json rte')

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-a', 'test1', '-c', 'contenttypewithemptyschema', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The contenttypewithemptyschema content type contains an empty schema.')
  })
  .it('throw error on content type with empty schema')

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-a', 'test1', '-c', 'contenttypedifferentlevelrte', '-h', 'group.rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('To complete migration, HTML RTE and JSON RTE should be present at the same field depth level.')
  })
  .it('throw error on different level rte migration')

  test
  .stub(cli, 'confirm', () => async () => true)
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-a', 'test1', '-c', 'invalidContentType', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The Content Type \'invalidContentType\' was not found. Please try again.')
  })
  .it('throw error on invalid contenttype')

  test
  .stub(cli, 'confirm', () => async () => true)
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-a', 'test1', '-c', 'contenttypewithentryupdateerror', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .it('notify user on entry update failed', ctx => {
    expect(ctx.stdout).to.contain('Faced issue while migrating some entries,"blta9b16ac2827c54ed"')
  })
})
describe('Global Field Migration', () => {
  let token = getToken('test1')
  beforeEach(() => {
    nock(`${defaultConfig.apiEndpoint}`, {
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
  .command(['cm:stack:entries:migrate-rte', '-p', './test/dummy/config/configForGlobalField.json', '-y'])
  .it('execute using config file', ctx => {
    expect(ctx.stdout).to.contain('Updated 2 ContentType(s) and 2 Entries')
  })

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-a', 'test1', '-c', 'globalfieldwithemptycontenttype', '-g', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('globalfieldformigration Global field is not referred in any content type.')
  })
  .it('throw error on global field with empty referred content_types')

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-a', 'test1', '-c', 'globalfieldwithinvalidcontenttype', '-g', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The contenttypewithemptyschema content type referred in globalfieldformigration contains an empty schema.')
  })
  .it('throw error on global field with invalid content_type')

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-a', 'test1', '-c', 'globalfieldwithemptyschema', '-g', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The globalfieldwithemptyschema Global field contains an empty schema.')
  })
  .it('throw error on global field with empty schema')

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-a', 'test1', '-c', 'globalfieldwithemptyschemacontenttype', '-g', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The contenttypewithemptyschema content type referred in globalfieldwithemptyschemacontenttype contains an empty schema.')
  })
  .it('throw error on global field with empty schema content_type')

  test
  .stub(cli, 'confirm', () => async () => 'yes')
  .stub(command, 'getToken', getTokenCallback)
  .stdout()
  .command(['cm:stack:entries:migrate-rte', '-a', 'test1', '-c', 'invalidUidGlobalfield', '-g', '-h', 'rich_text_editor', '-j', 'supercharged_rte', '-y', '-d', '50'])
  .catch(error => {
    expect(error.message).to.contain('The Global Field \'invalidUidGlobalfield\' was not found. Please try again.')
  })
  .it('throw error on invalid global_field uid')
})

describe('ContentType with single rte of multiple type', () => {
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
  .command(['cm:stack:entries:migrate-rte', '-p', './test/dummy/config/configForMultipleRte.json', '-y'])
  .it('execute using config file', ctx => {
    expect(ctx.stdout).to.contain('Updated 1 ContentType(s) and 1 Entries')
  })
})

describe('ContentType with Single RTE inside modular block', () => {
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
  .command(['cm:stack:entries:migrate-rte',
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
    expect(ctx.stdout).to.contain('Updated 1 ContentType(s) and 1 Entries')
  })
})

describe('ContentType with Single RTE of type multiple inside group', () => {
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
  .command(['cm:stack:entries:migrate-rte',
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
    expect(ctx.stdout).to.contain('Updated 1 ContentType(s) and 1 Entries')
  })
})

describe('ContentType with Single RTE inside group of type multiple', () => {
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
  .command(['cm:stack:entries:migrate-rte',
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
    expect(ctx.stdout).to.contain('Updated 1 ContentType(s) and 1 Entries')
  })
})
