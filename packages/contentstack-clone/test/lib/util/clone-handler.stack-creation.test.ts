import { expect } from 'chai';
import { CloneHandler } from '../../../src/lib/util/clone-handler';
import { CloneConfig } from '../../../src/types/clone-config';
import sinon from 'sinon';

describe('CloneHandler - Stack Creation', () => {
  describe('getNewStackPromptResult', () => {
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
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should get stack name from prompt', async () => {
      const promptModule = require('prompt');
      const originalGet = promptModule.get;
      promptModule.get = sandbox.stub().callsArgWith(1, null, { name: 'TestStack' });
      promptModule.stopped = false;

      const result = await handler.getNewStackPromptResult();

      expect(result).to.have.property('stack', 'TestStack');
      
      // Restore original
      promptModule.get = originalGet;
    });

    it('should return undefined when prompt is stopped', async () => {
      const promptModule = require('prompt');
      const originalGet = promptModule.get;
      promptModule.get = sandbox.stub().callsArgWith(1, null, { name: 'TestStack' });
      promptModule.stopped = true;

      const result = await handler.getNewStackPromptResult();

      expect(result).to.be.undefined;
      
      // Restore original
      promptModule.get = originalGet;
    });
  });

  describe('createNewStack', () => {
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
      (handler as any).master_locale = 'en-us';
      handler.setExectingCommand(1);
      // Mock SDK: client.stack() returns object with create()
      const createStub = sandbox.stub().resolves({});
      const stackMock = {
        create: createStub,
      };
      mockClient = {
        stack: sandbox.stub().returns(stackMock),
      };
      handler.setClient(mockClient);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should create new stack with provided stack name', async () => {
      (handler as any).config.stackName = 'NewStack';
      const mockStack = {
        name: 'NewStack',
        api_key: 'new-key',
      };
      // Mock SDK call: client.stack().create({ stack }, { organization_uid })
      const stackMock = mockClient.stack();
      stackMock.create.resolves(mockStack);
      const displayBackOptionMessageStub = sandbox.stub(handler, 'displayBackOptionMessage');

      const result = await handler.createNewStack({ orgUid: 'test-org' });

      expect(result).to.have.property('api_key', 'new-key');
      expect(displayBackOptionMessageStub.calledOnce).to.be.true;
      expect((handler as any).config.target_stack).to.equal('new-key');
    });

    it('should reject when executingCommand is 0', async () => {
      handler.setExectingCommand(0);
      (handler as any).config.stackName = 'NewStack';

      try {
        await handler.createNewStack({ orgUid: 'test-org' });
        expect.fail('Should have rejected');
      } catch (error) {
        expect(error).to.be.undefined;
      }
    });
  });
});
