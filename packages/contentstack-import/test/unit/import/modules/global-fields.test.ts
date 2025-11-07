import { expect } from 'chai';
import sinon from 'sinon';
import ImportGlobalFields from '../../../../src/import/modules/global-fields';
import { ImportConfig } from '../../../../src/types';
import { fsUtil, fileHelper } from '../../../../src/utils';
import * as extensionHelper from '../../../../src/utils/extension-helper';
import * as contentTypeHelper from '../../../../src/utils/content-type-helper';

describe('ImportGlobalFields', () => {
  let importGlobalFields: ImportGlobalFields;
  let mockStackClient: any;
  let mockImportConfig: ImportConfig;
  let fsUtilStub: any;
  let fileHelperStub: any;
  let lookupExtensionStub: sinon.SinonStub;
  let removeReferenceFieldsStub: sinon.SinonStub;
  let makeConcurrentCallStub: sinon.SinonStub;

  beforeEach(() => {
    // Setup filesystem stubs
    fsUtilStub = {
      readFile: sinon.stub(),
      writeFile: sinon.stub(),
      makeDirectory: sinon.stub().resolves()
    };
    sinon.stub(fsUtil, 'readFile').callsFake(fsUtilStub.readFile);
    sinon.stub(fsUtil, 'writeFile').callsFake(fsUtilStub.writeFile);
    sinon.stub(fsUtil, 'makeDirectory').callsFake(fsUtilStub.makeDirectory);

    fileHelperStub = {
      fileExistsSync: sinon.stub().returns(false)
    };
    sinon.stub(fileHelper, 'fileExistsSync').callsFake(fileHelperStub.fileExistsSync);

    // Setup helper stubs
    lookupExtensionStub = sinon.stub(extensionHelper, 'lookupExtension');
    removeReferenceFieldsStub = sinon.stub(contentTypeHelper, 'removeReferenceFields').resolves();

    // Setup mock stack client
    mockStackClient = {
      globalField: sinon.stub().returns({
        fetch: sinon.stub().resolves({ uid: 'gf-123', title: 'Test GF', update: sinon.stub().resolves({ uid: 'gf-123' }) }),
        update: sinon.stub().resolves({ uid: 'gf-123', title: 'Updated GF' }),
        create: sinon.stub().resolves({ uid: 'gf-123', title: 'Test GF' })
      })
    };

    mockImportConfig = {
      apiKey: 'test',
      contentDir: '/test/content',
      data: '/test/content',
      contentVersion: 1,
      region: 'us',
      master_locale: { code: 'en-us' },
      masterLocale: { code: 'en-us' },
      writeConcurrency: 2,
      context: {
        command: 'cm:stacks:import',
        module: 'global-fields',
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-123',
        apiKey: 'test',
        orgId: 'org-123',
        authenticationMethod: 'Basic Auth'
      },
      modules: {
        types: ['global-fields'],
        'global-fields': {
          dirName: 'global_fields',
          validKeys: ['title', 'uid', 'schema'],
          apiConcurrency: 5,
          writeConcurrency: 3,
          fileName: 'globalfields.json',
          limit: 100
        }
      },
      backupDir: '/test/backup',
      cliLogsPath: '/test/logs',
      canCreatePrivateApp: true,
      forceStopMarketplaceAppsPrompt: false,
      skipPrivateAppRecreationIfExist: true,
      isAuthenticated: true,
      auth_token: 'auth-token',
      selectedModules: ['global-fields'],
      skipAudit: false,
      preserveStackVersion: false,
      replaceExisting: false,
      skipExisting: false,
      'exclude-global-modules': false
    } as any;

    importGlobalFields = new ImportGlobalFields({
      importConfig: mockImportConfig as any,
      stackAPIClient: mockStackClient,
      moduleName: 'global-fields'
    });

    // Stub makeConcurrentCall after instance creation
    makeConcurrentCallStub = sinon.stub(importGlobalFields as any, 'makeConcurrentCall').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(importGlobalFields).to.be.instanceOf(ImportGlobalFields);
      expect(importGlobalFields['importConfig']).to.equal(mockImportConfig);
      expect((importGlobalFields as any)['client']).to.equal(mockStackClient);
    });

    it('should set context module to global-fields', () => {
      expect(importGlobalFields['importConfig'].context.module).to.equal('global-fields');
    });

    it('should initialize paths correctly', () => {
      expect(importGlobalFields['gFsFolderPath']).to.include('global_fields');
      expect(importGlobalFields['gFsMapperPath']).to.include('mapper');
      expect(importGlobalFields['gFsSuccessPath']).to.include('success.json');
      expect(importGlobalFields['gFsFailsPath']).to.include('fails.json');
      expect(importGlobalFields['gFsUidMapperPath']).to.include('uid-mapping.json');
      expect(importGlobalFields['gFsPendingPath']).to.include('pending_global_fields.js');
    });

    it('should initialize empty arrays and objects', () => {
      expect(importGlobalFields['gFs']).to.deep.equal([]);
      expect(importGlobalFields['createdGFs']).to.deep.equal([]);
      expect(importGlobalFields['failedGFs']).to.deep.equal([]);
      expect(importGlobalFields['pendingGFs']).to.deep.equal([]);
      expect(importGlobalFields['existingGFs']).to.deep.equal([]);
      expect(importGlobalFields['gFsUidMapper']).to.deep.equal({});
    });

    it('should set reqConcurrency from gFsConfig', () => {
      expect(importGlobalFields['reqConcurrency']).to.equal(3);
    });

    it('should fallback to importConfig writeConcurrency if gFsConfig not set', () => {
      const config = { ...mockImportConfig };
      (config.modules['global-fields'] as any).writeConcurrency = undefined;
      const instance = new ImportGlobalFields({
        importConfig: config as any,
        stackAPIClient: mockStackClient,
        moduleName: 'global-fields'
      });
      expect(instance['reqConcurrency']).to.equal(2);
    });
  });

  describe('start()', () => {
    it('should return early when no global fields found', async () => {
      fsUtilStub.readFile.returns(null);

      await importGlobalFields.start();

      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should return early when global fields array is empty', async () => {
      fsUtilStub.readFile.returns([]);

      await importGlobalFields.start();

      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should process global fields when available', async () => {
      const mockGFs = [
        { uid: 'gf1', title: 'Global Field 1', schema: [] as any },
        { uid: 'gf2', title: 'Global Field 2', schema: [] as any }
      ];

      fsUtilStub.readFile.withArgs(sinon.match(/globalfields\.json/)).returns(mockGFs);
      fsUtilStub.readFile.withArgs(sinon.match(/uid-mapping\.json/)).returns({ extension_uid: {} });

      await importGlobalFields.start();

      expect(makeConcurrentCallStub.callCount).to.equal(2); // seedGFs and updateGFs
      expect(fsUtilStub.makeDirectory.called).to.be.true;
    });

    it('should load existing UID mapper when file exists', async () => {
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];
      const mockUidMapper = { gf1: 'mapped-gf1' };

      fileHelperStub.fileExistsSync.returns(true);
      fsUtilStub.readFile.withArgs(sinon.match(/globalfields\.json/)).returns(mockGFs);
      fsUtilStub.readFile.withArgs(sinon.match(/uid-mapping\.json/)).onFirstCall().returns(mockUidMapper);
      fsUtilStub.readFile.withArgs(sinon.match(/marketplace_apps.*uid-mapping\.json/)).returns({ extension_uid: {} });

      await importGlobalFields.start();

      expect(importGlobalFields['gFsUidMapper']).to.deep.equal(mockUidMapper);
    });

    it('should load installed extensions', async () => {
      const mockExtensions = { extension_uid: { ext1: 'uid1', ext2: 'uid2' } };
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];

      fsUtilStub.readFile.withArgs(sinon.match(/globalfields\.json/)).returns(mockGFs);
      fsUtilStub.readFile.withArgs(sinon.match(/marketplace_apps.*uid-mapping\.json/)).returns(mockExtensions);

      await importGlobalFields.start();

      expect(importGlobalFields['installedExtensions']).to.deep.equal(mockExtensions.extension_uid);
    });

    it('should write pending global fields when available', async () => {
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];
      fsUtilStub.readFile.withArgs(sinon.match(/globalfields\.json/)).returns(mockGFs);
      fsUtilStub.readFile.withArgs(sinon.match(/marketplace_apps.*uid-mapping\.json/)).returns({ extension_uid: {} });

      importGlobalFields['pendingGFs'] = ['gf1', 'gf2'];

      await importGlobalFields.start();

      expect(fsUtilStub.writeFile.calledWith(sinon.match(/pending_global_fields\.js/))).to.be.true;
    });

    it('should write success file when global fields created', async () => {
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];
      fsUtilStub.readFile.withArgs(sinon.match(/globalfields\.json/)).returns(mockGFs);
      fsUtilStub.readFile.withArgs(sinon.match(/marketplace_apps.*uid-mapping\.json/)).returns({ extension_uid: {} });

      importGlobalFields['createdGFs'] = [{ uid: 'gf1' }, { uid: 'gf2' }];

      await importGlobalFields.start();

      expect(fsUtilStub.writeFile.calledWith(sinon.match(/success\.json/))).to.be.true;
    });

    it('should write fails file when global fields failed', async () => {
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];
      fsUtilStub.readFile.withArgs(sinon.match(/globalfields\.json/)).returns(mockGFs);
      fsUtilStub.readFile.withArgs(sinon.match(/marketplace_apps.*uid-mapping\.json/)).returns({ extension_uid: {} });

      importGlobalFields['failedGFs'] = [{ uid: 'gf1' }];

      await importGlobalFields.start();

      expect(fsUtilStub.writeFile.calledWith(sinon.match(/fails\.json/))).to.be.true;
    });

    it('should call replaceGFs when replaceExisting is true and existingGFs exist', async () => {
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];
      importGlobalFields['importConfig'].replaceExisting = true;
      importGlobalFields['existingGFs'] = [{ uid: 'gf1', global_field: { uid: 'gf1' } }];

      fsUtilStub.readFile.withArgs(sinon.match(/globalfields\.json/)).returns(mockGFs);
      fsUtilStub.readFile.withArgs(sinon.match(/marketplace_apps.*uid-mapping\.json/)).returns({ extension_uid: {} });

      await importGlobalFields.start();

      expect(makeConcurrentCallStub.callCount).to.equal(3); // seedGFs, updateGFs, replaceGFs
    });

    it('should handle replaceGFs errors gracefully', async () => {
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];
      importGlobalFields['importConfig'].replaceExisting = true;
      importGlobalFields['existingGFs'] = [{ uid: 'gf1', global_field: { uid: 'gf1' } }];

      fsUtilStub.readFile.withArgs(sinon.match(/globalfields\.json/)).returns(mockGFs);
      fsUtilStub.readFile.withArgs(sinon.match(/marketplace_apps.*uid-mapping\.json/)).returns({ extension_uid: {} });
      makeConcurrentCallStub.onThirdCall().rejects(new Error('Replace failed'));

      await importGlobalFields.start();

      // Should not throw, error is caught and handled
    });
  });

  describe('seedGFs()', () => {
    it('should call makeConcurrentCall with correct parameters', async () => {
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];
      importGlobalFields['gFs'] = mockGFs;

      await importGlobalFields.seedGFs();

      expect(makeConcurrentCallStub.calledOnce).to.be.true;
      const callArgs = makeConcurrentCallStub.firstCall.args[0];
      expect(callArgs.processName).to.equal('Import global fields');
      expect(callArgs.apiContent).to.equal(mockGFs);
      expect(callArgs.apiParams.entity).to.equal('create-gfs');
      expect(callArgs.concurrencyLimit).to.equal(3);
    });

    it('should handle successful global field creation', async () => {
      importGlobalFields['gFs'] = [{ uid: 'gf1', title: 'GF 1' }];

      await importGlobalFields.seedGFs();

      const onSuccess = makeConcurrentCallStub.firstCall.args[0].apiParams.resolve;
      const mockGF = { uid: 'gf1', title: 'GF 1' };
      onSuccess({ response: mockGF, apiData: { uid: 'gf1' } });

      expect(importGlobalFields['createdGFs']).to.include(mockGF);
      expect(importGlobalFields['gFsUidMapper']['gf1']).to.equal(mockGF);
    });

    it('should handle existing global field with replaceExisting true', async () => {
      importGlobalFields['gFs'] = [{ uid: 'gf1', title: 'GF 1' }];
      importGlobalFields['importConfig'].replaceExisting = true;

      await importGlobalFields.seedGFs();

      const onReject = makeConcurrentCallStub.firstCall.args[0].apiParams.reject;
      const mockGF = { global_field: { uid: 'gf1' } };
      onReject({
        error: { errors: { title: 'exists' } },
        apiData: mockGF
      });

      expect(importGlobalFields['existingGFs']).to.include(mockGF);
    });

    it('should handle existing global field with skipExisting false', async () => {
      importGlobalFields['gFs'] = [{ uid: 'gf1', title: 'GF 1' }];
      importGlobalFields['importConfig'].skipExisting = false;

      await importGlobalFields.seedGFs();

      const onReject = makeConcurrentCallStub.firstCall.args[0].apiParams.reject;
      onReject({
        error: { errors: { title: 'exists' } },
        apiData: { global_field: { uid: 'gf1' } }
      });

      // Should not throw, just log
    });

    it('should handle other errors during seeding', async () => {
      importGlobalFields['gFs'] = [{ uid: 'gf1', title: 'GF 1' }];

      await importGlobalFields.seedGFs();

      const onReject = makeConcurrentCallStub.firstCall.args[0].apiParams.reject;
      onReject({
        error: { errorCode: 500, message: 'Server error' },
        apiData: { global_field: { uid: 'gf1' } }
      });

      expect(importGlobalFields['failedGFs']).to.have.lengthOf(1);
    });

    it('should handle global fields as object instead of array', async () => {
      importGlobalFields['gFs'] = { gf1: { uid: 'gf1' }, gf2: { uid: 'gf2' } } as any;

      await importGlobalFields.seedGFs();

      expect(makeConcurrentCallStub.called).to.be.true;
    });
  });

  describe('serializeGFs()', () => {
    it('should serialize global field correctly', () => {
      const apiOptions = {
        apiData: { uid: 'test_gf', title: 'Test Global Field', schema: [] as any }
      };

      const result = importGlobalFields.serializeGFs(apiOptions as any);

      expect(result.apiData).to.have.property('global_field');
      expect(result.apiData.global_field.uid).to.equal('test_gf');
      expect(result.apiData.global_field.title).to.equal('Test Global Field');
    });

    it('should use gfSchemaTemplate structure', () => {
      const apiOptions = {
        apiData: { uid: 'gf_uid', title: 'GF Title', schema: [] as any }
      };

      const result = importGlobalFields.serializeGFs(apiOptions as any);

      expect(result.apiData.global_field).to.have.property('schema');
    });

    it('should preserve original uid and title', () => {
      const originalData = { uid: 'original_uid', title: 'Original Title', schema: [] as any };
      const apiOptions = { apiData: originalData };

      const result = importGlobalFields.serializeGFs(apiOptions as any);

      expect(result.apiData.global_field.uid).to.equal('original_uid');
      expect(result.apiData.global_field.title).to.equal('Original Title');
    });
  });

  describe('updateGFs()', () => {
    it('should call makeConcurrentCall with correct parameters', async () => {
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];
      importGlobalFields['gFs'] = mockGFs;

      await importGlobalFields.updateGFs();

      expect(makeConcurrentCallStub.called).to.be.true;
      const callArgs = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Update Global Fields'
      )?.args[0];
      expect(callArgs.processName).to.equal('Update Global Fields');
      expect(callArgs.apiParams.entity).to.equal('update-gfs');
    });

    it('should pass updateSerializedGFs as serialize function', async () => {
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];
      importGlobalFields['gFs'] = mockGFs;

      await importGlobalFields.updateGFs();

      expect(makeConcurrentCallStub.called).to.be.true;
      const serializeFunc = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Update Global Fields'
      )?.args[1];
      expect(serializeFunc).to.be.a('function');
    });

    it('should handle successful update', async () => {
      importGlobalFields['gFs'] = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];

      await importGlobalFields.updateGFs();

      const onSuccess = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Update Global Fields'
      )?.args[0].apiParams.resolve;

      expect(() => {
        onSuccess({ response: {}, apiData: { uid: 'gf1' } });
      }).to.not.throw();
    });

    it('should handle failed update', async () => {
      importGlobalFields['gFs'] = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];

      await importGlobalFields.updateGFs();

      const onReject = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Update Global Fields'
      )?.args[0].apiParams.reject;

      expect(() => {
        onReject({ error: { message: 'Update failed' }, apiData: { uid: 'gf1' } });
      }).to.not.throw();
    });

    it('should handle global fields as object instead of array', async () => {
      importGlobalFields['gFs'] = { gf1: { uid: 'gf1' }, gf2: { uid: 'gf2' } } as any;

      await importGlobalFields.updateGFs();

      expect(makeConcurrentCallStub.called).to.be.true;
    });
  });

  describe('updateSerializedGFs()', () => {
    let mockGlobalField: any;
    let mockApiParams: any;

    beforeEach(() => {
      mockGlobalField = { uid: 'gf1', title: 'GF 1', schema: [] };
      mockApiParams = {
        resolve: sinon.stub(),
        reject: sinon.stub()
      };
      importGlobalFields['installedExtensions'] = {};
      importGlobalFields['config'] = mockImportConfig;
    });

    it('should lookup extensions for global field', async () => {
      await importGlobalFields.updateSerializedGFs({
        apiParams: mockApiParams,
        element: mockGlobalField,
        isLastRequest: false
      });

      expect(lookupExtensionStub.calledOnce).to.be.true;
    });

    it('should remove reference fields', async () => {
      await importGlobalFields.updateSerializedGFs({
        apiParams: mockApiParams,
        element: mockGlobalField,
        isLastRequest: false
      });

      expect(removeReferenceFieldsStub.calledOnce).to.be.true;
    });

    it('should add to pending when flag.supressed is true', async () => {
      removeReferenceFieldsStub.callsFake(async (schema: any, flag: any) => {
        flag.supressed = true;
      });

      await importGlobalFields.updateSerializedGFs({
        apiParams: mockApiParams,
        element: mockGlobalField,
        isLastRequest: false
      });

      expect(importGlobalFields['pendingGFs']).to.include('gf1');
      expect(mockApiParams.resolve.called).to.be.false;
    });

    it('should fetch and update global field when not suppressed', async () => {
      const mockResponse = { uid: 'gf1', update: sinon.stub().resolves({ uid: 'gf1' }) };
      mockStackClient.globalField.returns({
        fetch: sinon.stub().resolves(mockResponse)
      });

      await importGlobalFields.updateSerializedGFs({
        apiParams: mockApiParams,
        element: mockGlobalField,
        isLastRequest: false
      });

      expect(mockStackClient.globalField.calledWith('gf1', { api_version: '3.2' })).to.be.true;
      expect(mockApiParams.resolve.called).to.be.true;
    });

    it('should handle fetch error', async () => {
      mockStackClient.globalField.returns({
        fetch: sinon.stub().rejects(new Error('Fetch failed'))
      });

      try {
        await importGlobalFields.updateSerializedGFs({
          apiParams: mockApiParams,
          element: mockGlobalField,
          isLastRequest: false
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
      }

      expect(mockApiParams.reject.called).to.be.true;
    });

    it('should handle update error', async () => {
      const mockResponse = { uid: 'gf1', update: sinon.stub().rejects(new Error('Update failed')) };
      mockStackClient.globalField.returns({
        fetch: sinon.stub().resolves(mockResponse)
      });

      try {
        await importGlobalFields.updateSerializedGFs({
          apiParams: mockApiParams,
          element: mockGlobalField,
          isLastRequest: false
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
      }

      expect(mockApiParams.reject.called).to.be.true;
    });
  });

  describe('replaceGFs()', () => {
    beforeEach(() => {
      importGlobalFields['existingGFs'] = [
        { uid: 'gf1', global_field: { uid: 'gf1' } },
        { uid: 'gf2', global_field: { uid: 'gf2' } }
      ];
    });

    it('should call makeConcurrentCall with correct parameters', async () => {
      await importGlobalFields.replaceGFs();

      const callArgs = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Replace global fields'
      )?.args[0];
      expect(callArgs.processName).to.equal('Replace global fields');
      expect(callArgs.apiContent).to.equal(importGlobalFields['existingGFs']);
      expect(callArgs.apiParams.entity).to.equal('update-gfs');
    });

    it('should handle successful replacement', async () => {
      await importGlobalFields.replaceGFs();

      const onSuccess = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Replace global fields'
      )?.args[0].apiParams.resolve;

      const mockGF = { uid: 'gf1', title: 'GF 1' };
      onSuccess({ response: mockGF, apiData: { uid: 'gf1' } });

      expect(importGlobalFields['createdGFs']).to.include(mockGF);
      expect(fsUtilStub.writeFile.calledWith(sinon.match(/uid-mapping\.json/))).to.be.true;
    });

    it('should handle replacement with global_field nested uid', async () => {
      await importGlobalFields.replaceGFs();

      const onSuccess = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Replace global fields'
      )?.args[0].apiParams.resolve;

      const mockGF = { uid: 'gf1', title: 'GF 1' };
      onSuccess({ response: mockGF, apiData: { global_field: { uid: 'gf1' } } });

      expect(importGlobalFields['createdGFs']).to.include(mockGF);
    });

    it('should handle replacement failure', async () => {
      await importGlobalFields.replaceGFs();

      const onReject = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Replace global fields'
      )?.args[0].apiParams.reject;

      onReject({ error: { message: 'Replace failed' }, apiData: { uid: 'gf1' } });

      expect(importGlobalFields['failedGFs']).to.have.lengthOf(1);
    });

    it('should use correct concurrency', async () => {
      await importGlobalFields.replaceGFs();

      const callArgs = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Replace global fields'
      )?.args[0];
      expect(callArgs.concurrencyLimit).to.be.a('number');
    });
  });

  describe('serializeReplaceGFs()', () => {
    beforeEach(() => {
      mockStackClient.globalField.returns({
        uid: 'test_gf',
        stackHeaders: { 'test-header': 'value' }
      });
    });

    it('should serialize global field replacement correctly', () => {
      const apiOptions = {
        apiData: { uid: 'gf1', title: 'GF 1', schema: [] as any }
      };

      const result = importGlobalFields.serializeReplaceGFs(apiOptions as any);

      expect(mockStackClient.globalField.calledWith('gf1', { api_version: '3.2' })).to.be.true;
      expect(result.apiData).to.exist;
    });

    it('should handle global field with nested uid', () => {
      const apiOptions = {
        apiData: { global_field: { uid: 'gf1' }, title: 'GF 1' }
      };

      const result = importGlobalFields.serializeReplaceGFs(apiOptions as any);

      expect(result.apiData).to.exist;
    });

    it('should preserve stackHeaders', () => {
      const apiOptions = {
        apiData: { uid: 'gf1', title: 'GF 1', schema: [] as any }
      };

      const result = importGlobalFields.serializeReplaceGFs(apiOptions as any);

      expect(result.apiData.stackHeaders).to.deep.equal({ 'test-header': 'value' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing extension_uid in marketplace mapping', async () => {
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];
      fsUtilStub.readFile.withArgs(sinon.match(/globalfields\.json/)).returns(mockGFs);
      fsUtilStub.readFile.withArgs(sinon.match(/marketplace_apps.*uid-mapping\.json/)).returns(null);

      await importGlobalFields.start();

      expect(importGlobalFields['installedExtensions']).to.deep.equal({});
    });

    it('should handle error without title field in seedGFs', async () => {
      importGlobalFields['gFs'] = [{ uid: 'gf1', title: 'GF 1' }];

      await importGlobalFields.seedGFs();

      const onReject = makeConcurrentCallStub.firstCall.args[0].apiParams.reject;
      onReject({
        error: { errorCode: 500, message: 'Server error' }, // No errors.title
        apiData: { global_field: { uid: 'gf1' } }
      });

      expect(importGlobalFields['failedGFs']).to.have.lengthOf(1);
    });

    it('should handle skipExisting true in seedGFs', async () => {
      importGlobalFields['gFs'] = [{ uid: 'gf1', title: 'GF 1' }];
      importGlobalFields['importConfig'].skipExisting = true;

      await importGlobalFields.seedGFs();

      const onReject = makeConcurrentCallStub.firstCall.args[0].apiParams.reject;
      onReject({
        error: { errors: { title: 'exists' } },
        apiData: { global_field: { uid: 'gf1' } }
      });

      // Should not log "already exist" message when skipExisting is true
      expect(importGlobalFields['existingGFs']).to.have.lengthOf(0);
    });

    it('should handle updateGFs onSuccess callback', async () => {
      importGlobalFields['gFs'] = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];

      await importGlobalFields.updateGFs();

      const onSuccess = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Update Global Fields'
      )?.args[0].apiParams.resolve;

      expect(() => {
        onSuccess({ response: { uid: 'gf1' }, apiData: { uid: 'gf1' } });
      }).to.not.throw();
    });

    it('should handle updateGFs onReject callback', async () => {
      importGlobalFields['gFs'] = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];

      await importGlobalFields.updateGFs();

      const onReject = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Update Global Fields'
      )?.args[0].apiParams.reject;

      expect(() => {
        onReject({ error: { message: 'Update failed' }, apiData: { uid: 'gf1' } });
      }).to.not.throw();
    });

    it('should handle replaceGFs onSuccess with apiData.uid', async () => {
      importGlobalFields['existingGFs'] = [
        { uid: 'gf1', global_field: { uid: 'gf1' } }
      ];

      await importGlobalFields.replaceGFs();

      const onSuccess = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Replace global fields'
      )?.args[0].apiParams.resolve;

      const mockGF = { uid: 'gf1', title: 'GF 1' };
      onSuccess({ response: mockGF, apiData: { uid: 'gf1' } });

      expect(importGlobalFields['createdGFs']).to.include(mockGF);
      expect(importGlobalFields['gFsUidMapper']['gf1']).to.equal(mockGF);
    });

    it('should handle replaceGFs onSuccess with apiData.global_field.uid', async () => {
      importGlobalFields['existingGFs'] = [
        { uid: 'gf1', global_field: { uid: 'gf1' } }
      ];

      await importGlobalFields.replaceGFs();

      const onSuccess = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Replace global fields'
      )?.args[0].apiParams.resolve;

      const mockGF = { uid: 'gf1', title: 'GF 1' };
      onSuccess({ response: mockGF, apiData: { global_field: { uid: 'gf1' } } });

      expect(importGlobalFields['createdGFs']).to.include(mockGF);
      expect(importGlobalFields['gFsUidMapper']['gf1']).to.equal(mockGF);
    });

    it('should handle replaceGFs onSuccess with unknown uid', async () => {
      importGlobalFields['existingGFs'] = [
        { uid: 'gf1', global_field: { uid: 'gf1' } }
      ];

      await importGlobalFields.replaceGFs();

      const onSuccess = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Replace global fields'
      )?.args[0].apiParams.resolve;

      const mockGF = { uid: 'gf1', title: 'GF 1' };
      onSuccess({ response: mockGF, apiData: {} }); // No uid or global_field.uid

      expect(importGlobalFields['createdGFs']).to.include(mockGF);
      expect(importGlobalFields['gFsUidMapper']['unknown']).to.equal(mockGF);
    });

    it('should handle replaceGFs onReject with apiData.uid', async () => {
      importGlobalFields['existingGFs'] = [
        { uid: 'gf1', global_field: { uid: 'gf1' } }
      ];

      await importGlobalFields.replaceGFs();

      const onReject = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Replace global fields'
      )?.args[0].apiParams.reject;

      onReject({ error: { message: 'Replace failed' }, apiData: { uid: 'gf1' } });

      expect(importGlobalFields['failedGFs']).to.have.lengthOf(1);
      expect(importGlobalFields['failedGFs'][0].uid).to.equal('gf1');
    });

    it('should handle replaceGFs onReject with apiData.global_field.uid', async () => {
      importGlobalFields['existingGFs'] = [
        { uid: 'gf1', global_field: { uid: 'gf1' } }
      ];

      await importGlobalFields.replaceGFs();

      const onReject = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Replace global fields'
      )?.args[0].apiParams.reject;

      onReject({ error: { message: 'Replace failed' }, apiData: { global_field: { uid: 'gf1' } } });

      expect(importGlobalFields['failedGFs']).to.have.lengthOf(1);
      expect(importGlobalFields['failedGFs'][0].uid).to.equal('gf1');
    });

    it('should handle replaceGFs onReject with unknown uid', async () => {
      importGlobalFields['existingGFs'] = [
        { uid: 'gf1', global_field: { uid: 'gf1' } }
      ];

      await importGlobalFields.replaceGFs();

      const onReject = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Replace global fields'
      )?.args[0].apiParams.reject;

      onReject({ error: { message: 'Replace failed' }, apiData: {} }); // No uid or global_field.uid

      expect(importGlobalFields['failedGFs']).to.have.lengthOf(1);
      expect(importGlobalFields['failedGFs'][0].uid).to.equal('unknown');
    });

    it('should handle serializeReplaceGFs with global_field.uid', () => {
      const apiOptions = {
        apiData: { global_field: { uid: 'gf1' }, title: 'GF 1' }
      };

      const result = importGlobalFields.serializeReplaceGFs(apiOptions as any);

      expect(result.apiData).to.exist;
    });

    it('should handle serializeReplaceGFs with unknown uid', () => {
      const apiOptions = {
        apiData: { title: 'GF 1' } // No uid or global_field.uid
      };

      const result = importGlobalFields.serializeReplaceGFs(apiOptions as any);

      expect(result.apiData).to.exist;
    });

    it('should handle seedGFs onSuccess with undefined uid', async () => {
      importGlobalFields['gFs'] = [{ uid: 'gf1', title: 'GF 1' }];

      await importGlobalFields.seedGFs();

      const onSuccess = makeConcurrentCallStub.firstCall.args[0].apiParams.resolve;
      const mockGF = { uid: 'gf1', title: 'GF 1' };
      onSuccess({ response: mockGF, apiData: {} }); // No uid in apiData

      expect(importGlobalFields['createdGFs']).to.include(mockGF);
      expect(importGlobalFields['gFsUidMapper']['undefined']).to.equal(mockGF);
    });

    it('should handle seedGFs onReject with undefined globalField', async () => {
      importGlobalFields['gFs'] = [{ uid: 'gf1', title: 'GF 1' }];

      await importGlobalFields.seedGFs();

      const onReject = makeConcurrentCallStub.firstCall.args[0].apiParams.reject;
      onReject({
        error: { errors: { title: 'exists' } },
        apiData: undefined // No globalField
      });

      // Should not throw, just log
    });

    it('should handle updateGFs onSuccess with undefined uid', async () => {
      importGlobalFields['gFs'] = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];

      await importGlobalFields.updateGFs();

      const onSuccess = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Update Global Fields'
      )?.args[0].apiParams.resolve;

      expect(() => {
        onSuccess({ response: { uid: 'gf1' }, apiData: {} }); // No uid in apiData
      }).to.not.throw();
    });

    it('should handle updateGFs onReject with undefined uid', async () => {
      importGlobalFields['gFs'] = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];

      await importGlobalFields.updateGFs();

      const onReject = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Update Global Fields'
      )?.args[0].apiParams.reject;

      expect(() => {
        onReject({ error: { message: 'Update failed' }, apiData: {} }); // No uid in apiData
      }).to.not.throw();
    });

    it('should handle replaceGFs onSuccess with null apiData', async () => {
      importGlobalFields['existingGFs'] = [
        { uid: 'gf1', global_field: { uid: 'gf1' } }
      ];

      await importGlobalFields.replaceGFs();

      const onSuccess = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Replace global fields'
      )?.args[0].apiParams.resolve;

      const mockGF = { uid: 'gf1', title: 'GF 1' };
      onSuccess({ response: mockGF, apiData: null }); // Null apiData

      expect(importGlobalFields['createdGFs']).to.include(mockGF);
      expect(importGlobalFields['gFsUidMapper']['unknown']).to.equal(mockGF);
    });

    it('should handle replaceGFs onReject with null apiData', async () => {
      importGlobalFields['existingGFs'] = [
        { uid: 'gf1', global_field: { uid: 'gf1' } }
      ];

      await importGlobalFields.replaceGFs();

      const onReject = makeConcurrentCallStub.getCalls().find((call: any) =>
        call.args[0].processName === 'Replace global fields'
      )?.args[0].apiParams.reject;

      onReject({ error: { message: 'Replace failed' }, apiData: null }); // Null apiData

      expect(importGlobalFields['failedGFs']).to.have.lengthOf(1);
      expect(importGlobalFields['failedGFs'][0].uid).to.equal('unknown');
    });


    it('should handle null UID mapper file', async () => {
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];
      fileHelperStub.fileExistsSync.returns(true);
      fsUtilStub.readFile.withArgs(sinon.match(/globalfields\.json/)).returns(mockGFs);
      fsUtilStub.readFile.withArgs(sinon.match(/uid-mapping\.json/)).onFirstCall().returns(null);
      fsUtilStub.readFile.withArgs(sinon.match(/marketplace_apps.*uid-mapping\.json/)).returns({ extension_uid: {} });

      await importGlobalFields.start();

      expect(importGlobalFields['gFsUidMapper']).to.deep.equal({});
    });

    it('should not replace when replaceExisting is false', async () => {
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];
      importGlobalFields['importConfig'].replaceExisting = false;
      importGlobalFields['existingGFs'] = [{ uid: 'gf1', global_field: { uid: 'gf1' } }];

      fsUtilStub.readFile.withArgs(sinon.match(/globalfields\.json/)).returns(mockGFs);
      fsUtilStub.readFile.withArgs(sinon.match(/marketplace_apps.*uid-mapping\.json/)).returns({ extension_uid: {} });

      await importGlobalFields.start();

      expect(makeConcurrentCallStub.callCount).to.equal(2); // Only seedGFs and updateGFs
    });

    it('should not replace when existingGFs is empty', async () => {
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];
      importGlobalFields['importConfig'].replaceExisting = true;
      importGlobalFields['existingGFs'] = [];

      fsUtilStub.readFile.withArgs(sinon.match(/globalfields\.json/)).returns(mockGFs);
      fsUtilStub.readFile.withArgs(sinon.match(/marketplace_apps.*uid-mapping\.json/)).returns({ extension_uid: {} });

      await importGlobalFields.start();

      expect(makeConcurrentCallStub.callCount).to.equal(2); // Only seedGFs and updateGFs
    });

    it('should not write pending file when array is empty', async () => {
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];
      fsUtilStub.readFile.withArgs(sinon.match(/globalfields\.json/)).returns(mockGFs);
      fsUtilStub.readFile.withArgs(sinon.match(/marketplace_apps.*uid-mapping\.json/)).returns({ extension_uid: {} });

      importGlobalFields['pendingGFs'] = [];

      await importGlobalFields.start();

      expect(fsUtilStub.writeFile.calledWith(sinon.match(/pending_global_fields\.js/))).to.be.false;
    });

    it('should not write success file when array is empty', async () => {
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];
      fsUtilStub.readFile.withArgs(sinon.match(/globalfields\.json/)).returns(mockGFs);
      fsUtilStub.readFile.withArgs(sinon.match(/marketplace_apps.*uid-mapping\.json/)).returns({ extension_uid: {} });

      importGlobalFields['createdGFs'] = [];

      await importGlobalFields.start();

      expect(fsUtilStub.writeFile.calledWith(sinon.match(/success\.json/))).to.be.false;
    });

    it('should not write fails file when array is empty', async () => {
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];
      fsUtilStub.readFile.withArgs(sinon.match(/globalfields\.json/)).returns(mockGFs);
      fsUtilStub.readFile.withArgs(sinon.match(/marketplace_apps.*uid-mapping\.json/)).returns({ extension_uid: {} });

      importGlobalFields['failedGFs'] = [];

      await importGlobalFields.start();

      expect(fsUtilStub.writeFile.calledWith(sinon.match(/fails\.json/))).to.be.false;
    });
  });

  describe('Integration Tests', () => {
    it('should complete full global fields import flow', async () => {
      const mockGFs = [
        { uid: 'gf1', title: 'Global Field 1', schema: [] as any },
        { uid: 'gf2', title: 'Global Field 2', schema: [] as any }
      ];

      fsUtilStub.readFile.withArgs(sinon.match(/globalfields\.json/)).returns(mockGFs);
      fsUtilStub.readFile.withArgs(sinon.match(/marketplace_apps.*uid-mapping\.json/)).returns({ extension_uid: {} });

      importGlobalFields['createdGFs'] = [{ uid: 'gf1' }, { uid: 'gf2' }];

      await importGlobalFields.start();

      expect(makeConcurrentCallStub.callCount).to.equal(2);
      expect(fsUtilStub.makeDirectory.called).to.be.true;
      expect(fsUtilStub.writeFile.called).to.be.true;
    });

    it('should handle complete flow with replaceExisting', async () => {
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];
      importGlobalFields['importConfig'].replaceExisting = true;

      fsUtilStub.readFile.withArgs(sinon.match(/globalfields\.json/)).returns(mockGFs);
      fsUtilStub.readFile.withArgs(sinon.match(/marketplace_apps.*uid-mapping\.json/)).returns({ extension_uid: {} });

      importGlobalFields['existingGFs'] = [{ uid: 'gf1', global_field: { uid: 'gf1' } }];

      await importGlobalFields.start();

      expect(makeConcurrentCallStub.callCount).to.equal(3);
    });

    it('should handle complete flow with pending and failed global fields', async () => {
      const mockGFs = [{ uid: 'gf1', title: 'GF 1', schema: [] as any }];

      fsUtilStub.readFile.withArgs(sinon.match(/globalfields\.json/)).returns(mockGFs);
      fsUtilStub.readFile.withArgs(sinon.match(/marketplace_apps.*uid-mapping\.json/)).returns({ extension_uid: {} });

      importGlobalFields['pendingGFs'] = ['gf1'];
      importGlobalFields['failedGFs'] = [{ uid: 'gf2' }];
      importGlobalFields['createdGFs'] = [{ uid: 'gf3' }];

      await importGlobalFields.start();

      expect(fsUtilStub.writeFile.callCount).to.be.at.least(3); // pending, fails, success
    });
  });
});

