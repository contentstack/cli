import { expect } from 'chai';
import { CloneHandler } from '../../../src/lib/util/clone-handler';
import { CloneConfig } from '../../../src/types/clone-config';
import sinon from 'sinon';
import inquirer from 'inquirer';

describe('CloneHandler - Stack', () => {
  describe('getStack', () => {
    let handler: CloneHandler;
    let mockClient: any;
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
      mockClient = {
        stack: sandbox.stub(),
      };
      handler.setClient(mockClient);
      // Set orgUidList for the test
      (handler as any).orgUidList = { 'TestOrg': 'test-org-uid' };
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should fetch stacks and return choices', async () => {
      const mockStacks = {
        items: [
          { name: 'Stack1', api_key: 'key1', master_locale: 'en-us' },
          { name: 'Stack2', api_key: 'key2', master_locale: 'en-gb' },
        ] as Array<{ name: string; api_key: string; master_locale: string }>,
      };
      const queryStub = {
        find: sandbox.stub().resolves(mockStacks),
      };
      mockClient.stack.returns({
        query: sandbox.stub().returns(queryStub),
      });

      const result = await handler.getStack({ Organization: 'TestOrg' });
      expect(result).to.have.property('type', 'list');
      expect(result).to.have.property('name', 'stack');
      expect(result.choices).to.have.length(2);
      expect(result.choices).to.include('Stack1');
      expect(result.choices).to.include('Stack2');
    });

    it('should use custom message when provided', async () => {
      const mockStacks = { items: [] as Array<{ name: string; api_key: string; master_locale: string }> };
      // Mock SDK call: client.stack().query({ organization_uid }).find()
      const findStub = sandbox.stub().resolves(mockStacks);
      const queryStub = sandbox.stub().returns({ find: findStub });
      mockClient.stack.returns({
        query: queryStub,
      });

      const result = await handler.getStack({ Organization: 'TestOrg' }, 'Custom message');
      expect(result.message).to.equal('Custom message');
    });

    it('should reject on error', async () => {
      // Mock SDK call: client.stack().query({ organization_uid }).find() to reject
      const findStub = sandbox.stub().rejects(new Error('API Error'));
      const queryStub = sandbox.stub().returns({ find: findStub });
      mockClient.stack.returns({
        query: queryStub,
      });

      try {
        await handler.getStack({ Organization: 'TestOrg' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error');
      }
    });
  });

  describe('handleStackSelection', () => {
    let handler: CloneHandler;
    let mockClient: any;
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
      mockClient = {
        stack: sandbox.stub(),
      };
      handler.setClient(mockClient);
      (handler as any).orgUidList = { 'TestOrg': 'test-org-uid' };
      (handler as any).stackUidList = { 'TestStack': 'test-stack-key' };
      (handler as any).masterLocaleList = { 'TestStack': 'en-us' };
      handler.setExectingCommand(1);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should handle stack selection for source', async () => {
      const mockStacks = {
        items: [{ name: 'TestStack', api_key: 'test-key', master_locale: 'en-us' }] as Array<{ name: string; api_key: string; master_locale: string }>,
      };
      const queryStub = {
        find: sandbox.stub().resolves(mockStacks),
      };
      mockClient.stack.returns({
        query: sandbox.stub().returns(queryStub),
      });

      const inquirerStub = sandbox.stub(inquirer, 'prompt').resolves({ stack: 'TestStack' });
      const displayBackOptionMessageStub = sandbox.stub(handler, 'displayBackOptionMessage');

      const result = await handler.handleStackSelection({
        org: { Organization: 'TestOrg' },
        msg: 'Select stack',
        isSource: true,
      });

      expect(result).to.have.property('stack', 'TestStack');
      expect(displayBackOptionMessageStub.calledOnce).to.be.true;
      inquirerStub.restore();
    });

    it('should handle stack selection for target', async () => {
      const mockStacks = {
        items: [{ name: 'TestStack', api_key: 'test-key', master_locale: 'en-us' }] as Array<{ name: string; api_key: string; master_locale: string }>,
      };
      const queryStub = {
        find: sandbox.stub().resolves(mockStacks),
      };
      mockClient.stack.returns({
        query: sandbox.stub().returns(queryStub),
      });

      const inquirerStub = sandbox.stub(inquirer, 'prompt').resolves({ stack: 'TestStack' });
      const displayBackOptionMessageStub = sandbox.stub(handler, 'displayBackOptionMessage');

      const result = await handler.handleStackSelection({
        org: { Organization: 'TestOrg' },
        msg: 'Select stack',
        isSource: false,
      });

      expect(result).to.have.property('stack', 'TestStack');
      expect(displayBackOptionMessageStub.calledOnce).to.be.true;
      inquirerStub.restore();
    });

    it('should reject when executingCommand is not 1', async () => {
      handler.setExectingCommand(0);
      const mockStacks = {
        items: [{ name: 'TestStack', api_key: 'test-key', master_locale: 'en-us' }] as Array<{ name: string; api_key: string; master_locale: string }>,
      };
      const queryStub = {
        find: sandbox.stub().resolves(mockStacks),
      };
      mockClient.stack.returns({
        query: sandbox.stub().returns(queryStub),
      });

      const inquirerStub = sandbox.stub(inquirer, 'prompt').resolves({ stack: 'TestStack' });

      try {
        await handler.handleStackSelection({
          org: { Organization: 'TestOrg' },
          isSource: true,
        });
        expect.fail('Should have rejected');
      } catch (error) {
        expect(error).to.be.undefined;
      }
      inquirerStub.restore();
    });
  });

  describe('executeStackPrompt', () => {
    let handler: CloneHandler;
    let mockClient: any;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
        source_stack: 'test-key',
      };
      handler = new CloneHandler(config);
      // Mock client to prevent real API calls
      mockClient = {
        stack: sandbox.stub().returns({
          branch: sandbox.stub().returns({
            query: sandbox.stub().returns({
              find: sandbox.stub().resolves({ items: [] }),
            }),
          }),
        }),
      };
      handler.setClient(mockClient);
      (handler as any).cloneCommand = {
        execute: sandbox.stub(),
      };
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should execute stack prompt and branch prompt when source_stack exists', async () => {
      (handler as any).cloneCommand.execute.resolves({ stack: 'TestStack' });
      const executeBranchPromptStub = sandbox.stub(handler, 'executeBranchPrompt').resolves();

      await handler.executeStackPrompt({ org: { Organization: 'TestOrg' } });

      expect((handler as any).cloneCommand.execute.calledOnce).to.be.true;
      expect(executeBranchPromptStub.calledOnce).to.be.true;
    });

    it('should update stackNamePrompt default', async () => {
      (handler as any).cloneCommand.execute.resolves({ stack: 'TestStack' });
      (handler as any).config.source_stack = undefined;

      await handler.executeStackPrompt({ org: { Organization: 'TestOrg' } });

      expect((handler as any).stackNamePrompt.default).to.include('Copy of');
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
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should execute destination stack selection when not creating new stack', async () => {
      (handler as any).cloneCommand.execute.resolves();
      const executeBranchDestinationPromptStub = sandbox.stub(handler, 'executeBranchDestinationPrompt').resolves();

      await handler.executeStackDestinationPrompt({
        org: { Organization: 'TestOrg' },
        canCreateStack: { stackCreate: false },
      });

      expect((handler as any).cloneCommand.execute.calledOnce).to.be.true;
      expect(executeBranchDestinationPromptStub.calledOnce).to.be.true;
    });

    it('should create new stack when canCreateStack is true', async () => {
      (handler as any).cloneCommand.execute.onFirstCall().resolves({ api_key: 'new-key' });
      (handler as any).cloneCommand.execute.onSecondCall().resolves('success');
      const removeBackKeyPressHandlerStub = sandbox.stub(handler, 'removeBackKeyPressHandler');

      await handler.executeStackDestinationPrompt({
        org: { Organization: 'TestOrg' },
        canCreateStack: { stackCreate: true },
      });

      expect((handler as any).cloneCommand.execute.calledTwice).to.be.true;
      expect(removeBackKeyPressHandlerStub.calledOnce).to.be.true;
    });
  });
});
