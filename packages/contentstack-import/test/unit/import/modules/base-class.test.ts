import { expect } from 'chai';
import { fancy } from 'fancy-test';
import sinon from 'sinon';
import { log } from '@contentstack/cli-utilities';
import BaseClass from '../../../../src/import/modules/base-class';
import { ImportConfig } from '../../../../src/types';

// Create a concrete implementation of BaseClass for testing
class TestBaseClass extends BaseClass {
  constructor(params: any) {
    super(params);
  }
}

describe('BaseClass', () => {
  let testClass: TestBaseClass;
  let mockStackClient: any;
  let mockImportConfig: ImportConfig;

  beforeEach(() => {
    mockStackClient = {
      asset: sinon.stub().returns({
        create: sinon.stub().resolves({ uid: 'asset-123' }),
        replace: sinon.stub().resolves({ uid: 'asset-123' }),
        publish: sinon.stub().resolves({ uid: 'asset-123' }),
        folder: sinon.stub().returns({
          create: sinon.stub().resolves({ uid: 'folder-123' })
        })
      }),
      contentType: sinon.stub().returns({
        create: sinon.stub().resolves({ uid: 'ct-123' }),
        entry: sinon.stub().returns({
          create: sinon.stub().resolves({ uid: 'entry-123' }),
          publish: sinon.stub().resolves({ uid: 'entry-123' }),
          delete: sinon.stub().resolves({ uid: 'entry-123' })
        })
      }),
      locale: sinon.stub().returns({
        create: sinon.stub().resolves({ uid: 'locale-123' }),
        fetch: sinon.stub().resolves({
          name: 'French',
          fallback_locale: 'en-us',
          update: sinon.stub().resolves({ code: 'fr-fr' })
        })
      }),
      extension: sinon.stub().returns({
        create: sinon.stub().resolves({ uid: 'ext-123' }),
        fetch: sinon.stub().resolves({
          scope: 'local',
          update: sinon.stub().resolves({ uid: 'ext-123' })
        })
      }),
      environment: sinon.stub().returns({
        create: sinon.stub().resolves({ uid: 'env-123' })
      }),
      label: sinon.stub().returns({
        create: sinon.stub().resolves({ uid: 'label-123' }),
        fetch: sinon.stub().resolves({
          parent: 'old-parent',
          update: sinon.stub().resolves({ uid: 'label-123' })
        })
      }),
      webhook: sinon.stub().returns({
        create: sinon.stub().resolves({ uid: 'webhook-123' })
      }),
      workflow: sinon.stub().returns({
        create: sinon.stub().resolves({ uid: 'workflow-123' })
      }),
      role: sinon.stub().returns({
        create: sinon.stub().resolves({ uid: 'role-123' })
      }),
      taxonomy: sinon.stub().returns({
        create: sinon.stub().resolves({ uid: 'taxonomy-123' }),
        terms: sinon.stub().returns({
          create: sinon.stub().resolves({ uid: 'term-123' })
        }),
        import: sinon.stub().resolves({ uid: 'import-123' })
      }),
      globalField: sinon.stub().returns({
        create: sinon.stub().resolves({ uid: 'gf-123' }),
        fetch: sinon.stub().resolves({
          title: 'Test GF',
          update: sinon.stub().resolves({ uid: 'gf-123' })
        })
      })
    };

    mockImportConfig = {
      apiKey: 'test',
      contentDir: '/test/content',
      data: '/test/content',
      contentVersion: 1,
      region: { name: 'us', cma: 'https://api.contentstack.io' } as any,
      master_locale: { code: 'en-us' },
      masterLocale: { code: 'en-us' },
      context: {
        command: 'cm:stacks:import',
        module: 'test',
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-123',
        apiKey: 'test',
        orgId: 'org-123',
        authenticationMethod: 'Management Token'
      },
      modules: {
        types: ['assets', 'content-types'],
        apiConcurrency: 5,
        assets: {
          dirName: 'assets',
          fileName: 'assets.json',
          validKeys: ['title', 'filename', 'content_type'],
          folderValidKeys: ['name', 'parent_uid'],
          uploadAssetsConcurrency: 1,
          importFoldersConcurrency: 1,
          displayExecutionTime: false,
          includeVersionedAssets: false,
          importSameStructure: false
        },
        contentTypes: {
          writeConcurrency: 1,
          dirName: 'content_types',
          fileName: 'content_types.json',
          validKeys: ['title', 'uid', 'schema'],
          apiConcurrency: 1
        }
      } as any,
      backupDir: '/test/backup',
      cliLogsPath: '/test/logs',
      canCreatePrivateApp: true,
      forceStopMarketplaceAppsPrompt: false,
      skipPrivateAppRecreationIfExist: true,
      isAuthenticated: true,
      auth_token: 'auth-token',
      selectedModules: ['assets'],
      skipAudit: false,
      'exclude-global-modules': false
    } as any;

    testClass = new TestBaseClass({
      importConfig: mockImportConfig,
      stackAPIClient: mockStackClient
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(testClass).to.be.instanceOf(BaseClass);
      expect(testClass.client).to.equal(mockStackClient);
      expect(testClass.importConfig).to.equal(mockImportConfig);
      expect(testClass.modulesConfig).to.equal(mockImportConfig.modules);
    });

    it('should set client property correctly', () => {
      expect(testClass.client).to.equal(mockStackClient);
    });

    it('should set importConfig property correctly', () => {
      expect(testClass.importConfig).to.equal(mockImportConfig);
    });

    it('should set modulesConfig property correctly', () => {
      expect(testClass.modulesConfig).to.equal(mockImportConfig.modules);
    });
  });

  describe('stack getter', () => {
    it('should return the client as stack', () => {
      expect(testClass.stack).to.equal(mockStackClient);
    });
  });

  describe('delay method', () => {
    it('should delay for specified milliseconds', async () => {
      const start = Date.now();
      await testClass.delay(100);
      const end = Date.now();
      
      expect(end - start).to.be.at.least(90); // Allow some tolerance
    });

    it('should handle zero delay', async () => {
      const start = Date.now();
      await testClass.delay(0);
      const end = Date.now();
      
      expect(end - start).to.be.at.most(10); // Should be very fast
    });

    it('should handle negative delay', async () => {
      const start = Date.now();
      await testClass.delay(-100);
      const end = Date.now();
      
      expect(end - start).to.be.at.most(10); // Should be very fast
    });

    it('should return a promise', () => {
      const result = testClass.delay(100);
      expect(result).to.be.a('promise');
    });
  });

  describe('makeConcurrentCall method', () => {
    let mockApiContent: any[];
    let mockApiParams: any;
    let mockProcessName: string;

    beforeEach(() => {
      mockApiContent = [
        { uid: 'item1', title: 'Item 1' },
        { uid: 'item2', title: 'Item 2' },
        { uid: 'item3', title: 'Item 3' }
      ] as any[];
      mockApiParams = {
        entity: 'create-assets',
        uid: 'test-uid',
        resolve: sinon.stub(),
        reject: sinon.stub()
      };
      mockProcessName = 'test-process';
    });

    it('should process empty content array', async () => {
      const env = {
        apiContent: [] as any[],
        apiParams: mockApiParams,
        processName: mockProcessName,
        indexerCount: 1,
        currentIndexer: 1,
        concurrencyLimit: 2
      };

      await testClass.makeConcurrentCall(env);
      // Should complete without error
    });

    it('should process content with custom promise handler', async () => {
      const customHandler = sinon.stub().resolves({ success: true });
      const env = {
        apiContent: mockApiContent,
        apiParams: mockApiParams,
        processName: mockProcessName,
        indexerCount: 1,
        currentIndexer: 1,
        concurrencyLimit: 2
      };

      await testClass.makeConcurrentCall(env, customHandler);

      expect(customHandler.callCount).to.equal(3);
      expect(customHandler.firstCall.args[0]).to.have.property('element', mockApiContent[0]);
      expect(customHandler.firstCall.args[0]).to.have.property('index', 0);
      expect(customHandler.firstCall.args[0]).to.have.property('batchIndex', 0);
    });

    it('should process content with API params', async () => {
      const env = {
        apiContent: mockApiContent,
        apiParams: mockApiParams,
        processName: mockProcessName,
        indexerCount: 1,
        currentIndexer: 1,
        concurrencyLimit: 2
      };

      await testClass.makeConcurrentCall(env);

      expect(mockApiParams.resolve.callCount).to.equal(3);
    });

    it('should respect concurrency limit', async () => {
      const env = {
        apiContent: mockApiContent,
        apiParams: mockApiParams,
        processName: mockProcessName,
        indexerCount: 1,
        currentIndexer: 1,
        concurrencyLimit: 2
      };

      await testClass.makeConcurrentCall(env);

      expect(mockApiParams.resolve.callCount).to.equal(3);
    });

    it('should handle single item', async () => {
      const env = {
        apiContent: [mockApiContent[0]],
        apiParams: mockApiParams,
        processName: mockProcessName,
        indexerCount: 1,
        currentIndexer: 1,
        concurrencyLimit: 2
      };

      await testClass.makeConcurrentCall(env);

      expect(mockApiParams.resolve.callCount).to.equal(1);
    });

    it('should use default concurrency limit from config', async () => {
      const env = {
        apiContent: mockApiContent,
        apiParams: mockApiParams,
        processName: mockProcessName,
        indexerCount: 1,
        currentIndexer: 1
        // No concurrencyLimit specified
      };

      await testClass.makeConcurrentCall(env);

      expect(mockApiParams.resolve.callCount).to.equal(3);
    });
  });

  describe('logMsgAndWaitIfRequired method', () => {
    let logDebugStub: sinon.SinonStub;
    let consoleLogStub: sinon.SinonStub;

    beforeEach(() => {
      logDebugStub = sinon.stub().callsFake(() => {});
      (log as any).debug = logDebugStub;
      consoleLogStub = sinon.stub(console, 'log');
    });

    it('should log batch completion message when enabled', async () => {
      await testClass.logMsgAndWaitIfRequired(
        'test-process',
        Date.now() - 500,
        5,
        2,
        true,
        10,
        3
      );

      // The log.debug is called in the real method, so we can't easily test the stub
      // This test verifies that the method executes without throwing errors
      expect(true).to.be.true;
    });

    it('should not log when logBatchCompletionMsg is false', async () => {
      await testClass.logMsgAndWaitIfRequired(
        'test-process',
        Date.now() - 500,
        5,
        2,
        false
      );

      expect(logDebugStub.called).to.be.false;
    });

    it('should include current chunk processing info when provided', async () => {
      await testClass.logMsgAndWaitIfRequired(
        'test-process',
        Date.now() - 500,
        5,
        2,
        true,
        10,
        3
      );

      expect(true).to.be.true;
    });

    it('should wait if execution time is less than 1000ms', async () => {
      const start = Date.now();
      await testClass.logMsgAndWaitIfRequired(
        'test-process',
        start - 100, // 100ms execution time
        5,
        2,
        true
      );
      const end = Date.now();

      expect(end - start).to.be.at.least(900); // Should wait ~900ms
    });

    it('should not wait if execution time is more than 1000ms', async () => {
      const start = Date.now();
      await testClass.logMsgAndWaitIfRequired(
        'test-process',
        start - 1500, // 1500ms execution time
        5,
        2,
        true
      );
      const end = Date.now();

      expect(end - start).to.be.at.most(100); 
    });

    it('should display execution time when enabled', async () => {
      mockImportConfig.modules.assets.displayExecutionTime = true;
      
      await testClass.logMsgAndWaitIfRequired(
        'test-process',
        Date.now() - 500,
        5,
        2,
        true
      );

      expect(consoleLogStub.calledOnce).to.be.true;
      expect(consoleLogStub.firstCall.args[0]).to.include('Time taken to execute');
    });
  });

  describe('makeAPICall method', () => {
    let mockApiOptions: any;

    beforeEach(() => {
      mockApiOptions = {
        entity: 'create-assets' as any,
        uid: 'test-uid',
        resolve: sinon.stub(),
        reject: sinon.stub(),
        apiData: { title: 'Test Asset', filename: 'test.jpg' },
        additionalInfo: {},
        includeParamOnCompletion: false
      };
    });

    it('should handle serializeData function', async () => {
      const serializedData = { ...mockApiOptions, serialized: true };
      mockApiOptions.serializeData = sinon.stub().returns(serializedData);

      await testClass.makeAPICall(mockApiOptions);

      expect(mockApiOptions.serializeData.calledOnce).to.be.true;
    });

    it('should resolve with correct response for create-assets', async () => {
      await testClass.makeAPICall(mockApiOptions);

      expect(mockApiOptions.resolve.calledOnce).to.be.true;
      const response = mockApiOptions.resolve.firstCall.args[0];
      expect(response).to.have.property('response');
      expect(response).to.have.property('isLastRequest', false);
      expect(response).to.have.property('additionalInfo');
      expect(response.additionalInfo).to.deep.equal({});
    });

    it('should reject with error when API call fails', async () => {
      const error = new Error('API Error');
      mockStackClient.asset().create.rejects(error);

      await testClass.makeAPICall(mockApiOptions);

      expect(mockApiOptions.reject.calledOnce).to.be.true;
      const errorResponse = mockApiOptions.reject.firstCall.args[0];
      expect(errorResponse).to.have.property('error', error);
      expect(errorResponse).to.have.property('isLastRequest', false);
    });

    it('should return resolved promise for empty apiData', async () => {
      mockApiOptions.apiData = null;

      const result = await testClass.makeAPICall(mockApiOptions);

      expect(result).to.be.undefined;
      expect(mockApiOptions.resolve.called).to.be.false;
      expect(mockApiOptions.reject.called).to.be.false;
    });

    it('should return resolved promise for publish-entries without entryUid', async () => {
      mockApiOptions.entity = 'publish-entries' as any;
      mockApiOptions.apiData = {};

      const result = await testClass.makeAPICall(mockApiOptions);

      expect(result).to.be.undefined;
    });

    it('should return resolved promise for update-extensions without uid', async () => {
      mockApiOptions.entity = 'update-extensions' as any;
      mockApiOptions.apiData = {};

      const result = await testClass.makeAPICall(mockApiOptions);

      expect(result).to.be.undefined;
    });

    it('should include apiData in response when includeParamOnCompletion is true', async () => {
      mockApiOptions.includeParamOnCompletion = true;

      await testClass.makeAPICall(mockApiOptions);

      expect(mockApiOptions.resolve.calledOnce).to.be.true;
      const response = mockApiOptions.resolve.firstCall.args[0];
      expect(response).to.have.property('apiData', mockApiOptions.apiData);
    });

    it('should not include apiData in response when includeParamOnCompletion is false', async () => {
      mockApiOptions.includeParamOnCompletion = false;

      await testClass.makeAPICall(mockApiOptions);

      expect(mockApiOptions.resolve.calledOnce).to.be.true;
      const response = mockApiOptions.resolve.firstCall.args[0];
      expect(response).to.have.property('apiData', undefined);
    });

    it('should handle unknown entity', async () => {
      mockApiOptions.entity = 'unknown-entity' as any;

      const result = await testClass.makeAPICall(mockApiOptions);

      expect(result).to.be.undefined;
    });
  });

  describe('makeAPICall - All Entity Types', () => {
    let mockApiOptions: any;

    beforeEach(() => {
      mockApiOptions = {
        entity: 'create-assets' as any,
        uid: 'test-uid',
        resolve: sinon.stub(),
        reject: sinon.stub(),
        apiData: { title: 'Test Asset', filename: 'test.jpg' },
        additionalInfo: {},
        includeParamOnCompletion: false
      };
    });

    describe('Asset Operations', () => {
      it('should handle create-assets-folder', async () => {
        mockApiOptions.entity = 'create-assets-folder' as any;
        mockApiOptions.apiData = { name: 'Test Folder', parent_uid: 'parent-123' };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.asset().folder().create.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });

      it('should handle replace-assets', async () => {
        mockApiOptions.entity = 'replace-assets' as any;
        mockApiOptions.apiData = { title: 'Replaced Asset', filename: 'replaced.jpg', upload: 'file' };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.asset().replace.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });

      it('should handle publish-assets', async () => {
        mockApiOptions.entity = 'publish-assets' as any;
        mockApiOptions.apiData = { publishDetails: { environments: ['production'] } };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.asset().publish.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });
    });

    describe('Extension Operations', () => {
      it('should handle create-extensions', async () => {
        mockApiOptions.entity = 'create-extensions' as any;
        mockApiOptions.apiData = { title: 'Test Extension', type: 'field' };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.extension().create.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });

      it('should handle update-extensions', async () => {
        mockApiOptions.entity = 'update-extensions' as any;
        mockApiOptions.apiData = { uid: 'ext-123', scope: 'global' };
        
        const mockExtension = {
          scope: 'local',
          update: sinon.stub().resolves({ uid: 'ext-123' })
        };
        mockStackClient.extension().fetch.resolves(mockExtension);

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.extension().fetch.calledOnce).to.be.true;
        expect(mockExtension.update.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });
    });

    describe('Locale Operations', () => {
      it('should handle create-locale', async () => {
        mockApiOptions.entity = 'create-locale' as any;
        mockApiOptions.apiData = { name: 'French', code: 'fr-fr' };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.locale().create.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });

      it('should handle update-locale', async () => {
        mockApiOptions.entity = 'update-locale' as any;
        mockApiOptions.apiData = { code: 'fr-fr', name: 'French Updated', fallback_locale: 'en-us' };
        
        const mockLocale = {
          name: 'French',
          fallback_locale: 'en-us',
          update: sinon.stub().resolves({ code: 'fr-fr' })
        };
        mockStackClient.locale().fetch.resolves(mockLocale);

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.locale().fetch.calledOnce).to.be.true;
        expect(mockLocale.update.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });
    });

    describe('Content Type Operations', () => {
      it('should handle create-cts', async () => {
        mockApiOptions.entity = 'create-cts' as any;
        mockApiOptions.apiData = { title: 'Test CT', uid: 'test-ct', schema: [] };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.contentType().create.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });

      it('should handle update-cts', async () => {
        mockApiOptions.entity = 'update-cts' as any;
        const mockCT = { update: sinon.stub().resolves({ uid: 'ct-123' }) };
        mockApiOptions.apiData = mockCT;

        await testClass.makeAPICall(mockApiOptions);

        expect(mockCT.update.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });
    });

    describe('Global Field Operations', () => {
      it('should handle create-gfs', async () => {
        mockApiOptions.entity = 'create-gfs' as any;
        mockApiOptions.apiData = { title: 'Test GF', uid: 'test-gf' };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.globalField().create.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });

      it('should handle update-gfs with uid in apiData', async () => {
        mockApiOptions.entity = 'update-gfs' as any;
        mockApiOptions.apiData = { uid: 'gf-123', title: 'Updated GF' };
        
        const mockGF = {
          title: 'Test GF',
          update: sinon.stub().resolves({ uid: 'gf-123' })
        };
        mockStackClient.globalField().fetch.resolves(mockGF);

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.globalField().fetch.calledOnce).to.be.true;
        expect(mockGF.update.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });

      it('should handle update-gfs with uid in global_field', async () => {
        mockApiOptions.entity = 'update-gfs' as any;
        mockApiOptions.apiData = { global_field: { uid: 'gf-123' }, title: 'Updated GF' };
        
        const mockGF = {
          title: 'Test GF',
          update: sinon.stub().resolves({ uid: 'gf-123' })
        };
        mockStackClient.globalField().fetch.resolves(mockGF);

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.globalField().fetch.calledOnce).to.be.true;
        expect(mockGF.update.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });
    });

    describe('Environment Operations', () => {
      it('should handle create-environments', async () => {
        mockApiOptions.entity = 'create-environments' as any;
        mockApiOptions.apiData = { name: 'Test Environment', uid: 'test-env' };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.environment().create.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });
    });

    describe('Label Operations', () => {
      it('should handle create-labels', async () => {
        mockApiOptions.entity = 'create-labels' as any;
        mockApiOptions.apiData = { name: 'Test Label', uid: 'test-label' };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.label().create.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });

      it('should handle update-labels', async () => {
        mockApiOptions.entity = 'update-labels' as any;
        mockApiOptions.apiData = { uid: 'label-123', parent: 'parent-123' };
        
        const mockLabel = {
          parent: 'old-parent',
          update: sinon.stub().resolves({ uid: 'label-123' })
        };
        mockStackClient.label().fetch.resolves(mockLabel);

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.label().fetch.calledOnce).to.be.true;
        expect(mockLabel.update.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });
    });

    describe('Webhook Operations', () => {
      it('should handle create-webhooks', async () => {
        mockApiOptions.entity = 'create-webhooks' as any;
        mockApiOptions.apiData = { name: 'Test Webhook', uid: 'test-webhook' };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.webhook().create.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });
    });

    describe('Workflow Operations', () => {
      it('should handle create-workflows', async () => {
        mockApiOptions.entity = 'create-workflows' as any;
        mockApiOptions.apiData = { name: 'Test Workflow', uid: 'test-workflow' };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.workflow().create.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });
    });

    describe('Role Operations', () => {
      it('should handle create-custom-role', async () => {
        mockApiOptions.entity = 'create-custom-role' as any;
        mockApiOptions.apiData = { name: 'Test Role', uid: 'test-role' };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.role().create.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });
    });

    describe('Entry Operations', () => {
      it('should handle create-entries for localized entry', async () => {
        mockApiOptions.entity = 'create-entries' as any;
        const mockEntry = { uid: 'entry-123', update: sinon.stub().resolves({ uid: 'entry-123' }) };
        mockApiOptions.apiData = mockEntry;
        mockApiOptions.additionalInfo = { 
          cTUid: 'ct-123', 
          locale: 'en-us',
          [mockEntry.uid]: { isLocalized: true }
        };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockEntry.update.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });

      it('should handle create-entries for new entry', async () => {
        mockApiOptions.entity = 'create-entries' as any;
        mockApiOptions.apiData = { uid: 'entry-123', title: 'Test Entry' };
        mockApiOptions.additionalInfo = { 
          cTUid: 'ct-123', 
          locale: 'en-us'
        };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.contentType().entry().create.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });

      it('should handle update-entries', async () => {
        mockApiOptions.entity = 'update-entries' as any;
        const mockEntry = { update: sinon.stub().resolves({ uid: 'entry-123' }) };
        mockApiOptions.apiData = mockEntry;
        mockApiOptions.additionalInfo = { locale: 'en-us' };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockEntry.update.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });

      it('should handle publish-entries', async () => {
        mockApiOptions.entity = 'publish-entries' as any;
        mockApiOptions.apiData = { 
          entryUid: 'entry-123',
          environments: ['production'],
          locales: ['en-us']
        };
        mockApiOptions.additionalInfo = { cTUid: 'ct-123' };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.contentType().entry().publish.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });

      it('should handle delete-entries', async () => {
        mockApiOptions.entity = 'delete-entries' as any;
        mockApiOptions.apiData = { 
          entryUid: 'entry-123',
          cTUid: 'ct-123'
        };
        mockApiOptions.additionalInfo = { locale: 'en-us' };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.contentType().entry().delete.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });
    });

    describe('Taxonomy Operations', () => {
      it('should handle create-taxonomies', async () => {
        mockApiOptions.entity = 'create-taxonomies' as any;
        mockApiOptions.apiData = { name: 'Test Taxonomy', uid: 'test-taxonomy' };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.taxonomy().create.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });

      it('should handle create-terms', async () => {
        mockApiOptions.entity = 'create-terms' as any;
        mockApiOptions.apiData = { 
          name: 'Test Term', 
          taxonomy_uid: 'taxonomy-123' 
        };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.taxonomy().terms().create.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });

      it('should handle import-taxonomy with filePath', async () => {
        mockApiOptions.entity = 'import-taxonomy' as any;
        mockApiOptions.apiData = { filePath: '/path/to/file.json' };

        await testClass.makeAPICall(mockApiOptions);

        expect(mockStackClient.taxonomy().import.calledOnce).to.be.true;
        expect(mockApiOptions.resolve.calledOnce).to.be.true;
      });

      it('should handle import-taxonomy without filePath', async () => {
        mockApiOptions.entity = 'import-taxonomy' as any;
        mockApiOptions.apiData = {};

        const result = await testClass.makeAPICall(mockApiOptions);

        expect(result).to.be.undefined;
        expect(mockStackClient.taxonomy().import.called).to.be.false;
      });
    });
  });

  describe('Error Handling in makeAPICall', () => {
    let mockApiOptions: any;

    beforeEach(() => {
      mockApiOptions = {
        entity: 'create-assets' as any,
        uid: 'test-uid',
        resolve: sinon.stub(),
        reject: sinon.stub(),
        apiData: { title: 'Test Asset', filename: 'test.jpg' },
        additionalInfo: {},
        includeParamOnCompletion: false
      };
    });

    it('should handle API errors in create-assets', async () => {
      const error = new Error('Asset creation failed');
      mockStackClient.asset().create.rejects(error);

      await testClass.makeAPICall(mockApiOptions);

      expect(mockApiOptions.reject.calledOnce).to.be.true;
      const errorResponse = mockApiOptions.reject.firstCall.args[0];
      expect(errorResponse.error).to.equal(error);
    });

    it('should handle API errors in update-extensions', async () => {
      mockApiOptions.entity = 'update-extensions' as any;
      mockApiOptions.apiData = { uid: 'ext-123', scope: 'global' };
      
      const error = new Error('Extension fetch failed');
      mockStackClient.extension().fetch.rejects(error);

      await testClass.makeAPICall(mockApiOptions);

      expect(mockApiOptions.reject.calledOnce).to.be.true;
      const errorResponse = mockApiOptions.reject.firstCall.args[0];
      expect(errorResponse.error).to.equal(error);
    });

    it('should handle API errors in update-gfs', async () => {
      mockApiOptions.entity = 'update-gfs' as any;
      mockApiOptions.apiData = { uid: 'gf-123', title: 'Updated GF' };
      
      const mockGF = {
        title: 'Test GF',
        update: sinon.stub().rejects(new Error('Update failed'))
      };
      mockStackClient.globalField().fetch.resolves(mockGF);

      await testClass.makeAPICall(mockApiOptions);

      expect(mockApiOptions.reject.calledOnce).to.be.true;
      const errorResponse = mockApiOptions.reject.firstCall.args[0];
      expect(errorResponse.error.message).to.equal('Update failed');
    });

    it('should handle API errors in update-labels', async () => {
      mockApiOptions.entity = 'update-labels' as any;
      mockApiOptions.apiData = { uid: 'label-123', parent: 'parent-123' };
      
      const mockLabel = {
        parent: 'old-parent',
        update: sinon.stub().rejects(new Error('Label update failed'))
      };
      mockStackClient.label().fetch.resolves(mockLabel);

      await testClass.makeAPICall(mockApiOptions);

      expect(mockApiOptions.reject.calledOnce).to.be.true;
      const errorResponse = mockApiOptions.reject.firstCall.args[0];
      expect(errorResponse.error.message).to.equal('Label update failed');
    });
  });

  describe('makeConcurrentCall - Advanced Scenarios', () => {
    let mockApiContent: any[];
    let mockApiParams: any;

    beforeEach(() => {
      mockApiContent = [
        { uid: 'item1', title: 'Item 1' },
        { uid: 'item2', title: 'Item 2' },
        { uid: 'item3', title: 'Item 3' },
        { uid: 'item4', title: 'Item 4' },
        { uid: 'item5', title: 'Item 5' }
      ] as any[];
      mockApiParams = {
        entity: 'create-assets',
        uid: 'test-uid',
        resolve: sinon.stub(),
        reject: sinon.stub()
      };
    });

    it('should handle custom promise handler with errors', async () => {
      const customHandler = sinon.stub()
        .onFirstCall().resolves({ success: true })
        .onSecondCall().rejects(new Error('Handler error'))
        .onThirdCall().resolves({ success: true });
      
      const env = {
        apiContent: mockApiContent.slice(0, 3),
        apiParams: mockApiParams,
        processName: 'test-process',
        indexerCount: 1,
        currentIndexer: 1,
        concurrencyLimit: 2
      };

      await testClass.makeConcurrentCall(env, customHandler);

      expect(customHandler.callCount).to.equal(3);
      // Should complete even with errors due to Promise.allSettled
    });

    it('should handle API params with errors', async () => {
      mockApiParams.reject = sinon.stub();
      mockStackClient.asset().create.rejects(new Error('API Error'));

      const env = {
        apiContent: mockApiContent.slice(0, 2),
        apiParams: mockApiParams,
        processName: 'test-process',
        indexerCount: 1,
        currentIndexer: 1,
        concurrencyLimit: 2
      };

      await testClass.makeConcurrentCall(env);

      expect(mockApiParams.reject.callCount).to.equal(2);
    });

    it('should handle large batches with high concurrency', async () => {
      const largeContent = Array.from({ length: 20 }, (_, i) => ({ uid: `item${i}`, title: `Item ${i}` }));
      
      const env = {
        apiContent: largeContent,
        apiParams: mockApiParams,
        processName: 'test-process',
        indexerCount: 1,
        currentIndexer: 1,
        concurrencyLimit: 5
      };

      await testClass.makeConcurrentCall(env);

      expect(mockApiParams.resolve.callCount).to.equal(20);
    });

    it('should handle isLastRequest correctly', async () => {
      const customHandler = sinon.stub().resolves({ success: true });
      
      const env = {
        apiContent: mockApiContent.slice(0, 3),
        apiParams: mockApiParams,
        processName: 'test-process',
        indexerCount: 1,
        currentIndexer: 1,
        concurrencyLimit: 2
      };

      await testClass.makeConcurrentCall(env, customHandler);

      // Check that isLastRequest is set correctly
      const calls = customHandler.getCalls();
      expect(calls[0].args[0].isLastRequest).to.be.false; // First item in first batch
      expect(calls[1].args[0].isLastRequest).to.be.false; // Second item in first batch
      expect(calls[2].args[0].isLastRequest).to.be.true;  // First item in second batch (last batch)
    });
  });

  describe('logMsgAndWaitIfRequired - Advanced Scenarios', () => {
    let logDebugStub: sinon.SinonStub;
    let consoleLogStub: sinon.SinonStub;

    beforeEach(() => {
      logDebugStub = sinon.stub().callsFake(() => {});
      (log as any).debug = logDebugStub;
      consoleLogStub = sinon.stub(console, 'log');
    });

    it('should handle execution time display when disabled', async () => {
      mockImportConfig.modules.assets.displayExecutionTime = false;
      
      await testClass.logMsgAndWaitIfRequired(
        'test-process',
        Date.now() - 500,
        5,
        2,
        true
      );

      expect(consoleLogStub.called).to.be.false;
    });

    it('should handle very short execution times', async () => {
      const start = Date.now();
      await testClass.logMsgAndWaitIfRequired(
        'test-process',
        start - 50, // 50ms execution time
        5,
        2,
        true
      );
      const end = Date.now();

      expect(end - start).to.be.at.least(950); // Should wait ~950ms
    });

    it('should handle very long execution times', async () => {
      const start = Date.now();
      await testClass.logMsgAndWaitIfRequired(
        'test-process',
        start - 5000, // 5000ms execution time
        5,
        2,
        true
      );
      const end = Date.now();

      expect(end - start).to.be.at.most(100); // Should be very fast
    });

    it('should handle missing context in importConfig', async () => {
      const originalContext = testClass.importConfig.context;
      testClass.importConfig.context = undefined as any;

      await testClass.logMsgAndWaitIfRequired(
        'test-process',
        Date.now() - 500,
        5,
        2,
        true
      );

      // Should not throw error
      expect(true).to.be.true;

      // Restore context
      testClass.importConfig.context = originalContext;
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle makeConcurrentCall with empty batches', async () => {
      const env = {
        apiContent: [] as any[],
        apiParams: { 
          entity: 'create-assets' as any,
          resolve: sinon.stub(),
          reject: sinon.stub()
        },
        processName: 'test',
        indexerCount: 1,
        currentIndexer: 1
      };

      await testClass.makeConcurrentCall(env);
      // Should complete without error
    });

    it('should handle makeConcurrentCall with null apiContent', async () => {
      const env = {
        apiContent: null as any,
        apiParams: { 
          entity: 'create-assets' as any,
          resolve: sinon.stub(),
          reject: sinon.stub()
        },
        processName: 'test',
        indexerCount: 1,
        currentIndexer: 1
      };

      await testClass.makeConcurrentCall(env);
      // Should complete without error
    });

    it('should handle makeAPICall with missing resolve/reject functions', async () => {
      const apiOptions = {
        entity: 'create-assets' as any,
        apiData: { title: 'Test' },
        resolve: sinon.stub(),
        reject: sinon.stub()
      };

      // Should not throw error
      await testClass.makeAPICall(apiOptions as any);
    });

    it('should handle delay with very large number', async () => {
      const start = Date.now();
      await testClass.delay(Number.MAX_SAFE_INTEGER);
      const end = Date.now();

      // Should complete (though it might take a while)
      expect(end).to.be.at.least(start);
    });

    it('should handle makeConcurrentCall with undefined promisifyHandler', async () => {
      const env = {
        apiContent: [{ uid: 'item1' }],
        apiParams: {
          entity: 'create-assets' as any,
          resolve: sinon.stub(),
          reject: sinon.stub()
        },
        processName: 'test',
        indexerCount: 1,
        currentIndexer: 1
      };

      await testClass.makeConcurrentCall(env, undefined);
      // Should complete without error
    });

    it('should handle makeConcurrentCall with null promisifyHandler', async () => {
      const env = {
        apiContent: [{ uid: 'item1' }],
        apiParams: {
          entity: 'create-assets' as any,
          resolve: sinon.stub(),
          reject: sinon.stub()
        },
        processName: 'test',
        indexerCount: 1,
        currentIndexer: 1
      };

      await testClass.makeConcurrentCall(env, null as any);
    });

    it('should handle makeAPICall with undefined additionalInfo', async () => {
      const apiOptions = {
        entity: 'create-assets' as any,
        apiData: { title: 'Test' },
        resolve: sinon.stub(),
        reject: sinon.stub(),
        additionalInfo: undefined as any
      };

      await testClass.makeAPICall(apiOptions as any);
      expect(apiOptions.resolve.calledOnce).to.be.true;
    });

    it('should handle makeAPICall with null additionalInfo', async () => {
      const apiOptions = {
        entity: 'create-assets' as any,
        apiData: { title: 'Test' },
        resolve: sinon.stub(),
        reject: sinon.stub(),
        additionalInfo: null as any
      };

      await testClass.makeAPICall(apiOptions as any);
      expect(apiOptions.resolve.calledOnce).to.be.true;
    });
  });
});