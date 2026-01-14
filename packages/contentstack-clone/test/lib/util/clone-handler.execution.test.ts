import { expect } from 'chai';
import { CloneHandler } from '../../../src/lib/util/clone-handler';
import { CloneConfig } from '../../../src/types/clone-config';
import sinon from 'sinon';
import inquirer from 'inquirer';

describe('CloneHandler - Execution', () => {
  describe('execute', () => {
    let handler: CloneHandler;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
      };
      handler = new CloneHandler(config);
      (handler as any).cloneCommand = {
        execute: sandbox.stub(),
        undo: sandbox.stub(),
      };
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should execute with source stack provided', async () => {
      (handler as any).config.source_stack = 'test-key';
      const handleBranchSelectionStub = sandbox.stub(handler, 'handleBranchSelection').resolves();
      (handler as any).cloneCommand.execute.resolves(true);
      const executeDestinationStub = sandbox.stub(handler, 'executeDestination').resolves();

      await handler.execute();

      expect(handleBranchSelectionStub.calledOnce).to.be.true;
      expect(executeDestinationStub.calledOnce).to.be.true;
    });

    it('should prompt for org when source stack not provided', async () => {
      (handler as any).config.source_stack = undefined;
      (handler as any).cloneCommand.execute.onFirstCall().resolves({ Organization: 'TestOrg' });
      const executeStackPromptStub = sandbox.stub(handler, 'executeStackPrompt').resolves();
      const addListenerStub = sandbox.stub(process.stdin, 'addListener');

      await handler.execute();

      expect((handler as any).cloneCommand.execute.calledOnce).to.be.true;
      expect(executeStackPromptStub.calledOnce).to.be.true;
      expect(addListenerStub.calledOnce).to.be.true;
    });

    it('should reject when org not found', async () => {
      (handler as any).config.source_stack = undefined;
      (handler as any).cloneCommand.execute.resolves(undefined);

      try {
        await handler.execute();
        expect.fail('Should have rejected');
      } catch (error) {
        expect(error).to.equal('Org not found.');
      }
    });
  });

  describe('executeExport', () => {
    let handler: CloneHandler;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
      };
      handler = new CloneHandler(config);
      (handler as any).cloneCommand = {
        execute: sandbox.stub(),
      };
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should execute export and proceed to destination', async () => {
      (handler as any).cloneCommand.execute.onFirstCall().resolves(true);
      (handler as any).cloneCommand.execute.onSecondCall().resolves();
      const executeDestinationStub = sandbox.stub(handler, 'executeDestination').resolves();
      const removeBackKeyPressHandlerStub = sandbox.stub(handler, 'removeBackKeyPressHandler');

      await handler.executeExport();

      expect((handler as any).cloneCommand.execute.calledTwice).to.be.true;
      expect(executeDestinationStub.calledOnce).to.be.true;
      expect(removeBackKeyPressHandlerStub.calledOnce).to.be.true;
    });

    it('should remove back key press handler even on error', async () => {
      (handler as any).cloneCommand.execute.rejects(new Error('Export failed'));
      const removeBackKeyPressHandlerStub = sandbox.stub(handler, 'removeBackKeyPressHandler');

      try {
        await handler.executeExport();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error');
        expect(removeBackKeyPressHandlerStub.calledOnce).to.be.true;
      }
    });
  });

  describe('executeDestination', () => {
    let handler: CloneHandler;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
      };
      handler = new CloneHandler(config);
      (handler as any).cloneCommand = {
        execute: sandbox.stub(),
      };
      (handler as any).orgUidList = { 'TestOrg': 'test-org-uid' };
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should prompt for stack creation when target stack not provided', async () => {
      (handler as any).config.target_stack = undefined;
      const inquirerStub = sandbox.stub(inquirer, 'prompt').resolves({ stackCreate: true });
      (handler as any).cloneCommand.execute.onFirstCall().resolves({ Organization: 'TestOrg' });
      (handler as any).cloneCommand.execute.onSecondCall().resolves({ api_key: 'new-key' });
      (handler as any).cloneCommand.execute.onThirdCall().resolves('success');
      const removeBackKeyPressHandlerStub = sandbox.stub(handler, 'removeBackKeyPressHandler');

      await handler.executeDestination();

      expect(inquirerStub.calledOnce).to.be.true;
      expect((handler as any).cloneCommand.execute.calledThrice).to.be.true;
      inquirerStub.restore();
    });

    it('should proceed with existing stack when target stack provided', async () => {
      (handler as any).config.target_stack = 'test-key';
      (handler as any).config.targetStackBranch = 'main';
      const executeBranchDestinationPromptStub = sandbox.stub(handler, 'executeBranchDestinationPrompt').resolves();

      await handler.executeDestination();

      expect(executeBranchDestinationPromptStub.calledOnce).to.be.true;
    });
  });

  describe('executeStackPrompt', () => {
    let handler: CloneHandler;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
      };
      handler = new CloneHandler(config);
      (handler as any).cloneCommand = {
        execute: sandbox.stub(),
      };
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should update stackNamePrompt default with sourceStack.stack (covers line 360)', async () => {
      (handler as any).config.source_stack = 'test-key';
      (handler as any).cloneCommand.execute.onFirstCall().resolves({ stack: 'TestStack' });
      const executeBranchPromptStub = sandbox.stub(handler, 'executeBranchPrompt').resolves();

      await handler.executeStackPrompt({ org: { Organization: 'TestOrg' } });

      expect((handler as any).stackNamePrompt.default).to.equal('Copy of TestStack');
      expect(executeBranchPromptStub.calledOnce).to.be.true;
    });

    it('should update stackNamePrompt default with source_alias fallback (covers line 360)', async () => {
      (handler as any).config.source_stack = 'test-key';
      (handler as any).config.source_alias = 'source-alias';
      (handler as any).cloneCommand.execute.onFirstCall().resolves({});
      const executeBranchPromptStub = sandbox.stub(handler, 'executeBranchPrompt').resolves();

      await handler.executeStackPrompt({ org: { Organization: 'TestOrg' } });

      expect((handler as any).stackNamePrompt.default).to.equal('Copy of source-alias');
      expect(executeBranchPromptStub.calledOnce).to.be.true;
    });

    it('should update stackNamePrompt default with ABC fallback (covers line 360)', async () => {
      (handler as any).config.source_stack = 'test-key';
      (handler as any).cloneCommand.execute.onFirstCall().resolves({});
      const executeBranchPromptStub = sandbox.stub(handler, 'executeBranchPrompt').resolves();

      await handler.executeStackPrompt({ org: { Organization: 'TestOrg' } });

      expect((handler as any).stackNamePrompt.default).to.equal('Copy of ABC');
      expect(executeBranchPromptStub.calledOnce).to.be.true;
    });

    it('should use config.stackName if provided (covers line 360)', async () => {
      (handler as any).config.source_stack = 'test-key';
      (handler as any).config.stackName = 'CustomStackName';
      (handler as any).cloneCommand.execute.onFirstCall().resolves({ stack: 'TestStack' });
      const executeBranchPromptStub = sandbox.stub(handler, 'executeBranchPrompt').resolves();

      await handler.executeStackPrompt({ org: { Organization: 'TestOrg' } });

      expect((handler as any).stackNamePrompt.default).to.equal('CustomStackName');
      expect(executeBranchPromptStub.calledOnce).to.be.true;
    });
  });

  describe('executeStackDestinationPrompt', () => {
    let handler: CloneHandler;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
      };
      handler = new CloneHandler(config);
      (handler as any).cloneCommand = {
        execute: sandbox.stub(),
      };
      (handler as any).orgUidList = { 'TestOrg': 'test-org-uid' };
      const mockClient = {
        stack: sandbox.stub().returns({
          create: sandbox.stub(),
        }),
      };
      handler.setClient(mockClient);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should create new stack when canCreateStack.stackCreate is true (covers lines 530-543)', async () => {
      (handler as any).executingCommand = 1;
      (handler as any).cloneCommand.execute.onFirstCall().resolves('success');
      (handler as any).cloneCommand.execute.onSecondCall().resolves('success');
      const removeBackKeyPressHandlerStub = sandbox.stub(handler, 'removeBackKeyPressHandler');

      await handler.executeStackDestinationPrompt({
        org: { Organization: 'TestOrg' },
        canCreateStack: { stackCreate: true },
      });

      expect((handler as any).cloneCommand.execute.calledTwice).to.be.true;
      expect(removeBackKeyPressHandlerStub.calledOnce).to.be.true;
    });

    it('should handle existing stack when canCreateStack.stackCreate is false (covers lines 530-543)', async () => {
      (handler as any).executingCommand = 1;
      (handler as any).cloneCommand.execute.onFirstCall().resolves('success');
      const executeBranchDestinationPromptStub = sandbox.stub(handler, 'executeBranchDestinationPrompt').resolves();

      await handler.executeStackDestinationPrompt({
        org: { Organization: 'TestOrg' },
        canCreateStack: { stackCreate: false },
      });

      expect((handler as any).cloneCommand.execute.calledOnce).to.be.true;
      expect(executeBranchDestinationPromptStub.calledOnce).to.be.true;
    });
  });
});
