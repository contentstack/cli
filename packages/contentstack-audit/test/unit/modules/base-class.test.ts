import { expect } from 'chai';
import { fancy } from 'fancy-test';
import sinon from 'sinon';
import { resolve } from 'node:path';
import { CLIProgressManager, configHandler } from '@contentstack/cli-utilities';

import config from '../../../src/config';
import BaseClass from '../../../src/modules/base-class';
import { ModuleConstructorParam } from '../../../src/types';
import { mockLogger } from '../mock-logger';

// Mock ora and cli-progress to prevent real spinners/progress bars
const mockOraInstance = {
  start: sinon.stub().returnsThis(),
  stop: sinon.stub().returnsThis(),
  succeed: sinon.stub().returnsThis(),
  fail: sinon.stub().returnsThis(),
  text: '',
  color: 'cyan',
  isSpinning: false,
};

const mockOra = sinon.stub().returns(mockOraInstance);
(mockOra as any).promise = sinon.stub().returns(mockOraInstance);

const mockProgressBar = {
  start: sinon.stub(),
  stop: sinon.stub(),
  increment: sinon.stub(),
  update: sinon.stub(),
};

const mockMultiBar = {
  create: sinon.stub().returns(mockProgressBar),
  stop: sinon.stub(),
};

// Mock require to intercept ora and cli-progress
const Module = require('node:module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === 'ora') {
    return mockOra;
  }
  if (id === 'cli-progress') {
    return {
      SingleBar: function() { return mockProgressBar; },
      MultiBar: function() { return mockMultiBar; },
      Presets: { shades_classic: {} }
    };
  }
  return originalRequire.apply(this, arguments);
};

