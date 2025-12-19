import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import BaseImportSetup from '../../../src/import/modules/base-setup';
import * as loggerModule from '../../../src/utils/logger';
import { ImportConfig } from '../../../src/types';
import { CLIProgressManager, configHandler } from '@contentstack/cli-utilities';

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
      dependencies: [] as any,
    });
  });

  afterEach(() => {
    restore();
  });

  it('should initialize with the provided config and client', () => {
    expect(baseSetup.config).to.equal(baseConfig);
    expect(baseSetup.stackAPIClient).to.equal(mockStackAPIClient);
    expect(baseSetup.dependencies).to.deep.equal([] as any);
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

  describe('Progress Manager', () => {
    let configHandlerGetStub: SinonStub;
    let createSimpleStub: SinonStub;
    let createNestedStub: SinonStub;
    let withLoadingSpinnerStub: SinonStub;
    let mockProgressManager: any;

    beforeEach(() => {
      mockProgressManager = {
        tick: stub(),
        complete: stub(),
        addProcess: stub().returnsThis(),
        startProcess: stub().returnsThis(),
        updateStatus: stub().returnsThis(),
        completeProcess: stub().returnsThis(),
      };

      configHandlerGetStub = stub(configHandler, 'get');
      createSimpleStub = stub(CLIProgressManager, 'createSimple');
      createNestedStub = stub(CLIProgressManager, 'createNested');
      withLoadingSpinnerStub = stub(CLIProgressManager, 'withLoadingSpinner');
    });

    afterEach(() => {
      restore();
    });

    describe('createSimpleProgress', () => {
      it('should create a simple progress manager with default showConsoleLogs', () => {
        configHandlerGetStub.returns({});
        createSimpleStub.returns(mockProgressManager);

        const result = (baseSetup as any).createSimpleProgress('test-module', 100);

        expect(configHandlerGetStub.calledWith('log')).to.be.true;
        expect(createSimpleStub.calledOnce).to.be.true;
        expect(createSimpleStub.firstCall.args[0]).to.equal('test-module');
        expect(createSimpleStub.firstCall.args[1]).to.equal(100);
        expect(createSimpleStub.firstCall.args[2]).to.equal(false);
        expect(result).to.equal(mockProgressManager);
        expect((baseSetup as any).currentModuleName).to.equal('test-module');
        expect((baseSetup as any).progressManager).to.equal(mockProgressManager);
      });

      it('should create a simple progress manager with showConsoleLogs enabled', () => {
        configHandlerGetStub.returns({ showConsoleLogs: true });
        createSimpleStub.returns(mockProgressManager);

        const result = (baseSetup as any).createSimpleProgress('test-module', 50);

        expect(createSimpleStub.firstCall.args[2]).to.equal(true);
        expect(result).to.equal(mockProgressManager);
      });

      it('should create a simple progress manager without total count', () => {
        configHandlerGetStub.returns({});
        createSimpleStub.returns(mockProgressManager);

        (baseSetup as any).createSimpleProgress('test-module');

        expect(createSimpleStub.firstCall.args[1]).to.be.undefined;
      });
    });

    describe('createNestedProgress', () => {
      it('should create a nested progress manager with default showConsoleLogs', () => {
        configHandlerGetStub.returns({});
        createNestedStub.returns(mockProgressManager);

        const result = (baseSetup as any).createNestedProgress('test-module');

        expect(configHandlerGetStub.calledWith('log')).to.be.true;
        expect(createNestedStub.calledOnce).to.be.true;
        expect(createNestedStub.firstCall.args[0]).to.equal('test-module');
        expect(createNestedStub.firstCall.args[1]).to.equal(false);
        expect(result).to.equal(mockProgressManager);
        expect((baseSetup as any).currentModuleName).to.equal('test-module');
        expect((baseSetup as any).progressManager).to.equal(mockProgressManager);
      });

      it('should create a nested progress manager with showConsoleLogs enabled', () => {
        configHandlerGetStub.returns({ showConsoleLogs: true });
        createNestedStub.returns(mockProgressManager);

        const result = (baseSetup as any).createNestedProgress('test-module');

        expect(createNestedStub.firstCall.args[1]).to.equal(true);
        expect(result).to.equal(mockProgressManager);
      });
    });

    describe('completeProgress', () => {
      it('should complete progress manager with success', () => {
        (baseSetup as any).progressManager = mockProgressManager;

        (baseSetup as any).completeProgress(true);

        expect(mockProgressManager.complete.calledOnce).to.be.true;
        expect(mockProgressManager.complete.firstCall.args[0]).to.equal(true);
        expect(mockProgressManager.complete.firstCall.args[1]).to.be.undefined;
        expect((baseSetup as any).progressManager).to.be.null;
      });

      it('should complete progress manager with error', () => {
        (baseSetup as any).progressManager = mockProgressManager;
        const errorMessage = 'Test error message';

        (baseSetup as any).completeProgress(false, errorMessage);

        expect(mockProgressManager.complete.calledOnce).to.be.true;
        expect(mockProgressManager.complete.firstCall.args[0]).to.equal(false);
        expect(mockProgressManager.complete.firstCall.args[1]).to.equal(errorMessage);
        expect((baseSetup as any).progressManager).to.be.null;
      });

      it('should handle null progress manager gracefully', () => {
        (baseSetup as any).progressManager = null;

        expect(() => (baseSetup as any).completeProgress(true)).to.not.throw();
      });
    });

    describe('withLoadingSpinner', () => {
      it('should execute action directly when showConsoleLogs is enabled', async () => {
        configHandlerGetStub.returns({ showConsoleLogs: true });
        const action = stub().resolves('result');

        const result = await (baseSetup as any).withLoadingSpinner('Loading...', action);

        expect(action.calledOnce).to.be.true;
        expect(withLoadingSpinnerStub.called).to.be.false;
        expect(result).to.equal('result');
      });

      it('should use CLIProgressManager.withLoadingSpinner when showConsoleLogs is disabled', async () => {
        configHandlerGetStub.returns({ showConsoleLogs: false });
        const action = stub().resolves('result');
        withLoadingSpinnerStub.resolves('result');

        const result = await (baseSetup as any).withLoadingSpinner('Loading...', action);

        expect(withLoadingSpinnerStub.calledOnce).to.be.true;
        expect(withLoadingSpinnerStub.firstCall.args[0]).to.equal('Loading...');
        expect(withLoadingSpinnerStub.firstCall.args[1]).to.equal(action);
        expect(result).to.equal('result');
      });

      it('should use CLIProgressManager.withLoadingSpinner when log config is empty', async () => {
        configHandlerGetStub.returns({});
        const action = stub().resolves('result');
        withLoadingSpinnerStub.resolves('result');

        const result = await (baseSetup as any).withLoadingSpinner('Loading...', action);

        expect(withLoadingSpinnerStub.calledOnce).to.be.true;
        expect(result).to.equal('result');
      });

      it('should handle errors in action when showConsoleLogs is enabled', async () => {
        configHandlerGetStub.returns({ showConsoleLogs: true });
        const error = new Error('Action failed');
        const action = stub().rejects(error);

        try {
          await (baseSetup as any).withLoadingSpinner('Loading...', action);
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e).to.equal(error);
        }
      });

      it('should handle errors in action when showConsoleLogs is disabled', async () => {
        configHandlerGetStub.returns({ showConsoleLogs: false });
        const error = new Error('Action failed');
        const action = stub().rejects(error);
        withLoadingSpinnerStub.rejects(error);

        try {
          await (baseSetup as any).withLoadingSpinner('Loading...', action);
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e).to.equal(error);
        }
      });
    });
  });
});
