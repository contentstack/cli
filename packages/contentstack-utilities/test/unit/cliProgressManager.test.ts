import { expect } from 'chai';
import { fancy } from 'fancy-test';
import sinon from 'sinon';

//NOTE:- Mock ora BEFORE any imports to prevent real spinners
const mockOraInstance = {
  start: sinon.stub().returnsThis(),
  stop: sinon.stub().returnsThis(),
  succeed: sinon.stub().returnsThis(),
  fail: sinon.stub().returnsThis(),
  warn: sinon.stub().returnsThis(),
  info: sinon.stub().returnsThis(),
  text: '',
  color: 'cyan',
  isSpinning: false,
};

const mockOra = sinon.stub().returns(mockOraInstance);
(mockOra as any).promise = sinon.stub().returns(mockOraInstance);

// Mock require.cache to intercept ora module loading
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === 'ora') {
    return mockOra;
  }
  return originalRequire.apply(this, arguments);
};

// mock cli-progress to prevent progress bars
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

import CLIProgressManager from '../../src/progress-manager/cli-progress-manager';
import SummaryManager from '../../src/progress-manager/summary-manager';

// Optimized cleanup function for fast tests
function forceCleanupSpinners() {
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
    // Ignore cleanup errors
  }
}

describe('CLIProgressManager', () => {
  let progressManager: CLIProgressManager;
  let consoleLogStub: sinon.SinonStub;
  
  beforeEach(() => {
    forceCleanupSpinners();
    
    // Mock require.cache to intercept ora and cli-progress module loading
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
  });
  
  afterEach(() => {
    // Restore original require
    Module.prototype.require = originalRequire;
    forceCleanupSpinners();
    CLIProgressManager.clearGlobalSummary();
  });

  beforeEach(() => {
    consoleLogStub = sinon.stub(console, 'log');
    
    mockOra.resetHistory();
    
    try {
      if (process.stdout && process.stdout.clearLine) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
      }
    } catch (e) {
      // Ignore
    }
  });

  afterEach(() => {
    //cleanup, even if test failed
    try {
      // Stop any running progress managers
      if (progressManager) {
        progressManager.stop();
        progressManager = null as any;
      }
    } catch (e) {
      // Ignore errors during cleanup
    }
    
    try {
      // Clear global summary first to stop any global tracking
      CLIProgressManager.clearGlobalSummary();
    } catch (e) {
      // Ignore errors
    }
    
    try {
      // Force cleanup any remaining spinners
      forceCleanupSpinners();
    } catch (e) {
      // Ignore errors
    }
    
    try {
      // Restore all sinon stubs
      sinon.restore();
    } catch (e) {
      // Ignore errors
    }
    
    // Final cleanup step - ensure clean state
    progressManager = null as any;
    
    // Immediate cleanup - no delay for faster tests
    try {
      forceCleanupSpinners();
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Constructor and Initialization', () => {
    fancy.it('should create instance with default options', () => {
      progressManager = new CLIProgressManager();
      expect(progressManager).to.be.instanceOf(CLIProgressManager);
    });

    fancy.it('should create instance with custom options', () => {
      progressManager = new CLIProgressManager({
        showConsoleLogs: true,
        total: 100,
        moduleName: 'TEST_MODULE',
        enableNestedProgress: true,
      });
      expect(progressManager).to.be.instanceOf(CLIProgressManager);
    });

    fancy.it('should initialize with progress tracking enabled', () => {
      progressManager = new CLIProgressManager({
        showConsoleLogs: true,
        total: 100,
        moduleName: 'TEST_INIT',
        enableNestedProgress: false,
      });
      expect(progressManager).to.be.instanceOf(CLIProgressManager);
      // Immediately stop to prevent any background activity
      progressManager.stop();
    });

    fancy.it('should initialize with spinner mode for unknown total', () => {
      progressManager = new CLIProgressManager({
        showConsoleLogs: true,
        total: 0,
        moduleName: 'TEST_SPINNER',
        enableNestedProgress: false,
      });
      expect(progressManager).to.be.instanceOf(CLIProgressManager);
      // Immediately stop to prevent any background activity
      progressManager.stop();
    });
  });

  describe('Static Methods', () => {
    fancy.it('should initialize global summary', () => {
      const summary = CLIProgressManager.initializeGlobalSummary('TEST_OPERATION');
      expect(summary).to.be.instanceOf(SummaryManager);
      expect(CLIProgressManager['globalSummary']).to.equal(summary);
    });

    fancy.it('should clear global summary', () => {
      CLIProgressManager.initializeGlobalSummary('TEST');
      CLIProgressManager.clearGlobalSummary();
      expect(CLIProgressManager['globalSummary']).to.be.null;
    });

    fancy.it('should create simple progress manager', () => {
      const simple = CLIProgressManager.createSimple('testModule', 50, true);
      expect(simple).to.be.instanceOf(CLIProgressManager);
    });

    fancy.it('should create nested progress manager', () => {
      const nested = CLIProgressManager.createNested('testModule', false);
      expect(nested).to.be.instanceOf(CLIProgressManager);
    });

    fancy.it('should validate static factory methods exist', () => {
      expect(typeof CLIProgressManager.withLoadingSpinner).to.equal('function');
      expect(typeof CLIProgressManager.createSimple).to.equal('function');
      expect(typeof CLIProgressManager.createNested).to.equal('function');
    });

    // Note: Skipping actual withLoadingSpinner tests to avoid ora spinner issues in test environment
    fancy.it('should print global summary when exists', () => {
      const summaryStub = sinon.stub(SummaryManager.prototype, 'printFinalSummary');
      CLIProgressManager.initializeGlobalSummary('TEST');
      CLIProgressManager.printGlobalSummary();
      expect(summaryStub.calledOnce).to.be.true;
    });
  });

  describe('Process Management (Nested Progress)', () => {
    beforeEach(() => {
      progressManager = new CLIProgressManager({
        enableNestedProgress: true,
        moduleName: 'NESTED_TEST',
        showConsoleLogs: true, 
      });
    });

    fancy.it('should add process for nested progress', () => {
      const result = progressManager.addProcess('process1', 50);
      expect(result).to.equal(progressManager);
    });

    fancy.it('should start process', () => {
      progressManager.addProcess('process1', 50);
      const result = progressManager.startProcess('process1');
      expect(result).to.equal(progressManager);
    });

    fancy.it('should complete process successfully', () => {
      progressManager.addProcess('process1', 50);
      progressManager.startProcess('process1');
      const result = progressManager.completeProcess('process1', true);
      expect(result).to.equal(progressManager);
    });

    fancy.it('should complete process with failure', () => {
      progressManager.addProcess('process1', 50);
      progressManager.startProcess('process1');
      const result = progressManager.completeProcess('process1', false);
      expect(result).to.equal(progressManager);
    });

    fancy.it('should handle non-nested mode gracefully', () => {
      const simpleManager = new CLIProgressManager({ enableNestedProgress: false });
      const result = simpleManager.addProcess('process1', 50);
      expect(result).to.equal(simpleManager);
    });
  });

  describe('Progress Tracking', () => {
    beforeEach(() => {
      progressManager = new CLIProgressManager({
        showConsoleLogs: true,
        total: 100,
        moduleName: 'PROGRESS_TEST',
      });
    });

    fancy.it('should tick progress successfully', () => {
      const result = progressManager.tick(true, 'item1');
      expect(result).to.equal(progressManager);
    });

    fancy.it('should tick progress with failure', () => {
      const result = progressManager.tick(false, 'item1', 'error message');
      expect(result).to.equal(progressManager);
    });

    fancy.it('should tick nested progress', () => {
      const nestedManager = new CLIProgressManager({
        enableNestedProgress: true,
        moduleName: 'TEST',
      });
      nestedManager.addProcess('process1', 10);
      nestedManager.startProcess('process1');
      const result = nestedManager.tick(true, 'item1', null, 'process1');
      expect(result).to.equal(nestedManager);
    });

    fancy.it('should update status message', () => {
      const result = progressManager.updateStatus('New status');
      expect(result).to.equal(progressManager);
    });

    fancy.it('should track success count', () => {
      progressManager.tick(true, 'item1');
      progressManager.tick(true, 'item2');
      expect(progressManager['successCount']).to.equal(2);
    });

    fancy.it('should track failure count and failures', () => {
      progressManager.tick(false, 'item1', 'error1');
      progressManager.tick(false, 'item2', 'error2');
      expect(progressManager['failureCount']).to.equal(2);
      expect(progressManager['failures']).to.have.length(2);
      expect(progressManager['failures'][0].item).to.equal('item1');
      expect(progressManager['failures'][0].error).to.equal('error1');
    });
  });

  describe('Callbacks', () => {
    let onModuleStartSpy: sinon.SinonSpy;
    let onModuleCompleteSpy: sinon.SinonSpy;
    let onProgressSpy: sinon.SinonSpy;

    beforeEach(() => {
      onModuleStartSpy = sinon.spy();
      onModuleCompleteSpy = sinon.spy();
      onProgressSpy = sinon.spy();

      progressManager = new CLIProgressManager({
        moduleName: 'TEST',
        total: 10,
        showConsoleLogs: true,
      });
    });

    fancy.it('should set and trigger callbacks', () => {
      try {
        progressManager.setCallbacks({
          onModuleStart: onModuleStartSpy,
          onModuleComplete: onModuleCompleteSpy,
          onProgress: onProgressSpy,
        });

        progressManager.tick(true, 'item1');
        expect(onProgressSpy.calledOnce).to.be.true;
        expect(onProgressSpy.calledWith('TEST', true, 'item1', undefined)).to.be.true;
      } finally {
        // Ensure cleanup happens even if test fails
        try {
          progressManager.stop();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });

    fancy.it('should integrate with global summary', () => {
      const summaryStub = sinon.stub(SummaryManager.prototype, 'registerModule');
      const startStub = sinon.stub(SummaryManager.prototype, 'startModule');

      CLIProgressManager.initializeGlobalSummary('GLOBAL_TEST');
      progressManager = new CLIProgressManager({
        moduleName: 'TEST_MODULE',
        total: 10,
      });

      expect(summaryStub.calledWith('TEST_MODULE', 10)).to.be.true;
      expect(startStub.calledWith('TEST_MODULE')).to.be.true;
    });
  });

  describe('Logging and Console Output', () => {
    beforeEach(() => {
      progressManager = new CLIProgressManager({
        showConsoleLogs: true,
        moduleName: 'LOGGING_TEST',
      });
    });

    fancy.it('should log message when showConsoleLogs is true', () => {
      progressManager.log('Test message');
      expect(consoleLogStub.calledWith('Test message')).to.be.true;
    });

    fancy.it('should not log when showConsoleLogs is false', () => {
      const silentManager = new CLIProgressManager({
        showConsoleLogs: false,
        moduleName: 'TEST',
      });
      silentManager.log('Test message');
      expect(consoleLogStub.called).to.be.false;
    });

    fancy.it('should print summary on stop when showConsoleLogs is true', () => {
      progressManager.tick(true, 'item1');
      progressManager.tick(false, 'item2', 'error');
      progressManager.stop();

      expect(consoleLogStub.called).to.be.true;
      // Check if summary content was logged
      const logCalls = consoleLogStub.getCalls();
      const summaryCall = logCalls.find(call => 
        call.args[0] && call.args[0].includes('TEST Summary:')
      );
      expect(summaryCall).to.not.be.undefined;
      
      // Ensure progress manager is stopped
      progressManager = null as any;
    });

    fancy.it('should print detailed summary for nested progress', () => {
      const nestedManager = new CLIProgressManager({
        showConsoleLogs: true,
        enableNestedProgress: true,
        moduleName: 'NESTED_TEST',
      });
      
      try {
        nestedManager.addProcess('process1', 5);
        nestedManager.startProcess('process1');
        nestedManager.tick(true, 'item1', null, 'process1');
        nestedManager.tick(false, 'item2', 'error', 'process1');
        nestedManager.completeProcess('process1');
        nestedManager.stop();

        expect(consoleLogStub.called).to.be.true;
        const logCalls = consoleLogStub.getCalls();
        const detailedSummaryCall = logCalls.find(call => 
          call.args[0] && call.args[0].includes('NESTED_TEST Detailed Summary:')
        );
        expect(detailedSummaryCall).to.not.be.undefined;
      } finally {
        // Ensure cleanup
        try {
          nestedManager.stop();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    fancy.it('should handle tick on non-existent process gracefully', () => {
      progressManager = new CLIProgressManager({
        enableNestedProgress: true,
        moduleName: 'EDGE_TEST',
        showConsoleLogs: true, // Use console logs to avoid UI components
      });
      
      try {
        // Should not throw error
        const result = progressManager.tick(true, 'item1', null, 'non-existent-process');
        expect(result).to.equal(progressManager);
      } finally {
        progressManager.stop();
      }
    });

    fancy.it('should handle process operations without multiBar', () => {
      progressManager = new CLIProgressManager({
        enableNestedProgress: false,
        moduleName: 'PROCESS_TEST',
        showConsoleLogs: true,
      });
      
      // Should return manager without errors
      const result1 = progressManager.addProcess('process1', 10);
      const result2 = progressManager.startProcess('process1');
      const result3 = progressManager.completeProcess('process1');
      
      expect(result1).to.equal(progressManager);
      expect(result2).to.equal(progressManager);
      expect(result3).to.equal(progressManager);
    });

    fancy.it('should handle stop with no active progress indicators', () => {
      progressManager = new CLIProgressManager({
        showConsoleLogs: true, // Use console logs to avoid UI components
        moduleName: 'TEST',
      });
      
      // Should not throw error
      progressManager.stop();
      expect(true).to.be.true; // Test passes if no error thrown
      progressManager = null as any; // Clear reference
    });

    fancy.it('should handle callbacks when not set', () => {
      progressManager = new CLIProgressManager({
        moduleName: 'TEST',
        showConsoleLogs: true,
      });
      
      // Should not throw error when callbacks are undefined
      progressManager.tick(true, 'item1');
      expect(true).to.be.true; // Test passes if no error thrown
    });
  });

  describe('Performance and Memory', () => {
    fancy.it('should handle multiple processes', () => {
      progressManager = new CLIProgressManager({
        enableNestedProgress: true,
        moduleName: 'MULTI_TEST',
        showConsoleLogs: true,
      });
      
      try {
        // Add minimal processes for fast testing
        for (let i = 0; i < 3; i++) {
          progressManager.addProcess(`process${i}`, 5);
        }
        
        expect(progressManager['processes'].size).to.equal(3);
      } finally {
        progressManager.stop();
      }
    });

        fancy.it('should handle tick updates', () => {
      progressManager = new CLIProgressManager({
        total: 10,
        moduleName: 'TICK_TEST',
        showConsoleLogs: true,
      });
      
      try {
        // Minimal tick updates for speed
        for (let i = 0; i < 5; i++) {
          progressManager.tick(i % 2 === 0, `item${i}`, i === 4 ? 'error' : null);
        }
        
        expect(progressManager['successCount'] + progressManager['failureCount']).to.equal(5);
      } finally {
        progressManager.stop();
      }
    });
  });
}); 