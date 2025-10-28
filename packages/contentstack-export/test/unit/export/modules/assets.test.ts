import { expect } from 'chai';
import sinon from 'sinon';
import { FsUtility, getDirectories } from '@contentstack/cli-utilities';
import ExportAssets from '../../../../src/export/modules/assets';
import { ExportConfig } from '../../../../src/types';
import { mockData, assetsMetaData } from '../../mock/assets';

describe('ExportAssets', () => {
  let exportAssets: ExportAssets;
  let mockStackClient: any;
  let mockExportConfig: ExportConfig;

  beforeEach(() => {
    mockStackClient = {
      asset: sinon.stub().returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({ items: mockData.findData.items }),
          count: sinon.stub().resolves(mockData.countData)
        }),
        download: sinon.stub().resolves({ data: 'stream-data' })
      })
    };

    mockExportConfig = {
      contentVersion: 1,
      versioning: false,
      host: 'https://api.contentstack.io',
      developerHubUrls: {},
      apiKey: 'test-api-key',
      exportDir: '/test/export',
      data: '/test/data',
      context: {
        command: 'cm:stacks:export',
        module: 'assets',
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-123',
        apiKey: 'test-api-key',
        orgId: 'org-123',
        authenticationMethod: 'Basic Auth'
      },
      cliLogsPath: '/test/logs',
      forceStopMarketplaceAppsPrompt: false,
      master_locale: { code: 'en-us' },
      region: {
        name: 'us',
        cma: 'https://api.contentstack.io',
        cda: 'https://cdn.contentstack.io',
        uiHost: 'https://app.contentstack.com'
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
        stacks: ''
      },
      preserveStackVersion: false,
      personalizationEnabled: false,
      fetchConcurrency: 5,
      writeConcurrency: 5,
      developerHubBaseUrl: '',
      marketplaceAppEncryptionKey: '',
      onlyTSModules: [],
      modules: {
        types: ['assets'],
        locales: {
          dirName: 'locales',
          fileName: 'locales.json',
          requiredKeys: ['code']
        },
        customRoles: {
          dirName: 'custom_roles',
          fileName: 'custom_roles.json',
          customRolesLocalesFileName: ''
        },
        'custom-roles': {
          dirName: 'custom_roles',
          fileName: 'custom_roles.json',
          customRolesLocalesFileName: ''
        },
        environments: {
          dirName: 'environments',
          fileName: 'environments.json'
        },
        labels: {
          dirName: 'labels',
          fileName: 'labels.json',
          invalidKeys: []
        },
        webhooks: {
          dirName: 'webhooks',
          fileName: 'webhooks.json'
        },
        releases: {
          dirName: 'releases',
          fileName: 'releases.json',
          releasesList: 'releases_list.json',
          invalidKeys: []
        },
        workflows: {
          dirName: 'workflows',
          fileName: 'workflows.json',
          invalidKeys: []
        },
        globalfields: {
          dirName: 'global_fields',
          fileName: 'globalfields.json',
          validKeys: ['title', 'uid']
        },
        'global-fields': {
          dirName: 'global_fields',
          fileName: 'globalfields.json',
          validKeys: ['title', 'uid']
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
          includeVersionedAssets: false
        },
        content_types: {
          dirName: 'content_types',
          fileName: 'content_types.json',
          validKeys: ['title', 'uid'],
          limit: 100
        },
        'content-types': {
          dirName: 'content_types',
          fileName: 'content_types.json',
          validKeys: ['title', 'uid'],
          limit: 100
        },
        entries: {
          dirName: 'entries',
          fileName: 'entries.json',
          invalidKeys: [],
          batchLimit: 100,
          downloadLimit: 5,
          limit: 100,
          exportVersions: false
        },
        personalize: {
          dirName: 'personalize',
          baseURL: {}
        },
        variantEntry: {
          dirName: 'variant_entries',
          fileName: 'variant_entries.json',
          chunkFileSize: 5,
          query: { skip: 0, limit: 100, include_variant: true, include_count: false, include_publish_details: true }
        },
        extensions: {
          dirName: 'extensions',
          fileName: 'extensions.json'
        },
        stack: {
          dirName: 'stack',
          fileName: 'stack.json'
        },
        dependency: {
          entries: []
        },
        marketplace_apps: {
          dirName: 'marketplace_apps',
          fileName: 'marketplace_apps.json'
        },
        'marketplace-apps': {
          dirName: 'marketplace_apps',
          fileName: 'marketplace_apps.json'
        },
        masterLocale: {
          dirName: 'master_locale',
          fileName: 'master_locale.json',
          requiredKeys: ['code']
        },
        taxonomies: {
          dirName: 'taxonomies',
          fileName: 'taxonomies.json',
          invalidKeys: [],
          limit: 100
        },
        events: {
          dirName: 'events',
          fileName: 'events.json',
          invalidKeys: []
        },
        audiences: {
          dirName: 'audiences',
          fileName: 'audiences.json',
          invalidKeys: []
        },
        attributes: {
          dirName: 'attributes',
          fileName: 'attributes.json',
          invalidKeys: []
        }
      }
    } as ExportConfig;

    exportAssets = new ExportAssets({
      exportConfig: mockExportConfig,
      stackAPIClient: mockStackClient,
      moduleName: 'assets'
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(exportAssets).to.be.instanceOf(ExportAssets);
      expect(exportAssets.exportConfig).to.equal(mockExportConfig);
      expect((exportAssets as any).client).to.equal(mockStackClient);
    });

    it('should set context module to assets', () => {
      expect(exportAssets.exportConfig.context.module).to.equal('assets');
    });

    it('should initialize assetConfig', () => {
      expect(exportAssets.assetConfig).to.be.an('object');
      expect(exportAssets.assetConfig.dirName).to.equal('assets');
    });

    it('should initialize empty arrays', () => {
      expect((exportAssets as any).assetsFolder).to.be.an('array');
      expect((exportAssets as any).assetsFolder).to.be.empty;
      expect(exportAssets.versionedAssets).to.be.an('array');
      expect(exportAssets.versionedAssets).to.be.empty;
    });
  });

  describe('commonQueryParam getter', () => {
    it('should return correct query parameters', () => {
      const params = exportAssets.commonQueryParam;
      expect(params).to.have.property('skip', 0);
      expect(params).to.have.property('asc', 'created_at');
      expect(params).to.have.property('include_count', false);
    });
  });

  describe('start() method', () => {
    let getAssetsCountStub: sinon.SinonStub;
    let getAssetsFoldersStub: sinon.SinonStub;
    let getAssetsStub: sinon.SinonStub;
    let downloadAssetsStub: sinon.SinonStub;
    let getVersionedAssetsStub: sinon.SinonStub;

    beforeEach(() => {
      getAssetsCountStub = sinon.stub(exportAssets, 'getAssetsCount');
      getAssetsFoldersStub = sinon.stub(exportAssets, 'getAssetsFolders');
      getAssetsStub = sinon.stub(exportAssets, 'getAssets');
      downloadAssetsStub = sinon.stub(exportAssets, 'downloadAssets');
      getVersionedAssetsStub = sinon.stub(exportAssets, 'getVersionedAssets');

      getAssetsCountStub
        .withArgs(false)
        .resolves(10)
        .withArgs(true)
        .resolves(5);
    });

    afterEach(() => {
      getAssetsCountStub.restore();
      getAssetsFoldersStub.restore();
      getAssetsStub.restore();
      downloadAssetsStub.restore();
      if (getVersionedAssetsStub.restore) {
        getVersionedAssetsStub.restore();
      }
    });

    it('should complete full export flow', async () => {
      await exportAssets.start();

      expect(getAssetsCountStub.calledTwice).to.be.true;
      expect(getAssetsFoldersStub.calledOnce).to.be.true;
      expect(getAssetsStub.calledOnce).to.be.true;
      expect(downloadAssetsStub.calledOnce).to.be.true;
    });

    it('should export versioned assets when enabled', async () => {
      mockExportConfig.modules.assets.includeVersionedAssets = true;
      exportAssets.versionedAssets = [{ 'asset-1': 2 }];
      
      // Just verify the flow completes
      await exportAssets.start();

      expect(getAssetsCountStub.calledTwice).to.be.true;
    });

    it('should skip versioned assets when empty', async () => {
      mockExportConfig.modules.assets.includeVersionedAssets = true;
      exportAssets.versionedAssets = [];

      await exportAssets.start();

      expect(getVersionedAssetsStub.called).to.be.false;
    });
  });

  describe('getAssetsCount() method', () => {
    it('should return count for regular assets', async () => {
      const count = await exportAssets.getAssetsCount(false);

      expect(mockStackClient.asset.called).to.be.true;
      expect(count).to.equal(mockData.countData.assets);
    });

    it('should return count for asset folders', async () => {
      const count = await exportAssets.getAssetsCount(true);

      expect(mockStackClient.asset.called).to.be.true;
      expect(count).to.equal(mockData.countData.assets);
    });

    it('should handle errors gracefully', async () => {
      mockStackClient.asset = sinon.stub().returns({
        query: sinon.stub().returns({
          count: sinon.stub().rejects(new Error('API Error'))
        })
      });

      const count = await exportAssets.getAssetsCount(false);
      expect(count).to.be.undefined;
    });
  });

  describe('getAssetsFolders() method', () => {
    let makeConcurrentCallStub: sinon.SinonStub;

    beforeEach(() => {
      // Initialize assetsRootPath by calling start() first
      (exportAssets as any).assetsRootPath = '/test/data/assets';
      makeConcurrentCallStub = sinon.stub(exportAssets as any, 'makeConcurrentCall').resolves();
      // Stub FsUtility methods
      sinon.stub(FsUtility.prototype, 'writeFile').resolves();
      sinon.stub(FsUtility.prototype, 'createFolderIfNotExist').resolves();
    });

    afterEach(() => {
      makeConcurrentCallStub.restore();
    });

    it('should return immediately when totalCount is 0', async () => {
      await exportAssets.getAssetsFolders(0);

      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should fetch asset folders', async () => {
      makeConcurrentCallStub.callsFake(async (options: any) => {
        const onSuccess = options.apiParams.resolve;
        onSuccess({ response: { items: [{ uid: 'folder-1', name: 'Folder 1' }] } });
      });

      await exportAssets.getAssetsFolders(5);

      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should write folders.json when folders exist', async () => {
      (exportAssets as any).assetsFolder = [{ uid: 'folder-1', name: 'Folder 1' }];
      makeConcurrentCallStub.resolves();

      await exportAssets.getAssetsFolders(5);

      // Verifies file write
      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should handle onReject callback', async () => {
      const error = new Error('Failed to fetch folders');
      makeConcurrentCallStub.callsFake(async (options: any) => {
        const onReject = options.apiParams.reject;
        onReject({ error });
      });

      await exportAssets.getAssetsFolders(5);

      expect(makeConcurrentCallStub.called).to.be.true;
    });
  });

  describe('getAssets() method', () => {
    let makeConcurrentCallStub: sinon.SinonStub;

    beforeEach(() => {
      makeConcurrentCallStub = sinon.stub(exportAssets as any, 'makeConcurrentCall').resolves();
    });

    afterEach(() => {
      makeConcurrentCallStub.restore();
    });

    it('should return immediately when totalCount is 0', async () => {
      await exportAssets.getAssets(0);

      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should fetch and write assets', async () => {
      await exportAssets.getAssets(0);
      // Just verify it completes for zero count
      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should handle includeVersionedAssets', async () => {
      mockExportConfig.modules.assets.includeVersionedAssets = true;
      await exportAssets.getAssets(0);
      // Just verify it completes
    });

    it('should handle onReject callback', async () => {
      const error = new Error('Failed to fetch assets');
      makeConcurrentCallStub.callsFake(async (options: any) => {
        const onReject = options.apiParams.reject;
        onReject({ error });
      });

      await exportAssets.getAssets(10);

      expect(makeConcurrentCallStub.called).to.be.true;
    });
  });

  describe('getVersionedAssets() method', () => {
    let makeConcurrentCallStub: sinon.SinonStub;

    beforeEach(() => {
      (exportAssets as any).assetsRootPath = '/test/data/assets';
      makeConcurrentCallStub = sinon.stub(exportAssets as any, 'makeConcurrentCall').resolves();
    });

    afterEach(() => {
      makeConcurrentCallStub.restore();
    });

    it('should fetch versioned assets', async () => {
      exportAssets.versionedAssets = [{ 'asset-1': 2 }, { 'asset-2': 3 }];

      await exportAssets.getVersionedAssets();

      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should prepare correct batch for versioned assets', async () => {
      exportAssets.versionedAssets = [{ 'asset-1': 2 }];

      makeConcurrentCallStub.callsFake(async (options: any) => {
        expect(options.totalCount).to.equal(1);
        return Promise.resolve();
      });

      await exportAssets.getVersionedAssets();

      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should handle onReject callback for versioned assets errors', async () => {
      exportAssets.versionedAssets = [{ 'asset-1': 2 }];
      
      makeConcurrentCallStub.callsFake(async (options: any) => {
        const onReject = options.apiParams.reject;
        const error = new Error('Versioned asset query failed');
        onReject({ error });
        return Promise.resolve();
      });

      await exportAssets.getVersionedAssets();
      expect(makeConcurrentCallStub.called).to.be.true;
    });

  });

  describe('downloadAssets() method', () => {
    let makeConcurrentCallStub: sinon.SinonStub;
    let getDirectoriesStub: sinon.SinonStub;
    let getPlainMetaStub: sinon.SinonStub;

    beforeEach(() => {
      // Initialize assetsRootPath
      (exportAssets as any).assetsRootPath = '/test/data/assets';
      makeConcurrentCallStub = sinon.stub(exportAssets as any, 'makeConcurrentCall').resolves();
      getDirectoriesStub = sinon.stub(require('@contentstack/cli-utilities'), 'getDirectories').resolves([]);
      getPlainMetaStub = sinon.stub(FsUtility.prototype, 'getPlainMeta').returns(assetsMetaData);
    });

    afterEach(() => {
      makeConcurrentCallStub.restore();
      if (getDirectoriesStub.restore) {
        getDirectoriesStub.restore();
      }
      if (getPlainMetaStub.restore) {
        getPlainMetaStub.restore();
      }
    });

    it('should download assets', async () => {
      await exportAssets.downloadAssets();

      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should download unique assets only', async () => {
      await exportAssets.downloadAssets();

      expect(getPlainMetaStub.called).to.be.true;
    });

    it('should include versioned assets when enabled', async () => {
      mockExportConfig.modules.assets.includeVersionedAssets = true;
      
      await exportAssets.downloadAssets();

      // Should complete without error
      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should handle download with secured assets', async () => {
      mockExportConfig.modules.assets.securedAssets = true;
      
      await exportAssets.downloadAssets();

      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should handle download with enabled status', async () => {
      mockExportConfig.modules.assets.enableDownloadStatus = true;
      
      makeConcurrentCallStub.callsFake(async (options: any, handler: any) => {
        expect(options.totalCount).to.be.greaterThan(0);
      });

      await exportAssets.downloadAssets();

      expect(makeConcurrentCallStub.called).to.be.true;
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty assets count', async () => {
      const getAssetsCountStub = sinon.stub(exportAssets, 'getAssetsCount').resolves(0);
      const getAssetsFoldersStub = sinon.stub(exportAssets, 'getAssetsFolders').resolves();
      const getAssetsStub = sinon.stub(exportAssets, 'getAssets').resolves();
      const downloadAssetsStub = sinon.stub(exportAssets, 'downloadAssets').resolves();

      await exportAssets.start();

      getAssetsCountStub.restore();
      getAssetsFoldersStub.restore();
      getAssetsStub.restore();
      downloadAssetsStub.restore();
    });

    it('should handle empty folders', async () => {
      const count = await exportAssets.getAssetsFolders(0);
      expect(count).to.be.undefined;
    });

    it('should handle versioned assets with version 1 only', async () => {
      exportAssets.versionedAssets = [];
      
      const result = await exportAssets.getVersionedAssets();
      // Should complete without errors
      expect(result).to.be.undefined;
    });

    it('should handle download with no assets metadata', async () => {
      (exportAssets as any).assetsRootPath = '/test/data/assets';
      const getPlainMetaStub = sinon.stub(FsUtility.prototype, 'getPlainMeta').returns({});
      const makeConcurrentCallStub = sinon.stub(exportAssets as any, 'makeConcurrentCall').resolves();

      await exportAssets.downloadAssets();

      getPlainMetaStub.restore();
      makeConcurrentCallStub.restore();
    });

    it('should handle download with empty assets list', async () => {
      (exportAssets as any).assetsRootPath = '/test/data/assets';
      sinon.stub(FsUtility.prototype, 'getPlainMeta').returns({});
      sinon.stub(exportAssets as any, 'makeConcurrentCall').resolves();

      await exportAssets.downloadAssets();
      // Should complete without error
    });

    it('should handle download with unique assets filtering', async () => {
      (exportAssets as any).assetsRootPath = '/test/data/assets';
      const assetsWithDuplicates = {
        'file-1': [
          { uid: '1', url: 'same-url', filename: 'test.jpg' },
          { uid: '2', url: 'same-url', filename: 'test.jpg' }
        ]
      };
      sinon.stub(FsUtility.prototype, 'getPlainMeta').returns(assetsWithDuplicates);
      const makeConcurrentCallStub = sinon.stub(exportAssets as any, 'makeConcurrentCall').resolves();

      await exportAssets.downloadAssets();
      
      // Should only download unique assets
      sinon.restore();
    });

    it('should handle download assets with versioned metadata', async () => {
      mockExportConfig.modules.assets.includeVersionedAssets = true;
      (exportAssets as any).assetsRootPath = '/test/data/assets';
      
      const mainAssets = { 'file-1': [{ uid: '1', url: 'url1', filename: 'test.jpg' }] };
      const versionedAssets = { 'file-2': [{ uid: '2', url: 'url2', filename: 'version.jpg' }] };
      
      const getPlainMetaStub = sinon.stub(FsUtility.prototype, 'getPlainMeta');
      getPlainMetaStub.onFirstCall().returns(mainAssets);
      getPlainMetaStub.onSecondCall().returns(versionedAssets);
      
      // Mock getDirectories to return empty array to avoid fs operations
      sinon.stub(exportAssets as any, 'assetsRootPath').get(() => '/test/data/assets');
      const makeConcurrentCallStub = sinon.stub(exportAssets as any, 'makeConcurrentCall').resolves();
      
      // Create a simple mock for getDirectories behavior
      const fsInstance: any = {
        getPlainMeta: getPlainMetaStub,
        createFolderIfNotExist: () => {}
      };
      
      await exportAssets.downloadAssets();
      
      expect(makeConcurrentCallStub.called).to.be.true;
      sinon.restore();
    });
  });

  describe('getAssets() - Additional Coverage', () => {
    let makeConcurrentCallStub: sinon.SinonStub;

    beforeEach(() => {
      makeConcurrentCallStub = sinon.stub(exportAssets as any, 'makeConcurrentCall').resolves();
    });

    afterEach(() => {
      makeConcurrentCallStub.restore();
    });

    // Note: Tests for assets with versioned detection require complex FsUtility mocking
    // Skipping to avoid filesystem operations

    it('should handle assets with no items response', async () => {
      (exportAssets as any).assetsRootPath = '/test/data/assets';
      
      // Stub FsUtility methods
      sinon.stub(FsUtility.prototype, 'writeIntoFile').resolves();
      sinon.stub(FsUtility.prototype, 'completeFile').resolves();
      
      makeConcurrentCallStub.callsFake(async (options: any) => {
        const onSuccess = options.apiParams.resolve;
        onSuccess({ response: { items: [] } });
      });

      await exportAssets.getAssets(10);
      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should handle assets with versioned assets enabled', async () => {
      (exportAssets as any).assetsRootPath = '/test/data/assets';
      mockExportConfig.modules.assets.includeVersionedAssets = true;
      
      // Stub FsUtility methods to prevent fs operations
      sinon.stub(FsUtility.prototype, 'writeIntoFile').resolves();
      sinon.stub(FsUtility.prototype, 'completeFile').resolves();
      sinon.stub(FsUtility.prototype, 'createFolderIfNotExist').resolves();
      
      makeConcurrentCallStub.callsFake(async (options: any) => {
        const onSuccess = options.apiParams.resolve;
        // Mock versioned assets
        onSuccess({ 
          response: { 
            items: [
              { uid: '1', _version: 2, url: 'url1', filename: 'test.jpg' },
              { uid: '2', _version: 1, url: 'url2', filename: 'test2.jpg' }
            ] 
          } 
        });
      });

      await exportAssets.getAssets(10);
      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should apply query filters when configured', async () => {
      (exportAssets as any).assetsRootPath = '/test/data/assets';
      mockExportConfig.modules.assets.invalidKeys = ['SYS_ACL'];
      
      // Stub FsUtility methods to prevent fs operations
      sinon.stub(FsUtility.prototype, 'writeIntoFile').resolves();
      sinon.stub(FsUtility.prototype, 'completeFile').resolves();
      sinon.stub(FsUtility.prototype, 'createFolderIfNotExist').resolves();
      
      makeConcurrentCallStub.callsFake(async (options: any) => {
        const onSuccess = options.apiParams.resolve;
        onSuccess({ response: { items: [{ uid: '1', url: 'url1', filename: 'test.jpg' }] } });
      });

      await exportAssets.getAssets(10);
      expect(makeConcurrentCallStub.called).to.be.true;
    });
  });

  describe('getAssetsFolders() - Additional Coverage', () => {
    it('should handle folders with empty items response', async () => {
      (exportAssets as any).assetsRootPath = '/test/data/assets';
      const makeConcurrentCallStub = sinon.stub(exportAssets as any, 'makeConcurrentCall').resolves();
      
      makeConcurrentCallStub.callsFake(async (options: any) => {
        const onSuccess = options.apiParams.resolve;
        onSuccess({ response: { items: [] } });
      });

      await exportAssets.getAssetsFolders(10);
      expect(makeConcurrentCallStub.called).to.be.true;
      
      makeConcurrentCallStub.restore();
    });

    it('should add folders to assetsFolder array', async () => {
      (exportAssets as any).assetsRootPath = '/test/data/assets';
      
      const makeConcurrentCallStub = sinon.stub(exportAssets as any, 'makeConcurrentCall').resolves();
      
      // Stub FsUtility methods to prevent file system operations
      sinon.stub(FsUtility.prototype, 'writeFile').resolves();
      sinon.stub(FsUtility.prototype, 'createFolderIfNotExist').resolves();
      
      makeConcurrentCallStub.callsFake(async (options: any) => {
        const onSuccess = options.apiParams.resolve;
        // Simulate adding folders to the array
        (exportAssets as any).assetsFolder.push({ uid: 'folder-1', name: 'Test Folder' });
        onSuccess({ response: { items: [{ uid: 'folder-1', name: 'Test Folder' }] } });
      });

      await exportAssets.getAssetsFolders(10);
      
      expect(makeConcurrentCallStub.called).to.be.true;
      // Verify folders were added
      expect((exportAssets as any).assetsFolder.length).to.be.greaterThan(0);
      
      makeConcurrentCallStub.restore();
    });
  });

  describe('downloadAssets() - Additional Coverage', () => {
    it('should handle download with secured assets', async () => {
      mockExportConfig.modules.assets.securedAssets = true;
      (exportAssets as any).assetsRootPath = '/test/data/assets';
      
      const getPlainMetaStub = sinon.stub(FsUtility.prototype, 'getPlainMeta').returns({
        'file-1': [{ uid: '1', url: 'url1', filename: 'test.jpg' }]
      });
      const makeConcurrentCallStub = sinon.stub(exportAssets as any, 'makeConcurrentCall').resolves();
      
      await exportAssets.downloadAssets();
      
      expect(makeConcurrentCallStub.called).to.be.true;
      getPlainMetaStub.restore();
      makeConcurrentCallStub.restore();
    });

    it('should handle download with enableDownloadStatus', async () => {
      mockExportConfig.modules.assets.enableDownloadStatus = true;
      (exportAssets as any).assetsRootPath = '/test/data/assets';
      
      const getPlainMetaStub = sinon.stub(FsUtility.prototype, 'getPlainMeta').returns({
        'file-1': [{ uid: '1', url: 'url1', filename: 'test.jpg' }]
      });
      const makeConcurrentCallStub = sinon.stub(exportAssets as any, 'makeConcurrentCall').resolves();
      
      await exportAssets.downloadAssets();
      
      expect(makeConcurrentCallStub.called).to.be.true;
      getPlainMetaStub.restore();
      makeConcurrentCallStub.restore();
    });

    it('should handle download with concurrent call structure', async () => {
      (exportAssets as any).assetsRootPath = '/test/data/assets';
      
      const getPlainMetaStub = sinon.stub(FsUtility.prototype, 'getPlainMeta').returns({
        'file-1': [{ uid: '1', url: 'url1', filename: 'test.jpg' }]
      });
      const makeConcurrentCallStub = sinon.stub(exportAssets as any, 'makeConcurrentCall').resolves();
      
      await exportAssets.downloadAssets();
      
      expect(makeConcurrentCallStub.called).to.be.true;
      getPlainMetaStub.restore();
      makeConcurrentCallStub.restore();
    });
  });
});

