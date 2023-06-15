const { expect, test } = require('@oclif/test');
const sinon = require('sinon');
const qs = require('querystring');
const nock = require('nock');
const { cliux } = require('@contentstack/cli-utilities');
const {
  getToken,
  getContentType,
  getEntries,
  getExpectedOutput,
  getGlobalField,
  getEntriesOnlyUID,
  getEntry,
} = require('../utils');
const omitDeep = require('omit-deep-lodash');
const { isEqual, cloneDeep } = require('lodash');
const { command } = require('../../src/lib/util');

describe('Migration Config validation', () => {
  const getTokenCallback = sinon.stub();
  getTokenCallback
    .withArgs('test1')
    .returns({
      token: 'testManagementToken',
      apiKey: 'testApiKey',
      type: 'management',
    })
    .withArgs('invalidAlias')
    .throws("Token with alias 'invalidAlias' was not found");

  test
    .stub(cliux, 'confirm', () => false)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'contenttypewithsinglerte',
      '--html-path',
      'rich_text_editor',
      '--json-path',
      'supercharged_rte',
      '--delay',
      '50',
    ])
    .catch((error) => {
      expect(error.message).to.contain('User aborted the command.');
    })
    .it('deny config confirmation');

  test
    .stub(cliux, 'confirm', () => true)
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command(['cm:entries:migrate-html-rte', '--config-path', './test/dummy/config/configWithEmptyPath.json', '--yes'])
    .catch((error) => {
      expect(error.message).to.contain('No value provided for the "paths" property in config.');
    })
    .it('throw error on Empty paths');

  test
    .stub(cliux, 'confirm', () => true)
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command(['cm:entries:migrate-html-rte', '--config-path', './test/dummy/config/invalidConfig.json', '--yes'])
    .catch((error) => {
      expect(error.message).to.contain('Invalid key type. alias must be of string type(s).');
    })
    .it('throw error on invalid config type');

  test
    .stub(cliux, 'confirm', () => true)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--content-type',
      'contenttypewithsinglerte',
      '--html-path',
      'rich_text_editor',
      '--json-path',
      'supercharged_rte',
      '--delay',
      '50',
    ])
    .catch((error) => {
      expect(error.message).to.contain('alias is mandatory while defining config.');
    })
    .it('throw error on config without alias property');

  test
    .stub(cliux, 'confirm', () => true)
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'invalidAlias',
      '--content-type',
      'contenttypewithsinglerte',
      '--html-path',
      'rich_text_editor',
      '--json-path',
      'supercharged_rte',
      '--delay',
      '50',
    ])
    .catch((error) => {
      expect(error.message).to.contain('Invalid alias provided for the management token.');
    })
    .it('throw error on invalidAlias');

  test
    .stub(cliux, 'confirm', () => true)
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--config-path',
      './test/dummy/config/configWithInvalidPath.json',
      '--yes',
    ])
    .catch((error) => {
      expect(error.message).to.contain('The specified path to config file does not exist.');
    })
    .it('throw error on invalid config file');
});
describe('Content Type with Single RTE Field of Single Type', function () {
  this.timeout(1000000);
  let token = getToken('test1');
  beforeEach(() => {
    nock(`${command.cmaAPIUrl}`, {
      reqheaders: {
        api_key: token.apiKey,
        authorization: token.token,
      },
    })
      .persist()
      .get(/\/v3\/content_types\/(\w)*/)
      .query({
        include_global_field_schema: true,
      })
      .reply((uri) => {
        var match = uri.match(/\/v3\/content_types\/((\w)*)/);
        return getContentType(match[1]);
      });
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
        'only[Base][]': 'uid',
      })
      .reply(200, (uri) => {
        var match = uri.match(/\/v3\/content_types\/((\w)*)\/entries/);
        return getEntriesOnlyUID(match[1]);
      });

    nock(`${command.cmaAPIUrl}`, {
      reqheaders: {
        api_key: token.apiKey,
        authorization: token.token,
      },
    })
      .persist()
      .get(/\/v3\/content_types\/((\w)*)\/entries/)
      .query(true)
      .reply(200, function (uri) {
        let query = this.req.options.search;
        query = query.substring(1);
        let locale = undefined;
        query = qs.parse(query);
        if (query.locale) {
          locale = query.locale;
        }
        var match = uri.match(/\/v3\/content_types\/((\w)*)\/entries/);
        return getEntries(match[1], locale);
      });
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
        deleted: false,
      })
      .reply(200, () => {
        return {
          locales: [
            {
              code: 'en-in',
              localized: true,
            },
            {
              code: 'en-us',
            },
          ],
        };
      });

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
      .reply(200, (uri) => {
        const query = this.queries;
        let match = uri.match(/\/v3\/content_types\/((\w)*)\/entries\/((\w)*)/);
        if (query.locale) {
          return getEntry(match[1], match[3], query.locale);
        } else {
          return getEntry(match2[1], match2[3]);
        }
      });

    nock(`${command.cmaAPIUrl}`, {
      reqheaders: {
        api_key: token.apiKey,
        authorization: token.token,
      },
    })
      .persist()
      .put(/\/v3\/content_types\/((\w)*)\/entries/)
      .reply((uri, body) => {
        let match = uri.match(/\/v3\/content_types\/((\w)*)\/entries\/((\w)*)\?locale=((\w|-)*)/);
        let responseModified = cloneDeep(omitDeep(body, ['uid']));
        let expectedResponse = omitDeep(getExpectedOutput(match[1], match[3], match[5]), ['uid']);
        expectedResponse = cloneDeep(expectedResponse);
        if (isEqual(responseModified, expectedResponse)) {
          return [
            200,
            {
              notice: 'Entry updated successfully.',
              entry: {},
            },
          ];
        }
        return [
          400,
          {
            notice: 'Update Failed.',
            error_message: 'Entry update failed.',
            entry: {},
          },
        ];
      });
  });
  const getTokenCallback = sinon.stub();
  getTokenCallback.withArgs('test1').returns({
    token: 'testManagementToken',
    apiKey: 'testApiKey',
    type: 'management',
  });

  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command(['cm:entries:migrate-html-rte', '--config-path', './test/dummy/config/config.json', '--yes'])
    .it('execute using config file w/o locale', (ctx) => {
      expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 2 Entrie(s)');
    });

  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command(['cm:entries:migrate-html-rte', '--config-path', './test/dummy/config/config_locale.json', '--yes'])
    .it('execute using config file w/ locale', (ctx) => {
      expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 1 Entrie(s)');
    });

  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command(['cm:entries:migrate-html-rte', '--config-path', './test/dummy/config/config-locale-2.json', '--yes'])
    .it('execute using config file w/ multiple locale', (ctx) => {
      expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 3 Entrie(s)');
    });
  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'contenttypewithsinglerte',
      '--html-path',
      'rich_text_editor',
      '--json-path',
      'supercharged_rte',
      '--delay',
      '50',
    ])
    .it('execute using flags (w/o locale)', (ctx) => {
      expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 2 Entrie(s)');
    });

  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'contenttypewithsinglerte',
      '--html-path',
      'rich_text_editor',
      '--json-path',
      'supercharged_rte',
      '--locale',
      'en-in',
      '--delay',
      '50',
    ])
    .it('execute using flags w/ locale', (ctx) => {
      expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 1 Entrie(s)');
    });
  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'contenttypewithsinglerte',
      '--html-path',
      'rich_text_editor.invalidPath',
      '--json-path',
      'supercharged_rte',
      '--yes',
      '--delay',
      '50',
    ])
    .catch((error) => {
      expect(error.message).to.contain('The specified path to invalidPath HTML RTE does not exist.');
    })
    .it('throw error on invalid html rte path');

  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'contenttypewithinvalidhtmlrteschema',
      '--html-path',
      'rich_text_editor',
      '--json-path',
      'supercharged_rte',
      '--yes',
      '--delay',
      '50',
    ])
    .catch((error) => {
      expect(error.message).to.contain('The specified path to rich_text_editor HTML RTE does not exist.');
    })
    .it('throw error on invalid html rte field schema');

  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'contenttypewithinvalidjsonrteschema',
      '--html-path',
      'rich_text_editor',
      '--json-path',
      'supercharged_rte',
      '--yes',
      '--delay',
      '50',
    ])
    .catch((error) => {
      expect(error.message).to.contain('The specified path to supercharged_rte JSON RTE does not exist.');
    })
    .it('throw error on invalid json rte field schema');
  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'contenttypewithsinglerte',
      '--html-path',
      'rich_text_editor',
      '--json-path',
      'supercharged_rte.invalidPath',
      '--yes',
      '--delay',
      '50',
    ])
    .catch((error) => {
      expect(error.message).to.contain('The specified path to invalidPath JSON RTE does not exist.');
    })
    .it('throw error on invalid json rte path');

  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--config-path',
      './test/dummy/config/configForInvalidContentType.json',
      '--yes',
    ])
    .catch((error) => {
      expect(error.message).to.contain('Cannot convert "Multiple" type HTML RTE to "Single" type JSON RTE.');
    })
    .it('throw error on migration of Mutiple Html rte with single Json rte');

  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'contenttypewithemptyschema',
      '--html-path',
      'rich_text_editor',
      '--json-path',
      'supercharged_rte',
      '--yes',
      '--delay',
      '50',
    ])
    .catch((error) => {
      expect(error.message).to.contain('The contenttypewithemptyschema content type contains an empty schema.');
    })
    .it('throw error on content type with empty schema');

  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'contenttypedifferentlevelrte',
      '--html-path',
      'group.rich_text_editor',
      '--json-path',
      'supercharged_rte',
      '--yes',
      '--delay',
      '50',
    ])
    .catch((error) => {
      expect(error.message).to.contain(
        'To complete migration, HTML RTE and JSON RTE should be present at the same field depth level.',
      );
    })
    .it('throw error on different level rte migration');

  test
    .stub(cliux, 'confirm', () => true)
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'invalidContentType',
      '--html-path',
      'rich_text_editor',
      '--json-path',
      'supercharged_rte',
      '--delay',
      '50',
    ])
    .catch((error) => {
      expect(error.message).to.contain("The Content Type 'invalidContentType' was not found. Please try again.");
    })
    .it('throw error on invalid contenttype');

  test
    .stub(cliux, 'confirm', () => true)
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'contenttypewithentryupdateerror',
      '--html-path',
      'rich_text_editor',
      '--json-path',
      'supercharged_rte',
      '--yes',
      '--delay',
      '50',
    ])
    .it('notify user on entry update failed', (ctx) => {
      expect(ctx.stdout).to.contain(
        `Faced issue while migrating some entrie(s) for "contenttypewithentryupdateerror" Content-type in "en-us" locale,"blta9b16ac2827c54ed, blta9b16ac2827c54e1"`,
      );
    });

    test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command(['cm:entries:migrate-html-rte', '--config-path', './test/dummy/config/config-for-images-in-rte.json', '--yes'])
    .it('should have proper json structure for images migrated from HTML RTE', (ctx) => {
      expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 1 Entrie(s)');
    });
    
});
describe('Global Field Migration', () => {
  let token = getToken('test1');
  beforeEach(() => {
    nock(`${command.cmaAPIUrl}`, {
      reqheaders: {
        api_key: token.apiKey,
        authorization: token.token,
      },
    })
      .persist()
      .get(/\/v3\/global_fields\/([a-zA-Z_])*/)
      .query({
        include_content_types: true,
      })
      .reply((uri) => {
        var match = uri.match(/\/v3\/global_fields\/(([a-zA-Z_])*)/);
        return getGlobalField(match[1]);
      });
  });

  const getTokenCallback = sinon.stub();
  getTokenCallback.withArgs('test1').returns({
    token: 'testManagementToken',
    apiKey: 'testApiKey',
    type: 'management',
  });
  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command(['cm:entries:migrate-html-rte', '--config-path', './test/dummy/config/configForGlobalField.json', '--yes'])
    .it('execute using config file', (ctx) => {
      expect(ctx.stdout).to.contain('Updated 2 Content Type(s) and 2 Entrie(s)');
    });

  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'globalfieldwithemptycontenttype',
      '--global-field',
      '--html-path',
      'rich_text_editor',
      '--json-path',
      'supercharged_rte',
      '--yes',
      '--delay',
      '50',
    ])
    .catch((error) => {
      expect(error.message).to.contain('globalfieldformigration Global field is not referred in any content type.');
    })
    .it('throw error on global field with empty referred content_types');

  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'globalfieldwithinvalidcontenttype',
      '--global-field',
      '--html-path',
      'rich_text_editor',
      '--json-path',
      'supercharged_rte',
      '--yes',
      '--delay',
      '50',
    ])
    .catch((error) => {
      expect(error.message).to.contain(
        'The contenttypewithemptyschema content type referred in globalfieldformigration contains an empty schema.',
      );
    })
    .it('throw error on global field with invalid content_type');

  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'globalfieldwithemptyschema',
      '--global-field',
      '--html-path',
      'rich_text_editor',
      '--json-path',
      'supercharged_rte',
      '--yes',
      '--delay',
      '50',
    ])
    .catch((error) => {
      expect(error.message).to.contain('The globalfieldwithemptyschema Global field contains an empty schema.');
    })
    .it('throw error on global field with empty schema');

  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'globalfieldwithemptyschemacontenttype',
      '--global-field',
      '--html-path',
      'rich_text_editor',
      '--json-path',
      'supercharged_rte',
      '--yes',
      '--delay',
      '50',
    ])
    .catch((error) => {
      expect(error.message).to.contain(
        'The contenttypewithemptyschema content type referred in globalfieldwithemptyschemacontenttype contains an empty schema.',
      );
    })
    .it('throw error on global field with empty schema content_type');

  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'invalidUidGlobalfield',
      '--global-field',
      '--html-path',
      'rich_text_editor',
      '--json-path',
      'supercharged_rte',
      '--yes',
      '--delay',
      '50',
    ])
    .catch((error) => {
      expect(error.message).to.contain("The Global Field 'invalidUidGlobalfield' was not found. Please try again.");
    })
    .it('throw error on invalid global_field uid');
});

