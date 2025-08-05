import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import ContentTypesImportSetup from '../../../src/import/modules/content-types';
import * as loggerModule from '../../../src/utils/logger';
import { ImportConfig } from '../../../src/types';

describe('ContentTypesImportSetup', () => {
  let contentTypesSetup: ContentTypesImportSetup;
  let mockStackAPIClient: any;
  let logStub: SinonStub;
  let setupDependenciesStub: SinonStub;

  const baseConfig: Partial<ImportConfig> = {
    contentDir: '/path/to/content',
    data: '/path/to/content',
    apiKey: 'test-api-key',
    forceStopMarketplaceAppsPrompt: false,
    master_locale: { code: 'en-us' },
    masterLocale: { code: 'en-us' },
    branchName: '',
    selectedModules: ['content-types'],
    backupDir: '',
    contentVersion: 1,
    region: 'us',
    fetchConcurrency: 2,
    writeConcurrency: 1,
  };

  beforeEach(() => {
    restore();

    mockStackAPIClient = {
      asset: stub().returns({
        query: stub().returnsThis(),
        find: stub().resolves({ items: [] }),
      }),
    };

    logStub = stub(loggerModule, 'log');

    contentTypesSetup = new ContentTypesImportSetup({
      config: baseConfig as ImportConfig,
      stackAPIClient: mockStackAPIClient,
      dependencies: {} as any,
    });

    // Stub the setupDependencies method to avoid actual imports
    setupDependenciesStub = stub(contentTypesSetup, 'setupDependencies').resolves();
  });

  afterEach(() => {
    restore();
  });

  it('should initialize with the provided config and client', () => {
    expect(contentTypesSetup.config).to.equal(baseConfig);
    expect(contentTypesSetup.stackAPIClient).to.equal(mockStackAPIClient);
    expect(contentTypesSetup.dependencies).to.deep.equal({} as any);
  });

  it('should call setupDependencies during start', async () => {
    await contentTypesSetup.start();
    expect(setupDependenciesStub.calledOnce).to.be.true;
  });

  it('should log success message after setup', async () => {
    await contentTypesSetup.start();
    expect(logStub.calledOnce).to.be.true;
    expect(logStub.firstCall.args[1]).to.include('successfully');
    expect(logStub.firstCall.args[2]).to.equal('success');
  });

  it('should handle errors during start process', async () => {
    const testError = new Error('Test error');
    setupDependenciesStub.rejects(testError);

    await contentTypesSetup.start();

    expect(logStub.calledOnce).to.be.true;
    expect(logStub.firstCall.args[1]).to.include('Error occurred');
    expect(logStub.firstCall.args[1]).to.include('Test error');
    expect(logStub.firstCall.args[2]).to.equal('error');
  });
});
