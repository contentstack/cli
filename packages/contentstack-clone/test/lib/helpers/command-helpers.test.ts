import { expect } from 'chai';
import {
  BaseCommand,
  HandleOrgCommand,
  HandleStackCommand,
  HandleBranchCommand,
  HandleDestinationStackCommand,
  HandleExportCommand,
  SetBranchCommand,
  CreateNewStackCommand,
  CloneTypeSelectionCommand,
  Clone,
} from '../../../src/lib/helpers/command-helpers';
import { ICommand } from '../../../src/types/command-types';

describe('Command Helpers', () => {
  describe('BaseCommand', () => {
    it('should create a BaseCommand with execute function', async () => {
      const executeFn = async (params?: any) => {
        return params ? params.value : 'default';
      };
      const command = new BaseCommand(executeFn);
      const result = await command.execute();
      expect(result).to.equal('default');
    });

    it('should execute with params', async () => {
      const executeFn = async (params?: any) => {
        return params?.value;
      };
      const command = new BaseCommand(executeFn, undefined, { value: 'test' });
      const result = await command.execute();
      expect(result).to.equal('test');
    });

    it('should execute undo function if provided', async () => {
      let undoCalled = false;
      const executeFn = async () => 'result';
      const undoFn = async () => {
        undoCalled = true;
      };
      const command = new BaseCommand(executeFn, undoFn);
      await command.undo();
      expect(undoCalled).to.be.true;
    });

    it('should not throw if undo is not provided', async () => {
      const executeFn = async () => 'result';
      const command = new BaseCommand(executeFn);
      await command.undo(); // Should not throw
      expect(true).to.be.true; // Test passes if no error
    });
  });

  describe('Command Factory Functions', () => {
    let mockParentContext: any;

    beforeEach(() => {
      mockParentContext = {
        handleOrgSelection: async (params: any) => ({ Organization: 'test-org' }),
        handleStackSelection: async (params: any) => ({ stack: 'test-stack' }),
        handleBranchSelection: async (params: any) => ({ branch: 'main' }),
        execute: async () => {},
        executeDestination: async () => {},
        cmdExport: async () => true,
        setBranch: async () => {},
        createNewStack: async (params: any) => ({ api_key: 'test-key' }),
        cloneTypeSelection: async () => 'success',
      };
    });

    it('should create HandleOrgCommand', async () => {
      const command = HandleOrgCommand({ msg: 'test', isSource: true }, mockParentContext);
      expect(command).to.exist;
      expect(command.execute).to.be.a('function');
      const result = await command.execute();
      expect(result).to.have.property('Organization');
    });

    it('should create HandleStackCommand', async () => {
      const command = HandleStackCommand({ org: { Organization: 'test' }, msg: 'test', isSource: true }, mockParentContext);
      expect(command).to.exist;
      expect(command.execute).to.be.a('function');
      expect(command.undo).to.be.a('function');
      const result = await command.execute();
      expect(result).to.have.property('stack');
    });

    it('should create HandleBranchCommand', async () => {
      const backStepHandler = async () => {};
      const command = HandleBranchCommand({ api_key: 'test', isSource: true }, mockParentContext, backStepHandler);
      expect(command).to.exist;
      expect(command.execute).to.be.a('function');
      expect(command.undo).to.be.a('function');
      const result = await command.execute();
      expect(result).to.have.property('branch');
    });

    it('should create HandleDestinationStackCommand', async () => {
      const command = HandleDestinationStackCommand({ org: { Organization: 'test' }, msg: 'test', isSource: false }, mockParentContext);
      expect(command).to.exist;
      expect(command.execute).to.be.a('function');
      expect(command.undo).to.be.a('function');
    });

    it('should create HandleExportCommand', async () => {
      const command = HandleExportCommand(null, mockParentContext);
      expect(command).to.exist;
      expect(command.execute).to.be.a('function');
      const result = await command.execute();
      expect(result).to.be.true;
    });

    it('should create SetBranchCommand', async () => {
      const command = SetBranchCommand(null, mockParentContext);
      expect(command).to.exist;
      expect(command.execute).to.be.a('function');
      await command.execute(); // Should not throw
      expect(true).to.be.true; // Test passes if no error
    });

    it('should create CreateNewStackCommand', async () => {
      const command = CreateNewStackCommand({ orgUid: 'test-org' }, mockParentContext);
      expect(command).to.exist;
      expect(command.execute).to.be.a('function');
      expect(command.undo).to.be.a('function');
      const result = await command.execute();
      expect(result).to.have.property('api_key');
    });

    it('should create CloneTypeSelectionCommand', async () => {
      const command = CloneTypeSelectionCommand(null, mockParentContext);
      expect(command).to.exist;
      expect(command.execute).to.be.a('function');
      const result = await command.execute();
      expect(result).to.equal('success');
    });
  });

  describe('Clone class', () => {
    it('should create a Clone instance', () => {
      const clone = new Clone();
      expect(clone).to.exist;
      expect(clone.execute).to.be.a('function');
      expect(clone.undo).to.be.a('function');
    });

    it('should execute commands and store them', async () => {
      const clone = new Clone();
      let executeCalled = false;
      const mockCommand: ICommand = {
        execute: async () => {
          executeCalled = true;
          return 'result';
        },
        params: { test: 'value' },
      };

      const result = await clone.execute(mockCommand);
      expect(executeCalled).to.be.true;
      expect(result).to.equal('result');
    });

    it('should undo commands in reverse order', async () => {
      const clone = new Clone();
      const undoOrder: number[] = [];
      
      const command1: ICommand = {
        execute: async () => 'result1',
        undo: async () => {
          undoOrder.push(1);
        },
        params: {},
      };

      const command2: ICommand = {
        execute: async () => 'result2',
        undo: async () => {
          undoOrder.push(2);
        },
        params: {},
      };

      await clone.execute(command1);
      await clone.execute(command2);
      await clone.undo();

      expect(undoOrder).to.deep.equal([2]);
    });

    it('should handle undo when no commands exist', async () => {
      const clone = new Clone();
      await clone.undo(); // Should not throw
      expect(true).to.be.true; // Test passes if no error
    });

    it('should handle undo when command has no undo function', async () => {
      const clone = new Clone();
      const command: ICommand = {
        execute: async () => 'result',
        params: {},
      };

      await clone.execute(command);
      await clone.undo(); // Should not throw
      expect(true).to.be.true; // Test passes if no error
    });
  });
});
