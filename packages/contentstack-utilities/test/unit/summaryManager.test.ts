import { expect } from 'chai';
import { fancy } from 'fancy-test';
import sinon from 'sinon';
import SummaryManager from '../../src/progress-summary/summary-manager';

describe('SummaryManager', () => {
  let summaryManager: SummaryManager;
  let consoleLogStub: sinon.SinonStub;

  beforeEach(() => {
    consoleLogStub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor and Initialization', () => {
    fancy.it('should create instance with operation name and context', () => {
      summaryManager = new SummaryManager({
        operationName: 'TEST_OPERATION',
        context: { env: 'test' },
      });
      expect(summaryManager).to.be.instanceOf(SummaryManager);
    });

    fancy.it('should create instance with only operation name', () => {
      summaryManager = new SummaryManager({
        operationName: 'SIMPLE_OPERATION',
      });
      expect(summaryManager).to.be.instanceOf(SummaryManager);
    });

    fancy.it('should set operation start time on creation', () => {
      const beforeTime = Date.now();
      summaryManager = new SummaryManager({
        operationName: 'TIME_TEST',
      });
      const afterTime = Date.now();

      expect(summaryManager['operationStartTime']).to.be.at.least(beforeTime);
      expect(summaryManager['operationStartTime']).to.be.at.most(afterTime);
    });
  });

  describe('Module Registration', () => {
    beforeEach(() => {
      summaryManager = new SummaryManager({
        operationName: 'MODULE_TEST',
        context: { version: '1.0' },
      });
    });

    fancy.it('should register module with default total items', () => {
      summaryManager.registerModule('testModule');
      const modules = summaryManager['modules'];
      expect(modules.has('testModule')).to.be.true;
      expect(modules.get('testModule')?.totalItems).to.equal(0);
      expect(modules.get('testModule')?.status).to.equal('pending');
    });

    fancy.it('should register module with specified total items', () => {
      summaryManager.registerModule('testModule', 100);
      const module = summaryManager['modules'].get('testModule');
      expect(module?.totalItems).to.equal(100);
      expect(module?.name).to.equal('testModule');
      expect(module?.successCount).to.equal(0);
      expect(module?.failureCount).to.equal(0);
      expect(module?.failures).to.be.an('array').that.is.empty;
    });

    fancy.it('should register multiple modules', () => {
      summaryManager.registerModule('module1', 50);
      summaryManager.registerModule('module2', 75);
      summaryManager.registerModule('module3');

      expect(summaryManager['modules'].size).to.equal(3);
      expect(summaryManager['modules'].get('module1')?.totalItems).to.equal(50);
      expect(summaryManager['modules'].get('module2')?.totalItems).to.equal(75);
      expect(summaryManager['modules'].get('module3')?.totalItems).to.equal(0);
    });
  });

  describe('Module Lifecycle Management', () => {
    beforeEach(() => {
      summaryManager = new SummaryManager({
        operationName: 'LIFECYCLE_TEST',
      });
      summaryManager.registerModule('testModule', 10);
    });

    fancy.it('should start module and set status to running', () => {
      const beforeTime = Date.now();
      summaryManager.startModule('testModule');
      const afterTime = Date.now();

      const module = summaryManager['modules'].get('testModule');
      expect(module?.status).to.equal('running');
      expect(module?.startTime).to.be.at.least(beforeTime);
      expect(module?.startTime).to.be.at.most(afterTime);
    });

    fancy.it('should complete module successfully', () => {
      summaryManager.startModule('testModule');
      const beforeTime = Date.now();
      summaryManager.completeModule('testModule', true);
      const afterTime = Date.now();

      const module = summaryManager['modules'].get('testModule');
      expect(module?.status).to.equal('completed');
      expect(module?.endTime).to.be.at.least(beforeTime);
      expect(module?.endTime).to.be.at.most(afterTime);
      expect(module?.failures).to.be.an('array').that.is.empty;
    });

    fancy.it('should complete module with failure', () => {
      summaryManager.startModule('testModule');
      summaryManager.completeModule('testModule', false, 'Module failed');

      const module = summaryManager['modules'].get('testModule');
      expect(module?.status).to.equal('failed');
      expect(module?.failures).to.have.length(1);
      expect(module?.failures[0].item).to.equal('module');
      expect(module?.failures[0].error).to.equal('Module failed');
    });

    fancy.it('should handle starting non-existent module gracefully', () => {
      summaryManager.startModule('nonExistentModule');
      // Should not throw error, but also should not affect anything
      expect(summaryManager['modules'].has('nonExistentModule')).to.be.false;
    });

    fancy.it('should handle completing non-existent module gracefully', () => {
      summaryManager.completeModule('nonExistentModule', true);
      // Should not throw error
      expect(summaryManager['modules'].has('nonExistentModule')).to.be.false;
    });
  });

  describe('Module Progress Tracking', () => {
    beforeEach(() => {
      summaryManager = new SummaryManager({
        operationName: 'PROGRESS_TEST',
      });
      summaryManager.registerModule('testModule', 10);
      summaryManager.startModule('testModule');
    });

    fancy.it('should update module progress with success', () => {
      summaryManager.updateModuleProgress('testModule', true, 'item1');

      const module = summaryManager['modules'].get('testModule');
      expect(module?.successCount).to.equal(1);
      expect(module?.failureCount).to.equal(0);
      expect(module?.failures).to.be.an('array').that.is.empty;
    });

    fancy.it('should update module progress with failure', () => {
      summaryManager.updateModuleProgress('testModule', false, 'item1', 'Failed to process');

      const module = summaryManager['modules'].get('testModule');
      expect(module?.successCount).to.equal(0);
      expect(module?.failureCount).to.equal(1);
      expect(module?.failures).to.have.length(1);
      expect(module?.failures[0].item).to.equal('item1');
      expect(module?.failures[0].error).to.equal('Failed to process');
    });

    fancy.it('should track multiple successes and failures', () => {
      summaryManager.updateModuleProgress('testModule', true, 'item1');
      summaryManager.updateModuleProgress('testModule', true, 'item2');
      summaryManager.updateModuleProgress('testModule', false, 'item3', 'Error1');
      summaryManager.updateModuleProgress('testModule', false, 'item4', 'Error2');
      summaryManager.updateModuleProgress('testModule', true, 'item5');

      const module = summaryManager['modules'].get('testModule');
      expect(module?.successCount).to.equal(3);
      expect(module?.failureCount).to.equal(2);
      expect(module?.failures).to.have.length(2);
      expect(module?.failures[0].item).to.equal('item3');
      expect(module?.failures[1].item).to.equal('item4');
    });

    fancy.it('should handle progress update for non-existent module', () => {
      summaryManager.updateModuleProgress('nonExistentModule', true, 'item1');
      // Should not throw error
      expect(summaryManager['modules'].has('nonExistentModule')).to.be.false;
    });

    fancy.it('should handle failure without error message', () => {
      summaryManager.updateModuleProgress('testModule', false, 'item1');

      const module = summaryManager['modules'].get('testModule');
      expect(module?.failureCount).to.equal(1);
      expect(module?.failures).to.have.length(0); // No failure recorded without error message
    });
  });

  describe('Final Summary Generation', () => {
    beforeEach(() => {
      summaryManager = new SummaryManager({
        operationName: 'SUMMARY_TEST',
        context: { env: 'test' },
      });
    });

    fancy.it('should print summary with no modules', () => {
      summaryManager.printFinalSummary();

      expect(consoleLogStub.called).to.be.true;
      const logCalls = consoleLogStub.getCalls();
      const summaryHeaderCall = logCalls.find(call =>
        call.args[0] && call.args[0].includes('SUMMARY_TEST SUMMARY')
      );
      expect(summaryHeaderCall).to.not.be.undefined;
    });

    fancy.it('should print summary with successful modules', () => {
      // Setup modules
      summaryManager.registerModule('module1', 5);
      summaryManager.registerModule('module2', 3);

      summaryManager.startModule('module1');
      summaryManager.updateModuleProgress('module1', true, 'item1');
      summaryManager.updateModuleProgress('module1', true, 'item2');
      summaryManager.completeModule('module1', true);

      summaryManager.startModule('module2');
      summaryManager.updateModuleProgress('module2', true, 'item1');
      summaryManager.completeModule('module2', true);

      summaryManager.printFinalSummary();

      expect(consoleLogStub.called).to.be.true;
      const logCalls = consoleLogStub.getCalls();

      // Check for overall statistics
      const statsCall = logCalls.find(call =>
        call.args[0] && call.args[0].includes('Overall Statistics:')
      );
      expect(statsCall).to.not.be.undefined;

      // Check for module details
      const moduleDetailsCall = logCalls.find(call =>
        call.args[0] && call.args[0].includes('Module Details:')
      );
      expect(moduleDetailsCall).to.not.be.undefined;

      // Check for successful completion message
      const successCall = logCalls.find(call =>
        call.args[0] && call.args[0].includes('completed successfully!')
      );
      expect(successCall).to.not.be.undefined;
    });

    fancy.it('should print summary with failed modules', () => {
      summaryManager.registerModule('failedModule', 2);
      summaryManager.startModule('failedModule');
      summaryManager.updateModuleProgress('failedModule', false, 'item1', 'Error 1');
      summaryManager.updateModuleProgress('failedModule', false, 'item2', 'Error 2');
      summaryManager.completeModule('failedModule', false, 'Module failed');

      summaryManager.printFinalSummary();

      expect(consoleLogStub.called).to.be.true;
      const logCalls = consoleLogStub.getCalls();

      // Check for failure message - should show "failed" in the output
      const failureCall = logCalls.find(call =>
        call.args[0] && call.args[0].includes('failed')
      );
      expect(failureCall).to.not.be.undefined;
    });

    fancy.it('should print summary with mixed success and failure', () => {
      summaryManager.registerModule('successModule', 2);
      summaryManager.registerModule('failModule', 2);

      // Success module
      summaryManager.startModule('successModule');
      summaryManager.updateModuleProgress('successModule', true, 'item1');
      summaryManager.updateModuleProgress('successModule', true, 'item2');
      summaryManager.completeModule('successModule', true);

      // Failed module
      summaryManager.startModule('failModule');
      summaryManager.updateModuleProgress('failModule', false, 'item1', 'Error');
      summaryManager.completeModule('failModule', false);

      summaryManager.printFinalSummary();

      expect(consoleLogStub.called).to.be.true;
      const logCalls = consoleLogStub.getCalls();

      // Should show mixed results
      const mixedCall = logCalls.find(call =>
        call.args[0] && call.args[0].includes('completed with') &&
        call.args[0].includes('failed modules')
      );
      expect(mixedCall).to.not.be.undefined;
    });

    fancy.it('should show limited number of failures per module', () => {
      summaryManager.registerModule('manyFailuresModule', 10);
      summaryManager.startModule('manyFailuresModule');

      // Add more than 5 failures
      for (let i = 1; i <= 7; i++) {
        summaryManager.updateModuleProgress('manyFailuresModule', false, `item${i}`, `Error ${i}`);
      }
      summaryManager.completeModule('manyFailuresModule', false);

      summaryManager.printFinalSummary();

      expect(consoleLogStub.called).to.be.true;
      const logCalls = consoleLogStub.getCalls();

      // Should show "and X more" message (7 failures - 2 shown = 5 more)
      const moreFailuresCall = logCalls.find(call =>
        call.args[0] && call.args[0].includes('and 5 more')
      );
      expect(moreFailuresCall).to.not.be.undefined;
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      summaryManager = new SummaryManager({
        operationName: 'HELPER_TEST',
      });
    });

    fancy.it('should format duration correctly for milliseconds', () => {
      const result = summaryManager['formatDuration'](500);
      expect(result).to.equal('500ms');
    });

    fancy.it('should format duration correctly for seconds', () => {
      const result = summaryManager['formatDuration'](2500);
      expect(result).to.equal('2.5s');
    });

    fancy.it('should format duration correctly for minutes', () => {
      const result = summaryManager['formatDuration'](90000);
      expect(result).to.equal('1.5m');
    });

    fancy.it('should calculate success rate correctly', () => {
      const result1 = summaryManager['calculateSuccessRate'](8, 10);
      expect(result1).to.equal('80.0');

      const result2 = summaryManager['calculateSuccessRate'](0, 10);
      expect(result2).to.equal('0.0');

      const result3 = summaryManager['calculateSuccessRate'](10, 10);
      expect(result3).to.equal('100.0');
    });

    fancy.it('should handle zero total in success rate calculation', () => {
      const result = summaryManager['calculateSuccessRate'](0, 0);
      expect(result).to.equal('0');
    });

    fancy.it('should return correct status icons', () => {
      expect(summaryManager['getStatusIcon']('completed')).to.include('✓');
      expect(summaryManager['getStatusIcon']('failed')).to.include('✗');
      expect(summaryManager['getStatusIcon']('running')).to.include('●');
      expect(summaryManager['getStatusIcon']('pending')).to.include('○');
      expect(summaryManager['getStatusIcon']('unknown')).to.include('?');
    });
  });

  describe('Integration and Real-world Scenarios', () => {
    beforeEach(() => {
      summaryManager = new SummaryManager({
        operationName: 'INTEGRATION_TEST',
        context: { source: 'test', target: 'prod' },
      });
    });

    fancy.it('should handle complete workflow scenario', () => {
      // Register multiple modules
      summaryManager.registerModule('CONTENT_TYPES', 5);
      summaryManager.registerModule('ENTRIES', 100);
      summaryManager.registerModule('ASSETS', 20);

      // Process content types (all success)
      summaryManager.startModule('CONTENT_TYPES');
      for (let i = 1; i <= 5; i++) {
        summaryManager.updateModuleProgress('CONTENT_TYPES', true, `ct${i}`);
      }
      summaryManager.completeModule('CONTENT_TYPES', true);

      // Process entries (mixed results)
      summaryManager.startModule('ENTRIES');
      for (let i = 1; i <= 90; i++) {
        summaryManager.updateModuleProgress('ENTRIES', true, `entry${i}`);
      }
      for (let i = 91; i <= 100; i++) {
        summaryManager.updateModuleProgress('ENTRIES', false, `entry${i}`, `Validation error ${i}`);
      }
      summaryManager.completeModule('ENTRIES', true);

      // Process assets (failure)
      summaryManager.startModule('ASSETS');
      for (let i = 1; i <= 5; i++) {
        summaryManager.updateModuleProgress('ASSETS', true, `asset${i}`);
      }
      for (let i = 6; i <= 20; i++) {
        summaryManager.updateModuleProgress('ASSETS', false, `asset${i}`, `Upload failed ${i}`);
      }
      summaryManager.completeModule('ASSETS', false, 'Too many upload failures');

      summaryManager.printFinalSummary();

      expect(consoleLogStub.called).to.be.true;

      // Verify the modules were processed correctly
      const contentTypes = summaryManager['modules'].get('CONTENT_TYPES');
      const entries = summaryManager['modules'].get('ENTRIES');
      const assets = summaryManager['modules'].get('ASSETS');

      expect(contentTypes?.successCount).to.equal(5);
      expect(contentTypes?.failureCount).to.equal(0);
      expect(contentTypes?.status).to.equal('completed');

      expect(entries?.successCount).to.equal(90);
      expect(entries?.failureCount).to.equal(10);
      expect(entries?.status).to.equal('completed');

      expect(assets?.successCount).to.equal(5);
      expect(assets?.failureCount).to.equal(15);
      expect(assets?.status).to.equal('failed');
      expect(assets?.failures).to.have.length(16); // 15 items + 1 module failure
    });

    fancy.it('should handle rapid progress updates', () => {
      summaryManager.registerModule('RAPID_MODULE', 1000);
      summaryManager.startModule('RAPID_MODULE');

      // Rapid updates
      for (let i = 0; i < 500; i++) {
        summaryManager.updateModuleProgress('RAPID_MODULE', true, `item${i}`);
      }
      for (let i = 500; i < 1000; i++) {
        summaryManager.updateModuleProgress('RAPID_MODULE', false, `item${i}`, `Error ${i}`);
      }

      summaryManager.completeModule('RAPID_MODULE', true);

      const module = summaryManager['modules'].get('RAPID_MODULE');
      expect(module?.successCount).to.equal(500);
      expect(module?.failureCount).to.equal(500);
      expect(module?.failures).to.have.length(500);
    });

    fancy.it('should calculate correct timing for long operations', async () => {
      summaryManager.registerModule('TIMING_MODULE', 1);
      summaryManager.startModule('TIMING_MODULE');

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          summaryManager.updateModuleProgress('TIMING_MODULE', true, 'item1');
          summaryManager.completeModule('TIMING_MODULE', true);

          const module = summaryManager['modules'].get('TIMING_MODULE');
          const duration = module?.endTime! - module?.startTime!;
          expect(duration).to.be.at.least(50); // At least 50ms
          resolve();
        }, 60);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      summaryManager = new SummaryManager({
        operationName: 'EDGE_CASE_TEST',
      });
    });

    fancy.it('should handle empty operation name', () => {
      const emptySummary = new SummaryManager({
        operationName: '',
      });
      emptySummary.printFinalSummary();
      expect(consoleLogStub.called).to.be.true;
    });

    fancy.it('should handle module with zero total items', () => {
      summaryManager.registerModule('zeroModule', 0);
      summaryManager.startModule('zeroModule');
      summaryManager.completeModule('zeroModule', true);

      summaryManager.printFinalSummary();

      const module = summaryManager['modules'].get('zeroModule');
      expect(module?.totalItems).to.equal(0);
      expect(summaryManager['calculateSuccessRate'](0, 0)).to.equal('0');
    });

    fancy.it('should handle operations with no registered modules', () => {
      summaryManager.printFinalSummary();

      expect(consoleLogStub.called).to.be.true;
      const logCalls = consoleLogStub.getCalls();
      const summaryCall = logCalls.find(call =>
        call.args[0] && call.args[0].includes('EDGE_CASE_TEST SUMMARY')
      );
      expect(summaryCall).to.not.be.undefined;
    });
  });
});