'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const Parser = require('../../../src/modules/parser');
const { map: _map, constants } = require('../../../src/utils');
const { getMapInstance, resetMapInstance } = _map;
const { MANAGEMENT_SDK, MANAGEMENT_TOKEN, AUTH_TOKEN, API_KEY, BRANCH, MANAGEMENT_CLIENT } = constants;
const { resetMap, createMockStackSDK } = require('../../setup/test-helpers');

describe('Parser Module', () => {
  let mapInstance;
  let mockStackSDK;
  let mockManagementClient;

  beforeEach(() => {
    resetMap();
    mapInstance = getMapInstance();
    mockStackSDK = createMockStackSDK();
    mockManagementClient = { stack: sinon.stub().returns(mockStackSDK) };

    _map.set(MANAGEMENT_SDK, mapInstance, mockStackSDK);
    _map.set(MANAGEMENT_CLIENT, mapInstance, mockManagementClient);
    _map.set(API_KEY, mapInstance, 'test-api-key');
    _map.set(constants.actionMapper, mapInstance, []);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getMigrationParser', () => {
    beforeEach(() => {
      // Initialize actionMapper
      _map.set(constants.actionMapper, mapInstance, []);
    });

    it('should parse a valid migration function', async () => {
      const parser = new Parser();
      const migrationFunc = async ({ migration, stackSDKInstance }) => {
        const blog = migration.createContentType('blog', { title: 'Blog', description: 'Blog description' });
        blog.createField('title').display_name('Title').data_type('text');
      };

      const result = await parser.getMigrationParser(migrationFunc);
      expect(result).to.be.an('object');
      expect(result.hasErrors).to.be.undefined;
    });

    it('should handle migration function with config', async () => {
      const parser = new Parser();
      _map.set(constants.actionMapper, mapInstance, []);
      const fsHelper = require('../../../src/utils/fs-helper');
      const originalReadJSONFile = fsHelper.readJSONFile;
      fsHelper.readJSONFile = sinon.stub().resolves({});

      _map.set('config', mapInstance, { key1: 'value1' });

      const migrationFunc = async ({ migration, config }) => {
        expect(config.key1).to.equal('value1');
      };

      const result = await parser.getMigrationParser(migrationFunc);
      expect(result).to.be.an('object');

      // Restore original
      fsHelper.readJSONFile = originalReadJSONFile;
    });

    it('should handle migration function with config file', async () => {
      const parser = new Parser();
      _map.set(constants.actionMapper, mapInstance, []);
      const fsHelper = require('../../../src/utils/fs-helper');
      const configData = { key1: 'value1', key2: 'value2' };
      // Stub the readJSONFile to prevent actual file system access
      const originalReadJSONFile = fsHelper.readJSONFile;
      fsHelper.readJSONFile = sinon.stub().resolves(configData);
      _map.set('config-path', mapInstance, '/path/to/config.json');

      const migrationFunc = async ({ migration, config }) => {
        expect(config.key1).to.equal('value1');
        expect(config.key2).to.equal('value2');
      };

      const result = await parser.getMigrationParser(migrationFunc);
      expect(result).to.be.an('object');
      // Restore original
      fsHelper.readJSONFile = originalReadJSONFile;
    });

    it('should merge config file and inline config', async () => {
      const parser = new Parser();
      _map.set(constants.actionMapper, mapInstance, []);
      const fsHelper = require('../../../src/utils/fs-helper');
      const fileConfig = { key1: 'file-value', key2: 'value2' };
      const inlineConfig = { key1: 'inline-value', key3: 'value3' };
      const originalReadJSONFile = fsHelper.readJSONFile;
      fsHelper.readJSONFile = sinon.stub().resolves(fileConfig);
      _map.set('config-path', mapInstance, '/path/to/config.json');
      _map.set('config', mapInstance, inlineConfig);

      const migrationFunc = async ({ migration, config }) => {
        // Inline config should override file config
        expect(config.key1).to.equal('inline-value');
        expect(config.key2).to.equal('value2');
        expect(config.key3).to.equal('value3');
      };

      const result = await parser.getMigrationParser(migrationFunc);
      expect(result).to.be.an('object');
      // Restore original
      fsHelper.readJSONFile = originalReadJSONFile;
    });

    it('should handle TypeError for invalid method calls', async () => {
      const parser = new Parser();
      _map.set(constants.actionMapper, mapInstance, []);
      const fsHelper = require('../../../src/utils/fs-helper');
      const originalReadJSONFile = fsHelper.readJSONFile;
      fsHelper.readJSONFile = sinon.stub().resolves({});

      // The migration function will throw a TypeError when invalidMethod is called
      // The parser catches this and adds it to typeErrors
      const migrationFunc = async ({ migration }) => {
        migration.invalidMethod(); // This should cause a TypeError
      };

      const result = await parser.getMigrationParser(migrationFunc);
      // The parser catches TypeError and dispatches it as a typeError action
      // Then it validates actions, and if there are typeErrors, hasErrors will be set
      // The _TypeError validator should catch this and add it to errors
      const actions = _map.get(constants.actionMapper, mapInstance);
      // The typeError action should be in the actions array
      const hasTypeError = actions.some((a) => a.type === 'typeError');
      // Either hasErrors should exist (validation found errors) or typeError action was created
      expect(result.hasErrors || hasTypeError).to.be.ok;

      // Restore
      fsHelper.readJSONFile = originalReadJSONFile;
    });

    it('should handle general errors in migration function', async () => {
      const parser = new Parser();
      _map.set(constants.actionMapper, mapInstance, []);
      const fsHelper = require('../../../src/utils/fs-helper');
      const originalReadJSONFile = fsHelper.readJSONFile;
      fsHelper.readJSONFile = sinon.stub().resolves({});

      const migrationFunc = async () => {
        throw new Error('General error');
      };

      const result = await parser.getMigrationParser(migrationFunc);
      expect(result.hasErrors).to.exist;
      expect(result.hasErrors.length).to.be.greaterThan(0);

      // Restore
      fsHelper.readJSONFile = originalReadJSONFile;
    });

    it('should validate actions and return errors if any', async () => {
      const parser = new Parser();
      _map.set(constants.actionMapper, mapInstance, []);
      const fsHelper = require('../../../src/utils/fs-helper');
      const originalReadJSONFile = fsHelper.readJSONFile;
      fsHelper.readJSONFile = sinon.stub().resolves({});

      const migrationFunc = async ({ migration }) => {
        // Create content type without required fields
        migration.createContentType('blog'); // Missing title
      };

      const result = await parser.getMigrationParser(migrationFunc);
      // Should have validation errors
      expect(result.hasErrors).to.exist;

      // Restore
      fsHelper.readJSONFile = originalReadJSONFile;
    });

    it('should pass all required parameters to migration function', async () => {
      const parser = new Parser();
      _map.set(constants.actionMapper, mapInstance, []);
      const fsHelper = require('../../../src/utils/fs-helper');
      const originalReadJSONFile = fsHelper.readJSONFile;
      fsHelper.readJSONFile = sinon.stub().resolves({});

      _map.set(MANAGEMENT_TOKEN, mapInstance, { token: 'test-token', apiKey: 'test-api-key' });
      _map.set(AUTH_TOKEN, mapInstance, 'test-auth-token');
      _map.set(BRANCH, mapInstance, 'test-branch');

      const migrationFunc = async ({
        migration,
        stackSDKInstance,
        managementAPIClient,
        managementToken,
        authToken,
        apiKey,
        branch,
        config,
      }) => {
        expect(migration).to.exist;
        expect(stackSDKInstance).to.equal(mockStackSDK);
        expect(managementAPIClient).to.equal(mockManagementClient);
        expect(managementToken).to.deep.equal({ token: 'test-token', apiKey: 'test-api-key' });
        expect(authToken).to.equal('test-auth-token');
        expect(apiKey).to.equal('test-api-key');
        expect(branch).to.equal('test-branch');
        expect(config).to.be.an('object');
      };

      const result = await parser.getMigrationParser(migrationFunc);
      expect(result).to.be.an('object');
      // Restore original
      fsHelper.readJSONFile = originalReadJSONFile;
    });
  });
});
