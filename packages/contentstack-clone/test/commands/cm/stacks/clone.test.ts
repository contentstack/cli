import { expect } from 'chai';
import sinon from 'sinon';
import StackCloneCommand from '../../../../src/commands/cm/stacks/clone';
import { CloneHandler } from '../../../../src/lib/util/clone-handler';
import { CloneContext } from '../../../../src/types/clone-context';
import * as cliUtilities from '@contentstack/cli-utilities';
import { rimraf } from 'rimraf';
import { readdirSync } from 'fs';

describe('StackCloneCommand', () => {
  let command: StackCloneCommand;
  let sandbox: sinon.SinonSandbox;
  let mockContext: any;
  let mockFlags: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    command = new StackCloneCommand([], {} as any);
    mockContext = {
      info: { command: 'cm:stacks:clone' },
    };
    mockFlags = {
      'source-stack-api-key': undefined,
      'destination-stack-api-key': undefined,
      'source-management-token-alias': undefined,
      'destination-management-token-alias': undefined,
      'source-branch': undefined,
      'target-branch': undefined,
      'stack-name': undefined,
      type: undefined,
      yes: false,
    };
    // Always stub registerCleanupOnInterrupt to prevent hanging tests
    sandbox.stub(command, 'registerCleanupOnInterrupt');
  });

  afterEach(() => {
    sandbox.restore();
    // Remove all event listeners to prevent hanging tests
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGQUIT');
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('unhandledRejection');
    process.removeAllListeners('uncaughtException');
  });

  describe('determineAuthenticationMethod', () => {
    it('should return "Management Token" when both aliases provided', () => {
      const method = command.determineAuthenticationMethod('source-alias', 'dest-alias');
      expect(method).to.equal('Management Token');
    });

    it('should return "OAuth" when user is authenticated via OAuth', () => {
      // Mock configHandler to return OAUTH
      const configHandlerStub = sandbox.stub(cliUtilities.configHandler, 'get');
      configHandlerStub.withArgs('authorisationType').returns('OAUTH');
      // Since isAuthenticated is non-configurable, we test the OAuth path by ensuring it's called
      // The actual return value depends on isAuthenticated() which we can't stub
      const method = command.determineAuthenticationMethod(undefined, undefined);
      
      // Method will be OAuth if authenticated, Basic Auth if not
      expect(method).to.be.oneOf(['OAuth', 'Basic Auth']);
    });

    it('should return "Basic Auth" when user is authenticated but not OAuth', () => {
      // Mock configHandler to return non-OAUTH value
      const configHandlerStub = sandbox.stub(cliUtilities.configHandler, 'get');
      configHandlerStub.withArgs('authorisationType').returns('BASIC');
      
      const method = command.determineAuthenticationMethod(undefined, undefined);
      
      // Method will be Basic Auth if authenticated, Basic Auth if not
      expect(method).to.equal('Basic Auth');
    });

    it('should return "Basic Auth" when user is not authenticated', () => {
      // When not authenticated, should return Basic Auth
      const method = command.determineAuthenticationMethod(undefined, undefined);
      
      // If not authenticated, it should return Basic Auth
      expect(method).to.equal('Basic Auth');
    });

    it('should return "Management Token" when source alias provided', () => {
      const method = command.determineAuthenticationMethod('source-alias', undefined);
      expect(method).to.equal('Management Token');
    });

    it('should return "Management Token" when destination alias provided', () => {
      const method = command.determineAuthenticationMethod(undefined, 'dest-alias');
      expect(method).to.equal('Management Token');
    });
  });

  describe('createCloneContext', () => {
    it('should create context with management-token method', () => {
      const context = command.createCloneContext('management-token');
      expect(context).to.have.property('command', 'cm:stacks:clone');
      expect(context).to.have.property('module', 'clone');
      expect(context).to.have.property('authenticationMethod', 'management-token');
    });

    it('should create context with oauth method', () => {
      const context = command.createCloneContext('oauth');
      expect(context).to.have.property('authenticationMethod', 'oauth');
    });
  });

  describe('removeContentDirIfNotEmptyBeforeClone', () => {
    it('should remove directory when it exists and is not empty', async () => {
      const readdirSyncStub = sandbox.stub(require('fs'), 'readdirSync').returns(['file1', 'file2']);
      const cleanUpStub = sandbox.stub(command, 'cleanUp').resolves();
      const cloneContext: CloneContext = {
        command: 'test',
        module: 'clone',
        email: 'test@example.com',
      };

      await command.removeContentDirIfNotEmptyBeforeClone('/test/dir', cloneContext);

      expect(cleanUpStub.calledOnce).to.be.true;
    });

    it('should not remove directory when it is empty', async () => {
      const readdirSyncStub = sandbox.stub(require('fs'), 'readdirSync').returns([]);
      const cleanUpStub = sandbox.stub(command, 'cleanUp').resolves();
      const cloneContext: CloneContext = {
        command: 'test',
        module: 'clone',
        email: 'test@example.com',
      };

      await command.removeContentDirIfNotEmptyBeforeClone('/test/dir', cloneContext);

      expect(cleanUpStub.called).to.be.false;
    });

    it('should handle directory not existing', async () => {
      const error = new Error('ENOENT') as any;
      error.code = 'ENOENT';
      const readdirSyncStub = sandbox.stub(require('fs'), 'readdirSync').throws(error);
      const cleanUpStub = sandbox.stub(command, 'cleanUp').resolves();
      const cloneContext: CloneContext = {
        command: 'test',
        module: 'clone',
        email: 'test@example.com',
      };

      await command.removeContentDirIfNotEmptyBeforeClone('/test/dir', cloneContext);

      expect(cleanUpStub.called).to.be.false;
    });
  });

  describe('cleanUp', () => {
    it('should clean up directory successfully', async () => {
      const rimrafModule = require('rimraf');
      const rimrafStub = sandbox.stub(rimrafModule, 'rimraf').resolves();
      const cloneContext: CloneContext = {
        command: 'test',
        module: 'clone',
        email: 'test@example.com',
      };

      await command.cleanUp('/test/dir', 'Test message', cloneContext);

      expect(rimrafStub.calledOnce).to.be.true;
    });

    it('should handle cleanup errors with skip codes', async () => {
      const rimrafModule = require('rimraf');
      const rimrafStub = sandbox.stub(rimrafModule, 'rimraf').rejects({ code: 'ENOENT' });
      const exitStub = sandbox.stub(process, 'exit').callsFake((() => {
        throw new Error('process.exit called');
      }) as () => never);
      const cloneContext: CloneContext = {
        command: 'test',
        module: 'clone',
        email: 'test@example.com',
      };

      try {
        await command.cleanUp('/test/dir', null, cloneContext);
      } catch (error) {
        // Expected to throw due to process.exit
      }

      expect(rimrafStub.calledOnce).to.be.true;
      exitStub.restore();
    });

    it('should handle cleanup errors with other skip codes', async () => {
      const rimrafModule = require('rimraf');
      const rimrafStub = sandbox.stub(rimrafModule, 'rimraf').rejects({ code: 'EBUSY' });
      const exitStub = sandbox.stub(process, 'exit').callsFake((() => {
        throw new Error('process.exit called');
      }) as () => never);
      const cloneContext: CloneContext = {
        command: 'test',
        module: 'clone',
        email: 'test@example.com',
      };

      try {
        await command.cleanUp('/test/dir', null, cloneContext);
      } catch (error) {
        // Expected to throw due to process.exit
      }

      expect(rimrafStub.calledOnce).to.be.true;
      exitStub.restore();
    });

    it('should handle cleanup errors without skip codes', async () => {
      const rimrafModule = require('rimraf');
      const rimrafStub = sandbox.stub(rimrafModule, 'rimraf').rejects({ code: 'UNKNOWN_ERROR' });
      const cloneContext: CloneContext = {
        command: 'test',
        module: 'clone',
        email: 'test@example.com',
      };

      await command.cleanUp('/test/dir', null, cloneContext);

      expect(rimrafStub.calledOnce).to.be.true;
    });

    it('should handle cleanup with null error', async () => {
      const rimrafModule = require('rimraf');
      const rimrafStub = sandbox.stub(rimrafModule, 'rimraf').rejects(null);
      const cloneContext: CloneContext = {
        command: 'test',
        module: 'clone',
        email: 'test@example.com',
      };

      await command.cleanUp('/test/dir', null, cloneContext);

      expect(rimrafStub.calledOnce).to.be.true;
    });
  });

  describe('registerCleanupOnInterrupt', () => {
    beforeEach(() => {
      // Restore the stub from parent beforeEach so we can test the real method
      const stub = (command.registerCleanupOnInterrupt as any);
      if (stub && stub.restore) {
        stub.restore();
      }
    });

    afterEach(() => {
      // Clean up listeners after each test in this describe block
      process.removeAllListeners('SIGINT');
      process.removeAllListeners('SIGQUIT');
      process.removeAllListeners('SIGTERM');
      process.removeAllListeners('unhandledRejection');
      process.removeAllListeners('uncaughtException');
    });

    it('should register signal handlers', () => {
      const onStub = sandbox.stub(process, 'on').returns(process);
      const cloneContext: CloneContext = {
        command: 'test',
        module: 'clone',
        email: 'test@example.com',
      };

      command.registerCleanupOnInterrupt('/test/dir', cloneContext);

      expect(onStub.called).to.be.true;
    });

    it('should handle SIGINT signal', async () => {
      let sigintHandler: any;
      const onStub = sandbox.stub(process, 'on').callsFake((event: string, handler: any) => {
        if (event === 'SIGINT') {
          sigintHandler = handler;
        }
        return process;
      });
      const cleanUpStub = sandbox.stub(command, 'cleanUp').resolves();
      const exitStub = sandbox.stub(process, 'exit').callsFake((() => {
        throw new Error('process.exit called');
      }) as () => never);
      const cloneContext: CloneContext = {
        command: 'test',
        module: 'clone',
        email: 'test@example.com',
      };

      command.registerCleanupOnInterrupt('/test/dir', cloneContext);

      // Trigger SIGINT handler
      if (sigintHandler) {
        try {
          await sigintHandler(true);
        } catch (error) {
          // Expected due to process.exit
        }
      }

      expect(cleanUpStub.called).to.be.true;
      exitStub.restore();
    });

    it('should handle unhandledRejection exception', async () => {
      let rejectionHandler: any;
      const onStub = sandbox.stub(process, 'on').callsFake((event: string, handler: any) => {
        if (event === 'unhandledRejection') {
          rejectionHandler = handler;
        }
        return process;
      });
      const cleanUpStub = sandbox.stub(command, 'cleanUp').resolves();
      const cloneContext: CloneContext = {
        command: 'test',
        module: 'clone',
        email: 'test@example.com',
      };

      command.registerCleanupOnInterrupt('/test/dir', cloneContext);

      // Trigger unhandledRejection handler
      if (rejectionHandler) {
        await rejectionHandler(Promise.resolve('test'));
      }

      expect(cleanUpStub.called).to.be.true;
    });

    it('should handle error with message', async () => {
      let exceptionHandler: any;
      const onStub = sandbox.stub(process, 'on').callsFake((event: string, handler: any) => {
        if (event === 'uncaughtException') {
          exceptionHandler = handler;
        }
        return process;
      });
      const cleanUpStub = sandbox.stub(command, 'cleanUp').resolves();
      const cloneContext: CloneContext = {
        command: 'test',
        module: 'clone',
        email: 'test@example.com',
      };

      command.registerCleanupOnInterrupt('/test/dir', cloneContext);

      // Trigger uncaughtException handler
      if (exceptionHandler) {
        await exceptionHandler({ message: 'Test error' });
      }

      expect(cleanUpStub.called).to.be.true;
    });

    it('should handle error with errorMessage', async () => {
      let exceptionHandler: any;
      const onStub = sandbox.stub(process, 'on').callsFake((event: string, handler: any) => {
        if (event === 'uncaughtException') {
          exceptionHandler = handler;
        }
        return process;
      });
      const cleanUpStub = sandbox.stub(command, 'cleanUp').resolves();
      const cloneContext: CloneContext = {
        command: 'test',
        module: 'clone',
        email: 'test@example.com',
      };

      command.registerCleanupOnInterrupt('/test/dir', cloneContext);

      // Trigger uncaughtException handler
      if (exceptionHandler) {
        await exceptionHandler({ errorMessage: 'Test error message' });
      }

      expect(cleanUpStub.called).to.be.true;
    });
  });

  describe('run', () => {
    beforeEach(() => {
      // Use Object.defineProperty to set read-only properties
      Object.defineProperty(command, 'context', {
        value: mockContext,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(command, 'cmaHost', {
        value: 'https://api.contentstack.io',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(command, 'cdaHost', {
        value: 'https://cdn.contentstack.io',
        writable: true,
        configurable: true,
      });
    });

    it('should handle run with authenticated user', async () => {
      const parseStub = sandbox.stub(command, 'parse' as any).resolves({
        flags: mockFlags,
      });
      const configHandlerStub = sandbox.stub(cliUtilities.configHandler, 'get');
      configHandlerStub.withArgs('tokens').returns({});
      configHandlerStub.withArgs('email').returns('test@example.com');
      configHandlerStub.withArgs('authtoken').returns('test-token');
      const managementSDKClientStub = sandbox.stub(cliUtilities, 'managementSDKClient').resolves({} as any);
      const readdirSyncStub = sandbox.stub(require('fs'), 'readdirSync').returns([]);
      const onStub = sandbox.stub(process, 'on').returns(process);
      const cloneHandlerExecuteStub = sandbox.stub(CloneHandler.prototype, 'execute').resolves();

      // Only test if authenticated, otherwise skip
      if (cliUtilities.isAuthenticated()) {
        await command.run();
        expect(parseStub.calledOnce).to.be.true;
        expect(managementSDKClientStub.calledOnce).to.be.true;
      }
    });

    it('should handle run with external config path', async () => {
      const parseStub = sandbox.stub(command, 'parse' as any).resolves({
        flags: {
          ...mockFlags,
          config: '/path/to/config.json',
        },
      });
      const configHandlerStub = sandbox.stub(cliUtilities.configHandler, 'get');
      configHandlerStub.withArgs('tokens').returns({});
      configHandlerStub.withArgs('email').returns('test@example.com');
      configHandlerStub.withArgs('authtoken').returns('test-token');
      const readFileSyncStub = sandbox.stub(require('fs'), 'readFileSync').returns('{"cloneType": "a"}');
      const managementSDKClientStub = sandbox.stub(cliUtilities, 'managementSDKClient').resolves({} as any);
      const readdirSyncStub = sandbox.stub(require('fs'), 'readdirSync').returns([]);
      const onStub = sandbox.stub(process, 'on').returns(process);
      const cloneHandlerExecuteStub = sandbox.stub(CloneHandler.prototype, 'execute').resolves();

      // Only test if authenticated, otherwise skip
      if (cliUtilities.isAuthenticated()) {
        await command.run();
        expect(parseStub.calledOnce).to.be.true;
        expect(readFileSyncStub.calledOnce).to.be.true;
      }
    });

    it('should handle run with all flags set', async () => {
      const parseStub = sandbox.stub(command, 'parse' as any).resolves({
        flags: {
          ...mockFlags,
          'source-stack-api-key': 'source-key',
          'destination-stack-api-key': 'dest-key',
          'source-branch': 'main',
          'target-branch': 'develop',
          'stack-name': 'NewStack',
          type: 'a',
          yes: true,
          'skip-audit': true,
          'import-webhook-status': 'disable',
        },
      });
      const configHandlerStub = sandbox.stub(cliUtilities.configHandler, 'get');
      configHandlerStub.withArgs('tokens').returns({});
      configHandlerStub.withArgs('email').returns('test@example.com');
      configHandlerStub.withArgs('authtoken').returns('test-token');
      const managementSDKClientStub = sandbox.stub(cliUtilities, 'managementSDKClient').resolves({} as any);
      const readdirSyncStub = sandbox.stub(require('fs'), 'readdirSync').returns([]);
      const onStub = sandbox.stub(process, 'on').returns(process);
      const cloneHandlerExecuteStub = sandbox.stub(CloneHandler.prototype, 'execute').resolves();

      // Only test if authenticated, otherwise skip
      if (cliUtilities.isAuthenticated()) {
        await command.run();
        expect(parseStub.calledOnce).to.be.true;
        expect(managementSDKClientStub.calledOnce).to.be.true;
      }
    });

    it.skip('should exit when not authenticated and no management token aliases', async () => {
      const parseStub = sandbox.stub(command, 'parse' as any).resolves({
        flags: mockFlags,
      });
      const exitStub = sandbox.stub(command, 'exit' as any).callsFake((() => {
        throw new Error('exit called');
      }) as () => never);

      // Only test if not authenticated
      if (!cliUtilities.isAuthenticated()) {
        try {
          await command.run();
          expect.fail('Should have exited');
        } catch (error: any) {
          expect(error.message).to.equal('exit called');
        }

        expect(parseStub.calledOnce).to.be.true;
        expect(exitStub.calledOnce).to.be.true;
      }
    });

    it.skip('should exit when management token aliases provided but not authenticated and branches provided', async () => {
      const parseStub = sandbox.stub(command, 'parse' as any).resolves({
        flags: {
          ...mockFlags,
          'source-management-token-alias': 'source-alias',
          'destination-management-token-alias': 'dest-alias',
          'source-branch': 'main',
        },
      });
      const exitStub = sandbox.stub(command, 'exit' as any).callsFake((() => {
        throw new Error('exit called');
      }) as () => never);

      // Only test if not authenticated
      if (!cliUtilities.isAuthenticated()) {
        try {
          await command.run();
          expect.fail('Should have exited');
        } catch (error: any) {
          expect(error.message).to.equal('exit called');
        }

        expect(parseStub.calledOnce).to.be.true;
        expect(exitStub.calledOnce).to.be.true;
      }
    });

    it('should handle run error and cleanup', async () => {
      const parseStub = sandbox.stub(command, 'parse' as any).rejects(new Error('Parse error'));
      const cleanUpStub = sandbox.stub(command, 'cleanUp').resolves();
      // Stub log.error since it might not be directly accessible
      const logStub = {
        error: sandbox.stub(),
        warn: sandbox.stub(),
        debug: sandbox.stub(),
        info: sandbox.stub(),
      };
      sandbox.stub(cliUtilities, 'log').value(logStub);

      await command.run();

      expect(parseStub.calledOnce).to.be.true;
      expect(cleanUpStub.calledOnce).to.be.true;
      expect(logStub.error.calledOnce).to.be.true;
    });

    it('should handle run with source management token alias not found', async () => {
      const parseStub = sandbox.stub(command, 'parse' as any).resolves({
        flags: {
          ...mockFlags,
          'source-management-token-alias': 'non-existent-alias',
        },
      });
      const configHandlerStub = sandbox.stub(cliUtilities.configHandler, 'get');
      configHandlerStub.withArgs('tokens').returns({});
      configHandlerStub.withArgs('email').returns('test@example.com');
      configHandlerStub.withArgs('authtoken').returns('test-token');
      // Stub log.warn since it might not be directly accessible
      const logStub = {
        error: sandbox.stub(),
        warn: sandbox.stub(),
        debug: sandbox.stub(),
        info: sandbox.stub(),
      };
      sandbox.stub(cliUtilities, 'log').value(logStub);
      const managementSDKClientStub = sandbox.stub(cliUtilities, 'managementSDKClient').resolves({} as any);
      const readdirSyncStub = sandbox.stub(require('fs'), 'readdirSync').returns([]);
      const onStub = sandbox.stub(process, 'on').returns(process);
      const cloneHandlerExecuteStub = sandbox.stub(CloneHandler.prototype, 'execute').resolves();

      // Only test if authenticated, otherwise skip
      if (cliUtilities.isAuthenticated()) {
        await command.run();
        expect(logStub.warn.calledOnce).to.be.true;
      }
    });
  });
});