describe('Content Type with single rte of multiple type', () => {
  const getTokenCallback = sinon.stub();
  getTokenCallback.withArgs('test1').returns({
    token: 'testManagementToken',
    apiKey: 'testApiKey',
    type: 'management',
  });
  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command(['cm:entries:migrate-html-rte', '--config-path', './test/dummy/config/configForMultipleRte.json', '--yes'])
    .it('execute using config file', (ctx) => {
      expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 1 Entrie(s)');
    });
});

describe('Content Type with Single RTE inside modular block', () => {
  const getTokenCallback = sinon.stub();
  getTokenCallback.withArgs('test1').returns({
    token: 'testManagementToken',
    apiKey: 'testApiKey',
    type: 'management',
  });
  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'contenttypewithmodularblock',
      '--html-path',
      'modular_blocks.test1.rich_text_editor',
      '--json-path',
      'modular_blocks.test1.supercharged_rte',
      '--yes',
      '--delay',
      '50',
    ])
    .it('execute using Flags', (ctx) => {
      expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 1 Entrie(s)');
    });
});

describe('Content Type with Single RTE of type multiple inside group', () => {
  const getTokenCallback = sinon.stub();
  getTokenCallback.withArgs('test1').returns({
    token: 'testManagementToken',
    apiKey: 'testApiKey',
    type: 'management',
  });
  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'contenttypewithgroup',
      '--html-path',
      'group.rich_text_editor',
      '--json-path',
      'group.supercharged_rte',
      '--yes',
      '--delay',
      '50',
    ])
    .it('execute using Flags', (ctx) => {
      expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 1 Entrie(s)');
    });
});

