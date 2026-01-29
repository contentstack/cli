import { expect } from 'chai';
import sinon from 'sinon';
import ImportPublish from '../../../../src/import/modules/publish';
import { ImportConfig } from '../../../../src/types';
import { fsUtil, fileHelper } from '../../../../src/utils';

describe('ImportPublish', () => {
  let importPublish: ImportPublish;
  let mockStackClient: any;
  let mockImportConfig: ImportConfig;
  let fileExistsSyncStub: sinon.SinonStub;
  let fsUtilReadFileStub: sinon.SinonStub;
  let fsUtilWriteFileStub: sinon.SinonStub;

  beforeEach(() => {
    fileExistsSyncStub = sinon.stub(fileHelper, 'fileExistsSync').returns(true);
    fsUtilReadFileStub = sinon.stub(fsUtil, 'readFile').returns({});
    fsUtilWriteFileStub = sinon.stub(fsUtil, 'writeFile').returns();

    mockStackClient = {
      asset: sinon.stub().returns({
        publish: sinon.stub().resolves({ uid: 'asset-123' }),
      }),
      contentType: sinon.stub().returns({
        entry: sinon.stub().returns({
          publish: sinon.stub().resolves({ uid: 'entry-123' }),
        }),
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
        module: 'publish',
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-123',
        apiKey: 'test',
        orgId: 'org-123',
        authenticationMethod: 'Basic Auth',
      },
      modules: {
        types: ['publish'],
        apiConcurrency: 5,
        assets: {
          dirName: 'assets',
          validKeys: ['title', 'filename'],
          folderValidKeys: ['name', 'parent_uid'],
          apiConcurrency: 5,
          importFoldersConcurrency: 3,
          uploadAssetsConcurrency: 5,
          includeVersionedAssets: false,
          importSameStructure: false,
          displayExecutionTime: false,
        },
        entries: {
          dirName: 'entries',
          importConcurrency: 5,
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
        variantEntry: {
          dirName: 'variants',
        },
        personalize: {
          dirName: 'personalize',
          project_id: 'project-123',
          projects: {
            dirName: 'projects',
            fileName: 'projects.json',
          },
        },
      },
      backupDir: '/test/backup',
      cliLogsPath: '/test/logs',
      canCreatePrivateApp: true,
      forceStopMarketplaceAppsPrompt: false,
      skipPrivateAppRecreationIfExist: true,
      isAuthenticated: true,
      auth_token: 'auth-token',
      selectedModules: ['publish'],
      skipAudit: false,
      skipAssetsPublish: false,
      skipEntriesPublish: false,
      'exclude-global-modules': false,
      replaceExisting: false,
      importConcurrency: 5,
      fetchConcurrency: 2,
    } as any;

    importPublish = new ImportPublish({
      importConfig: mockImportConfig as any,
      stackAPIClient: mockStackClient,
      moduleName: 'publish',
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(importPublish).to.be.instanceOf(ImportPublish);
      expect(importPublish['importConfig']).to.equal(mockImportConfig);
      expect((importPublish as any)['client']).to.equal(mockStackClient);
    });

    it('should have publishConfig property with new file names', () => {
      expect(importPublish.publishConfig).to.be.an('object');
      expect(importPublish.publishConfig).to.have.property('dirName', 'publish');
      expect(importPublish.publishConfig).to.have.property('pendingAssetsFileName', 'pending-assets.json');
      expect(importPublish.publishConfig).to.have.property('successAssetsFileName', 'success-assets.json');
      expect(importPublish.publishConfig).to.have.property('failedAssetsFileName', 'failed-assets.json');
      expect(importPublish.publishConfig).to.have.property('pendingEntriesFileName', 'pending-entries.json');
      expect(importPublish.publishConfig).to.have.property('successEntriesFileName', 'success-entries.json');
      expect(importPublish.publishConfig).to.have.property('failedEntriesFileName', 'failed-entries.json');
      expect(importPublish.publishConfig).to.have.property(
        'pendingVariantEntriesFileName',
        'pending-variant-entries.json',
      );
      expect(importPublish.publishConfig).to.have.property(
        'successVariantEntriesFileName',
        'success-variant-entries.json',
      );
      expect(importPublish.publishConfig).to.have.property(
        'failedVariantEntriesFileName',
        'failed-variant-entries.json',
      );
    });

    it('should set context module to publish', () => {
      expect(importPublish['importConfig'].context.module).to.equal('publish');
    });

    it('should initialize paths correctly', () => {
      expect(importPublish['publishDirPath']).to.include('mapper/publish');
      expect(importPublish['pendingAssetsPath']).to.include('pending-assets.json');
      expect(importPublish['pendingEntriesPath']).to.include('pending-entries.json');
      expect(importPublish['successAssetsPath']).to.include('success-assets.json');
      expect(importPublish['failedAssetsPath']).to.include('failed-assets.json');
      expect(importPublish['successEntriesPath']).to.include('success-entries.json');
      expect(importPublish['failedEntriesPath']).to.include('failed-entries.json');
      expect(importPublish['pendingVariantEntriesPath']).to.include('pending-variant-entries.json');
      expect(importPublish['successVariantEntriesPath']).to.include('success-variant-entries.json');
      expect(importPublish['failedVariantEntriesPath']).to.include('failed-variant-entries.json');
    });

    it('should initialize empty tracking arrays', () => {
      expect(importPublish['successAssets']).to.deep.equal([]);
      expect(importPublish['failedAssets']).to.deep.equal([]);
      expect(importPublish['successEntries']).to.deep.equal({});
      expect(importPublish['failedEntries']).to.deep.equal({});
      expect(importPublish['successVariantEntries']).to.deep.equal([]);
      expect(importPublish['failedVariantEntries']).to.deep.equal([]);
    });

    it('should read environments file', () => {
      expect(fsUtilReadFileStub.called).to.be.true;
    });
  });

  describe('start() method', () => {
    let publishAssetsStub: sinon.SinonStub;
    let publishEntriesStub: sinon.SinonStub;
    let publishVariantEntriesStub: sinon.SinonStub;

    beforeEach(() => {
      publishAssetsStub = sinon.stub(importPublish as any, 'publishAssets').resolves();
      publishEntriesStub = sinon.stub(importPublish as any, 'publishEntries').resolves();
      publishVariantEntriesStub = sinon.stub(importPublish as any, 'publishVariantEntries').resolves();
    });

    it('should skip when no publish directory exists', async () => {
      fileExistsSyncStub.returns(false);

      await importPublish.start();

      expect(publishAssetsStub.called).to.be.false;
      expect(publishEntriesStub.called).to.be.false;
      expect(publishVariantEntriesStub.called).to.be.false;
    });

    it('should publish assets first, then entries, then variant entries', async () => {
      await importPublish.start();

      expect(publishAssetsStub.calledOnce).to.be.true;
      expect(publishEntriesStub.calledOnce).to.be.true;
      expect(publishVariantEntriesStub.calledOnce).to.be.true;
      expect(publishAssetsStub.calledBefore(publishEntriesStub)).to.be.true;
      expect(publishEntriesStub.calledBefore(publishVariantEntriesStub)).to.be.true;
    });

    it('should skip asset publishing when skipAssetsPublish is true', async () => {
      mockImportConfig.skipAssetsPublish = true;

      await importPublish.start();

      expect(publishAssetsStub.called).to.be.false;
      expect(publishEntriesStub.calledOnce).to.be.true;
      expect(publishVariantEntriesStub.calledOnce).to.be.true;
    });

    it('should skip entry and variant entry publishing when skipEntriesPublish is true', async () => {
      mockImportConfig.skipEntriesPublish = true;

      await importPublish.start();

      expect(publishAssetsStub.calledOnce).to.be.true;
      expect(publishEntriesStub.called).to.be.false;
      expect(publishVariantEntriesStub.called).to.be.false;
    });

    it('should skip both when both flags are true', async () => {
      mockImportConfig.skipAssetsPublish = true;
      mockImportConfig.skipEntriesPublish = true;

      await importPublish.start();

      expect(publishAssetsStub.called).to.be.false;
      expect(publishEntriesStub.called).to.be.false;
      expect(publishVariantEntriesStub.called).to.be.false;
    });

    it('should handle errors gracefully', async () => {
      publishAssetsStub.rejects(new Error('Publish failed'));

      await importPublish.start();

      expect(publishAssetsStub.calledOnce).to.be.true;
    });
  });

  describe('publishAssets() method', () => {
    let makeConcurrentCallStub: sinon.SinonStub;
    let buildAssetPublishDataStub: sinon.SinonStub;

    beforeEach(() => {
      makeConcurrentCallStub = sinon.stub(importPublish as any, 'makeConcurrentCall').resolves();
      buildAssetPublishDataStub = sinon.stub(importPublish as any, 'buildAssetPublishData').resolves([]);
      importPublish['environments'] = { 'env-1': { name: 'production' } };
    });

    it('should skip when no pending assets file exists', async () => {
      fileExistsSyncStub.withArgs(importPublish['pendingAssetsPath']).returns(false);

      await (importPublish as any).publishAssets();

      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should skip when pending assets file is empty', async () => {
      fsUtilReadFileStub.returns({});

      await (importPublish as any).publishAssets();

      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should skip when no assets with valid publish details', async () => {
      fsUtilReadFileStub.returns({
        'old-asset-1': 'new-asset-1',
      });
      buildAssetPublishDataStub.resolves([]);

      await (importPublish as any).publishAssets();

      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should publish assets with valid publish details', async () => {
      fsUtilReadFileStub.returns({
        'old-asset-1': 'new-asset-1',
      });
      buildAssetPublishDataStub.resolves([
        {
          oldUid: 'old-asset-1',
          newUid: 'new-asset-1',
          title: 'Asset 1',
          publish_details: [{ environment: 'env-1', locale: 'en-us' }],
        },
      ]);

      await (importPublish as any).publishAssets();

      expect(makeConcurrentCallStub.called).to.be.true;
    });
  });

  describe('publishEntries() method', () => {
    let makeConcurrentCallStub: sinon.SinonStub;
    let buildEntryPublishDataStub: sinon.SinonStub;

    beforeEach(() => {
      makeConcurrentCallStub = sinon.stub(importPublish as any, 'makeConcurrentCall').resolves();
      buildEntryPublishDataStub = sinon.stub(importPublish as any, 'buildEntryPublishData').resolves([]);
      importPublish['environments'] = { 'env-1': { name: 'production' } };
    });

    it('should skip when no pending entries file exists', async () => {
      fileExistsSyncStub.withArgs(importPublish['pendingEntriesPath']).returns(false);

      await (importPublish as any).publishEntries();

      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should skip when pending entries file is empty', async () => {
      fsUtilReadFileStub.returns({});

      await (importPublish as any).publishEntries();

      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should publish entries for each content type and locale', async () => {
      fsUtilReadFileStub.returns({
        profiles: {
          'en-us': {
            'old-entry-1': 'new-entry-1',
          },
        },
      });
      buildEntryPublishDataStub.resolves([
        {
          oldUid: 'old-entry-1',
          newUid: 'new-entry-1',
          title: 'Entry 1',
          publish_details: [{ environment: 'env-1', locale: 'en-us' }],
        },
      ]);

      await (importPublish as any).publishEntries();

      expect(makeConcurrentCallStub.called).to.be.true;
    });
  });

  describe('writeTrackingFiles() method', () => {
    it('should write success assets file when successAssets is not empty', () => {
      importPublish['successAssets'] = [{ oldUid: 'old-1', newUid: 'new-1' }];

      (importPublish as any).writeTrackingFiles('assets');

      expect(fsUtilWriteFileStub.calledWith(importPublish['successAssetsPath'], importPublish['successAssets'])).to.be
        .true;
    });

    it('should write failed assets file when failedAssets is not empty', () => {
      importPublish['failedAssets'] = [{ oldUid: 'old-1', newUid: 'new-1', error: 'Error' }];

      (importPublish as any).writeTrackingFiles('assets');

      expect(fsUtilWriteFileStub.calledWith(importPublish['failedAssetsPath'], importPublish['failedAssets'])).to.be
        .true;
    });

    it('should write success entries file when successEntries is not empty', () => {
      importPublish['successEntries'] = {
        profiles: [{ locale: 'en-us', oldUid: 'old-1', newUid: 'new-1' }],
      };

      (importPublish as any).writeTrackingFiles('entries');

      expect(fsUtilWriteFileStub.calledWith(importPublish['successEntriesPath'], importPublish['successEntries'])).to.be
        .true;
    });

    it('should write failed entries file when failedEntries is not empty', () => {
      importPublish['failedEntries'] = {
        profiles: [{ locale: 'en-us', oldUid: 'old-1', newUid: 'new-1', error: 'Error' }],
      };

      (importPublish as any).writeTrackingFiles('entries');

      expect(fsUtilWriteFileStub.calledWith(importPublish['failedEntriesPath'], importPublish['failedEntries'])).to.be
        .true;
    });

    it('should not write files when tracking arrays are empty', () => {
      (importPublish as any).writeTrackingFiles('assets');

      expect(fsUtilWriteFileStub.called).to.be.false;
    });

    it('should write variant entry tracking files when type is variant-entries', () => {
      importPublish['successVariantEntries'] = [
        {
          content_type: 'profiles',
          old_entry_uid: 'old-1',
          entry_uid: 'new-1',
          locale: 'en-us',
          old_variant_uid: 'v-old-1',
          variant_uid: 'v-new-1',
        },
      ];
      importPublish['failedVariantEntries'] = [];

      (importPublish as any).writeTrackingFiles('variant-entries');

      expect(
        fsUtilWriteFileStub.calledWith(
          importPublish['successVariantEntriesPath'],
          importPublish['successVariantEntries'],
        ),
      ).to.be.true;
    });
  });

  describe('publishVariantEntries() method', () => {
    let makeConcurrentCallStub: sinon.SinonStub;
    let buildVariantEntryPublishDataStub: sinon.SinonStub;

    beforeEach(() => {
      makeConcurrentCallStub = sinon.stub(importPublish as any, 'makeConcurrentCall').resolves();
      buildVariantEntryPublishDataStub = sinon.stub(importPublish as any, 'buildVariantEntryPublishData').resolves([]);
    });

    it('should skip when no pending variant entries file exists', async () => {
      fileExistsSyncStub.withArgs(importPublish['pendingVariantEntriesPath']).returns(false);

      await (importPublish as any).publishVariantEntries();

      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should skip when pending variant entries file is empty', async () => {
      fsUtilReadFileStub.returns([]);

      await (importPublish as any).publishVariantEntries();

      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should skip when no variant entries with valid publish details', async () => {
      fsUtilReadFileStub.returns([
        {
          content_type: 'profiles',
          old_entry_uid: 'old-1',
          entry_uid: 'new-1',
          locale: 'en-us',
          old_variant_uid: 'v-old-1',
          variant_uid: 'v-new-1',
        },
      ]);
      buildVariantEntryPublishDataStub.resolves([]);

      await (importPublish as any).publishVariantEntries();

      expect(makeConcurrentCallStub.called).to.be.false;
    });
  });

  describe('Integration Tests', () => {
    it('should complete full publish flow', async () => {
      const publishAssetsStub = sinon.stub(importPublish as any, 'publishAssets').resolves();
      const publishEntriesStub = sinon.stub(importPublish as any, 'publishEntries').resolves();
      const publishVariantEntriesStub = sinon.stub(importPublish as any, 'publishVariantEntries').resolves();

      await importPublish.start();

      expect(publishAssetsStub.calledOnce).to.be.true;
      expect(publishEntriesStub.calledOnce).to.be.true;
      expect(publishVariantEntriesStub.calledOnce).to.be.true;
      expect(publishAssetsStub.calledBefore(publishEntriesStub)).to.be.true;
      expect(publishEntriesStub.calledBefore(publishVariantEntriesStub)).to.be.true;
    });

    it('should respect skip flags in full flow', async () => {
      mockImportConfig.skipAssetsPublish = true;
      mockImportConfig.skipEntriesPublish = true;

      const publishAssetsStub = sinon.stub(importPublish as any, 'publishAssets').resolves();
      const publishEntriesStub = sinon.stub(importPublish as any, 'publishEntries').resolves();
      const publishVariantEntriesStub = sinon.stub(importPublish as any, 'publishVariantEntries').resolves();

      await importPublish.start();

      expect(publishAssetsStub.called).to.be.false;
      expect(publishEntriesStub.called).to.be.false;
      expect(publishVariantEntriesStub.called).to.be.false;
    });
  });
});
