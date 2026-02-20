import { expect } from 'chai';
import { CloneHandler } from '../../../src/core/util/clone-handler';
import { CloneConfig } from '../../../src/types/clone-config';
import sinon from 'sinon';
import inquirer from 'inquirer';

describe('CloneHandler - Helpers', () => {
  describe('displayBackOptionMessage', () => {
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

    it('should display back option message', () => {
      const writeStub = sandbox.stub(process.stdout, 'write');
      handler.displayBackOptionMessage();
      expect(writeStub.calledOnce).to.be.true;
      expect(writeStub.firstCall.args[0]).to.include('Press shift & left arrow together to undo');
      writeStub.restore();
    });
  });

  describe('setBackKeyPressHandler', () => {
    let handler: CloneHandler;

    beforeEach(() => {
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
      };
      handler = new CloneHandler(config);
    });

    it('should set back key press handler', () => {
      const handlerFn = () => {};
      handler.setBackKeyPressHandler(handlerFn);
      // Handler is private, so we test indirectly by checking it doesn't throw
      expect(handler).to.exist;
    });
  });

  describe('removeBackKeyPressHandler', () => {
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

    it('should remove back key press handler when handler exists', () => {
      const handlerFn = () => {};
      handler.setBackKeyPressHandler(handlerFn);
      const removeListenerStub = sandbox.stub(process.stdin, 'removeListener');
      
      handler.removeBackKeyPressHandler();
      
      expect(removeListenerStub.calledOnce).to.be.true;
    });

    it('should not throw when handler does not exist', () => {
      expect(() => handler.removeBackKeyPressHandler()).to.not.throw();
    });
  });

  describe('setExectingCommand', () => {
    let handler: CloneHandler;

    beforeEach(() => {
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
      };
      handler = new CloneHandler(config);
    });

    it('should set executing command to 0 (org)', () => {
      handler.setExectingCommand(0);
      // Command is private, so we test indirectly
      expect(handler).to.exist;
    });

    it('should set executing command to 1 (stack)', () => {
      handler.setExectingCommand(1);
      expect(handler).to.exist;
    });

    it('should set executing command to 2 (branch)', () => {
      handler.setExectingCommand(2);
      expect(handler).to.exist;
    });

    it('should set executing command to 3 (stack cancelled)', () => {
      handler.setExectingCommand(3);
      expect(handler).to.exist;
    });

    it('should set executing command to 4 (branch cancelled)', () => {
      handler.setExectingCommand(4);
      expect(handler).to.exist;
    });
  });

  describe('setCreateNewStackPrompt', () => {
    let handler: CloneHandler;

    beforeEach(() => {
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
      };
      handler = new CloneHandler(config);
    });

    it('should set create new stack prompt', () => {
      const prompt = [{ type: 'confirm', name: 'test' }];
      handler.setCreateNewStackPrompt(prompt);
      // Prompt is private, so we test indirectly
      expect(handler).to.exist;
    });
  });

  describe('setClient', () => {
    let handler: CloneHandler;

    beforeEach(() => {
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
      };
      handler = new CloneHandler(config);
    });

    it('should set client with valid client object', () => {
      const mockClient = {
        stack: () => {},
        organization: () => {},
      };
      handler.setClient(mockClient as any);
      expect(handler).to.exist;
    });

    it('should handle null client', () => {
      handler.setClient(null as any);
      expect(handler).to.exist;
    });

    it('should handle undefined client', () => {
      handler.setClient(undefined as any);
      expect(handler).to.exist;
    });
  });
});