describe('Content Type with Single RTE inside group of type multiple', () => {
  const getTokenCallback = sinon.stub();
  getTokenCallback.withArgs('test1').returns({
    token: 'testManagementToken',
    apiKey: 'testApiKey',
    type: 'management',
  });
  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'contenttypewithmultiplegroup',
      '--html-path',
      'group.rich_text_editor',
      '--json-path',
      'group.supercharged_rte',
      '--yes',
      '--delay',
      '50',
    ])
    .it('execute using Flags', (ctx) => {
      expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 1 Entrie(s)');
    });
});

describe('Content Type with multiple file field', () => {
  const getTokenCallback = sinon.stub();
  getTokenCallback.withArgs('test1').returns({
    token: 'testManagementToken',
    apiKey: 'testApiKey',
    type: 'management',
  });
  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content-type',
      'contenttypewithfilefield',
      '--html-path',
      'rich_text_editor',
      '--json-path',
      'json_rte',
      '--yes',
      '--delay',
      '50',
    ])
    .it('execute using Flags', (ctx) => {
      expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 1 Entrie(s)');
    });
});

describe('Migration with old flags and command', () => {
  const getTokenCallback = sinon.stub();
  getTokenCallback.withArgs('test1').returns({
    token: 'testManagementToken',
    apiKey: 'testApiKey',
    type: 'management',
  });

  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command(['cm:migrate-rte', '--configPath', './test/dummy/config/config.json', '--yes'])
    .it('execute using config file w/o locale', (ctx) => {
      expect(ctx.stdout).to.contain(
        `DEPRECATION WARNING: flags -p,--configPath will be removed in two months, start using -c,--config-path flags instead`,
      );
      expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 2 Entrie(s)');
    });

  test
    .stub(cliux, 'confirm', () => 'yes')
    .stub(command, 'getToken', getTokenCallback)
    .stdout()
    .command([
      'cm:entries:migrate-html-rte',
      '--alias',
      'test1',
      '--content_type',
      'contenttypewithsinglerte',
      '--htmlPath',
      'rich_text_editor',
      '--jsonPath',
      'supercharged_rte',
      '--delay',
      '50',
    ])
    .it('execute using flags (w/o locale)', (ctx) => {
      expect(ctx.stdout).to.contain(
        `DEPRECATION WARNING: flags -c,--content_type will be removed in two months, start using --content-type flags instead`,
      );
      expect(ctx.stdout).to.contain(
        `DEPRECATION WARNING: flags -h,--htmlPath will be removed in two months, start using --html-path flags instead`,
      );
      expect(ctx.stdout).to.contain(
        `DEPRECATION WARNING: flags -j,--jsonPath will be removed in two months, start using --json-path flags instead`,
      );

      expect(ctx.stdout).to.contain('Updated 1 Content Type(s) and 2 Entrie(s)');
    });
});
