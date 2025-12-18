import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import ImportSetup from '../../src/import/import-setup';
import * as backupHandlerModule from '../../src/utils/backup-handler';
import * as loggerModule from '../../src/utils/logger';
import * as commonHelperModule from '../../src/utils/common-helper';
import { ImportConfig } from '../../src/types';

describe('ImportSetup', () => {
  let mockStackAPIClient: any;
  let mockManagementAPIClient: any;
  let backupHandlerStub: SinonStub;
  let logStub: SinonStub;
  let validateBranchStub: SinonStub;
  let importSetup: ImportSetup;
  let fetchStub: SinonStub;

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

    mockStackAPIClient = {
      fetch: fetchStub,
    };

    mockManagementAPIClient = {
      stack: stub().returns(mockStackAPIClient),
    };

    backupHandlerStub = stub(backupHandlerModule, 'default').resolves('/backup/path');
    logStub = stub(loggerModule, 'log');
    validateBranchStub = stub(commonHelperModule, 'validateBranch').resolves({ uid: 'branch-uid' });

    importSetup = new ImportSetup(baseConfig, mockManagementAPIClient);
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
    importSetup = new ImportSetup(configWithToken, mockManagementAPIClient);

    await importSetup.start();
    expect(fetchStub.called).to.be.false;
  });

  it('should call backupHandler during start', async () => {
    await importSetup.start();
    expect(backupHandlerStub.calledOnce).to.be.true;
    expect(backupHandlerStub.calledWith(baseConfig)).to.be.true;
    expect((importSetup as any).config.backupDir).to.equal('/backup/path');
  });

  it('should validate branch if branchName is provided', async () => {
    const configWithBranch = { ...baseConfig, branchName: 'development' };
    importSetup = new ImportSetup(configWithBranch, mockManagementAPIClient);

    await importSetup.start();
    expect(validateBranchStub.calledOnce).to.be.true;
    expect(validateBranchStub.calledWith(mockStackAPIClient, configWithBranch, 'development')).to.be.true;
  });

  it('should not validate branch if branchName is not provided', async () => {
    await importSetup.start();
    expect(validateBranchStub.called).to.be.false;
  });

  it('should generate dependency tree correctly', async () => {
    // Access the protected method using any
    await (importSetup as any).generateDependencyTree();

    const dependencyTree = importSetup.dependencyTree;
    expect(dependencyTree).to.have.property('entries');
    expect(dependencyTree.entries).to.include('content-types');
    expect(dependencyTree.entries).to.include('assets');
    expect(dependencyTree.entries).to.include('global-fields');
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
});
