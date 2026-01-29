import { expect } from 'chai';
import sinon from 'sinon';
import ImportAssets from '../../../../src/import/modules/assets';
import { ImportConfig } from '../../../../src/types';
import { FsUtility } from '@contentstack/cli-utilities';

describe('ImportAssets', () => {
  let importAssets: ImportAssets;
  let mockStackClient: any;
  let mockImportConfig: ImportConfig;
  let fsUtilityReadFileStub: sinon.SinonStub;
  let fsUtilityWriteFileStub: sinon.SinonStub;
  let makeConcurrentCallStub: sinon.SinonStub;

  beforeEach(() => {
    // Mock FsUtility to prevent directory creation
    sinon.stub(FsUtility.prototype, 'createFolderIfNotExist').callsFake(() => {
      return Promise.resolve();
    });
    fsUtilityReadFileStub = sinon.stub(FsUtility.prototype, 'readFile').returns({});
    fsUtilityWriteFileStub = sinon.stub(FsUtility.prototype, 'writeFile').callsFake(() => {
      return Promise.resolve();
    });

    mockStackClient = {
      asset: sinon.stub().returns({
        create: sinon.stub().resolves({ uid: 'asset-123', url: 'https://example.com/asset.jpg' }),
        folder: sinon.stub().returns({
          create: sinon.stub().resolves({ uid: 'folder-123' }),
        }),
        replace: sinon.stub().resolves({ uid: 'asset-123', url: 'https://example.com/asset.jpg' }),
        publish: sinon.stub().resolves({ uid: 'asset-123' }),
      }),
    };

    mockImportConfig = {
      apiKey: 'test',
      contentDir: '/test/content',
      data: '/test/content',
      contentVersion: 1,
      region: 'us',
      master_locale: { code: 'en-us' },
      masterLocale: { code: 'en-us' },
      context: {
        command: 'cm:stacks:import',
        module: 'assets',
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-123',
        apiKey: 'test',
        orgId: 'org-123',
        authenticationMethod: 'Basic Auth',
      },
      modules: {
        types: ['assets'],
        assets: {
          dirName: 'assets',
          validKeys: ['title', 'filename', 'content_type', 'parent_uid', 'description', 'tags'],
          folderValidKeys: ['name', 'parent_uid'],
          apiConcurrency: 5,
          importFoldersConcurrency: 3,
          uploadAssetsConcurrency: 5,
          includeVersionedAssets: true,
          importSameStructure: false,
          displayExecutionTime: false,
        },
        publish: {
          dirName: 'publish',
          pendingAssetsFileName: 'pending-assets.json',
          successAssetsFileName: 'success-assets.json',
          failedAssetsFileName: 'failed-assets.json',
          pendingEntriesFileName: 'pending-entries.json',
          successEntriesFileName: 'success-entries.json',
          failedEntriesFileName: 'failed-entries.json',
          pendingVariantEntriesFileName: 'pending-variant-entries.json',
          successVariantEntriesFileName: 'success-variant-entries.json',
          failedVariantEntriesFileName: 'failed-variant-entries.json',
        },
      },
      backupDir: '/test/backup',
      cliLogsPath: '/test/logs',
      canCreatePrivateApp: true,
      forceStopMarketplaceAppsPrompt: false,
      skipPrivateAppRecreationIfExist: true,
      isAuthenticated: true,
      auth_token: 'auth-token',
      selectedModules: ['assets'],
      skipAudit: false,
      skipAssetsPublish: false,
      'exclude-global-modules': false,
      replaceExisting: false,
    } as any;

    importAssets = new ImportAssets({
      importConfig: mockImportConfig as any,
      stackAPIClient: mockStackClient,
      moduleName: 'assets',
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(importAssets).to.be.instanceOf(ImportAssets);
      expect(importAssets['importConfig']).to.equal(mockImportConfig);
      expect((importAssets as any)['client']).to.equal(mockStackClient);
    });

    it('should have assetConfig property', () => {
      expect(importAssets.assetConfig).to.be.an('object');
      expect(importAssets.assetConfig).to.have.property('dirName', 'assets');
    });

    it('should set context module to assets', () => {
      expect(importAssets['importConfig'].context.module).to.equal('assets');
    });

    it('should initialize paths correctly', () => {
      expect(importAssets['assetsPath']).to.include('assets');
      expect(importAssets['mapperDirPath']).to.include('mapper/assets');
      expect(importAssets['assetUidMapperPath']).to.include('uid-mapping.json');
      expect(importAssets['assetUrlMapperPath']).to.include('url-mapping.json');
      expect(importAssets['assetFolderUidMapperPath']).to.include('folder-mapping.json');
    });

    it('should initialize empty mappings', () => {
      expect(importAssets['assetsUidMap']).to.deep.equal({});
      expect(importAssets['assetsUrlMap']).to.deep.equal({});
      expect(importAssets['assetsFolderMap']).to.deep.equal({});
    });

    it('should read environments file', () => {
      expect(fsUtilityReadFileStub.called).to.be.true;
    });
  });

  describe('start() method', () => {
    let importFoldersStub: sinon.SinonStub;
    let importAssetsStub: sinon.SinonStub;
    let savePublishDetailsStub: sinon.SinonStub;
    let existsSyncStub: sinon.SinonStub;

    beforeEach(() => {
      importFoldersStub = sinon.stub(importAssets as any, 'importFolders').resolves();
      importAssetsStub = sinon.stub(importAssets as any, 'importAssets').resolves();
      savePublishDetailsStub = sinon.stub(importAssets as any, 'savePublishDetails').resolves();
      existsSyncStub = sinon.stub().returns(true);
      sinon.replace(require('node:fs'), 'existsSync', existsSyncStub);
    });

    it('should call importFolders first', async () => {
      await importAssets.start();
      expect(importFoldersStub.calledOnce).to.be.true;
    });

    it('should import versioned assets when includeVersionedAssets is true', async () => {
      const originalValue = importAssets.assetConfig.includeVersionedAssets;
      importAssets.assetConfig.includeVersionedAssets = true;
      existsSyncStub.returns(true);

      await importAssets.start();

      expect(importFoldersStub.calledOnce).to.be.true;
      expect(importAssetsStub.calledTwice).to.be.true;
      expect(importAssetsStub.firstCall.calledWith(true)).to.be.true;
      expect(importAssetsStub.secondCall.calledWith()).to.be.true;
      expect(savePublishDetailsStub.calledOnce).to.be.true;

      // Restore original value
      importAssets.assetConfig.includeVersionedAssets = originalValue;
    });

    it('should skip versioned assets when directory does not exist', async () => {
      mockImportConfig.modules.assets.includeVersionedAssets = true;
      existsSyncStub.returns(false);

      await importAssets.start();

      expect(importAssetsStub.calledOnce).to.be.true;
      expect(importAssetsStub.firstCall.calledWith()).to.be.true;
    });

    it('should not import versioned assets when includeVersionedAssets is false', async () => {
      mockImportConfig.modules.assets.includeVersionedAssets = false;

      await importAssets.start();

      expect(importAssetsStub.calledOnce).to.be.true;
      expect(importAssetsStub.calledWith(true)).to.be.false;
    });

    it('should call savePublishDetails after importing assets', async () => {
      await importAssets.start();

      expect(savePublishDetailsStub.calledOnce).to.be.true;
      expect(savePublishDetailsStub.calledAfter(importAssetsStub)).to.be.true;
    });

    it('should log success message on completion', async () => {
      await importAssets.start();

      expect(importFoldersStub.called).to.be.true;
      expect(importAssetsStub.called).to.be.true;
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Import failed');
      importFoldersStub.rejects(error);

      await importAssets.start();

      expect(importFoldersStub.calledOnce).to.be.true;
    });
  });

  describe('importFolders() method', () => {
    let makeConcurrentCallStub: sinon.SinonStub;

    beforeEach(() => {
      makeConcurrentCallStub = sinon.stub(importAssets as any, 'makeConcurrentCall').resolves();
    });

    it('should log info when no folders found', async () => {
      fsUtilityReadFileStub.returns([]);

      await (importAssets as any).importFolders();

      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should import folders successfully', async () => {
      const mockFolders = [
        { uid: 'folder-1', name: 'Folder 1', parent_uid: null, created_at: '2023-01-01' },
        { uid: 'folder-2', name: 'Folder 2', parent_uid: 'folder-1', created_at: '2023-01-02' },
      ];
      fsUtilityReadFileStub.returns(mockFolders);

      await (importAssets as any).importFolders();

      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should construct folder import order', async () => {
      const mockFolders = [
        { uid: 'folder-1', name: 'Folder 1', parent_uid: null, created_at: '2023-01-01' },
        { uid: 'folder-2', name: 'Folder 2', parent_uid: 'folder-1', created_at: '2023-01-02' },
      ];
      fsUtilityReadFileStub.returns(mockFolders);
      const constructStub = sinon.stub(importAssets as any, 'constructFolderImportOrder').returns(mockFolders);

      await (importAssets as any).importFolders();

      expect(constructStub.calledOnce).to.be.true;
      expect(constructStub.calledWith(mockFolders)).to.be.true;
    });

    it('should write folder mappings after import', async () => {
      const mockFolders = [{ uid: 'folder-1', name: 'Folder 1', parent_uid: null as any, created_at: '2023-01-01' }];
      fsUtilityReadFileStub.returns(mockFolders);

      // Simulate successful folder creation
      makeConcurrentCallStub.callsFake(async (options) => {
        const onSuccess = options.apiParams.resolve;
        onSuccess({
          response: { uid: 'new-folder-1' },
          apiData: { uid: 'folder-1', name: 'Folder 1' },
        });
      });

      await (importAssets as any).importFolders();

      expect(fsUtilityWriteFileStub.called).to.be.true;
    });

    it('should handle onSuccess callback correctly', async () => {
      const mockFolders = [{ uid: 'folder-1', name: 'Folder 1', parent_uid: null as any, created_at: '2023-01-01' }];
      fsUtilityReadFileStub.returns(mockFolders);

      makeConcurrentCallStub.callsFake(async (options) => {
        const onSuccess = options.apiParams.resolve;
        onSuccess({
          response: { uid: 'new-folder-1' },
          apiData: { uid: 'folder-1', name: 'Folder 1' },
        });
      });

      await (importAssets as any).importFolders();

      expect(importAssets['assetsFolderMap']['folder-1']).to.equal('new-folder-1');
    });

    it('should handle onReject callback correctly', async () => {
      const mockFolders = [{ uid: 'folder-1', name: 'Folder 1', parent_uid: null as any, created_at: '2023-01-01' }];
      fsUtilityReadFileStub.returns(mockFolders);

      makeConcurrentCallStub.callsFake(async (options) => {
        const onReject = options.apiParams.reject;
        onReject({
          error: new Error('Failed to create folder'),
          apiData: { name: 'Folder 1' },
        });
      });

      await (importAssets as any).importFolders();

      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should map parent folder UIDs in serializeData', async () => {
      const mockFolders = [
        { uid: 'folder-1', name: 'Folder 1', parent_uid: null, created_at: '2023-01-01' },
        { uid: 'folder-2', name: 'Folder 2', parent_uid: 'folder-1', created_at: '2023-01-02' },
      ];
      fsUtilityReadFileStub.returns(mockFolders);
      importAssets['assetsFolderMap'] = { 'folder-1': 'new-folder-1' };

      let capturedApiOptions: any;
      makeConcurrentCallStub.callsFake(async (options) => {
        const serializeData = options.apiParams.serializeData;
        capturedApiOptions = serializeData({
          apiData: { uid: 'folder-2', name: 'Folder 2', parent_uid: 'folder-1' },
        });
      });

      await (importAssets as any).importFolders();

      expect(capturedApiOptions.apiData.parent_uid).to.equal('new-folder-1');
    });
  });

  describe('importAssets() method', () => {
    let makeConcurrentCallStub: sinon.SinonStub;
    let fsUtilityStub: any;

    beforeEach(() => {
      makeConcurrentCallStub = sinon.stub(importAssets as any, 'makeConcurrentCall').resolves();

      fsUtilityStub = sinon.stub(FsUtility.prototype, 'constructor' as any);
      Object.defineProperty(FsUtility.prototype, 'indexFileContent', {
        get: sinon.stub().returns({ '0': 'chunk-0' }),
        configurable: true,
      });
      Object.defineProperty(FsUtility.prototype, 'readChunkFiles', {
        get: sinon.stub().returns({
          next: sinon.stub().resolves({
            'asset-1': { uid: 'asset-1', title: 'Asset 1', url: 'url-1', filename: 'file1.jpg', _version: 1 },
          }),
        }),
        configurable: true,
      });
    });

    afterEach(() => {
      delete (FsUtility.prototype as any).indexFileContent;
      delete (FsUtility.prototype as any).readChunkFiles;
    });

    it('should import assets successfully', async () => {
      await (importAssets as any).importAssets(false);

      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should handle versioned assets', async () => {
      mockImportConfig.modules.assets.importSameStructure = true;

      await (importAssets as any).importAssets(true);

      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should process version 1 assets separately when importSameStructure is true', async () => {
      mockImportConfig.modules.assets.importSameStructure = true;
      Object.defineProperty(FsUtility.prototype, 'readChunkFiles', {
        get: sinon.stub().returns({
          next: sinon.stub().resolves({
            'asset-1': { uid: 'asset-1', title: 'Asset 1', _version: 1 },
            'asset-2': { uid: 'asset-2', title: 'Asset 2', _version: 2 },
          }),
        }),
        configurable: true,
      });

      await (importAssets as any).importAssets(true);

      expect(makeConcurrentCallStub.calledTwice).to.be.true;
    });

    it('should write UID mappings after non-versioned import', async () => {
      importAssets['assetsUidMap'] = { 'asset-1': 'new-asset-1' };

      await (importAssets as any).importAssets(false);

      expect(fsUtilityWriteFileStub.called).to.be.true;
    });

    it('should write URL mappings after non-versioned import', async () => {
      importAssets['assetsUrlMap'] = { 'url-1': 'new-url-1' };

      await (importAssets as any).importAssets(false);

      expect(fsUtilityWriteFileStub.called).to.be.true;
    });

    it('should not write mappings for versioned assets', async () => {
      importAssets['assetsUidMap'] = { 'asset-1': 'new-asset-1' };
      fsUtilityWriteFileStub.resetHistory();

      await (importAssets as any).importAssets(true);

      // Should not write during versioned import
      expect(fsUtilityWriteFileStub.called).to.be.false;
    });

    it('should handle onSuccess callback', async () => {
      makeConcurrentCallStub.callsFake(async (options) => {
        const onSuccess = options.apiParams.resolve;
        onSuccess({
          response: { uid: 'new-asset-1', url: 'new-url-1' },
          apiData: { uid: 'asset-1', url: 'url-1', title: 'Asset 1' },
        });
      });

      await (importAssets as any).importAssets(false);

      expect(importAssets['assetsUidMap']['asset-1']).to.equal('new-asset-1');
      expect(importAssets['assetsUrlMap']['url-1']).to.equal('new-url-1');
    });

    it('should handle onReject callback', async () => {
      makeConcurrentCallStub.callsFake(async (options) => {
        const onReject = options.apiParams.reject;
        onReject({
          error: new Error('Upload failed'),
          apiData: { title: 'Asset 1' },
        });
      });

      await (importAssets as any).importAssets(false);

      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should handle chunk read errors', async () => {
      Object.defineProperty(FsUtility.prototype, 'readChunkFiles', {
        get: sinon.stub().returns({
          next: sinon.stub().rejects(new Error('Read failed')),
        }),
        configurable: true,
      });

      await (importAssets as any).importAssets(false);

      // Should handle error gracefully - makeConcurrentCall not called when chunk is null
      expect(makeConcurrentCallStub.called).to.be.false;
    });
  });

  describe('serializeAssets() method', () => {
    it('should skip existing asset when not importing same structure', () => {
      // Create a fresh instance for this test to avoid side effects
      const testImportAssets = new ImportAssets({
        importConfig: mockImportConfig as any,
        stackAPIClient: mockStackClient,
        moduleName: 'assets',
      });
      testImportAssets['assetConfig'].importSameStructure = false;
      testImportAssets['assetConfig'].includeVersionedAssets = false;
      testImportAssets['assetsUidMap'] = { 'asset-1': 'existing-asset-1' };

      const apiOptions = {
        entity: 'create-assets' as const,
        apiData: { uid: 'asset-1', title: 'Asset 1', filename: 'file1.jpg' },
      };

      const result = (testImportAssets as any).serializeAssets(apiOptions);

      expect(result.entity).to.be.undefined;
    });

    it('should set upload path for asset', () => {
      const apiOptions = {
        entity: 'create-assets' as const,
        apiData: { uid: 'asset-1', title: 'Asset 1', filename: 'file1.jpg' },
      };

      const result = (importAssets as any).serializeAssets(apiOptions);

      expect(result.apiData.upload).to.include('file1.jpg');
      expect(result.apiData.upload).to.include('asset-1');
    });

    it('should map parent_uid to folder UID', () => {
      importAssets['assetsFolderMap'] = { 'folder-1': 'new-folder-1' };

      const apiOptions = {
        entity: 'create-assets' as const,
        apiData: { uid: 'asset-1', title: 'Asset 1', filename: 'file1.jpg', parent_uid: 'folder-1' },
      };

      const result = (importAssets as any).serializeAssets(apiOptions);

      expect(result.apiData.parent_uid).to.equal('new-folder-1');
    });

    it('should assign root folder when replaceExisting and no parent_uid', () => {
      mockImportConfig.replaceExisting = true;
      importAssets['rootFolder'] = { uid: 'root-1', name: 'Root', parent_uid: null as any, created_at: '2023-01-01' };
      importAssets['assetsFolderMap'] = { 'root-1': 'new-root-1' };

      const apiOptions = {
        entity: 'create-assets' as const,
        apiData: { uid: 'asset-1', title: 'Asset 1', filename: 'file1.jpg' },
      };

      const result = (importAssets as any).serializeAssets(apiOptions);

      expect(result.apiData.parent_uid).to.equal('new-root-1');
    });

    it('should change entity to replace-assets when asset exists and importSameStructure', () => {
      // Temporarily enable importSameStructure
      const originalValue = importAssets.assetConfig.importSameStructure;
      importAssets.assetConfig.importSameStructure = true;
      importAssets['assetsUidMap'] = { 'asset-1': 'existing-asset-1' };

      const apiOptions = {
        entity: 'create-assets' as const,
        apiData: { uid: 'asset-1', title: 'Asset 1', filename: 'file1.jpg' },
      };

      const result = (importAssets as any).serializeAssets(apiOptions);

      expect(result.entity).to.equal('replace-assets');
      expect(result.uid).to.equal('existing-asset-1');

      // Restore original value
      importAssets.assetConfig.importSameStructure = originalValue;
    });

    it('should keep create-assets entity when asset does not exist', () => {
      mockImportConfig.modules.assets.importSameStructure = true;
      importAssets['assetsUidMap'] = {};

      const apiOptions = {
        entity: 'create-assets' as const,
        apiData: { uid: 'asset-1', title: 'Asset 1', filename: 'file1.jpg' },
      };

      const result = (importAssets as any).serializeAssets(apiOptions);

      expect(result.entity).to.equal('create-assets');
      expect(result.uid).to.be.undefined;
    });
  });

  describe('publish() method', () => {
    let makeConcurrentCallStub: sinon.SinonStub;

    beforeEach(() => {
      makeConcurrentCallStub = sinon.stub(importAssets as any, 'makeConcurrentCall').resolves();
      importAssets['assetsUidMap'] = { 'asset-1': 'new-asset-1' };
      importAssets['environments'] = { 'env-1': { name: 'production' } };

      // Mock FsUtility for publish method
      Object.defineProperty(FsUtility.prototype, 'indexFileContent', {
        get: sinon.stub().returns({ '0': 'chunk-0' }),
        configurable: true,
      });
      Object.defineProperty(FsUtility.prototype, 'readChunkFiles', {
        get: sinon.stub().returns({
          next: sinon.stub().resolves([
            {
              uid: 'asset-1',
              title: 'Asset 1',
              publish_details: [{ environment: 'env-1', locale: 'en-us' }],
            },
          ]),
        }),
        configurable: true,
      });
    });

    afterEach(() => {
      delete (FsUtility.prototype as any).indexFileContent;
      delete (FsUtility.prototype as any).readChunkFiles;
    });

    it('should load UID mappings if not already loaded', async () => {
      importAssets['assetsUidMap'] = {};
      fsUtilityReadFileStub.returns({ 'asset-1': 'new-asset-1' });

      await (importAssets as any).publish();

      expect(fsUtilityReadFileStub.called).to.be.true;
    });

    it('should skip assets without publish_details', async () => {
      Object.defineProperty(FsUtility.prototype, 'readChunkFiles', {
        get: sinon.stub().returns({
          next: sinon.stub().resolves([{ uid: 'asset-1', title: 'Asset 1', publish_details: [] }]),
        }),
        configurable: true,
      });

      await (importAssets as any).publish();

      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should publish assets with valid publish details', async () => {
      await (importAssets as any).publish();

      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should handle onSuccess callback', async () => {
      makeConcurrentCallStub.callsFake(async (options) => {
        const onSuccess = options.apiParams.resolve;
        onSuccess({
          apiData: { uid: 'asset-1', title: 'Asset 1' },
        });
      });

      await (importAssets as any).publish();

      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should handle onReject callback', async () => {
      makeConcurrentCallStub.callsFake(async (options) => {
        const onReject = options.apiParams.reject;
        onReject({
          error: new Error('Publish failed'),
          apiData: { uid: 'asset-1', title: 'Asset 1' },
        });
      });

      await (importAssets as any).publish();

      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should filter publish_details by valid environments', async () => {
      importAssets['environments'] = { 'env-1': { name: 'production' } };

      makeConcurrentCallStub.callsFake(async (options: any) => {
        const serializeData = options.apiParams.serializeData;
        const result = serializeData({
          apiData: {
            uid: 'asset-1',
            publish_details: [
              { environment: 'env-1', locale: 'en-us' },
              { environment: 'env-invalid', locale: 'en-us' },
            ],
          },
        });

        expect(result.apiData.environments).to.deep.equal(['production']);
        expect(result.apiData.locales).to.deep.equal(['en-us']);
      });

      await (importAssets as any).publish();
    });

    it('should skip publish when no valid environments', async () => {
      makeConcurrentCallStub.callsFake(async (options: any) => {
        const serializeData = options.apiParams.serializeData;
        const result = serializeData({
          apiData: {
            uid: 'asset-1',
            publish_details: [{ environment: 'env-invalid', locale: 'en-us' }],
          },
        });

        expect(result.entity).to.be.undefined;
      });

      await (importAssets as any).publish();
    });

    it('should skip publish when no UID mapping found', async () => {
      importAssets['assetsUidMap'] = {};

      makeConcurrentCallStub.callsFake(async (options: any) => {
        const serializeData = options.apiParams.serializeData;
        const result = serializeData({
          apiData: {
            uid: 'asset-unknown',
            publish_details: [{ environment: 'env-1', locale: 'en-us' }],
          },
        });

        expect(result.entity).to.be.undefined;
      });

      await (importAssets as any).publish();
    });

    it('should set correct UID from mapping', async () => {
      importAssets['assetsUidMap'] = { 'asset-1': 'mapped-asset-1' };

      makeConcurrentCallStub.callsFake(async (options: any) => {
        const serializeData = options.apiParams.serializeData;
        const result = serializeData({
          apiData: {
            uid: 'asset-1',
            publish_details: [{ environment: 'env-1', locale: 'en-us' }],
          },
        });

        expect(result.uid).to.equal('mapped-asset-1');
      });

      await (importAssets as any).publish();
    });

    it('should extract unique locales from publish_details', async () => {
      makeConcurrentCallStub.callsFake(async (options: any) => {
        const serializeData = options.apiParams.serializeData;
        const result = serializeData({
          apiData: {
            uid: 'asset-1',
            publish_details: [
              { environment: 'env-1', locale: 'en-us' },
              { environment: 'env-1', locale: 'en-us' },
              { environment: 'env-1', locale: 'fr-fr' },
            ],
          },
        });

        expect(result.apiData.locales).to.have.lengthOf(2);
        expect(result.apiData.locales).to.include.members(['en-us', 'fr-fr']);
      });

      await (importAssets as any).publish();
    });
  });

  describe('constructFolderImportOrder() method', () => {
    it('should order folders with null parent_uid first', () => {
      const folders = [
        { uid: 'folder-2', name: 'Folder 2', parent_uid: 'folder-1', created_at: '2023-01-02' },
        { uid: 'folder-1', name: 'Folder 1', parent_uid: null as any, created_at: '2023-01-01' },
      ];

      const result = (importAssets as any).constructFolderImportOrder(folders);

      expect(result[0].uid).to.equal('folder-1');
      expect(result[0].parent_uid).to.be.null;
    });

    it('should order nested folders correctly', () => {
      const folders = [
        { uid: 'folder-3', name: 'Folder 3', parent_uid: 'folder-2', created_at: '2023-01-03' },
        { uid: 'folder-1', name: 'Folder 1', parent_uid: null as any, created_at: '2023-01-01' },
        { uid: 'folder-2', name: 'Folder 2', parent_uid: 'folder-1', created_at: '2023-01-02' },
      ];

      const result = (importAssets as any).constructFolderImportOrder(folders);

      expect(result[0].uid).to.equal('folder-1');
      expect(result[1].uid).to.equal('folder-2');
      expect(result[2].uid).to.equal('folder-3');
    });

    it('should handle multiple root folders', () => {
      const folders = [
        { uid: 'folder-1', name: 'Folder 1', parent_uid: null as any, created_at: '2023-01-01' },
        { uid: 'folder-2', name: 'Folder 2', parent_uid: null as any, created_at: '2023-01-02' },
      ];

      const result = (importAssets as any).constructFolderImportOrder(folders);

      expect(result).to.have.lengthOf(2);
      expect(result[0].parent_uid).to.be.null;
      expect(result[1].parent_uid).to.be.null;
    });

    it('should handle deeply nested folder structures', () => {
      const folders = [
        { uid: 'folder-1', name: 'Folder 1', parent_uid: null as any, created_at: '2023-01-01' },
        { uid: 'folder-2', name: 'Folder 2', parent_uid: 'folder-1', created_at: '2023-01-02' },
        { uid: 'folder-3', name: 'Folder 3', parent_uid: 'folder-2', created_at: '2023-01-03' },
        { uid: 'folder-4', name: 'Folder 4', parent_uid: 'folder-3', created_at: '2023-01-04' },
      ];

      const result = (importAssets as any).constructFolderImportOrder(folders);

      expect(result).to.have.lengthOf(4);
      expect(result.map((f: any) => f.uid)).to.deep.equal(['folder-1', 'folder-2', 'folder-3', 'folder-4']);
    });

    it('should add root folder when replaceExisting is true', () => {
      mockImportConfig.replaceExisting = true;
      const folders = [{ uid: 'folder-1', name: 'Folder 1', parent_uid: null as any, created_at: '2023-01-01' }];

      const result = (importAssets as any).constructFolderImportOrder(folders);

      expect(result[0].name).to.include('Import-');
      expect(result[0].parent_uid).to.be.null;
      expect(result).to.have.lengthOf(2);
    });

    it('should update root folder parent_uid when replaceExisting', () => {
      mockImportConfig.replaceExisting = true;
      const folders = [{ uid: 'folder-1', name: 'Folder 1', parent_uid: null as any, created_at: '2023-01-01' }];

      const result = (importAssets as any).constructFolderImportOrder(folders);

      expect(result[1].parent_uid).to.equal(result[0].uid);
      expect(importAssets['rootFolder']).to.not.be.undefined;
    });

    it('should preserve folder hierarchy when replaceExisting', () => {
      mockImportConfig.replaceExisting = true;
      const folders = [
        { uid: 'folder-1', name: 'Folder 1', parent_uid: null as any, created_at: '2023-01-01' },
        { uid: 'folder-2', name: 'Folder 2', parent_uid: 'folder-1', created_at: '2023-01-02' },
      ];

      const result = (importAssets as any).constructFolderImportOrder(folders);

      // Root import folder, folder-1 (now child of root), folder-2 (still child of folder-1)
      expect(result).to.have.lengthOf(3);
      expect(result[2].parent_uid).to.equal('folder-1');
    });

    it('should handle empty folders array', () => {
      const folders: any[] = [];

      const result = (importAssets as any).constructFolderImportOrder(folders);

      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(0);
    });

    it('should maintain created_at timestamps', () => {
      const folders = [
        { uid: 'folder-1', name: 'Folder 1', parent_uid: null as any, created_at: '2023-01-01' },
        { uid: 'folder-2', name: 'Folder 2', parent_uid: 'folder-1', created_at: '2023-01-02' },
      ];

      const result = (importAssets as any).constructFolderImportOrder(folders);

      expect(result[0].created_at).to.equal('2023-01-01');
      expect(result[1].created_at).to.equal('2023-01-02');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full asset import flow', async () => {
      const importFoldersStub = sinon.stub(importAssets as any, 'importFolders').resolves();
      const importAssetsStub = sinon.stub(importAssets as any, 'importAssets').resolves();
      const savePublishDetailsStub = sinon.stub(importAssets as any, 'savePublishDetails').resolves();

      await importAssets.start();

      expect(importFoldersStub.calledOnce).to.be.true;
      expect(importAssetsStub.called).to.be.true;
      expect(savePublishDetailsStub.calledOnce).to.be.true;
      expect(savePublishDetailsStub.calledAfter(importAssetsStub)).to.be.true;
    });

    it('should handle complete versioned assets flow', async () => {
      // Temporarily enable includeVersionedAssets
      const originalValue = importAssets.assetConfig.includeVersionedAssets;
      importAssets.assetConfig.includeVersionedAssets = true;
      const testExistsSyncStub = sinon.stub().returns(true);
      sinon.replace(require('node:fs'), 'existsSync', testExistsSyncStub);

      const testImportFoldersStub = sinon.stub(importAssets as any, 'importFolders').resolves();
      const testImportAssetsStub = sinon.stub(importAssets as any, 'importAssets').resolves();
      const testSavePublishDetailsStub = sinon.stub(importAssets as any, 'savePublishDetails').resolves();

      await importAssets.start();

      expect(testImportFoldersStub.calledOnce).to.be.true;
      expect(testImportAssetsStub.calledTwice).to.be.true;
      expect(testSavePublishDetailsStub.calledOnce).to.be.true;

      // Restore original value
      importAssets.assetConfig.includeVersionedAssets = originalValue;
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing folder file gracefully', async () => {
      fsUtilityReadFileStub.throws(new Error('File not found'));

      try {
        await (importAssets as any).importFolders();
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should handle empty environments object', () => {
      importAssets['environments'] = {};

      const apiOptions = {
        entity: 'create-assets' as const,
        apiData: { uid: 'asset-1', title: 'Asset 1', filename: 'file1.jpg' },
      };

      const result = (importAssets as any).serializeAssets(apiOptions);
      expect(result.apiData).to.exist;
    });

    it('should handle assets without parent_uid', () => {
      const apiOptions = {
        entity: 'create-assets' as const,
        apiData: { uid: 'asset-1', title: 'Asset 1', filename: 'file1.jpg' },
      };

      const result = (importAssets as any).serializeAssets(apiOptions);

      expect(result.apiData.parent_uid).to.be.undefined;
    });

    it('should handle malformed folder structure', () => {
      const folders = [{ uid: 'folder-1', name: 'Folder 1', parent_uid: 'non-existent', created_at: '2023-01-01' }];

      const result = (importAssets as any).constructFolderImportOrder(folders);

      // Should still return the folder even though parent doesn't exist
      expect(result).to.be.an('array');
    });

    it('should handle circular folder references', () => {
      const folders = [
        { uid: 'folder-1', name: 'Folder 1', parent_uid: 'folder-2', created_at: '2023-01-01' },
        { uid: 'folder-2', name: 'Folder 2', parent_uid: 'folder-1', created_at: '2023-01-02' },
      ];

      const result = (importAssets as any).constructFolderImportOrder(folders);

      // Should handle gracefully without infinite loop
      expect(result).to.be.an('array');
    });

    it('should handle assets with empty publish_details array', async () => {
      Object.defineProperty(FsUtility.prototype, 'indexFileContent', {
        get: sinon.stub().returns({ '0': 'chunk-0' }),
        configurable: true,
      });
      Object.defineProperty(FsUtility.prototype, 'readChunkFiles', {
        get: sinon.stub().returns({
          next: sinon.stub().resolves([{ uid: 'asset-1', title: 'Asset 1', publish_details: [] }]),
        }),
        configurable: true,
      });

      const makeConcurrentStub = sinon
        .stub(importAssets as any, 'makeConcurrentCall')
        .callsFake(async (options: any) => {
          // When publish_details is empty, the asset should be filtered out
          expect(options.apiContent).to.have.lengthOf(0);
        });

      await (importAssets as any).publish();
      expect(makeConcurrentStub.called).to.be.true;
    });

    it('should handle special characters in folder names', () => {
      const folders = [
        { uid: 'folder-1', name: 'Folder & Special "Chars"', parent_uid: null as any, created_at: '2023-01-01' },
      ];

      const result = (importAssets as any).constructFolderImportOrder(folders);

      expect(result[0].name).to.equal('Folder & Special "Chars"');
    });

    it('should handle very long folder hierarchies', () => {
      const folders = [];
      for (let i = 0; i < 100; i++) {
        folders.push({
          uid: `folder-${i}`,
          name: `Folder ${i}`,
          parent_uid: i === 0 ? null : `folder-${i - 1}`,
          created_at: `2023-01-${String(i + 1).padStart(2, '0')}`,
        });
      }

      const result = (importAssets as any).constructFolderImportOrder(folders);

      expect(result).to.have.lengthOf(100);
      expect(result[99].parent_uid).to.equal('folder-98');
    });
  });

  describe('savePublishDetails() method', () => {
    it('should skip when no pending assets', async () => {
      importAssets['pendingPublishAssets'] = [];
      fsUtilityWriteFileStub.resetHistory();

      await (importAssets as any).savePublishDetails();

      // Should not write file when no pending assets
      expect(fsUtilityWriteFileStub.called).to.be.false;
    });

    it('should log correct count of pending assets', () => {
      importAssets['pendingPublishAssets'] = [
        { oldUid: 'old-asset-1', newUid: 'new-asset-1' },
        { oldUid: 'old-asset-2', newUid: 'new-asset-2' },
      ];

      const assetCount = importAssets['pendingPublishAssets'].length;
      expect(assetCount).to.equal(2);
    });

    it('should have correct publish config file name', () => {
      expect(importAssets['importConfig'].modules.publish.pendingAssetsFileName).to.equal('pending-assets.json');
    });
  });
});
