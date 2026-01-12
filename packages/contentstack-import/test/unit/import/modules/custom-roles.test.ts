import { expect } from 'chai';
import sinon from 'sinon';
import ImportCustomRoles from '../../../../src/import/modules/custom-roles';
import { ImportConfig } from '../../../../src/types';
import { fsUtil, fileHelper } from '../../../../src/utils';

describe('ImportCustomRoles', () => {
  let importCustomRoles: ImportCustomRoles;
  let mockStackClient: any;
  let mockImportConfig: ImportConfig;
  let fsUtilStub: any;
  let fileHelperStub: any;
  let makeConcurrentCallStub: sinon.SinonStub;

  beforeEach(() => {
    fsUtilStub = {
      readFile: sinon.stub(),
      writeFile: sinon.stub(),
      makeDirectory: sinon.stub().resolves(),
    };
    sinon.stub(fsUtil, 'readFile').callsFake(fsUtilStub.readFile);
    sinon.stub(fsUtil, 'writeFile').callsFake(fsUtilStub.writeFile);
    sinon.stub(fsUtil, 'makeDirectory').callsFake(fsUtilStub.makeDirectory);

    fileHelperStub = {
      fileExistsSync: sinon.stub(),
    };
    sinon.stub(fileHelper, 'fileExistsSync').callsFake(fileHelperStub.fileExistsSync);

    mockStackClient = {
      locale: sinon.stub().returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({ items: [{ code: 'en-us', uid: 'locale1' }] }),
        }),
      }),
      role: sinon.stub().returns({
        create: sinon.stub().resolves({ uid: 'role-123', name: 'Test Role' }),
      }),
    };

    mockImportConfig = {
      // false positive - no hardcoded secret here
      // @ts-ignore-next-line secret-detection
      apiKey: 'test',
      backupDir: '/test/backup',
      data: '/test/content',
      contentVersion: 1,
      region: 'us',
      fetchConcurrency: 2,
      context: {
        command: 'cm:stacks:import',
        module: 'custom-roles',
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-123',
        // false positive - no hardcoded secret here
        // @ts-ignore-next-line secret-detection
        apiKey: 'test',
        orgId: 'org-123',
        authenticationMethod: 'Basic Auth',
      },
      modules: {
        customRoles: {
          dirName: 'roles',
          fileName: 'roles.json',
          customRolesLocalesFileName: 'roles-locales.json',
        },
      },
    } as any;

    importCustomRoles = new ImportCustomRoles({
      importConfig: mockImportConfig as any,
      stackAPIClient: mockStackClient,
      moduleName: 'custom-roles',
    });

    sinon.stub(importCustomRoles as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
      return await fn();
    });
    sinon.stub(importCustomRoles as any, 'analyzeCustomRoles').resolves([1]);
    const mockProgress = {
      updateStatus: sinon.stub()
    };
    sinon.stub(importCustomRoles as any, 'createSimpleProgress').returns(mockProgress);
    sinon.stub(importCustomRoles as any, 'prepareForImport').resolves();
    sinon.stub(importCustomRoles as any, 'getLocalesUidMap').resolves();
    sinon.stub(importCustomRoles as any, 'handleImportResults').resolves();
    sinon.stub(importCustomRoles as any, 'completeProgress').resolves();
    makeConcurrentCallStub = sinon.stub(importCustomRoles as any, 'makeConcurrentCall').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(importCustomRoles).to.be.instanceOf(ImportCustomRoles);
      expect(importCustomRoles['importConfig']).to.equal(mockImportConfig);
      expect((importCustomRoles as any)['client']).to.equal(mockStackClient);
    });

    it('should set context module to custom-roles', () => {
      expect(importCustomRoles['importConfig'].context.module).to.equal('custom-roles');
    });

    it('should initialize paths correctly', () => {
      expect(importCustomRoles['customRolesFolderPath']).to.include('roles');
      expect(importCustomRoles['customRolesMapperPath']).to.include('mapper');
      expect(importCustomRoles['customRolesUidMapperPath']).to.include('uid-mapping.json');
      expect(importCustomRoles['createdCustomRolesPath']).to.include('success.json');
      expect(importCustomRoles['customRolesFailsPath']).to.include('fails.json');
    });

    it('should initialize empty arrays and objects', () => {
      expect(importCustomRoles['customRoles']).to.deep.equal({});
      expect(importCustomRoles['createdCustomRoles']).to.deep.equal([]);
      expect(importCustomRoles['failedCustomRoles']).to.deep.equal([]);
      expect(importCustomRoles['customRolesUidMapper']).to.deep.equal({});
      expect(importCustomRoles['environmentsUidMap']).to.deep.equal({});
      expect(importCustomRoles['entriesUidMap']).to.deep.equal({});
    });
  });

  describe('start()', () => {
    it('should return early when custom roles folder does not exist', async () => {
      fileHelperStub.fileExistsSync.returns(false);

      await importCustomRoles.start();

      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should process custom roles when folder exists', async () => {
      sinon.restore();
      
      sinon.stub(fsUtil, 'readFile').callsFake(fsUtilStub.readFile);
      sinon.stub(fsUtil, 'writeFile').callsFake(fsUtilStub.writeFile);
      sinon.stub(fsUtil, 'makeDirectory').callsFake(fsUtilStub.makeDirectory);
      sinon.stub(fileHelper, 'fileExistsSync').callsFake(fileHelperStub.fileExistsSync);
      
      sinon.stub(importCustomRoles as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      sinon.stub(importCustomRoles as any, 'getLocalesUidMap').resolves();
      sinon.stub(importCustomRoles as any, 'completeProgress').resolves();
      const mockProgress = { updateStatus: sinon.stub() };
      sinon.stub(importCustomRoles as any, 'createSimpleProgress').returns(mockProgress);
      
      const mockRoles = { role1: { uid: 'role1', name: 'Role 1', rules: [] as any } };
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/roles$/)).returns(true);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/uid-mapping\.json/)).returns(false);
      fsUtilStub.readFile.withArgs(sinon.match(/roles\.json/)).returns(mockRoles);
      fsUtilStub.readFile.withArgs(sinon.match(/roles-locales\.json/)).returns({});
      
      makeConcurrentCallStub = sinon.stub(importCustomRoles as any, 'makeConcurrentCall').resolves();

      await importCustomRoles.start();

      expect(makeConcurrentCallStub.called).to.be.true;
      expect(fsUtilStub.makeDirectory.called).to.be.true;
    });

    it('should load existing UID mapper when file exists', async () => {
      sinon.restore();
      
      sinon.stub(fsUtil, 'readFile').callsFake(fsUtilStub.readFile);
      sinon.stub(fsUtil, 'writeFile').callsFake(fsUtilStub.writeFile);
      sinon.stub(fsUtil, 'makeDirectory').callsFake(fsUtilStub.makeDirectory);
      sinon.stub(fileHelper, 'fileExistsSync').callsFake(fileHelperStub.fileExistsSync);
      
      sinon.stub(importCustomRoles as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      sinon.stub(importCustomRoles as any, 'getLocalesUidMap').resolves();
      sinon.stub(importCustomRoles as any, 'completeProgress').resolves();
      const mockProgress = { updateStatus: sinon.stub() };
      sinon.stub(importCustomRoles as any, 'createSimpleProgress').returns(mockProgress);
      makeConcurrentCallStub = sinon.stub(importCustomRoles as any, 'makeConcurrentCall').resolves();
      
      const mockRoles = { role1: { uid: 'role1', name: 'Role 1', rules: [] as any } };
      const mockUidMapper = { role1: 'mapped-role1' };

      fileHelperStub.fileExistsSync.withArgs(sinon.match(/roles$/)).returns(true);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/custom-roles.*uid-mapping\.json/)).returns(true);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/environments.*uid-mapping\.json/)).returns(false);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/entries.*uid-mapping\.json/)).returns(false);
      fsUtilStub.readFile.withArgs(sinon.match(/roles\.json/)).returns(mockRoles);
      fsUtilStub.readFile.withArgs(sinon.match(/roles-locales\.json/)).returns({});
      fsUtilStub.readFile.withArgs(sinon.match(/custom-roles.*uid-mapping\.json/)).returns(mockUidMapper);

      await importCustomRoles.start();

      expect(importCustomRoles['customRolesUidMapper']).to.deep.equal(mockUidMapper);
    });

    it('should load environments UID map when available', async () => {
      sinon.restore();
      
      sinon.stub(fsUtil, 'readFile').callsFake(fsUtilStub.readFile);
      sinon.stub(fsUtil, 'writeFile').callsFake(fsUtilStub.writeFile);
      sinon.stub(fsUtil, 'makeDirectory').callsFake(fsUtilStub.makeDirectory);
      sinon.stub(fileHelper, 'fileExistsSync').callsFake(fileHelperStub.fileExistsSync);
      
      sinon.stub(importCustomRoles as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      sinon.stub(importCustomRoles as any, 'getLocalesUidMap').resolves();
      sinon.stub(importCustomRoles as any, 'completeProgress').resolves();
      const mockProgress = { updateStatus: sinon.stub() };
      sinon.stub(importCustomRoles as any, 'createSimpleProgress').returns(mockProgress);
      makeConcurrentCallStub = sinon.stub(importCustomRoles as any, 'makeConcurrentCall').resolves();
      
      const mockRoles = { role1: { uid: 'role1', name: 'Role 1', rules: [] as any } };
      const mockEnvMap = { env1: 'mapped-env1' };

      fileHelperStub.fileExistsSync.withArgs(sinon.match(/roles$/)).returns(true);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/custom-roles.*uid-mapping\.json/)).returns(false);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/environments.*uid-mapping\.json/)).returns(true);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/entries.*uid-mapping\.json/)).returns(false);
      fsUtilStub.readFile.withArgs(sinon.match(/roles\.json/)).returns(mockRoles);
      fsUtilStub.readFile.withArgs(sinon.match(/roles-locales\.json/)).returns({});
      fsUtilStub.readFile.withArgs(sinon.match(/environments.*uid-mapping\.json/)).returns(mockEnvMap);

      await importCustomRoles.start();

      expect(importCustomRoles['environmentsUidMap']).to.deep.equal(mockEnvMap);
    });

    it('should load entries UID map when available', async () => {
      sinon.restore();
      
      sinon.stub(fsUtil, 'readFile').callsFake(fsUtilStub.readFile);
      sinon.stub(fsUtil, 'writeFile').callsFake(fsUtilStub.writeFile);
      sinon.stub(fsUtil, 'makeDirectory').callsFake(fsUtilStub.makeDirectory);
      sinon.stub(fileHelper, 'fileExistsSync').callsFake(fileHelperStub.fileExistsSync);
      
      sinon.stub(importCustomRoles as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      sinon.stub(importCustomRoles as any, 'getLocalesUidMap').resolves();
      sinon.stub(importCustomRoles as any, 'completeProgress').resolves();
      const mockProgress = { updateStatus: sinon.stub() };
      sinon.stub(importCustomRoles as any, 'createSimpleProgress').returns(mockProgress);
      makeConcurrentCallStub = sinon.stub(importCustomRoles as any, 'makeConcurrentCall').resolves();
      
      const mockRoles = { role1: { uid: 'role1', name: 'Role 1', rules: [] as any } };
      const mockEntriesMap = { entry1: 'mapped-entry1' };

      fileHelperStub.fileExistsSync.withArgs(sinon.match(/roles$/)).returns(true);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/custom-roles.*uid-mapping\.json/)).returns(false);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/environments.*uid-mapping\.json/)).returns(false);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/entries.*uid-mapping\.json/)).returns(true);
      fsUtilStub.readFile.withArgs(sinon.match(/roles\.json/)).returns(mockRoles);
      fsUtilStub.readFile.withArgs(sinon.match(/roles-locales\.json/)).returns({});
      fsUtilStub.readFile.withArgs(sinon.match(/entries.*uid-mapping\.json/)).returns(mockEntriesMap);

      await importCustomRoles.start();

      expect(importCustomRoles['entriesUidMap']).to.deep.equal(mockEntriesMap);
    });

    it('should write success file when custom roles created', async () => {
      sinon.restore();
      
      sinon.stub(fsUtil, 'readFile').callsFake(fsUtilStub.readFile);
      sinon.stub(fsUtil, 'writeFile').callsFake(fsUtilStub.writeFile);
      sinon.stub(fsUtil, 'makeDirectory').callsFake(fsUtilStub.makeDirectory);
      sinon.stub(fileHelper, 'fileExistsSync').callsFake(fileHelperStub.fileExistsSync);
      
      sinon.stub(importCustomRoles as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      sinon.stub(importCustomRoles as any, 'getLocalesUidMap').resolves();
      sinon.stub(importCustomRoles as any, 'completeProgress').resolves();
      const mockProgress = { updateStatus: sinon.stub() };
      sinon.stub(importCustomRoles as any, 'createSimpleProgress').returns(mockProgress);
      makeConcurrentCallStub = sinon.stub(importCustomRoles as any, 'makeConcurrentCall').resolves();
      
      const mockRoles = { role1: { uid: 'role1', name: 'Role 1', rules: [] as any } };

      fileHelperStub.fileExistsSync.withArgs(sinon.match(/roles$/)).returns(true);
      fileHelperStub.fileExistsSync.returns(false);
      fsUtilStub.readFile.withArgs(sinon.match(/roles\.json/)).returns(mockRoles);
      fsUtilStub.readFile.withArgs(sinon.match(/roles-locales\.json/)).returns({});

      importCustomRoles['createdCustomRoles'] = [{ uid: 'role1' }];

      await importCustomRoles.start();

      expect(fsUtilStub.writeFile.calledWith(sinon.match(/success\.json/))).to.be.true;
    });

    it('should write fails file when custom roles failed', async () => {
      sinon.restore();
      
      sinon.stub(fsUtil, 'readFile').callsFake(fsUtilStub.readFile);
      sinon.stub(fsUtil, 'writeFile').callsFake(fsUtilStub.writeFile);
      sinon.stub(fsUtil, 'makeDirectory').callsFake(fsUtilStub.makeDirectory);
      sinon.stub(fileHelper, 'fileExistsSync').callsFake(fileHelperStub.fileExistsSync);
      
      sinon.stub(importCustomRoles as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      sinon.stub(importCustomRoles as any, 'getLocalesUidMap').resolves();
      sinon.stub(importCustomRoles as any, 'completeProgress').resolves();
      const mockProgress = { updateStatus: sinon.stub() };
      sinon.stub(importCustomRoles as any, 'createSimpleProgress').returns(mockProgress);
      makeConcurrentCallStub = sinon.stub(importCustomRoles as any, 'makeConcurrentCall').resolves();
      
      const mockRoles = { role1: { uid: 'role1', name: 'Role 1', rules: [] as any } };

      fileHelperStub.fileExistsSync.withArgs(sinon.match(/roles$/)).returns(true);
      fileHelperStub.fileExistsSync.returns(false);
      fsUtilStub.readFile.withArgs(sinon.match(/roles\.json/)).returns(mockRoles);
      fsUtilStub.readFile.withArgs(sinon.match(/roles-locales\.json/)).returns({});

      importCustomRoles['failedCustomRoles'] = [{ uid: 'role1' }];

      await importCustomRoles.start();

      expect(fsUtilStub.writeFile.calledWith(sinon.match(/fails\.json/))).to.be.true;
    });
  });

  describe('getLocalesUidMap()', () => {
    it('should fetch locales and create mappings', async () => {
      sinon.restore();
      sinon.stub(fsUtil, 'readFile');
      sinon.stub(fsUtil, 'writeFile');
      sinon.stub(fsUtil, 'makeDirectory');
      sinon.stub(fileHelper, 'fileExistsSync');
      
      const mockLocales = [
        { code: 'en-us', uid: 'locale1' },
        { code: 'fr-fr', uid: 'locale2' },
      ];

      const findStub = sinon.stub().resolves({ items: mockLocales });
      const localeQueryStub = sinon.stub().returns({
        find: findStub,
      });
      mockStackClient.locale.returns({
        query: localeQueryStub,
      });

      importCustomRoles['customRolesLocales'] = {
        locale1: { code: 'en-us' },
        locale2: { code: 'fr-fr' },
      };

      await importCustomRoles.getLocalesUidMap();

      expect(findStub.called).to.be.true;
      expect(importCustomRoles['targetLocalesMap']).to.have.property('en-us');
      expect(importCustomRoles['sourceLocalesMap']).to.have.property('en-us');
    });

    it('should handle locale fetch error', async () => {
      sinon.restore();
      sinon.stub(fsUtil, 'readFile');
      sinon.stub(fsUtil, 'writeFile');
      sinon.stub(fsUtil, 'makeDirectory');
      sinon.stub(fileHelper, 'fileExistsSync');
      
      const findStub = sinon.stub().resolves({ items: [] });
      const localeQueryStub = sinon.stub().returns({
        find: findStub,
      });
      mockStackClient.locale.returns({
        query: localeQueryStub,
      });

      await importCustomRoles.getLocalesUidMap();

      expect(findStub.called).to.be.true;
      expect(importCustomRoles['targetLocalesMap']).to.deep.equal({});
      expect(importCustomRoles['sourceLocalesMap']).to.deep.equal({});
    });
  });

  describe('importCustomRoles()', () => {
    it('should return early when no custom roles found', async () => {
      importCustomRoles['customRoles'] = {};

      await importCustomRoles.importCustomRoles();

      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should call makeConcurrentCall with correct parameters', async () => {
      const mockRoles = { role1: { uid: 'role1', name: 'Role 1', rules: [] as any } };
      importCustomRoles['customRoles'] = mockRoles;

      await importCustomRoles.importCustomRoles();

      expect(makeConcurrentCallStub.calledOnce).to.be.true;
      const callArgs = makeConcurrentCallStub.firstCall.args[0];
      expect(callArgs.processName).to.equal('create custom role');
      expect(callArgs.apiParams.entity).to.equal('create-custom-role');
    });

    it('should handle successful custom role creation', async () => {
      importCustomRoles['customRoles'] = { role1: { uid: 'role1', name: 'Role 1' } };

      await importCustomRoles.importCustomRoles();

      const onSuccess = makeConcurrentCallStub.firstCall.args[0].apiParams.resolve;
      const mockRole = { uid: 'role-new', name: 'Role 1' };
      onSuccess({ response: mockRole, apiData: { uid: 'role1', name: 'Role 1' } });

      expect(importCustomRoles['createdCustomRoles']).to.include(mockRole);
      expect(importCustomRoles['customRolesUidMapper']['role1']).to.equal('role-new');
    });

    it('should handle existing custom role error', async () => {
      importCustomRoles['customRoles'] = { role1: { uid: 'role1', name: 'Role 1' } };

      await importCustomRoles.importCustomRoles();

      const onReject = makeConcurrentCallStub.firstCall.args[0].apiParams.reject;
      onReject({
        error: { message: JSON.stringify({ errors: { name: 'exists' } }) },
        apiData: { name: 'Role 1' },
      });

      expect(importCustomRoles['failedCustomRoles']).to.have.lengthOf(0);
    });

    it('should handle other errors during import', async () => {
      importCustomRoles['customRoles'] = { role1: { uid: 'role1', name: 'Role 1' } };

      await importCustomRoles.importCustomRoles();

      const onReject = makeConcurrentCallStub.firstCall.args[0].apiParams.reject;
      onReject({
        error: { message: JSON.stringify({ errorCode: 500 }) },
        apiData: { name: 'Role 1' },
      });

      expect(importCustomRoles['failedCustomRoles']).to.have.lengthOf(1);
    });

    it('should handle error without message property', async () => {
      importCustomRoles['customRoles'] = { role1: { uid: 'role1', name: 'Role 1' } };

      await importCustomRoles.importCustomRoles();

      const onReject = makeConcurrentCallStub.firstCall.args[0].apiParams.reject;
      onReject({
        error: { errorCode: 500 },
        apiData: { name: 'Role 1' },
      });

      expect(importCustomRoles['failedCustomRoles']).to.have.lengthOf(1);
    });
  });

  describe('serializeCustomRoles()', () => {
    it('should skip role if already exists in mapper', () => {
      importCustomRoles['customRolesUidMapper'] = { role1: 'mapped-role1' };
      const apiOptions = {
        apiData: { uid: 'role1', name: 'Role 1', rules: [] as any },
        entity: 'create-custom-role',
      };

      const result = importCustomRoles.serializeCustomRoles(apiOptions as any);

      expect(result.entity).to.be.undefined;
    });

    it('should add branch rule if not exists', () => {
      const apiOptions = {
        apiData: { uid: 'role1', name: 'Role 1', rules: [] as any },
      };

      const result = importCustomRoles.serializeCustomRoles(apiOptions as any);

      expect(result.apiData.rules).to.have.lengthOf(1);
      expect(result.apiData.rules[0].module).to.equal('branch');
    });

    it('should not add branch rule if already exists', () => {
      const apiOptions = {
        apiData: {
          uid: 'role1',
          name: 'Role 1',
          rules: [{ module: 'branch', branches: ['main'], acl: { read: true } }] as any,
        },
      };

      const result = importCustomRoles.serializeCustomRoles(apiOptions as any);

      expect(result.apiData.rules).to.have.lengthOf(1);
    });

    it('should transform environment UIDs', () => {
      importCustomRoles['environmentsUidMap'] = { env1: 'new-env1', env2: 'new-env2' };
      const apiOptions = {
        apiData: {
          uid: 'role1',
          name: 'Role 1',
          rules: [{ module: 'environment', environments: ['env1', 'env2'] }] as any,
        },
      };

      const result = importCustomRoles.serializeCustomRoles(apiOptions as any);

      expect(result.apiData.rules[0].environments).to.deep.equal(['new-env1', 'new-env2']);
    });

    it('should transform locale UIDs', () => {
      importCustomRoles['localesUidMap'] = { locale1: 'new-locale1', locale2: 'new-locale2' };
      const apiOptions = {
        apiData: {
          uid: 'role1',
          name: 'Role 1',
          rules: [{ module: 'locale', locales: ['locale1', 'locale2'] }] as any,
        },
      };

      const result = importCustomRoles.serializeCustomRoles(apiOptions as any);

      expect(result.apiData.rules[0].locales).to.deep.equal(['new-locale1', 'new-locale2']);
    });

    it('should transform entry UIDs', () => {
      importCustomRoles['entriesUidMap'] = { entry1: 'new-entry1', entry2: 'new-entry2' };
      const apiOptions = {
        apiData: {
          uid: 'role1',
          name: 'Role 1',
          rules: [{ module: 'entry', entries: ['entry1', 'entry2'] }] as any,
        },
      };

      const result = importCustomRoles.serializeCustomRoles(apiOptions as any);

      expect(result.apiData.rules[0].entries).to.deep.equal(['new-entry1', 'new-entry2']);
    });
  });

  describe('getTransformUidsFactory()', () => {
    it('should transform environment UIDs when map is not empty', () => {
      importCustomRoles['environmentsUidMap'] = { env1: 'new-env1' };
      const rule = { module: 'environment', environments: ['env1'] };

      const result = importCustomRoles.getTransformUidsFactory(rule);

      expect(result.environments).to.deep.equal(['new-env1']);
    });

    it('should not transform environment UIDs when map is empty', () => {
      importCustomRoles['environmentsUidMap'] = {};
      const rule = { module: 'environment', environments: ['env1'] };

      const result = importCustomRoles.getTransformUidsFactory(rule);

      expect(result.environments).to.deep.equal(['env1']);
    });

    it('should transform locale UIDs when map is not empty', () => {
      importCustomRoles['localesUidMap'] = { locale1: 'new-locale1' };
      const rule = { module: 'locale', locales: ['locale1'] };

      const result = importCustomRoles.getTransformUidsFactory(rule);

      expect(result.locales).to.deep.equal(['new-locale1']);
    });

    it('should not transform locale UIDs when map is empty', () => {
      importCustomRoles['localesUidMap'] = {};
      const rule = { module: 'locale', locales: ['locale1'] };

      const result = importCustomRoles.getTransformUidsFactory(rule);

      expect(result.locales).to.deep.equal(['locale1']);
    });

    it('should transform entry UIDs when map is not empty', () => {
      importCustomRoles['entriesUidMap'] = { entry1: 'new-entry1' };
      const rule = { module: 'entry', entries: ['entry1'] };

      const result = importCustomRoles.getTransformUidsFactory(rule);

      expect(result.entries).to.deep.equal(['new-entry1']);
    });

    it('should not transform entry UIDs when map is empty', () => {
      importCustomRoles['entriesUidMap'] = {};
      const rule = { module: 'entry', entries: ['entry1'] };

      const result = importCustomRoles.getTransformUidsFactory(rule);

      expect(result.entries).to.deep.equal(['entry1']);
    });

    it('should return rule unchanged for other modules', () => {
      const rule = { module: 'other', data: 'test' };

      const result = importCustomRoles.getTransformUidsFactory(rule);

      expect(result).to.deep.equal(rule);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty custom roles locales', async () => {
      const mockRoles = { role1: { uid: 'role1', name: 'Role 1', rules: [] as any } };

      fileHelperStub.fileExistsSync.withArgs(sinon.match(/roles$/)).returns(true);
      fileHelperStub.fileExistsSync.returns(false);
      fsUtilStub.readFile.withArgs(sinon.match(/roles\.json/)).returns(mockRoles);
      fsUtilStub.readFile.withArgs(sinon.match(/roles-locales\.json/)).returns({});

      await importCustomRoles.start();

      expect(importCustomRoles['customRolesLocales']).to.deep.equal({});
    });

    it('should handle null UID mapper files', async () => {
      const mockRoles = { role1: { uid: 'role1', name: 'Role 1', rules: [] as any } };

      fileHelperStub.fileExistsSync.withArgs(sinon.match(/roles$/)).returns(true);
      fileHelperStub.fileExistsSync.returns(true);
      fsUtilStub.readFile.withArgs(sinon.match(/roles\.json/)).returns(mockRoles);
      fsUtilStub.readFile.withArgs(sinon.match(/roles-locales\.json/)).returns({});
      fsUtilStub.readFile.withArgs(sinon.match(/uid-mapping\.json/)).returns(null);

      await importCustomRoles.start();

      expect(importCustomRoles['customRolesUidMapper']).to.deep.equal({});
    });

    it('should not write files when arrays are empty', async () => {
      const mockRoles = { role1: { uid: 'role1', name: 'Role 1', rules: [] as any } };

      fileHelperStub.fileExistsSync.withArgs(sinon.match(/roles$/)).returns(true);
      fileHelperStub.fileExistsSync.returns(false);
      fsUtilStub.readFile.withArgs(sinon.match(/roles\.json/)).returns(mockRoles);
      fsUtilStub.readFile.withArgs(sinon.match(/roles-locales\.json/)).returns({});

      importCustomRoles['createdCustomRoles'] = [];
      importCustomRoles['failedCustomRoles'] = [];

      await importCustomRoles.start();

      expect(fsUtilStub.writeFile.calledWith(sinon.match(/success\.json/))).to.be.false;
      expect(fsUtilStub.writeFile.calledWith(sinon.match(/fails\.json/))).to.be.false;
    });
  });

  describe('Additional Branch Coverage Tests', () => {
    it('should log when customRolesUidMapper has items', async () => {
      sinon.restore();
      
      sinon.stub(fsUtil, 'readFile').callsFake(fsUtilStub.readFile);
      sinon.stub(fsUtil, 'writeFile').callsFake(fsUtilStub.writeFile);
      sinon.stub(fsUtil, 'makeDirectory').callsFake(fsUtilStub.makeDirectory);
      sinon.stub(fileHelper, 'fileExistsSync').callsFake(fileHelperStub.fileExistsSync);
      
      sinon.stub(importCustomRoles as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      sinon.stub(importCustomRoles as any, 'getLocalesUidMap').resolves();
      sinon.stub(importCustomRoles as any, 'completeProgress').resolves();
      const mockProgress = { updateStatus: sinon.stub() };
      sinon.stub(importCustomRoles as any, 'createSimpleProgress').returns(mockProgress);
      makeConcurrentCallStub = sinon.stub(importCustomRoles as any, 'makeConcurrentCall').resolves();
      
      const mockRoles = { role1: { uid: 'role1', name: 'Role 1', rules: [] as any } };
      const mockUidMapper = { existingRole: 'existing-uid' };

      fileHelperStub.fileExistsSync.withArgs(sinon.match(/roles$/)).returns(true);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/custom-roles.*uid-mapping\.json/)).returns(true);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/environments.*uid-mapping\.json/)).returns(false);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/entries.*uid-mapping\.json/)).returns(false);
      fsUtilStub.readFile.withArgs(sinon.match(/roles\.json/)).returns(mockRoles);
      fsUtilStub.readFile.withArgs(sinon.match(/roles-locales\.json/)).returns({});
      fsUtilStub.readFile.withArgs(sinon.match(/custom-roles.*uid-mapping\.json/)).returns(mockUidMapper);

      await importCustomRoles.start();

      expect(importCustomRoles['customRolesUidMapper']).to.deep.equal(mockUidMapper);
    });

    it('should log when environmentsUidMap has items', async () => {
      sinon.restore();
      
      sinon.stub(fsUtil, 'readFile').callsFake(fsUtilStub.readFile);
      sinon.stub(fsUtil, 'writeFile').callsFake(fsUtilStub.writeFile);
      sinon.stub(fsUtil, 'makeDirectory').callsFake(fsUtilStub.makeDirectory);
      sinon.stub(fileHelper, 'fileExistsSync').callsFake(fileHelperStub.fileExistsSync);
      
      sinon.stub(importCustomRoles as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      sinon.stub(importCustomRoles as any, 'getLocalesUidMap').resolves();
      sinon.stub(importCustomRoles as any, 'completeProgress').resolves();
      const mockProgress = { updateStatus: sinon.stub() };
      sinon.stub(importCustomRoles as any, 'createSimpleProgress').returns(mockProgress);
      makeConcurrentCallStub = sinon.stub(importCustomRoles as any, 'makeConcurrentCall').resolves();
      
      const mockRoles = { role1: { uid: 'role1', name: 'Role 1', rules: [] as any } };
      const mockEnvMapper = { env1: 'env-uid-1', env2: 'env-uid-2' };

      fileHelperStub.fileExistsSync.withArgs(sinon.match(/roles$/)).returns(true);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/custom-roles.*uid-mapping\.json/)).returns(false);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/environments.*uid-mapping\.json/)).returns(true);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/entries.*uid-mapping\.json/)).returns(false);
      fsUtilStub.readFile.withArgs(sinon.match(/roles\.json/)).returns(mockRoles);
      fsUtilStub.readFile.withArgs(sinon.match(/roles-locales\.json/)).returns({});
      fsUtilStub.readFile.withArgs(sinon.match(/environments.*uid-mapping\.json/)).returns(mockEnvMapper);

      await importCustomRoles.start();

      expect(importCustomRoles['environmentsUidMap']).to.deep.equal(mockEnvMapper);
    });

    it('should log when entriesUidMap has items', async () => {
      sinon.restore();
      
      sinon.stub(fsUtil, 'readFile').callsFake(fsUtilStub.readFile);
      sinon.stub(fsUtil, 'writeFile').callsFake(fsUtilStub.writeFile);
      sinon.stub(fsUtil, 'makeDirectory').callsFake(fsUtilStub.makeDirectory);
      sinon.stub(fileHelper, 'fileExistsSync').callsFake(fileHelperStub.fileExistsSync);
      
      sinon.stub(importCustomRoles as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      sinon.stub(importCustomRoles as any, 'getLocalesUidMap').resolves();
      sinon.stub(importCustomRoles as any, 'completeProgress').resolves();
      const mockProgress = { updateStatus: sinon.stub() };
      sinon.stub(importCustomRoles as any, 'createSimpleProgress').returns(mockProgress);
      makeConcurrentCallStub = sinon.stub(importCustomRoles as any, 'makeConcurrentCall').resolves();
      
      const mockRoles = { role1: { uid: 'role1', name: 'Role 1', rules: [] as any } };
      const mockEntriesMapper = { entry1: 'entry-uid-1', entry2: 'entry-uid-2' };

      fileHelperStub.fileExistsSync.withArgs(sinon.match(/roles$/)).returns(true);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/custom-roles.*uid-mapping\.json/)).returns(false);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/environments.*uid-mapping\.json/)).returns(false);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/entries.*uid-mapping\.json/)).returns(true);
      fsUtilStub.readFile.withArgs(sinon.match(/roles\.json/)).returns(mockRoles);
      fsUtilStub.readFile.withArgs(sinon.match(/roles-locales\.json/)).returns({});
      fsUtilStub.readFile.withArgs(sinon.match(/entries.*uid-mapping\.json/)).returns(mockEntriesMapper);

      await importCustomRoles.start();

      expect(importCustomRoles['entriesUidMap']).to.deep.equal(mockEntriesMapper);
    });

    it('should transform environment UIDs when environmentsUidMap is not empty', () => {
      const mockRule = {
        module: 'environment',
        environments: ['env1', 'env2'],
      };

      importCustomRoles['environmentsUidMap'] = { env1: 'env-uid-1', env2: 'env-uid-2' };

      const result = importCustomRoles.getTransformUidsFactory(mockRule);

      expect(result.environments).to.deep.equal(['env-uid-1', 'env-uid-2']);
    });

    it('should transform locale UIDs when localesUidMap is not empty', () => {
      const mockRule = {
        module: 'locale',
        locales: ['locale1', 'locale2'],
      };

      importCustomRoles['localesUidMap'] = { locale1: 'locale-uid-1', locale2: 'locale-uid-2' };

      const result = importCustomRoles.getTransformUidsFactory(mockRule);

      expect(result.locales).to.deep.equal(['locale-uid-1', 'locale-uid-2']);
    });

    it('should transform entry UIDs when entriesUidMap is not empty', () => {
      const mockRule = {
        module: 'entry',
        entries: ['entry1', 'entry2'],
      };

      importCustomRoles['entriesUidMap'] = { entry1: 'entry-uid-1', entry2: 'entry-uid-2' };

      const result = importCustomRoles.getTransformUidsFactory(mockRule);

      expect(result.entries).to.deep.equal(['entry-uid-1', 'entry-uid-2']);
    });

    it('should handle rule with no environments array', () => {
      const mockRule = {
        module: 'environment',
      };

      importCustomRoles['environmentsUidMap'] = { env1: 'env-uid-1' };

      const result = importCustomRoles.getTransformUidsFactory(mockRule);

      expect(result.environments).to.be.an('array');
      expect(result.environments).to.have.length(0);
    });

    it('should handle rule with no locales array', () => {
      const mockRule = {
        module: 'locale',
      };

      importCustomRoles['localesUidMap'] = { locale1: 'locale-uid-1' };

      const result = importCustomRoles.getTransformUidsFactory(mockRule);

      expect(result.locales).to.be.an('array');
      expect(result.locales).to.have.length(0);
    });

    it('should handle rule with no entries array', () => {
      const mockRule = {
        module: 'entry',
      };

      importCustomRoles['entriesUidMap'] = { entry1: 'entry-uid-1' };

      const result = importCustomRoles.getTransformUidsFactory(mockRule);

      expect(result.entries).to.be.an('array');
      expect(result.entries).to.have.length(0);
    });

    it('should handle custom role with existing UID in mapper', () => {
      const mockCustomRole = {
        uid: 'existing-role',
        name: 'Existing Role',
        rules: [] as any[],
      };

      importCustomRoles['customRolesUidMapper'] = { 'existing-role': 'mapped-uid' };

      const apiOptions = {
        apiData: mockCustomRole,
        entity: 'create-custom-role' as any,
        resolve: sinon.stub(),
        reject: sinon.stub(),
      };

      const result = importCustomRoles.serializeCustomRoles(apiOptions);

      expect(result.entity).to.be.undefined;
    });

    it('should add branch rule when none exists', () => {
      const mockCustomRole = {
        uid: 'new-role',
        name: 'New Role',
        rules: [{ module: 'environment', environments: ['env1'] }],
      };

      importCustomRoles['customRolesUidMapper'] = {};

      const apiOptions = {
        apiData: mockCustomRole,
        entity: 'create-custom-role' as any,
        resolve: sinon.stub(),
        reject: sinon.stub(),
      };

      const result = importCustomRoles.serializeCustomRoles(apiOptions);

      expect(result.apiData.rules).to.have.length(2);
      expect(result.apiData.rules[1]).to.deep.include({
        module: 'branch',
        branches: ['main'],
        acl: { read: true },
      });
    });

    it('should not add branch rule when one already exists', () => {
      const mockCustomRole = {
        uid: 'new-role',
        name: 'New Role',
        rules: [
          { module: 'environment', environments: ['env1'] },
          { module: 'branch', branches: ['main'] },
        ],
      };

      importCustomRoles['customRolesUidMapper'] = {};

      const apiOptions = {
        apiData: mockCustomRole,
        entity: 'create-custom-role' as any,
        resolve: sinon.stub(),
        reject: sinon.stub(),
      };

      const result = importCustomRoles.serializeCustomRoles(apiOptions);

      expect(result.apiData.rules).to.have.length(2);
      expect(result.apiData.rules[1].module).to.equal('branch');
    });

    it('should handle custom role with no rules property', () => {
      const mockCustomRole = {
        uid: 'new-role',
        name: 'New Role',
        rules: [] as any[],
      };

      importCustomRoles['customRolesUidMapper'] = {};

      const apiOptions = {
        apiData: mockCustomRole,
        entity: 'create-custom-role' as any,
        resolve: sinon.stub(),
        reject: sinon.stub(),
      };

      const result = importCustomRoles.serializeCustomRoles(apiOptions);

      expect(result.apiData.rules).to.be.an('array');
      expect(result.apiData.rules).to.have.length(1);
      expect(result.apiData.rules[0]).to.deep.include({
        module: 'branch',
        branches: ['main'],
        acl: { read: true },
      });
    });

    it('should handle custom role with empty rules array', () => {
      const mockCustomRole = {
        uid: 'new-role',
        name: 'New Role',
        rules: [] as any[],
      };

      importCustomRoles['customRolesUidMapper'] = {};

      const apiOptions = {
        apiData: mockCustomRole,
        entity: 'create-custom-role' as any,
        resolve: sinon.stub(),
        reject: sinon.stub(),
      };

      const result = importCustomRoles.serializeCustomRoles(apiOptions);

      expect(result.apiData.rules).to.have.length(1);
      expect(result.apiData.rules[0]).to.deep.include({
        module: 'branch',
        branches: ['main'],
        acl: { read: true },
      });
    });

    it('should handle custom role with null rules', () => {
      const mockCustomRole = {
        uid: 'new-role',
        name: 'New Role',
        rules: [] as any[],
      };

      importCustomRoles['customRolesUidMapper'] = {};

      const apiOptions = {
        apiData: mockCustomRole,
        entity: 'create-custom-role' as any,
        resolve: sinon.stub(),
        reject: sinon.stub(),
      };

      const result = importCustomRoles.serializeCustomRoles(apiOptions);

      expect(result.apiData.rules).to.be.an('array');
      expect(result.apiData.rules).to.have.length(1);
      expect(result.apiData.rules[0]).to.deep.include({
        module: 'branch',
        branches: ['main'],
        acl: { read: true },
      });
    });

    it('should handle custom role with existing branch rule at different position', () => {
      const mockCustomRole = {
        uid: 'new-role',
        name: 'New Role',
        rules: [
          { module: 'environment', environments: ['env1'] },
          { module: 'locale', locales: ['locale1'] },
          { module: 'branch', branches: ['main'] },
        ],
      };

      importCustomRoles['customRolesUidMapper'] = {};

      const apiOptions = {
        apiData: mockCustomRole,
        entity: 'create-custom-role' as any,
        resolve: sinon.stub(),
        reject: sinon.stub(),
      };

      const result = importCustomRoles.serializeCustomRoles(apiOptions);

      expect(result.apiData.rules).to.have.length(3);
      expect(result.apiData.rules[2].module).to.equal('branch');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full custom roles import flow', async () => {
      sinon.restore();
      
      fsUtilStub = {
        readFile: sinon.stub(),
        writeFile: sinon.stub(),
        makeDirectory: sinon.stub().resolves(),
      };
      sinon.stub(fsUtil, 'readFile').callsFake(fsUtilStub.readFile);
      sinon.stub(fsUtil, 'writeFile').callsFake(fsUtilStub.writeFile);
      sinon.stub(fsUtil, 'makeDirectory').callsFake(fsUtilStub.makeDirectory);

      fileHelperStub = {
        fileExistsSync: sinon.stub(),
      };
      sinon.stub(fileHelper, 'fileExistsSync').callsFake(fileHelperStub.fileExistsSync);
      
      const mockRoles = {
        role1: { uid: 'role1', name: 'Role 1', rules: [] as any },
        role2: { uid: 'role2', name: 'Role 2', rules: [] as any },
      };

      fileHelperStub.fileExistsSync.withArgs(sinon.match(/roles$/)).returns(true);
      fileHelperStub.fileExistsSync.returns(false);
      fsUtilStub.readFile.withArgs(sinon.match(/roles\.json/)).returns(mockRoles);
      fsUtilStub.readFile.withArgs(sinon.match(/roles-locales\.json/)).returns({ locale1: { code: 'en-us' } });

      sinon.stub(importCustomRoles as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      sinon.stub(importCustomRoles as any, 'analyzeCustomRoles').callsFake(async () => {
        importCustomRoles['customRoles'] = mockRoles;
        return [2];
      });
      sinon.stub(importCustomRoles as any, 'createSimpleProgress').returns({
        updateStatus: sinon.stub()
      });
      sinon.stub(importCustomRoles as any, 'getLocalesUidMap').resolves();
      sinon.stub(importCustomRoles as any, 'completeProgress').resolves();
      
      makeConcurrentCallStub = sinon.stub(importCustomRoles as any, 'makeConcurrentCall').resolves();

      importCustomRoles['createdCustomRoles'] = [];

      const prepareForImportStub = sinon.stub(importCustomRoles as any, 'prepareForImport').resolves();
      const importCustomRolesStub = sinon.stub(importCustomRoles as any, 'importCustomRoles').resolves();
      const handleImportResultsStub = sinon.stub(importCustomRoles as any, 'handleImportResults').resolves();
      
      await importCustomRoles.start();

      expect(prepareForImportStub.called).to.be.true;
      expect(importCustomRolesStub.called).to.be.true;
      expect(handleImportResultsStub.called).to.be.true;
    });
  });
});