describe('BaseClass Progress Manager', () => {
  class TestBaseClass extends BaseClass {
    public testCreateSimpleProgress(moduleName: string, total?: number) {
      return this.createSimpleProgress(moduleName, total);
    }

    public testCreateNestedProgress(moduleName: string) {
      return this.createNestedProgress(moduleName);
    }

    public async testWithLoadingSpinner<T>(message: string, action: () => Promise<T>): Promise<T> {
      return this.withLoadingSpinner(message, action);
    }

    public testCompleteProgress(success: boolean = true, error?: string) {
      return this.completeProgress(success, error);
    }
  }

  let testInstance: TestBaseClass;
  let constructorParam: ModuleConstructorParam;

  beforeEach(() => {
    constructorParam = {
      config: Object.assign(config, { 
        basePath: resolve(__dirname, '..', 'mock', 'contents'), 
        flags: {},
        auditContext: {
          command: 'cm:stacks:audit',
          module: 'test',
          email: '',
          sessionId: '',
          authenticationMethod: '',
        }
      }),
    };

    // Mock the logger
    sinon.stub(require('@contentstack/cli-utilities'), 'log').value(mockLogger);
    
    // Reset config
    configHandler.set('log', {});
    
    testInstance = new TestBaseClass(constructorParam);
  });

  afterEach(() => {
    try {
      // Complete any running progress managers
      if (testInstance && testInstance['progressManager']) {
        testInstance['progressManager'].stop();
        testInstance['progressManager'] = null;
      }
    } catch (e) {
      // Ignore
    }
    
    try {
      // Stop mock ora instance
      if (mockOraInstance.stop) {
        mockOraInstance.stop();
      }
      
      // Quick console cleanup
      if (process.stdout && process.stdout.clearLine) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write('\x1b[?25h\x1b[0m');
      }
    } catch (e) {
      // Ignore
    }
    
    try {
      CLIProgressManager.clearGlobalSummary();
    } catch (e) {
      // Ignore
    }
    
    sinon.restore();
    Module.prototype.require = originalRequire;
  });

  describe('createSimpleProgress', () => {
    fancy.it('should create simple progress manager with total count', () => {
      const progress = testInstance.testCreateSimpleProgress('test-module', 100);
      expect(progress).to.be.instanceOf(CLIProgressManager);
      expect(testInstance['progressManager']).to.equal(progress);
      expect(testInstance['currentModuleName']).to.equal('test-module');
      
      // Clean up
      try {
        progress.stop();
        testInstance['progressManager'] = null;
      } catch (e) {
        // Ignore
      }
    });

    fancy.it('should create simple progress manager without total count', () => {
      const progress = testInstance.testCreateSimpleProgress('test-module');
      expect(progress).to.be.instanceOf(CLIProgressManager);
      expect(testInstance['progressManager']).to.equal(progress);
      
      // Clean up
      try {
        progress.stop();
        testInstance['progressManager'] = null;
      } catch (e) {
        // Ignore
      }
    });

    fancy.it('should respect showConsoleLogs setting from config', () => {
      configHandler.set('log.showConsoleLogs', true);
      const progress1 = testInstance.testCreateSimpleProgress('test-module', 100);
      expect(progress1).to.be.instanceOf(CLIProgressManager);

      configHandler.set('log.showConsoleLogs', false);
      const progress2 = testInstance.testCreateSimpleProgress('test-module-2', 100);
      expect(progress2).to.be.instanceOf(CLIProgressManager);
      
      // Clean up
      try {
        progress1.stop();
        progress2.stop();
        testInstance['progressManager'] = null;
      } catch (e) {
        // Ignore
      }
    });

    fancy.it('should default showConsoleLogs to false when not set', () => {
      configHandler.set('log', {});
      const progress = testInstance.testCreateSimpleProgress('test-module', 100);
      expect(progress).to.be.instanceOf(CLIProgressManager);
      
      // Clean up
      try {
        progress.stop();
        testInstance['progressManager'] = null;
      } catch (e) {
        // Ignore
      }
    });
  });

  describe('createNestedProgress', () => {
    fancy.it('should create nested progress manager', () => {
      const progress = testInstance.testCreateNestedProgress('test-module');
      expect(progress).to.be.instanceOf(CLIProgressManager);
      expect(testInstance['progressManager']).to.equal(progress);
      expect(testInstance['currentModuleName']).to.equal('test-module');
      
      // Clean up
      try {
        progress.stop();
        testInstance['progressManager'] = null;
      } catch (e) {
        // Ignore
      }
    });

    fancy.it('should respect showConsoleLogs setting from config', () => {
      configHandler.set('log.showConsoleLogs', false);
      const progress = testInstance.testCreateNestedProgress('test-module');
      expect(progress).to.be.instanceOf(CLIProgressManager);
      
      // Clean up
      try {
        progress.stop();
        testInstance['progressManager'] = null;
      } catch (e) {
        // Ignore
      }
    });
  });

  describe('withLoadingSpinner', () => {
    fancy.it('should execute action directly when showConsoleLogs is true', async () => {
      configHandler.set('log.showConsoleLogs', true);
      const action = sinon.stub().resolves('result');
      
      const result = await testInstance.testWithLoadingSpinner('Loading...', action);
      
      expect(result).to.equal('result');
      expect(action.calledOnce).to.be.true;
      expect(mockOra.called).to.be.false;
    });

    fancy.it('should use spinner when showConsoleLogs is false', async () => {
      configHandler.set('log.showConsoleLogs', false);
      const action = sinon.stub().resolves('result');
      
      const result = await testInstance.testWithLoadingSpinner('Loading...', action);
      
      expect(result).to.equal('result');
      expect(action.calledOnce).to.be.true;
    });

    fancy.it('should handle errors in action', async () => {
      configHandler.set('log.showConsoleLogs', true);
      const error = new Error('Test error');
      const action = sinon.stub().rejects(error);
      
      try {
        await testInstance.testWithLoadingSpinner('Loading...', action);
        expect.fail('Should have thrown error');
      } catch (e: any) {
        expect(e).to.equal(error);
      }
    });
  });

  describe('completeProgress', () => {
    fancy.it('should complete progress successfully', () => {
      const progress = testInstance.testCreateSimpleProgress('test-module', 100);
      const completeSpy = sinon.spy(progress, 'complete');
      
      testInstance.testCompleteProgress(true);
      
      expect(completeSpy.calledOnce).to.be.true;
      expect(completeSpy.calledWith(true)).to.be.true;
      expect(testInstance['progressManager']).to.be.null;
      
      // Ensure progress is stopped
      try {
        progress.stop();
      } catch (e) {
        // Ignore
      }
    });

    fancy.it('should complete progress with error', () => {
      const progress = testInstance.testCreateSimpleProgress('test-module', 100);
      const completeSpy = sinon.spy(progress, 'complete');
      
      testInstance.testCompleteProgress(false, 'Test error');
      
      expect(completeSpy.calledOnce).to.be.true;
      expect(completeSpy.calledWith(false, 'Test error')).to.be.true;
      expect(testInstance['progressManager']).to.be.null;
      
      // Ensure progress is stopped
      try {
        progress.stop();
      } catch (e) {
        // Ignore
      }
    });

    fancy.it('should handle completion when no progress manager exists', () => {
      expect(() => testInstance.testCompleteProgress(true)).to.not.throw();
    });
  });
  
  // Global after hook to ensure all spinners are cleaned up
  after(() => {
    try {
      CLIProgressManager.clearGlobalSummary();
      if (mockOraInstance.stop) {
        mockOraInstance.stop();
      }
      if (process.stdout && process.stdout.clearLine) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write('\x1b[?25h\x1b[0m');
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });
});

