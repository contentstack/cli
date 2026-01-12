import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import ImportSetup, { ImportSetupDeps } from '../../src/import/import-setup';
import { ImportConfig, Modules } from '../../src/types';

describe('ImportSetup', () => {
  let mockStackAPIClient: any;
  let mockManagementAPIClient: any;
  let backupHandlerStub: SinonStub;
  let setupBranchConfigStub: SinonStub;
  let importSetup: ImportSetup;
  let fetchStub: SinonStub;
  let branchQueryStub: SinonStub;
  let logDebugStub: SinonStub;
  let handleAndLogErrorStub: SinonStub;
  let deps: ImportSetupDeps;

  const baseConfig: ImportConfig = {
    host: 'https://api.contentstack.io',
    developerHubBaseUrl: 'https://developer.contentstack.com',
    fetchConcurrency: 1,
    writeConcurrency: 1,
    contentDir: '/path/to/content',
    data: '/path/to/content',
    apiKey: 'test-api-key',
    forceStopMarketplaceAppsPrompt: false,
    master_locale: { code: 'en-us' },
    masterLocale: { code: 'en-us' },
    branchName: '',
    selectedModules: ['entries'],
    backupDir: '',
    region: 'us',
    modules: {
      extensions: {
        dirName: 'extensions',
        fileName: 'extensions',
        dependencies: [],
      },
      'marketplace-apps': {
        dirName: 'marketplace-apps',
        fileName: 'marketplace-apps',
        dependencies: [],
      },
      taxonomies: {
        dirName: 'taxonomies',
        fileName: 'taxonomies',
        dependencies: [],
        invalidKeys: [],
      },
      'custom-roles': {
        dirName: 'custom-roles',
        fileName: 'custom-roles',
        dependencies: [],
      },
      environments: {
        dirName: 'environments',
        fileName: 'environments',
        dependencies: [],
      },
      locales: {
        dirName: 'locales',
        fileName: 'locales',
        dependencies: [],
      },
      entries: {
        dirName: 'entries',
        fileName: 'entries',
        dependencies: ['content-types', 'assets'],
      },
      'content-types': {
        dirName: 'content-types',
        fileName: 'content-types',
        dependencies: ['global-fields'],
      },
      assets: {
        fetchConcurrency: 1,
        dirName: 'assets',
        fileName: 'assets',
        dependencies: [],
      },
      'global-fields': {
        dirName: 'global-fields',
        fileName: 'global-fields',
        dependencies: [],
      },
    },
  };

  beforeEach(() => {
    restore();

    fetchStub = stub().resolves({
      name: 'Test Stack',
      org_uid: 'test-org-uid',
    });

    branchQueryStub = stub().returns({
      find: stub().resolves({ items: [] }),
    });

    mockStackAPIClient = {
      fetch: fetchStub,
      branch: stub().returns({
        query: branchQueryStub,
        fetch: stub().resolves({ uid: 'branch-uid', name: 'test-branch' }),
      }),
    };

    mockManagementAPIClient = {
      stack: stub().returns(mockStackAPIClient),
    };

    // Create stubs for utilities
    backupHandlerStub = stub().resolves('/backup/path');
    setupBranchConfigStub = stub().resolves();

    // Create stubs for log and handleAndLogError
    logDebugStub = stub();
    handleAndLogErrorStub = stub();

    // Create the deps object for injection
    deps = {
      backupHandler: backupHandlerStub as any,
      setupBranchConfig: setupBranchConfigStub as any,
      log: {
        debug: logDebugStub,
        error: stub(),
        warn: stub(),
        info: stub(),
      } as any,
      handleAndLogError: handleAndLogErrorStub as any,
    };

    importSetup = new ImportSetup(baseConfig, mockManagementAPIClient, deps);
  });

  afterEach(() => {
    restore();
  });

  it('should initialize with the provided config and client', () => {
    expect(importSetup).to.have.property('config', baseConfig);
    expect(importSetup).to.have.property('managementAPIClient', mockManagementAPIClient);
  });

  it('should fetch stack details when management token is not provided', async () => {
    await importSetup.start();
    expect(fetchStub.calledOnce).to.be.true;
    expect((importSetup as any).config).to.have.property('stackName', 'Test Stack');
    expect((importSetup as any).config).to.have.property('org_uid', 'test-org-uid');
  });

  it('should not fetch stack details when management token is provided', async () => {
    const configWithToken = { ...baseConfig, management_token: 'test-token' };
    importSetup = new ImportSetup(configWithToken, mockManagementAPIClient, deps);

    await importSetup.start();
    expect(fetchStub.called).to.be.false;
  });

  it('should call backupHandler during start', async () => {
    await importSetup.start();
    expect(backupHandlerStub.calledOnce).to.be.true;
    expect(backupHandlerStub.calledWith(baseConfig)).to.be.true;
    expect((importSetup as any).config.backupDir).to.equal('/backup/path');
  });

  it('should call setupBranchConfig during start', async () => {
    await importSetup.start();
    expect(setupBranchConfigStub.calledOnce).to.be.true;
    expect(setupBranchConfigStub.calledWith(baseConfig, mockStackAPIClient)).to.be.true;
  });

  it('should generate dependency tree correctly for single module', async () => {
    await (importSetup as any).generateDependencyTree();

    const dependencyTree = importSetup.dependencyTree;
    expect(dependencyTree).to.have.property('entries');
    expect(dependencyTree.entries).to.include('content-types');
    expect(dependencyTree.entries).to.include('assets');
    expect(dependencyTree.entries).to.include('global-fields');
  });

  it('should generate dependency tree correctly for multiple modules', async () => {
    const configWithMultipleModules: ImportConfig = {
      ...baseConfig,
      selectedModules: ['entries', 'content-types'] as Modules[],
    };
    importSetup = new ImportSetup(configWithMultipleModules, mockManagementAPIClient, deps);
    await (importSetup as any).generateDependencyTree();

    const dependencyTree = importSetup.dependencyTree;
    expect(dependencyTree).to.have.property('entries');
    expect(dependencyTree).to.have.property('content-types');
    expect(dependencyTree.entries).to.include('content-types');
    expect(dependencyTree.entries).to.include('assets');
    expect(dependencyTree.entries).to.include('global-fields');
    expect(dependencyTree['content-types']).to.be.an('array');
  });

  it('should handle visited modules to prevent infinite loops', async () => {
    const configWithRepeatedDeps: ImportConfig = {
      ...baseConfig,
      selectedModules: ['entries', 'content-types'] as Modules[],
    };
    importSetup = new ImportSetup(configWithRepeatedDeps, mockManagementAPIClient, deps);

    await (importSetup as any).generateDependencyTree();
    const dependencyTree = importSetup.dependencyTree;
    expect(dependencyTree).to.have.property('entries');
    expect(dependencyTree).to.have.property('content-types');
  });

  it('should call runModuleImports after generating dependency tree in start', async () => {
    const runModuleImportsSpy = stub(importSetup as any, 'runModuleImports').resolves();

    await importSetup.start();

    expect(runModuleImportsSpy.calledOnce).to.be.true;
    expect(importSetup.dependencyTree).to.not.be.empty;
  });

  it('should handle errors during module import and propagate them', async () => {
    const testError = new Error('Module import failed');
    stub(importSetup as any, 'runModuleImports').rejects(testError);

    try {
      await importSetup.start();
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).to.include('Module import failed');
    }
  });

  it('should handle errors during start process', async () => {
    fetchStub.rejects(new Error('API Error'));

    try {
      await importSetup.start();
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).to.equal('API Error');
    }
  });

  it('should handle backup handler returning undefined', async () => {
    backupHandlerStub.resolves(undefined);

    await importSetup.start();
    expect(backupHandlerStub.calledOnce).to.be.true;
  });

  it('should complete full start process successfully', async () => {
    await importSetup.start();

    expect(fetchStub.calledOnce).to.be.true;
    expect(backupHandlerStub.calledOnce).to.be.true;
    expect(setupBranchConfigStub.calledOnce).to.be.true;
    expect(importSetup.dependencyTree).to.have.property('entries');
  });

  it('should handle empty selected modules', async () => {
    const configWithEmptyModules: ImportConfig = {
      ...baseConfig,
      selectedModules: [] as Modules[],
    };
    importSetup = new ImportSetup(configWithEmptyModules, mockManagementAPIClient, deps);

    await (importSetup as any).generateDependencyTree();
    expect(Object.keys(importSetup.dependencyTree)).to.have.length(0);
  });

  it('should handle modules with no dependencies', async () => {
    const configWithNoDeps: ImportConfig = {
      ...baseConfig,
      selectedModules: ['assets'] as Modules[],
    };
    importSetup = new ImportSetup(configWithNoDeps, mockManagementAPIClient, deps);

    await (importSetup as any).generateDependencyTree();
    const dependencyTree = importSetup.dependencyTree;
    expect(dependencyTree).to.have.property('assets');
    expect(dependencyTree.assets).to.be.an('array').that.is.empty;
  });

  it('should call setupBranchConfig with branchName when provided', async () => {
    const configWithBranch: ImportConfig = {
      ...baseConfig,
      branchName: 'development',
    };
    importSetup = new ImportSetup(configWithBranch, mockManagementAPIClient, deps);

    await importSetup.start();

    expect(setupBranchConfigStub.calledOnce).to.be.true;
    expect(setupBranchConfigStub.calledWith(configWithBranch, mockStackAPIClient)).to.be.true;
  });

  it('should call setupBranchConfig with branchAlias when provided', async () => {
    const configWithBranchAlias: ImportConfig = {
      ...baseConfig,
      branchAlias: 'dev-alias',
    };
    importSetup = new ImportSetup(configWithBranchAlias, mockManagementAPIClient, deps);

    await importSetup.start();

    expect(setupBranchConfigStub.calledOnce).to.be.true;
    expect(setupBranchConfigStub.calledWith(configWithBranchAlias, mockStackAPIClient)).to.be.true;
  });

  it('should call setupBranchConfig even when no branch is provided', async () => {
    await importSetup.start();

    expect(setupBranchConfigStub.calledOnce).to.be.true;
    expect(setupBranchConfigStub.calledWith(baseConfig, mockStackAPIClient)).to.be.true;
  });
});
