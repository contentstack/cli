import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import BaseImportSetup from '../../../src/import/modules/base-setup';
import * as loggerModule from '../../../src/utils/logger';
import { ImportConfig } from '../../../src/types';

describe('BaseImportSetup', () => {
  let baseSetup: BaseImportSetup;
  let mockStackAPIClient: any;
  let logStub: SinonStub;

  const baseConfig: Partial<ImportConfig> = {
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

    baseSetup = new BaseImportSetup({
      config: baseConfig as ImportConfig,
      stackAPIClient: mockStackAPIClient,
      dependencies: {} as any,
    });
  });

  afterEach(() => {
    restore();
  });

  it('should initialize with the provided config and client', () => {
    expect(baseSetup.config).to.equal(baseConfig);
    expect(baseSetup.stackAPIClient).to.equal(mockStackAPIClient);
    expect(baseSetup.dependencies).to.deep.equal({} as any);
  });

  it('should delay execution for specified milliseconds', async () => {
    const start = Date.now();
    await baseSetup.delay(100);
    const duration = Date.now() - start;
    expect(duration).to.be.at.least(90); // Allow some small variance
  });

  it('should handle zero or negative delay values', async () => {
    const start = Date.now();
    await baseSetup.delay(0);
    const duration = Date.now() - start;
    expect(duration).to.be.lessThan(50); // Should return almost immediately
  });

  it('should make API call for fetch-assets entity', async () => {
    const mockApiOptions = {
      entity: 'fetch-assets',
      apiData: {
        file_size: 1000,
        filename: 'test.jpg',
        title: 'Test Image',
      },
      resolve: stub(),
      reject: stub(),
    };

    await baseSetup.makeAPICall(mockApiOptions as any);

    expect(mockStackAPIClient.asset.calledOnce).to.be.true;
  });

  it('should resolve immediately if apiData is not provided', async () => {
    const mockApiOptions = {
      entity: 'fetch-assets',
      apiData: null as any,
      resolve: stub(),
      reject: stub(),
    };

    const result = await baseSetup.makeAPICall(mockApiOptions as any);
    expect(result).to.be.undefined;
    expect(mockStackAPIClient.asset.called).to.be.false;
  });

  it('should resolve immediately for unknown entity types', async () => {
    const mockApiOptions = {
      entity: 'unknown-entity',
      apiData: { test: 'data' },
      resolve: stub(),
      reject: stub(),
    };

    const result = await baseSetup.makeAPICall(mockApiOptions as any);
    expect(result).to.be.undefined;
  });

  it('should log batch completion message when specified', async () => {
    await baseSetup.logMsgAndWaitIfRequired('test-process', Date.now() - 500, 5, 3, true);
    expect(logStub.calledOnce).to.be.true;
    expect(logStub.firstCall.args[1]).to.include('Batch No. (3/5)');
  });

  it('should not log batch completion message when not specified', async () => {
    await baseSetup.logMsgAndWaitIfRequired('test-process', Date.now() - 500, 5, 3, false);
    expect(logStub.called).to.be.false;
  });
});
