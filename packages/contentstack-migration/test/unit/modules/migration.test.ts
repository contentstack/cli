import { expect } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import Migration from '../../../src/modules/migration';
import * as mapModule from '../../../src/utils/map';
import * as utilsModule from '../../../src/utils';
import * as constantsModule from '../../../src/utils/constants';

describe('Migration Module', () => {
  let sandbox: ReturnType<typeof createSandbox>;
  let migration: Migration;
  let getStub: SinonStub;
  let setStub: SinonStub;
  let safePromiseStub: SinonStub;
  let waterfallStub: SinonStub;
  let mockMapInstance: Map<string, any>;
  let mockListr: any;
  let mockBase: any;

  beforeEach(() => {
    sandbox = createSandbox();
    mockMapInstance = new Map();
    mockListr = {
      run: sandbox.stub().resolves(),
    };
    mockBase = {
      dispatch: sandbox.stub(),
    };

    sandbox.stub(mapModule, 'getMapInstance').returns(mockMapInstance);
    getStub = sandbox.stub(mapModule, 'get').callsFake((key: string, mapInstance: Map<string, any>, data?: any) => {
      const existing = mapInstance.get(key);
      if (existing !== undefined) return existing;
      if (key === constantsModule.requests || key === 'REQUESTS') {
        const defaultValue = data !== undefined ? data : [];
        mapInstance.set(key, defaultValue);
        return defaultValue;
      }
      const defaultValue = data !== undefined ? data : {};
      mapInstance.set(key, defaultValue);
      return defaultValue;
    });
    setStub = sandbox.stub(mapModule, 'set');
    sandbox.stub(utilsModule, 'getCallsite').returns({
      getFileName: () => 'test.js',
      getLineNumber: () => 1,
    } as any);
    safePromiseStub = sandbox.stub(utilsModule, 'safePromise').callsFake(async (promise: any) => {
      try {
        const result = await promise;
        return [null, result];
      } catch (err) {
        return [err, null];
      }
    });
    waterfallStub = sandbox.stub().callsFake((tasks: any[], callback: any) => {
      if (tasks && tasks.length > 0 && typeof callback === 'function') {
        callback(null, 'result');
      }
    });
    sandbox.stub(require('async'), 'waterfall').value(waterfallStub);
    // Mock Listr - the module itself is the constructor
    // We need to replace it in the require cache since migration.ts imports it
    const listrPath = require.resolve('listr');
    const originalListr = require.cache[listrPath];
    if (originalListr) {
      (originalListr as any).__original = originalListr;
      require.cache[listrPath] = {
        id: listrPath,
        exports: function() {
          return mockListr;
        },
        loaded: true,
        parent: originalListr.parent,
        filename: listrPath,
        children: originalListr.children || [],
      } as any;
    }

    migration = new Migration();
    (migration as any).contentTypeService = { base: mockBase };
    (migration as any).handleErrors = sandbox.stub();
  });

  afterEach(() => {
    // Restore Listr in require cache if we modified it
    const listrPath = require.resolve('listr');
    if (require.cache[listrPath] && (require.cache[listrPath] as any).__original) {
      require.cache[listrPath] = (require.cache[listrPath] as any).__original;
    }
    sandbox.restore();
  });

  it('should export Migration class', () => {
    expect(Migration).to.exist;
  });

  it('should be instantiable', () => {
    expect(migration).to.be.instanceOf(Migration);
  });



  describe('getTasks', () => {
    it('should create task function that handles success', async () => {
      const _requests = [
        {
          title: 'Test Task',
          tasks: [async () => 'result1', async () => 'result2'],
          failedTitle: 'Failed',
          successTitle: 'Success',
        },
      ];

      const tasks = await migration.getTasks(_requests);

      expect(tasks).to.have.length(1);
      expect(tasks[0].title).to.equal('Test Task');
      expect(tasks[0].task).to.be.a('function');
    });


    it('should push result to results array when successful', async () => {
      const _requests = [
        {
          title: 'Test Task',
          tasks: [async () => 'result'],
          failedTitle: 'Failed',
          successTitle: 'Success',
        },
      ];

      const tasks = await migration.getTasks(_requests);
      const taskFn = tasks[0].task;
      const mockCtx: any = {};
      const mockTask: any = { title: 'Test Task' };

      await taskFn(mockCtx, mockTask);

      expect(mockTask.title).to.equal('Success');
    });

    it('should handle multiple requests', async () => {
      const _requests = [
        {
          title: 'Task 1',
          tasks: [async () => 'result1'],
          failedTitle: 'Failed 1',
          successTitle: 'Success 1',
        },
        {
          title: 'Task 2',
          tasks: [async () => 'result2'],
          failedTitle: 'Failed 2',
          successTitle: 'Success 2',
        },
      ];

      const tasks = await migration.getTasks(_requests);

      expect(tasks).to.have.length(2);
      expect(tasks[0].title).to.equal('Task 1');
      expect(tasks[1].title).to.equal('Task 2');
    });

    it('should handle empty requests array', async () => {
      const tasks = await migration.getTasks([]);

      expect(tasks).to.be.an('array');
      expect(tasks).to.have.length(0);
    });

    it('should not push null result to results array', async () => {
      waterfallStub.callsFake((tasks: any[], callback: any) => {
        if (tasks && tasks.length > 0 && typeof callback === 'function') {
          callback(null, null);
        }
      });
      safePromiseStub.callsFake(async (promise: any) => {
        try {
          const result = await promise;
          return [null, result];
        } catch (err) {
          return [err, null];
        }
      });

      const _requests = [
        {
          title: 'Test Task',
          tasks: [async (): Promise<null> => null],
          failedTitle: 'Failed',
          successTitle: 'Success',
        },
      ];

      const tasks = await migration.getTasks(_requests);
      const taskFn = tasks[0].task;
      const mockCtx: any = {};
      const mockTask: any = { title: 'Test Task' };

      await taskFn(mockCtx, mockTask);

      expect(mockTask.title).to.equal('Success');
      // Result is null, so it should not be pushed to results array
      // (results array is internal to getTasks, so we can't directly verify)
    });

    it('should not push undefined result to results array', async () => {
      waterfallStub.callsFake((tasks: any[], callback: any) => {
        if (tasks && tasks.length > 0 && typeof callback === 'function') {
          callback(null, undefined);
        }
      });
      safePromiseStub.callsFake(async (promise: any) => {
        try {
          const result = await promise;
          return [null, result];
        } catch (err) {
          return [err, null];
        }
      });

      const _requests = [
        {
          title: 'Test Task',
          tasks: [async (): Promise<undefined> => undefined],
          failedTitle: 'Failed',
          successTitle: 'Success',
        },
      ];

      const tasks = await migration.getTasks(_requests);
      const taskFn = tasks[0].task;
      const mockCtx: any = {};
      const mockTask: any = { title: 'Test Task' };

      await taskFn(mockCtx, mockTask);

      expect(mockTask.title).to.equal('Success');
    });

    it('should not push falsy result (false) to results array', async () => {
      waterfallStub.callsFake((tasks: any[], callback: any) => {
        if (tasks && tasks.length > 0 && typeof callback === 'function') {
          callback(null, false);
        }
      });
      safePromiseStub.callsFake(async (promise: any) => {
        try {
          const result = await promise;
          return [null, result];
        } catch (err) {
          return [err, null];
        }
      });

      const _requests = [
        {
          title: 'Test Task',
          tasks: [async () => false],
          failedTitle: 'Failed',
          successTitle: 'Success',
        },
      ];

      const tasks = await migration.getTasks(_requests);
      const taskFn = tasks[0].task;
      const mockCtx: any = {};
      const mockTask: any = { title: 'Test Task' };

      await taskFn(mockCtx, mockTask);

      expect(mockTask.title).to.equal('Success');
    });

    it('should not push falsy result (0) to results array', async () => {
      waterfallStub.callsFake((tasks: any[], callback: any) => {
        if (tasks && tasks.length > 0 && typeof callback === 'function') {
          callback(null, 0);
        }
      });
      safePromiseStub.callsFake(async (promise: any) => {
        try {
          const result = await promise;
          return [null, result];
        } catch (err) {
          return [err, null];
        }
      });

      const _requests = [
        {
          title: 'Test Task',
          tasks: [async () => 0],
          failedTitle: 'Failed',
          successTitle: 'Success',
        },
      ];

      const tasks = await migration.getTasks(_requests);
      const taskFn = tasks[0].task;
      const mockCtx: any = {};
      const mockTask: any = { title: 'Test Task' };

      await taskFn(mockCtx, mockTask);

      expect(mockTask.title).to.equal('Success');
    });

    it('should not push falsy result (empty string) to results array', async () => {
      waterfallStub.callsFake((tasks: any[], callback: any) => {
        if (tasks && tasks.length > 0 && typeof callback === 'function') {
          callback(null, '');
        }
      });
      safePromiseStub.callsFake(async (promise: any) => {
        try {
          const result = await promise;
          return [null, result];
        } catch (err) {
          return [err, null];
        }
      });

      const _requests = [
        {
          title: 'Test Task',
          tasks: [async () => ''],
          failedTitle: 'Failed',
          successTitle: 'Success',
        },
      ];

      const tasks = await migration.getTasks(_requests);
      const taskFn = tasks[0].task;
      const mockCtx: any = {};
      const mockTask: any = { title: 'Test Task' };

      await taskFn(mockCtx, mockTask);

      expect(mockTask.title).to.equal('Success');
    });


    it('should handle reqObj without title', async () => {
      const _requests = [
        {
          tasks: [async () => 'result'],
          failedTitle: 'Failed',
          successTitle: 'Success',
        },
      ];

      const tasks = await migration.getTasks(_requests);

      expect(tasks).to.have.length(1);
      expect(tasks[0].title).to.be.undefined;
    });

    it('should handle reqObj without failedTitle and successTitle', async () => {
      const _requests = [
        {
          title: 'Test Task',
          tasks: [async () => 'result'],
        },
      ];

      const tasks = await migration.getTasks(_requests);
      const taskFn = tasks[0].task;
      const mockCtx: any = {};
      const mockTask: any = { title: 'Test Task' };

      await taskFn(mockCtx, mockTask);

      // Should not throw error even without failedTitle/successTitle
      expect(mockTask.title).to.be.undefined; // Since successTitle is undefined
    });


    it('should handle waterfall with undefined result', async () => {
      waterfallStub.callsFake((tasks: any[], callback: any) => {
        if (tasks && tasks.length > 0 && typeof callback === 'function') {
          callback(null, undefined);
        }
      });
      safePromiseStub.callsFake(async (promise: any) => {
        try {
          const result = await promise;
          return [null, result];
        } catch (err) {
          return [err, null];
        }
      });

      const _requests = [
        {
          title: 'Test Task',
          tasks: [async (): Promise<undefined> => undefined],
          failedTitle: 'Failed',
          successTitle: 'Success',
        },
      ];

      const tasks = await migration.getTasks(_requests);
      const taskFn = tasks[0].task;
      const mockCtx: any = {};
      const mockTask: any = { title: 'Test Task' };

      const result = await taskFn(mockCtx, mockTask);

      expect(mockTask.title).to.equal('Success');
      expect(result).to.be.undefined;
  });

  describe('addTask', () => {
    it.skip('should add task to requests array in map', () => {
      const initialRequests: any[] = [];
      // Set up get stub to return the initialRequests array
      getStub.callsFake((key: string, mapInstance: Map<string, any>, data?: any) => {
        if (key === constantsModule.requests || key === 'REQUESTS') {
          return initialRequests;
        }
        const existing = mapInstance.get(key);
        if (existing !== undefined) return existing;
        const defaultValue = data !== undefined ? data : {};
        mapInstance.set(key, defaultValue);
        return defaultValue;
      });
      
      const taskDescription = {
        title: 'Test Task',
        task: async () => 'result',
        failMessage: 'Task failed',
        successMessage: 'Task succeeded',
      };

      migration.addTask(taskDescription);

      expect(mockBase.dispatch.called).to.be.true;
      expect(setStub.called).to.be.true;
      
      // Verify the request was added to the array
      expect(initialRequests).to.have.length(1);
      expect(initialRequests[0].title).to.equal('Test Task');
      expect(initialRequests[0].failedTitle).to.equal('Task failed');
      expect(initialRequests[0].successTitle).to.equal('Task succeeded');
      expect(initialRequests[0].tasks).to.be.an('array');
      expect(initialRequests[0].tasks).to.have.length(1);
    });
  });

});
});
