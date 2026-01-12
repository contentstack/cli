import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import GlobalFieldsImportSetup from '../../../src/import/modules/global-fields';
import * as loggerModule from '../../../src/utils/logger';
import { ImportConfig } from '../../../src/types';

describe('GlobalFieldsImportSetup', () => {
  let globalFieldsSetup: GlobalFieldsImportSetup;
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
    selectedModules: ['global-fields'],
    backupDir: '',
    region: 'us',
    fetchConcurrency: 2,
    writeConcurrency: 1,
  };

  beforeEach(() => {
    restore();

    mockStackAPIClient = {
      globalField: stub().returns({
        query: stub().returnsThis(),
        find: stub().resolves({ items: [] }),
      }),
    };

    logStub = stub(loggerModule, 'log');

    globalFieldsSetup = new GlobalFieldsImportSetup({
      config: baseConfig as ImportConfig,
      stackAPIClient: mockStackAPIClient,
      dependencies: ['extensions'] as any,
    });

    // Stub the setupDependencies method to avoid actual imports
    setupDependenciesStub = stub(globalFieldsSetup, 'setupDependencies').resolves();
    // Stub createNestedProgress and completeProgress to avoid progress manager issues
    stub(globalFieldsSetup as any, 'createNestedProgress').returns({
      addProcess: stub().returnsThis(),
      startProcess: stub().returnsThis(),
      updateStatus: stub().returnsThis(),
      completeProcess: stub().returnsThis(),
    });
    stub(globalFieldsSetup as any, 'completeProgress');
  });

  afterEach(() => {
    restore();
  });

  it('should initialize with the provided config and client', () => {
    expect((globalFieldsSetup as any).config).to.equal(baseConfig);
    expect((globalFieldsSetup as any).stackAPIClient).to.equal(mockStackAPIClient);
    expect((globalFieldsSetup as any).dependencies).to.deep.equal(['extensions'] as any);
  });

  it('should call setupDependencies during start', async () => {
    await globalFieldsSetup.start();
    expect(setupDependenciesStub.calledOnce).to.be.true;
  });

  it('should log success message after setup', async () => {
    await globalFieldsSetup.start();
    expect(logStub.calledOnce).to.be.true;
    expect(logStub.firstCall.args[1]).to.include('successfully');
    expect(logStub.firstCall.args[2]).to.equal('success');
  });

  it('should handle errors during start process', async () => {
    const testError = new Error('Test error');
    setupDependenciesStub.rejects(testError);

    await globalFieldsSetup.start();

    expect(logStub.called).to.be.true;
    const errorCall = logStub.getCalls().find((call) => call.args[1]?.includes('Error occurred'));
    expect(errorCall).to.exist;
    expect(errorCall?.args[1]).to.include('Test error');
    expect(errorCall?.args[2]).to.equal('error');
  });
});
