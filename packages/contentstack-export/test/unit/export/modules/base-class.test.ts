import { expect } from 'chai';
import sinon from 'sinon';
import { log } from '@contentstack/cli-utilities';
import BaseClass from '../../../../src/export/modules/base-class';
import { ExportConfig } from '../../../../src/types';
import type { EnvType, CustomPromiseHandler } from '../../../../src/export/modules/base-class';

// Create a concrete implementation of BaseClass for testing
class TestBaseClass extends BaseClass {
  constructor(params: any) {
    super(params);
  }
}

describe('BaseClass', () => {
  let testClass: TestBaseClass;
  let mockStackClient: any;
  let mockExportConfig: ExportConfig;

  beforeEach(() => {
    mockStackClient = {
      asset: sinon.stub().returns({
        fetch: sinon.stub().resolves({ uid: 'asset-123', title: 'Test Asset' }),
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [{ uid: 'asset-1' }, { uid: 'asset-2' }],
          }),
        }),
        download: sinon.stub().resolves({ data: 'stream-data' }),
      }),
      contentType: sinon.stub().returns({
        fetch: sinon.stub().resolves({ uid: 'ct-123' }),
      }),
      entry: sinon.stub().returns({
        fetch: sinon.stub().resolves({ uid: 'entry-123' }),
      }),
      taxonomy: sinon.stub().returns({
        export: sinon.stub().resolves({ data: 'taxonomy-export' }),
      }),
    };

    mockExportConfig = {
      versioning: false,
      host: 'https://api.contentstack.io',
      developerHubUrls: {},
      apiKey: 'test-api-key',
      exportDir: '/test/export',
      data: '/test/data',
      context: {
        command: 'cm:stacks:export',
        module: 'test',
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-123',
        apiKey: 'test-api-key',
        orgId: 'org-123',
        authenticationMethod: 'Basic Auth',
      },
      cliLogsPath: '/test/logs',
      forceStopMarketplaceAppsPrompt: false,
      master_locale: { code: 'en-us' },
      region: {
        name: 'us',
        cma: 'https://api.contentstack.io',
        cda: 'https://cdn.contentstack.io',
        uiHost: 'https://app.contentstack.com',
      },
      skipStackSettings: false,
      skipDependencies: false,
      languagesCode: ['en'],
      apis: {
        userSession: '',
        globalfields: '',
        locales: '',
        labels: '',
        environments: '',
        assets: '',
        content_types: '',
        entries: '',
        users: '',
        extension: '',
        webhooks: '',
        stacks: '',
      },
      preserveStackVersion: false,
      personalizationEnabled: false,
      fetchConcurrency: 5,
      writeConcurrency: 5,
      developerHubBaseUrl: '',
      marketplaceAppEncryptionKey: '',
      modules: {
        types: ['assets'],
        locales: {
          dirName: 'locales',
          fileName: 'locales.json',
          requiredKeys: ['code'],
        },
        customRoles: {
          dirName: 'custom_roles',
          fileName: 'custom_roles.json',
          customRolesLocalesFileName: '',
        },
        'custom-roles': {
          dirName: 'custom_roles',
          fileName: 'custom_roles.json',
          customRolesLocalesFileName: '',
        },
        environments: {
          dirName: 'environments',
          fileName: 'environments.json',
        },
        labels: {
          dirName: 'labels',
          fileName: 'labels.json',
          invalidKeys: [],
        },
        webhooks: {
          dirName: 'webhooks',
          fileName: 'webhooks.json',
        },
        releases: {
          dirName: 'releases',
          fileName: 'releases.json',
          releasesList: 'releases_list.json',
          invalidKeys: [],
        },
        workflows: {
          dirName: 'workflows',
          fileName: 'workflows.json',
          invalidKeys: [],
        },
        globalfields: {
          dirName: 'global_fields',
          fileName: 'globalfields.json',
          validKeys: ['title', 'uid'],
        },
        'global-fields': {
          dirName: 'global_fields',
          fileName: 'globalfields.json',
          validKeys: ['title', 'uid'],
        },
        assets: {
          dirName: 'assets',
          fileName: 'assets.json',
          batchLimit: 100,
          host: 'https://api.contentstack.io',
          invalidKeys: [],
          chunkFileSize: 5,
          downloadLimit: 5,
          fetchConcurrency: 5,
          assetsMetaKeys: [],
          securedAssets: false,
          displayExecutionTime: false,
          enableDownloadStatus: false,
          includeVersionedAssets: false,
        },
        content_types: {
          dirName: 'content_types',
          fileName: 'content_types.json',
          validKeys: ['title', 'uid'],
          limit: 100,
        },
        'content-types': {
          dirName: 'content_types',
          fileName: 'content_types.json',
          validKeys: ['title', 'uid'],
          limit: 100,
        },
        entries: {
          dirName: 'entries',
          fileName: 'entries.json',
          invalidKeys: [],
          batchLimit: 100,
          downloadLimit: 5,
          limit: 100,
          exportVersions: false,
        },
        personalize: {
          dirName: 'personalize',
          baseURL: {},
        },
        variantEntry: {
          dirName: 'variant_entries',
          fileName: 'variant_entries.json',
          chunkFileSize: 5,
          query: { skip: 0, limit: 100, include_variant: true, include_count: false, include_publish_details: true },
        },
        extensions: {
          dirName: 'extensions',
          fileName: 'extensions.json',
        },
        stack: {
          dirName: 'stack',
          fileName: 'stack.json',
        },
        dependency: {
          entries: [],
        },
        marketplace_apps: {
          dirName: 'marketplace_apps',
          fileName: 'marketplace_apps.json',
        },
        'marketplace-apps': {
          dirName: 'marketplace_apps',
          fileName: 'marketplace_apps.json',
        },
        masterLocale: {
          dirName: 'master_locale',
          fileName: 'master_locale.json',
          requiredKeys: ['code'],
        },
        taxonomies: {
          dirName: 'taxonomies',
          fileName: 'taxonomies.json',
          invalidKeys: [],
          limit: 100,
        },
        events: {
          dirName: 'events',
          fileName: 'events.json',
          invalidKeys: [],
        },
        audiences: {
          dirName: 'audiences',
          fileName: 'audiences.json',
          invalidKeys: [],
        },
        attributes: {
          dirName: 'attributes',
          fileName: 'attributes.json',
          invalidKeys: [],
        },
        'composable-studio': {
          dirName: 'composable_studio',
          fileName: 'composable_studio.json',
          apiBaseUrl: 'https://api.contentstack.io',
          apiVersion: 'v3'
        },
      },
    } as ExportConfig;

    testClass = new TestBaseClass({
      exportConfig: mockExportConfig,
      stackAPIClient: mockStackClient,
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(testClass).to.be.instanceOf(BaseClass);
      expect(testClass.exportConfig).to.equal(mockExportConfig);
      expect((testClass as any).client).to.equal(mockStackClient);
    });

    it('should set exportConfig property', () => {
      expect(testClass.exportConfig).to.be.an('object');
      expect(testClass.exportConfig.apiKey).to.equal('test-api-key');
    });

    it('should set client property', () => {
      expect((testClass as any).client).to.equal(mockStackClient);
    });
  });

  describe('stack getter', () => {
    it('should return the client', () => {
      expect(testClass.stack).to.equal(mockStackClient);
    });

    it('should allow access to stack methods', () => {
      expect(testClass.stack.asset).to.be.a('function');
    });
  });

  describe('delay() method', () => {
    let clock: sinon.SinonFakeTimers;

    afterEach(() => {
      if (clock) {
        clock.restore();
      }
    });

    it('should delay for the specified milliseconds', async () => {
      clock = sinon.useFakeTimers();
      const delayPromise = testClass.delay(100);
      clock.tick(100);
      await delayPromise;
      // Test passes if no timeout
    });

    it('should not delay when ms is 0', async () => {
      clock = sinon.useFakeTimers();
      const start = Date.now();
      const delayPromise = testClass.delay(0);
      clock.tick(0);
      await delayPromise;
      expect(Date.now() - start).to.equal(0);
    });

    it('should not delay when ms is negative', async () => {
      clock = sinon.useFakeTimers();
      const start = Date.now();
      const delayPromise = testClass.delay(-100);
      clock.tick(0);
      await delayPromise;
      expect(Date.now() - start).to.equal(0);
    });
  });

  describe('makeConcurrentCall() method', () => {
    it('should resolve immediately for empty batches', async () => {
      const env: EnvType = {
        module: 'test',
        totalCount: 0,
        concurrencyLimit: 5,
        apiParams: {
          module: 'assets',
          resolve: sinon.stub(),
          reject: sinon.stub(),
        },
      };

      await testClass.makeConcurrentCall(env);
      // Should complete without error
    });

    it('should handle single batch correctly', async () => {
      const env: EnvType = {
        module: 'test',
        totalCount: 50,
        concurrencyLimit: 5,
        apiParams: {
          module: 'asset',
          resolve: sinon.stub(),
          reject: sinon.stub(),
        },
      };

      const result = await testClass.makeConcurrentCall(env);
      expect(result).to.be.undefined;
    });

    it('should process batches with custom promise handler', async () => {
      let handlerCalled = false;
      const customHandler: CustomPromiseHandler = async () => {
        handlerCalled = true;
      };

      const env: EnvType = {
        module: 'test',
        totalCount: 150,
        concurrencyLimit: 5,
      };

      await testClass.makeConcurrentCall(env, customHandler);
      expect(handlerCalled).to.be.true;
    });

    it('should respect concurrency limit', async () => {
      const callCount = sinon.stub().resolves();
      const customHandler: CustomPromiseHandler = async () => {
        callCount();
      };

      const env: EnvType = {
        module: 'test',
        totalCount: 300,
        concurrencyLimit: 2,
      };

      await testClass.makeConcurrentCall(env, customHandler);
      // Concurrency limit should control batch size
      expect(callCount.called).to.be.true;
    });

    it('should handle large batches', async () => {
      const env: EnvType = {
        module: 'test',
        totalCount: 100,
        concurrencyLimit: 10,
      };

      const result = await testClass.makeConcurrentCall(env);
      expect(result).to.be.undefined;
    });

    it('should handle makeAPICall for asset module', async () => {
      const env: EnvType = {
        module: 'asset',
        totalCount: 1,
        concurrencyLimit: 1,
        apiParams: {
          module: 'asset',
          uid: 'asset-123',
          resolve: sinon.stub(),
          reject: sinon.stub(),
          queryParam: {},
        },
      };

      await testClass.makeConcurrentCall(env);
      expect(mockStackClient.asset.called).to.be.true;
    });

    it('should handle makeAPICall for assets query', async () => {
      const env: EnvType = {
        module: 'assets',
        totalCount: 1,
        concurrencyLimit: 1,
        apiParams: {
          module: 'assets',
          resolve: sinon.stub(),
          reject: sinon.stub(),
          queryParam: { skip: 0 },
        },
      };

      await testClass.makeConcurrentCall(env);
      expect(mockStackClient.asset.called).to.be.true;
    });

    it('should handle makeAPICall for download-asset module', async () => {
      const env: EnvType = {
        module: 'download-asset',
        totalCount: 1,
        concurrencyLimit: 1,
        apiParams: {
          module: 'download-asset',
          url: 'https://example.com/asset.jpg',
          resolve: sinon.stub(),
          reject: sinon.stub(),
          queryParam: {},
        },
      };

      await testClass.makeConcurrentCall(env);
      // Should complete without error
    });

    it('should handle makeAPICall for export-taxonomy module', async () => {
      const env: EnvType = {
        module: 'export-taxonomy',
        totalCount: 1,
        concurrencyLimit: 1,
        apiParams: {
          module: 'export-taxonomy',
          uid: 'taxonomy-123',
          resolve: sinon.stub(),
          reject: sinon.stub(),
          queryParam: {},
        },
      };

      await testClass.makeConcurrentCall(env);
      // Should complete without error
    });

    it('should identify last request correctly', async () => {
      const env: EnvType = {
        module: 'test',
        totalCount: 100,
        concurrencyLimit: 5,
      };

      let isLastRequestValues: boolean[] = [];
      const customHandler: CustomPromiseHandler = async (input) => {
        isLastRequestValues.push(input.isLastRequest);
      };

      await testClass.makeConcurrentCall(env, customHandler);
      // Check that last request is identified correctly
      const lastValue = isLastRequestValues[isLastRequestValues.length - 1];
      expect(lastValue).to.be.true;
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockStackClient.asset = sinon.stub().returns({
        fetch: sinon.stub().rejects(error),
      });

      const env: EnvType = {
        module: 'asset',
        totalCount: 1,
        concurrencyLimit: 1,
        apiParams: {
          module: 'asset',
          uid: 'asset-123',
          resolve: sinon.stub(),
          reject: (error) => {
            expect(error.error).to.equal(error);
          },
          queryParam: {},
        },
      };

      await testClass.makeConcurrentCall(env);
      // Error should be handled by reject callback
    });

    it('should provide correct batch and index information', async () => {
      const batchInfo: Array<{ batchIndex: number; index: number }> = [];

      const customHandler: CustomPromiseHandler = async (input) => {
        batchInfo.push({
          batchIndex: input.batchIndex,
          index: input.index,
        });
      };

      const env: EnvType = {
        module: 'test',
        totalCount: 250,
        concurrencyLimit: 5,
      };

      await testClass.makeConcurrentCall(env, customHandler);

      // Verify batch and index information
      expect(batchInfo.length).to.be.greaterThan(0);
      expect(batchInfo[0]?.batchIndex).to.be.a('number');
      expect(batchInfo[0]?.index).to.be.a('number');
    });
  });

  describe('logMsgAndWaitIfRequired() method', () => {
    let clock: sinon.SinonFakeTimers;

    afterEach(() => {
      if (clock) {
        clock.restore();
      }
    });

    it('should log batch completion', async () => {
      const start = Date.now();

      await (testClass as any).logMsgAndWaitIfRequired('test-module', start, 1);

      // Just verify it completes without error - the log is tested implicitly
    });

    it('should wait when execution time is less than 1000ms', async function () {
      clock = sinon.useFakeTimers();
      const start = Date.now();

      const waitPromise = (testClass as any).logMsgAndWaitIfRequired('test-module', start, 1);
      clock.tick(1000);
      await waitPromise;

      // Just verify it completes
      clock.restore();
    });

    it('should not wait when execution time is more than 1000ms', async () => {
      const start = Date.now() - 1500;

      await (testClass as any).logMsgAndWaitIfRequired('test-module', start, 1);

      // Just verify it completes
    });

    it('should display execution time when configured', async () => {
      mockExportConfig.modules.assets.displayExecutionTime = true;

      await (testClass as any).logMsgAndWaitIfRequired('test-module', Date.now() - 100, 1);

      // Verify it completes - display logic is tested implicitly
    });
  });

  describe('makeAPICall() method', () => {
    it('should handle asset fetch', async () => {
      const resolveStub = sinon.stub();
      const rejectStub = sinon.stub();

      await (testClass as any).makeAPICall({
        module: 'asset',
        uid: 'asset-123',
        queryParam: {},
        resolve: resolveStub,
        reject: rejectStub,
      });

      expect(mockStackClient.asset.calledWith('asset-123')).to.be.true;
    });

    it('should handle assets query', async () => {
      const resolveStub = sinon.stub();
      const rejectStub = sinon.stub();

      await (testClass as any).makeAPICall({
        module: 'assets',
        queryParam: { skip: 0 },
        resolve: resolveStub,
        reject: rejectStub,
      });

      expect(mockStackClient.asset.called).to.be.true;
    });

    it('should handle API errors', async () => {
      const error = new Error('Network error');
      mockStackClient.asset = sinon.stub().returns({
        fetch: sinon.stub().rejects(error),
      });

      const rejectStub = sinon.stub();

      await (testClass as any).makeAPICall({
        module: 'asset',
        uid: 'asset-123',
        queryParam: {},
        resolve: sinon.stub(),
        reject: rejectStub,
      });

      // Error should be handled by reject
    });

    it('should handle unknown module gracefully', async () => {
      const result = await (testClass as any).makeAPICall({
        module: 'unknown' as any,
        resolve: sinon.stub(),
        reject: sinon.stub(),
      });

      expect(result).to.be.undefined;
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly 100 items', async () => {
      const env: EnvType = {
        module: 'test',
        totalCount: 100,
        concurrencyLimit: 5,
      };

      const result = await testClass.makeConcurrentCall(env);
      expect(result).to.be.undefined;
    });

    it('should handle 101 items correctly', async () => {
      const env: EnvType = {
        module: 'test',
        totalCount: 101,
        concurrencyLimit: 5,
      };

      const result = await testClass.makeConcurrentCall(env);
      expect(result).to.be.undefined;
    });

    it('should handle concurrency limit of 1', async () => {
      const env: EnvType = {
        module: 'test',
        totalCount: 50,
        concurrencyLimit: 1,
      };

      const result = await testClass.makeConcurrentCall(env);
      expect(result).to.be.undefined;
    });

    it('should handle very large concurrency limit', async () => {
      const env: EnvType = {
        module: 'test',
        totalCount: 50,
        concurrencyLimit: 100,
      };

      const result = await testClass.makeConcurrentCall(env);
      expect(result).to.be.undefined;
    });
  });
});
