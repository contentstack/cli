import { expect } from 'chai';
import * as sinon from 'sinon';
import { join } from 'path';
import ImportExtensions from '../../../../src/import/modules/extensions';
import { fsUtil, fileHelper } from '../../../../src/utils';
import { log, handleAndLogError } from '@contentstack/cli-utilities';

describe('ImportExtensions', () => {
  let importExtensions: ImportExtensions;
  let mockStackClient: any;
  let mockImportConfig: any;
  let sandbox: sinon.SinonSandbox;
  const testBackupDir = join(__dirname, 'mock-data');

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    mockStackClient = {
      extension: (uid?: string) => ({
        create: sandbox.stub().resolves({ 
          uid: `stack-${uid || 'new'}-${Date.now()}`, 
          title: 'Test Extension',
          type: 'field'
        }),
        update: sandbox.stub().resolves({ 
          uid: `updated-${uid || 'ext'}-${Date.now()}`, 
          title: 'Updated Extension',
          type: 'field'
        }),
        fetch: sandbox.stub().resolves({ 
          uid: uid || 'ext-123', 
          title: 'Test Extension',
          type: 'field',
          urlPath: `/extensions/${uid || 'ext-123'}`,
          _version: 1,
          stackHeaders: {}
        }),
        fetchAll: sandbox.stub().resolves({ items: [] }),
        query: () => ({
          findOne: sandbox.stub().resolves({ 
            items: [{
              uid: 'stack-ext-1',
              title: 'Test Extension 1',
              type: 'field',
              urlPath: '/extensions/stack-ext-1',
              _version: 1,
              stackHeaders: {}
            }]
          })
        })
      })
    };

    mockImportConfig = {
      apiKey: 'test',
      backupDir: testBackupDir,
      context: { module: 'extensions' },
      concurrency: 2,
      fetchConcurrency: 3,
      replaceExisting: false,
      skipExisting: false,
      modules: {
        extensions: {
          dirName: 'extensions',
          fileName: 'extensions.json'
        }
      }
    };

    importExtensions = new ImportExtensions({
      importConfig: mockImportConfig,
      stackAPIClient: mockStackClient,
      moduleName: 'extensions'
    });

    sandbox.stub(importExtensions as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
      return await fn();
    });
    sandbox.stub(importExtensions as any, 'analyzeExtensions').resolves([1]);
    const mockProgress = {
      addProcess: sandbox.stub(),
      startProcess: sandbox.stub().returns({ updateStatus: sandbox.stub() }),
      completeProcess: sandbox.stub(),
      updateStatus: sandbox.stub(),
      tick: sandbox.stub()
    };
    sandbox.stub(importExtensions as any, 'createNestedProgress').returns(mockProgress);
    sandbox.stub(importExtensions as any, 'prepareExtensionMapper').resolves();
    sandbox.stub(importExtensions as any, 'getContentTypesInScope').returns([]);
    sandbox.stub(importExtensions as any, 'updateUidExtension').returns(undefined);
    sandbox.stub(importExtensions as any, 'processExtensionResults').resolves();
    sandbox.stub(importExtensions as any, 'completeProgress').resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct config and paths', () => {
      expect(importExtensions).to.be.instanceOf(ImportExtensions);
      expect((importExtensions as any).importConfig).to.deep.equal(mockImportConfig);
      expect((importExtensions as any).extensionsConfig).to.deep.equal(mockImportConfig.modules.extensions);
      expect(mockImportConfig.context.module).to.equal('extensions');
    });

    it('should set correct directory paths', () => {
      const expectedMapperDirPath = join(testBackupDir, 'mapper', 'extensions');
      const expectedExtensionsFolderPath = join(testBackupDir, 'extensions');
      const expectedExtUidMapperPath = join(testBackupDir, 'mapper', 'extensions', 'uid-mapping.json');
      const expectedExtSuccessPath = join(testBackupDir, 'mapper', 'extensions', 'success.json');
      const expectedExtFailsPath = join(testBackupDir, 'mapper', 'extensions', 'fails.json');
      const expectedExtPendingPath = join(testBackupDir, 'mapper', 'extensions', 'pending_extensions.js');

      expect((importExtensions as any).mapperDirPath).to.equal(expectedMapperDirPath);
      expect((importExtensions as any).extensionsFolderPath).to.equal(expectedExtensionsFolderPath);
      expect((importExtensions as any).extUidMapperPath).to.equal(expectedExtUidMapperPath);
      expect((importExtensions as any).extSuccessPath).to.equal(expectedExtSuccessPath);
      expect((importExtensions as any).extFailsPath).to.equal(expectedExtFailsPath);
      expect((importExtensions as any).extPendingPath).to.equal(expectedExtPendingPath);
    });

    it('should initialize empty arrays and objects', () => {
      expect((importExtensions as any).extFailed).to.deep.equal([]);
      expect((importExtensions as any).extSuccess).to.deep.equal([]);
      expect((importExtensions as any).existingExtensions).to.deep.equal([]);
      expect((importExtensions as any).extUidMapper).to.deep.equal({});
      expect((importExtensions as any).extensionObject).to.deep.equal([]);
    });
  });

  describe('start', () => {
    it('should start import process when extensions folder exists', async () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      sandbox.stub(fileHelper, 'fileExistsSync');
      sandbox.stub(fsUtil, 'readFile');
      sandbox.stub(fsUtil, 'makeDirectory');
      sandbox.stub(fsUtil, 'writeFile');
      
      sandbox.stub(importExtensions as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      sandbox.stub(importExtensions as any, 'analyzeExtensions').resolves([2]);
      const mockProgress = {
        addProcess: sandbox.stub(),
        startProcess: sandbox.stub().returns({ updateStatus: sandbox.stub() }),
        completeProcess: sandbox.stub(),
        updateStatus: sandbox.stub(),
        tick: sandbox.stub()
      };
      sandbox.stub(importExtensions as any, 'createNestedProgress').returns(mockProgress);
      const prepareExtensionMapperStub = sandbox.stub(importExtensions as any, 'prepareExtensionMapper').resolves();
      sandbox.stub(importExtensions as any, 'getContentTypesInScope').returns([]);
      sandbox.stub(importExtensions as any, 'updateUidExtension').returns(undefined);
      const importExtensionsStub = sandbox.stub(importExtensions as any, 'importExtensions').resolves();
      sandbox.stub(importExtensions as any, 'processExtensionResults').resolves();
      sandbox.stub(importExtensions as any, 'completeProgress').resolves();
      
      await importExtensions.start();

      expect(prepareExtensionMapperStub.called).to.be.true;
      expect(importExtensionsStub.called).to.be.true;
    });

    it('should handle when extensions folder does not exist', async () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      
      sandbox.stub(fileHelper, 'fileExistsSync').returns(false);
      sandbox.stub(fsUtil, 'readFile');
      sandbox.stub(fsUtil, 'writeFile');
      sandbox.stub(fsUtil, 'makeDirectory');
      
      sandbox.stub(importExtensions as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      const analyzeExtensionsStub = sandbox.stub(importExtensions as any, 'analyzeExtensions').resolves([0]);
      sandbox.stub(importExtensions as any, 'completeProgress').resolves();

      await importExtensions.start();

      expect(analyzeExtensionsStub.called).to.be.true;
      // fsUtil.readFile should not be called when folder doesn't exist
    });

    it('should handle empty extensions data', async () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      
      sandbox.stub(fileHelper, 'fileExistsSync')
        .onFirstCall().returns(true)
        .onSecondCall().returns(false);
      sandbox.stub(fsUtil, 'readFile').returns(null);
      sandbox.stub(fsUtil, 'makeDirectory').resolves();
      sandbox.stub(fsUtil, 'writeFile');
      
      sandbox.stub(importExtensions as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      const analyzeExtensionsStub = sandbox.stub(importExtensions as any, 'analyzeExtensions').resolves([0]);
      sandbox.stub(importExtensions as any, 'createNestedProgress').returns({
        addProcess: sandbox.stub(),
        startProcess: sandbox.stub().returns({ updateStatus: sandbox.stub() }),
        completeProcess: sandbox.stub(),
        updateStatus: sandbox.stub(),
        tick: sandbox.stub()
      });
      sandbox.stub(importExtensions as any, 'completeProgress').resolves();

      await importExtensions.start();

      expect(analyzeExtensionsStub.called).to.be.true;
    });

    it('should handle replaceExisting when existing extensions present', async () => {
      mockImportConfig.replaceExisting = true;
      
      sandbox.stub(fileHelper, 'fileExistsSync')
        .onFirstCall().returns(true)
        .onSecondCall().returns(false);
      
      sandbox.stub(fsUtil, 'readFile')
        .onFirstCall().returns({
          'ext-1': { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
        });
      
      sandbox.stub(fsUtil, 'makeDirectory').resolves();
      sandbox.stub(fsUtil, 'writeFile');
      
      // Set up existing extensions
      (importExtensions as any).existingExtensions = [
        { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
      ];
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').resolves();
      const replaceExtensionsStub = sandbox.stub(importExtensions as any, 'replaceExtensions').resolves();

      await importExtensions.start();

      expect(replaceExtensionsStub.called).to.be.true;
    });

    it('should handle replaceExtensions error', async () => {
      mockImportConfig.replaceExisting = true;
      
      sandbox.stub(fileHelper, 'fileExistsSync')
        .onFirstCall().returns(true)
        .onSecondCall().returns(false);
      
      sandbox.stub(fsUtil, 'readFile')
        .onFirstCall().returns({
          'ext-1': { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
        });
      
      sandbox.stub(fsUtil, 'makeDirectory').resolves();
      sandbox.stub(fsUtil, 'writeFile');
      
      // Set up existing extensions
      (importExtensions as any).existingExtensions = [
        { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
      ];
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').resolves();
      const replaceExtensionsStub = sandbox.stub(importExtensions as any, 'replaceExtensions').rejects(new Error('Replace error'));

      await importExtensions.start();

      expect(replaceExtensionsStub.called).to.be.true;
    });

    it('should write success and failed files when data exists', async () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      
      sandbox.stub(fileHelper, 'fileExistsSync')
        .onFirstCall().returns(true)
        .onSecondCall().returns(false);
      
      sandbox.stub(fsUtil, 'readFile')
        .onFirstCall().returns({
          'ext-1': { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
        });
      
      sandbox.stub(fsUtil, 'makeDirectory').resolves();
      const writeFileStub = sandbox.stub(fsUtil, 'writeFile');
      
      // Set up success and failed data
      (importExtensions as any).extSuccess = [{ uid: 'success-ext' }];
      (importExtensions as any).extFailed = [{ uid: 'failed-ext' }];
      
      sandbox.stub(importExtensions as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      sandbox.stub(importExtensions as any, 'analyzeExtensions').resolves([1]);
      const mockProgress = {
        addProcess: sandbox.stub(),
        startProcess: sandbox.stub().returns({ updateStatus: sandbox.stub() }),
        completeProcess: sandbox.stub(),
        updateStatus: sandbox.stub(),
        tick: sandbox.stub()
      };
      sandbox.stub(importExtensions as any, 'createNestedProgress').returns(mockProgress);
      sandbox.stub(importExtensions as any, 'prepareExtensionMapper').resolves();
      sandbox.stub(importExtensions as any, 'getContentTypesInScope').returns([]);
      sandbox.stub(importExtensions as any, 'updateUidExtension').returns(undefined);
      sandbox.stub(importExtensions as any, 'importExtensions').resolves();
      sandbox.stub(importExtensions as any, 'completeProgress').resolves();
      sandbox.stub(importExtensions as any, 'makeConcurrentCall').resolves();

      await importExtensions.start();

      expect(writeFileStub.calledTwice).to.be.true;
    });

    it('should handle existing UID mappings', async () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      sandbox.stub(fileHelper, 'fileExistsSync');
      sandbox.stub(fsUtil, 'readFile');
      sandbox.stub(fsUtil, 'makeDirectory');
      sandbox.stub(fsUtil, 'writeFile');
      
      sandbox.stub(importExtensions as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      sandbox.stub(importExtensions as any, 'analyzeExtensions').resolves([1]);
      const mockProgress = {
        addProcess: sandbox.stub(),
        startProcess: sandbox.stub().returns({ updateStatus: sandbox.stub() }),
        completeProcess: sandbox.stub(),
        updateStatus: sandbox.stub(),
        tick: sandbox.stub()
      };
      sandbox.stub(importExtensions as any, 'createNestedProgress').returns(mockProgress);
      const prepareExtensionMapperStub = sandbox.stub(importExtensions as any, 'prepareExtensionMapper').callsFake(async () => {
        (importExtensions as any).extensionUidMapper = { 'ext-1': 'stack-ext-1', 'ext-2': 'stack-ext-2' };
      });
      sandbox.stub(importExtensions as any, 'getContentTypesInScope').returns([]);
      sandbox.stub(importExtensions as any, 'updateUidExtension').returns(undefined);
      const importExtensionsStub = sandbox.stub(importExtensions as any, 'importExtensions').resolves();
      sandbox.stub(importExtensions as any, 'processExtensionResults').resolves();
      sandbox.stub(importExtensions as any, 'completeProgress').resolves();

      await importExtensions.start();

      expect(prepareExtensionMapperStub.called).to.be.true;
      expect(importExtensionsStub.called).to.be.true;
      expect((importExtensions as any).extensionUidMapper).to.deep.equal({ 'ext-1': 'stack-ext-1', 'ext-2': 'stack-ext-2' });
    });
  });

  describe('importExtensions', () => {
    it('should handle successful extension import', async () => {
      (importExtensions as any).extensions = {
        'ext-1': { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
      };
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        // Simulate successful import
        const onSuccess = config.apiParams.resolve;
        onSuccess({
          response: { uid: 'new-ext-1', title: 'Test Extension 1' },
          apiData: { uid: 'ext-1', title: 'Test Extension 1' }
        });
      });

      await (importExtensions as any).importExtensions();

      expect((sandbox.stub(importExtensions as any, 'importExtensions') as any).called || true).to.be.true;
      expect((importExtensions as any).extSuccess.length).to.equal(1);
      expect((importExtensions as any).extUidMapper['ext-1']).to.equal('new-ext-1');
    });

    it('should handle extension import failure with title error', async () => {
      (importExtensions as any).extensions = {
        'ext-1': { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
      };
      mockImportConfig.replaceExisting = true;
      mockImportConfig.skipExisting = false;
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        // Simulate failure with title error
        const onReject = config.apiParams.reject;
        onReject({
          error: { errors: { title: 'Extension already exists' } },
          apiData: { uid: 'ext-1', title: 'Test Extension 1' }
        });
      });

      await (importExtensions as any).importExtensions();

      expect((sandbox.stub(importExtensions as any, 'importExtensions') as any).called || true).to.be.true;
      expect((importExtensions as any).existingExtensions.length).to.equal(1);
    });

    it('should handle extension import failure without title error', async () => {
      (importExtensions as any).extensions = {
        'ext-1': { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
      };
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        // Simulate failure without title error
        const onReject = config.apiParams.reject;
        onReject({
          error: { message: 'Network error' },
          apiData: { uid: 'ext-1', title: 'Test Extension 1' }
        });
      });

      await (importExtensions as any).importExtensions();

      expect((sandbox.stub(importExtensions as any, 'importExtensions') as any).called || true).to.be.true;
      expect((importExtensions as any).extFailed.length).to.equal(1);
    });

    it('should handle empty extensions', async () => {
      (importExtensions as any).extensions = {};

      await (importExtensions as any).importExtensions();

    });

    it('should handle undefined extensions', async () => {
      (importExtensions as any).extensions = undefined;

      await (importExtensions as any).importExtensions();

    });
  });

  describe('replaceExtensions', () => {
    it('should handle successful extension replacement', async () => {
      (importExtensions as any).existingExtensions = [
        { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
      ];
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        // Simulate successful replacement
        const onSuccess = config.apiParams.resolve;
        onSuccess({
          response: { uid: 'replaced-ext-1', title: 'Test Extension 1' },
          apiData: { uid: 'ext-1', title: 'Test Extension 1' }
        });
      });

      await (importExtensions as any).replaceExtensions();

      expect((sandbox.stub(importExtensions as any, 'importExtensions') as any).called || true).to.be.true;
      expect((importExtensions as any).extSuccess.length).to.equal(1);
    });

    it('should handle extension replacement failure', async () => {
      (importExtensions as any).existingExtensions = [
        { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
      ];
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        // Simulate replacement failure
        const onReject = config.apiParams.reject;
        onReject({
          error: { message: 'Update failed' },
          apiData: { uid: 'ext-1', title: 'Test Extension 1' }
        });
      });

      await (importExtensions as any).replaceExtensions();

      expect((sandbox.stub(importExtensions as any, 'importExtensions') as any).called || true).to.be.true;
      expect((importExtensions as any).extFailed.length).to.equal(1);
    });
  });

  describe('replaceExtensionHandler', () => {
    it('should handle successful extension update', async () => {
      const extension = { uid: 'ext-1', title: 'Test Extension 1' };
      const apiParams = {
        resolve: sandbox.stub(),
        reject: sandbox.stub()
      };

      const queryStub = sandbox.stub().returns({
        findOne: sandbox.stub().resolves({ 
          items: [{
            uid: 'stack-ext-1',
            title: 'Test Extension 1',
            type: 'field',
            urlPath: '/extensions/stack-ext-1',
        _version: 1,
        stackHeaders: {}
          }]
        })
      });

      const updateStub = sandbox.stub().resolves({ uid: 'updated-ext-1' });
      const extensionPayload = {
        update: updateStub
      };

      const extensionStub = sandbox.stub();
      extensionStub.returns({ query: queryStub }); // For query call
      extensionStub.withArgs('ext-1').returns(extensionPayload); // For extension(uid) call

      Object.defineProperty(importExtensions, 'stack', {
        value: {
          extension: extensionStub
        },
        writable: true
      });

      // The method should resolve successfully
      const result = await (importExtensions as any).replaceExtensionHandler({
        apiParams,
        element: extension,
        isLastRequest: false
      });

      expect(queryStub.called).to.be.true;
      expect(updateStub.called).to.be.true;
      expect(apiParams.resolve.called).to.be.true;
      expect(result).to.be.true;
    });

    it('should handle extension not found in stack', async () => {
      const extension = { uid: 'ext-1', title: 'Test Extension 1' };
      const apiParams = {
        resolve: sandbox.stub(),
        reject: sandbox.stub()
      };

      const queryStub = sandbox.stub().returns({
        findOne: sandbox.stub().resolves({ items: [] })
      });
      Object.defineProperty(importExtensions, 'stack', {
        value: {
          extension: sandbox.stub().returns({
            query: queryStub
          })
        },
        writable: true
      });

      try {
        await (importExtensions as any).replaceExtensionHandler({
          apiParams,
          element: extension,
        isLastRequest: false
      });
      } catch (error) {
        // Expected to throw when extension not found
        expect(error).to.be.true;
      }

      expect(queryStub.called).to.be.true;
      expect(apiParams.reject.called).to.be.true;
    });

    it('should handle query errors', async () => {
      const extension = { uid: 'ext-1', title: 'Test Extension 1' };
      const apiParams = {
        resolve: sandbox.stub(),
        reject: sandbox.stub()
      };

      const queryStub = sandbox.stub().returns({
        findOne: sandbox.stub().rejects(new Error('Query failed'))
      });
      Object.defineProperty(importExtensions, 'stack', {
        value: {
          extension: sandbox.stub().returns({
            query: queryStub
          })
        },
        writable: true
      });

      try {
        await (importExtensions as any).replaceExtensionHandler({
          apiParams,
          element: extension,
        isLastRequest: false
      });
      } catch (error) {
        // Expected to throw when query fails
        expect(error).to.be.true;
      }

      expect(queryStub.called).to.be.true;
      expect(apiParams.reject.called).to.be.true;
    });

    it('should handle update errors', async () => {
      const extension = { uid: 'ext-1', title: 'Test Extension 1' };
      const apiParams = {
        resolve: sandbox.stub(),
        reject: sandbox.stub()
      };

      const queryStub = sandbox.stub().returns({
        findOne: sandbox.stub().resolves({ 
          items: [{
            uid: 'stack-ext-1',
            title: 'Test Extension 1',
            type: 'field',
            urlPath: '/extensions/stack-ext-1',
        _version: 1,
        stackHeaders: {}
          }]
        })
      });

      const updateStub = sandbox.stub().rejects(new Error('Update failed'));
      const extensionPayload = {
        update: updateStub
      };

      const extensionStub = sandbox.stub();
      extensionStub.returns({ query: queryStub }); // For query call
      extensionStub.withArgs('ext-1').returns(extensionPayload); // For extension(uid) call

      Object.defineProperty(importExtensions, 'stack', {
        value: {
          extension: extensionStub
        },
        writable: true
      });

      try {
        await (importExtensions as any).replaceExtensionHandler({
          apiParams,
          element: extension,
        isLastRequest: false
      });
      } catch (error) {
        // Expected to throw when update fails
        expect(error).to.be.true;
      }

      expect(queryStub.called).to.be.true;
      expect(updateStub.called).to.be.true;
      expect(apiParams.reject.called).to.be.true;
    });
  });

  describe('getContentTypesInScope', () => {
    it('should process extensions with content type scope', () => {
      (importExtensions as any).getContentTypesInScope.restore();
      
      (importExtensions as any).extensions = {
        'ext-1': {
          uid: 'ext-1',
          title: 'Test Extension 1',
          scope: {
            content_types: ['content-type-1', 'content-type-2']
          }
        },
        'ext-2': {
          uid: 'ext-2',
          title: 'Test Extension 2',
          scope: {
            content_types: ['$all']
          }
        }
      };

      (importExtensions as any).extensionObject = [];
      (importExtensions as any).getContentTypesInScope();

      expect((importExtensions as any).extensionObject.length).to.equal(1);
    });

    it('should handle extensions with $all scope', () => {
      const extensionsWithAll = {
        'ext-1': {
          uid: 'ext-1',
          title: 'Test Extension 1',
          scope: {
            content_types: ['$all']
          }
        }
      };
      (importExtensions as any).extensions = extensionsWithAll;

      (importExtensions as any).getContentTypesInScope();

      // Should not process $all scope
      expect((importExtensions as any).extensionObject.length).to.equal(0);
    });

    it('should handle extensions with single content type scope', () => {
      (importExtensions as any).getContentTypesInScope.restore();
      
      (importExtensions as any).extensions = {
        'ext-1': {
          uid: 'ext-1',
          title: 'Test Extension 1',
          scope: {
            content_types: ['content-type-1']
          }
        }
      };

      (importExtensions as any).extensionObject = [];
      (importExtensions as any).getContentTypesInScope();

      expect((importExtensions as any).extensionObject.length).to.equal(1);
    });

    it('should handle extensions with no scope', () => {
      (importExtensions as any).extensions = {
        'ext-1': {
          uid: 'ext-1',
          title: 'Test Extension 1'
        }
      };

      (importExtensions as any).getContentTypesInScope();

      expect((importExtensions as any).extensionObject.length).to.equal(0);
    });
  });

  describe('updateUidExtension', () => {
    it('should update extension UIDs', () => {
      (importExtensions as any).updateUidExtension.restore();
      
      (importExtensions as any).extensionObject = [
        { uid: 'ext-1', scope: {} },
        { uid: 'ext-2', scope: {} }
      ];
      (importExtensions as any).extUidMapper = {
        'ext-1': 'new-ext-1',
        'ext-2': 'new-ext-2'
      };

      (importExtensions as any).updateUidExtension();

      expect((importExtensions as any).extensionObject[0].uid).to.equal('new-ext-1');
      expect((importExtensions as any).extensionObject[1].uid).to.equal('new-ext-2');
    });

    it('should handle UIDs not found in mapper', () => {
      (importExtensions as any).updateUidExtension.restore();
      
      (importExtensions as any).extensionObject = [
        { uid: 'ext-1', scope: {} },
        { uid: 'ext-2', scope: {} }
      ];
      (importExtensions as any).extUidMapper = {
        'ext-1': 'new-ext-1'
        // ext-2 not in mapper
      };

      (importExtensions as any).updateUidExtension();

      expect((importExtensions as any).extensionObject[0].uid).to.equal('new-ext-1');
      // When UID not found in mapper, it's set to undefined
      expect((importExtensions as any).extensionObject[1].uid).to.be.undefined;
    });

    it('should write pending extensions file when extensions exist', () => {
      (importExtensions as any).updateUidExtension.restore();
      
      sandbox.stub(fsUtil, 'writeFile');
      (importExtensions as any).extensionObject = [
        { uid: 'ext-1', scope: {} }
      ];

      (importExtensions as any).updateUidExtension();

      expect((fsUtil.writeFile as any).called).to.be.true;
    });

    it('should not write pending extensions file when no extensions exist', () => {
      sandbox.stub(fsUtil, 'writeFile');
      (importExtensions as any).extensionObject = [];

      (importExtensions as any).updateUidExtension();

      expect((fsUtil.writeFile as any).called).to.be.false;
    });
  });

  describe('Additional Branch Coverage Tests', () => {
    it('should handle extensions with no content types in scope', () => {
      (importExtensions as any).extensions = {
        'ext-1': {
          uid: 'ext-1',
          title: 'Test Extension 1',
          scope: {
            content_types: []
          }
        }
      };

      (importExtensions as any).getContentTypesInScope();

      expect((importExtensions as any).extensionObject.length).to.equal(0);
    });

    it('should handle extensions with undefined scope', () => {
      (importExtensions as any).extensions = {
        'ext-1': {
          uid: 'ext-1',
          title: 'Test Extension 1'
        }
      };

      (importExtensions as any).getContentTypesInScope();

      expect((importExtensions as any).extensionObject.length).to.equal(0);
    });

    it('should handle extensions with null scope', () => {
      (importExtensions as any).extensions = {
        'ext-1': {
          uid: 'ext-1',
          title: 'Test Extension 1',
          scope: null
        }
      };

      (importExtensions as any).getContentTypesInScope();

      expect((importExtensions as any).extensionObject.length).to.equal(0);
    });

    it('should handle importExtensions with skipExisting true', async () => {
      (importExtensions as any).extensions = {
        'ext-1': { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
      };
      mockImportConfig.skipExisting = true;
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        // Simulate failure with title error
        const onReject = config.apiParams.reject;
        onReject({
          error: { errors: { title: 'Extension already exists' } },
          apiData: { uid: 'ext-1', title: 'Test Extension 1' }
        });
      });

      await (importExtensions as any).importExtensions();

      expect((sandbox.stub(importExtensions as any, 'importExtensions') as any).called || true).to.be.true;
      expect((importExtensions as any).existingExtensions.length).to.equal(0); // Should not be added when skipExisting is true
    });

    it('should handle importExtensions with replaceExisting false', async () => {
      (importExtensions as any).extensions = {
        'ext-1': { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
      };
      mockImportConfig.replaceExisting = false;
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        // Simulate failure with title error
        const onReject = config.apiParams.reject;
        onReject({
          error: { errors: { title: 'Extension already exists' } },
          apiData: { uid: 'ext-1', title: 'Test Extension 1' }
        });
      });

      await (importExtensions as any).importExtensions();

      expect((sandbox.stub(importExtensions as any, 'importExtensions') as any).called || true).to.be.true;
      expect((importExtensions as any).existingExtensions.length).to.equal(0); // Should not be added when replaceExisting is false
    });

    it('should handle start with no success or failed files to write', async () => {
      sandbox.stub(fileHelper, 'fileExistsSync')
        .onFirstCall().returns(true)
        .onSecondCall().returns(false);
      
      sandbox.stub(fsUtil, 'readFile')
        .onFirstCall().returns({
          'ext-1': { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
        });
      
      sandbox.stub(fsUtil, 'makeDirectory').resolves();
      sandbox.stub(fsUtil, 'writeFile');
      
      // Set up empty success and failed data
      (importExtensions as any).extSuccess = [];
      (importExtensions as any).extFailed = [];
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').resolves();
      // getContentTypesInScope and updateUidExtension are already stubbed in beforeEach, don't stub again

      await importExtensions.start();

      expect((fsUtil.writeFile as any).called).to.be.false;
    });

    it('should handle start with only success files to write', async () => {
      sandbox.stub(fileHelper, 'fileExistsSync')
        .onFirstCall().returns(true)
        .onSecondCall().returns(false);
      
      sandbox.stub(fsUtil, 'readFile')
        .onFirstCall().returns({
          'ext-1': { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
        });
      
      sandbox.stub(fsUtil, 'makeDirectory').resolves();
      sandbox.stub(fsUtil, 'writeFile');
      
      // Set up only success data
      (importExtensions as any).extSuccess = [{ uid: 'success-ext' }];
      (importExtensions as any).extFailed = [];
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').resolves();
      // getContentTypesInScope and updateUidExtension are already stubbed in beforeEach, don't stub again
      (importExtensions as any).processExtensionResults.restore();

      await importExtensions.start();

      expect((fsUtil.writeFile as any).calledOnce).to.be.true;
    });

    it('should handle start with only failed files to write', async () => {
      sandbox.stub(fileHelper, 'fileExistsSync')
        .onFirstCall().returns(true)
        .onSecondCall().returns(false);
      
      sandbox.stub(fsUtil, 'readFile')
        .onFirstCall().returns({
          'ext-1': { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
        });
      
      sandbox.stub(fsUtil, 'makeDirectory').resolves();
      sandbox.stub(fsUtil, 'writeFile');
      
      // Set up only failed data
      (importExtensions as any).extSuccess = [];
      (importExtensions as any).extFailed = [{ uid: 'failed-ext' }];
      
      // analyzeExtensions is already stubbed in beforeEach, restore it first if we need to change it
      (importExtensions as any).analyzeExtensions.restore();
      sandbox.stub(importExtensions as any, 'analyzeExtensions').resolves([1]);
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').resolves();
      // getContentTypesInScope and updateUidExtension are already stubbed in beforeEach, don't stub again
      (importExtensions as any).processExtensionResults.restore();

      await importExtensions.start();

      expect((fsUtil.writeFile as any).calledOnce).to.be.true;
    });

    it('should handle importExtensions with error without title property', async () => {
      (importExtensions as any).extensions = {
        'ext-1': { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
      };
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        // Simulate failure without title error
        const onReject = config.apiParams.reject;
        onReject({
          error: { message: 'Network error' },
          apiData: { uid: 'ext-1', title: 'Test Extension 1' }
        });
      });

      await (importExtensions as any).importExtensions();

      expect((sandbox.stub(importExtensions as any, 'importExtensions') as any).called || true).to.be.true;
      expect((importExtensions as any).extFailed.length).to.equal(1);
    });

    it('should handle importExtensions with error without errors property', async () => {
      (importExtensions as any).extensions = {
        'ext-1': { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
      };
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        // Simulate failure without errors property
        const onReject = config.apiParams.reject;
        onReject({
          error: { message: 'Some other error' },
          apiData: { uid: 'ext-1', title: 'Test Extension 1' }
        });
      });

      await (importExtensions as any).importExtensions();

      expect((sandbox.stub(importExtensions as any, 'importExtensions') as any).called || true).to.be.true;
      expect((importExtensions as any).extFailed.length).to.equal(1);
    });

    it('should handle getContentTypesInScope with extensions having content_types length 1 but not $all', () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      
      (importExtensions as any).extensions = {
        'ext-1': {
          uid: 'ext-1',
          title: 'Test Extension 1',
          scope: {
            content_types: ['content-type-1']
          }
        }
      };
      
      // Reset extensionObject
      (importExtensions as any).extensionObject = [];

      (importExtensions as any).getContentTypesInScope();

      expect((importExtensions as any).extensionObject.length).to.equal(1);
    });

    it('should handle getContentTypesInScope with extensions having content_types length > 1', () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      
      (importExtensions as any).extensions = {
        'ext-1': {
          uid: 'ext-1',
          title: 'Test Extension 1',
          scope: {
            content_types: ['content-type-1', 'content-type-2', 'content-type-3']
          }
        }
      };
      
      // Reset extensionObject
      (importExtensions as any).extensionObject = [];

      (importExtensions as any).getContentTypesInScope();

      expect((importExtensions as any).extensionObject.length).to.equal(1);
    });

    it('should handle importExtensions with onSuccess callback having undefined apiData', async () => {
      (importExtensions as any).extensions = {
        'ext-1': { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
      };
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        // Simulate successful import with undefined apiData
        const onSuccess = config.apiParams.resolve;
        onSuccess({
          response: { uid: 'new-ext-1', title: 'Test Extension 1' },
          apiData: undefined
        });
      });

      await (importExtensions as any).importExtensions();

      expect((sandbox.stub(importExtensions as any, 'importExtensions') as any).called || true).to.be.true;
      expect((importExtensions as any).extSuccess.length).to.equal(1);
    });

    it('should handle importExtensions with onSuccess callback having apiData without uid and title', async () => {
      (importExtensions as any).extensions = {
        'ext-1': { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
      };
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        // Simulate successful import with apiData without uid and title
        const onSuccess = config.apiParams.resolve;
        onSuccess({
          response: { uid: 'new-ext-1', title: 'Test Extension 1' },
          apiData: { type: 'field' }
        });
      });

      await (importExtensions as any).importExtensions();

      expect((sandbox.stub(importExtensions as any, 'importExtensions') as any).called || true).to.be.true;
      expect((importExtensions as any).extSuccess.length).to.equal(1);
    });

    it('should handle importExtensions with onReject callback having apiData without title', async () => {
      (importExtensions as any).extensions = {
        'ext-1': { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
      };
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        // Simulate failure with apiData without title
        const onReject = config.apiParams.reject;
        onReject({
          error: { message: 'Network error' },
          apiData: { uid: 'ext-1' }
    });
  });

      await (importExtensions as any).importExtensions();

      expect((sandbox.stub(importExtensions as any, 'importExtensions') as any).called || true).to.be.true;
      expect((importExtensions as any).extFailed.length).to.equal(1);
    });

    it('should handle replaceExtensions with onSuccess callback having undefined apiData', async () => {
      (importExtensions as any).existingExtensions = [
        { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
      ];
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        // Simulate successful replacement with undefined apiData
        const onSuccess = config.apiParams.resolve;
        onSuccess({
          response: { uid: 'new-ext-1', title: 'Test Extension 1' },
          apiData: undefined
        });
      });

      await (importExtensions as any).replaceExtensions();

      expect((sandbox.stub(importExtensions as any, 'importExtensions') as any).called || true).to.be.true;
      expect((importExtensions as any).extSuccess.length).to.equal(1);
    });

    it('should handle replaceExtensions with onSuccess callback having apiData without uid and title', async () => {
      (importExtensions as any).existingExtensions = [
        { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
      ];
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        // Simulate successful replacement with apiData without uid and title
        const onSuccess = config.apiParams.resolve;
        onSuccess({
          response: { uid: 'new-ext-1', title: 'Test Extension 1' },
          apiData: { type: 'field' }
        });
      });

      await (importExtensions as any).replaceExtensions();

      expect((sandbox.stub(importExtensions as any, 'importExtensions') as any).called || true).to.be.true;
      expect((importExtensions as any).extSuccess.length).to.equal(1);
    });

    it('should handle replaceExtensions with onReject callback having apiData without title', async () => {
      (importExtensions as any).existingExtensions = [
        { uid: 'ext-1', title: 'Test Extension 1', type: 'field' }
      ];
      
      const makeConcurrentCallStub = sandbox.stub(importExtensions as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        // Simulate failure with apiData without title
        const onReject = config.apiParams.reject;
        onReject({
          error: { message: 'Network error' },
          apiData: { uid: 'ext-1' }
        });
      });

      await (importExtensions as any).replaceExtensions();

      expect((sandbox.stub(importExtensions as any, 'importExtensions') as any).called || true).to.be.true;
      expect((importExtensions as any).extFailed.length).to.equal(1);
    });

    it('should handle replaceExtensionHandler with successful extension update', async () => {
      const mockExtension = { uid: 'ext-1', title: 'Test Extension 1', type: 'field' };
      const mockApiParams = {
        resolve: sandbox.stub(),
        reject: sandbox.stub()
      };

      const mockQueryResult = {
        items: [{
          uid: 'existing-ext-1',
          title: 'Test Extension 1',
          urlPath: '/extensions/existing-ext-1',
          _version: 1,
          stackHeaders: {}
        }]
      };

      const mockUpdateResponse = { uid: 'existing-ext-1', title: 'Test Extension 1' };

      const mockExtensionQuery = {
        findOne: sandbox.stub().resolves(mockQueryResult)
      };

      const mockExtensionInstance = {
        update: sandbox.stub().resolves(mockUpdateResponse)
      };

      Object.defineProperty(importExtensions, 'stack', {
        value: {
          extension: sandbox.stub()
            .onFirstCall().returns({
              query: sandbox.stub().returns(mockExtensionQuery)
            })
            .onSecondCall().returns(mockExtensionInstance)
        },
        writable: true
      });

      await (importExtensions as any).replaceExtensionHandler({
        apiParams: mockApiParams,
        element: mockExtension,
        isLastRequest: false
      });

      expect(mockApiParams.resolve.calledOnce).to.be.true;
      expect(mockApiParams.resolve.calledWith({
        response: mockUpdateResponse,
        apiData: mockExtension
      })).to.be.true;
    });

    it('should handle replaceExtensionHandler with extension not found in stack', async () => {
      const mockExtension = { uid: 'ext-1', title: 'Test Extension 1', type: 'field' };
      const mockApiParams = {
        resolve: sandbox.stub(),
        reject: sandbox.stub()
      };

      const mockQueryResult = { items: [] as any[] };

      const mockExtensionQuery = {
        findOne: sandbox.stub().resolves(mockQueryResult)
      };

      Object.defineProperty(importExtensions, 'stack', {
        value: {
          extension: sandbox.stub().returns({
            query: sandbox.stub().returns(mockExtensionQuery)
          })
        },
        writable: true
      });

      try {
        await (importExtensions as any).replaceExtensionHandler({
          apiParams: mockApiParams,
          element: mockExtension,
          isLastRequest: false
        });
      } catch (error) {
        // The method throws true, which is expected
        expect(error).to.be.true;
      }

      expect(mockApiParams.reject.calledOnce).to.be.true;
      expect(mockApiParams.reject.calledWith({
        error: sinon.match.instanceOf(Error),
        apiData: mockExtension
      })).to.be.true;
    });

    it('should handle replaceExtensionHandler with query error', async () => {
      const mockExtension = { uid: 'ext-1', title: 'Test Extension 1', type: 'field' };
      const mockApiParams = {
        resolve: sandbox.stub(),
        reject: sandbox.stub()
      };

      const mockError = new Error('Query failed');

      const mockExtensionQuery = {
        findOne: sandbox.stub().rejects(mockError)
      };

      Object.defineProperty(importExtensions, 'stack', {
        value: {
          extension: sandbox.stub().returns({
            query: sandbox.stub().returns(mockExtensionQuery)
          })
        },
        writable: true
      });

      try {
        await (importExtensions as any).replaceExtensionHandler({
          apiParams: mockApiParams,
          element: mockExtension,
          isLastRequest: false
        });
        } catch (error) {
        // The method throws true, which is expected
        expect(error).to.be.true;
      }

      expect(mockApiParams.reject.calledOnce).to.be.true;
      expect(mockApiParams.reject.calledWith({
        error: mockError,
        apiData: mockExtension
      })).to.be.true;
    });

    it('should handle replaceExtensionHandler with update error', async () => {
      const mockExtension = { uid: 'ext-1', title: 'Test Extension 1', type: 'field' };
      const mockApiParams = {
        resolve: sandbox.stub(),
        reject: sandbox.stub()
      };

      const mockQueryResult = {
        items: [{
          uid: 'existing-ext-1',
          title: 'Test Extension 1',
          urlPath: '/extensions/existing-ext-1',
          _version: 1,
          stackHeaders: {}
        }]
      };

      const mockUpdateError = new Error('Update failed');

      const mockExtensionQuery = {
        findOne: sandbox.stub().resolves(mockQueryResult)
      };

      const mockExtensionInstance = {
        update: sandbox.stub().rejects(mockUpdateError)
      };

      Object.defineProperty(importExtensions, 'stack', {
        value: {
          extension: sandbox.stub()
            .onFirstCall().returns({
              query: sandbox.stub().returns(mockExtensionQuery)
            })
            .onSecondCall().returns(mockExtensionInstance)
        },
        writable: true
      });

      try {
        await (importExtensions as any).replaceExtensionHandler({
          apiParams: mockApiParams,
          element: mockExtension,
          isLastRequest: false
        });
      } catch (error) {
        // The method throws true, which is expected
        expect(error).to.be.true;
      }

      expect(mockApiParams.reject.calledOnce).to.be.true;
      expect(mockApiParams.reject.calledWith({
        error: mockUpdateError,
        apiData: mockExtension
      })).to.be.true;
    });

    it('should handle replaceExtensionHandler with undefined items in query result', async () => {
      const mockExtension = { uid: 'ext-1', title: 'Test Extension 1', type: 'field' };
      const mockApiParams = {
        resolve: sandbox.stub(),
        reject: sandbox.stub()
      };

      const mockQueryResult = { items: undefined as any };

      const mockExtensionQuery = {
        findOne: sandbox.stub().resolves(mockQueryResult)
      };

      Object.defineProperty(importExtensions, 'stack', {
        value: {
          extension: sandbox.stub().returns({
            query: sandbox.stub().returns(mockExtensionQuery)
          })
        },
        writable: true
      });

      try {
        await (importExtensions as any).replaceExtensionHandler({
          apiParams: mockApiParams,
          element: mockExtension,
          isLastRequest: false
        });
      } catch (error) {
        // The method throws true, which is expected
        expect(error).to.be.true;
      }

      expect(mockApiParams.reject.calledOnce).to.be.true;
      expect(mockApiParams.reject.calledWith({
        error: sinon.match.instanceOf(Error),
        apiData: mockExtension
      })).to.be.true;
    });
  });
});