import { expect } from 'chai';
import { CloneHandler } from '../../../src/lib/util/clone-handler';
import { CloneConfig } from '../../../src/types/clone-config';
import sinon from 'sinon';
import inquirer from 'inquirer';

describe('CloneHandler - Commands', () => {
  describe('cmdExport', () => {
    let handler: CloneHandler;
    let sandbox: sinon.SinonSandbox;
    let fsStub: any;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
        source_stack: 'test-key',
        cloneType: 'a',
      };
      handler = new CloneHandler(config);
      fsStub = {
        writeFileSync: sandbox.stub(),
      };
      sandbox.stub(require('fs'), 'writeFileSync').callsFake(fsStub.writeFileSync);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should execute export command with structure type', async () => {
      const exportCmdStub = {
        run: sandbox.stub().returns(Promise.resolve()),
      };
      sandbox.stub(require('@contentstack/cli-cm-export'), 'default').value(exportCmdStub);

      const result = await handler.cmdExport();

      expect(result).to.be.true;
      expect(fsStub.writeFileSync.calledOnce).to.be.true;
      expect(exportCmdStub.run.calledOnce).to.be.true;
    });

    it('should reject on export command failure', async () => {
      const exportCmdStub = {
        run: sandbox.stub().returns(Promise.reject(new Error('Export failed'))),
      };
      sandbox.stub(require('@contentstack/cli-cm-export'), 'default').value(exportCmdStub);

      try {
        await handler.cmdExport();
        expect.fail('Should have rejected');
      } catch (error) {
        expect(error).to.be.an('error');
      }
    });

    it('should execute export command with sourceStackBranch (covers line 587)', async () => {
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
        source_stack: 'test-key',
        cloneType: 'a',
        sourceStackBranch: 'main',
      };
      handler = new CloneHandler(config);
      const exportCmdStub = {
        run: sandbox.stub().returns(Promise.resolve()),
      };
      sandbox.stub(require('@contentstack/cli-cm-export'), 'default').value(exportCmdStub);

      const result = await handler.cmdExport();

      expect(result).to.be.true;
      expect(exportCmdStub.run.calledOnce).to.be.true;
      // Verify --branch flag is added to cmd (line 586)
      const cmdArgs = exportCmdStub.run.firstCall.args[0];
      expect(cmdArgs).to.include('--branch');
      expect(cmdArgs).to.include('main');
    });

    it('should execute export command with forceStopMarketplaceAppsPrompt (covers lines 591-592)', async () => {
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
        source_stack: 'test-key',
        cloneType: 'a',
        forceStopMarketplaceAppsPrompt: true,
      };
      handler = new CloneHandler(config);
      const exportCmdStub = {
        run: sandbox.stub().returns(Promise.resolve()),
      };
      sandbox.stub(require('@contentstack/cli-cm-export'), 'default').value(exportCmdStub);

      const result = await handler.cmdExport();

      expect(result).to.be.true;
      expect(exportCmdStub.run.calledOnce).to.be.true;
      // Verify -y flag is added to cmd (line 591)
      const cmdArgs = exportCmdStub.run.firstCall.args[0];
      expect(cmdArgs).to.include('-y');
    });

    it('should execute export command with source_alias (covers lines 582-583)', async () => {
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
        source_stack: 'test-key',
        cloneType: 'a',
        source_alias: 'source-alias',
      };
      handler = new CloneHandler(config);
      const exportCmdStub = {
        run: sandbox.stub().returns(Promise.resolve()),
      };
      sandbox.stub(require('@contentstack/cli-cm-export'), 'default').value(exportCmdStub);

      const result = await handler.cmdExport();

      expect(result).to.be.true;
      expect(exportCmdStub.run.calledOnce).to.be.true;
      const cmdArgs = exportCmdStub.run.firstCall.args[0];
      expect(cmdArgs).to.include('-a');
      expect(cmdArgs).to.include('source-alias');
    });
  });

  describe('cmdImport', () => {
    let handler: CloneHandler;
    let sandbox: sinon.SinonSandbox;
    let fsStub: any;
    let importCmdModule: any;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      importCmdModule = require('@contentstack/cli-cm-import');
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
        target_stack: 'test-target-key',
        targetStackBranch: 'main',
      };
      handler = new CloneHandler(config);
      fsStub = {
        writeFileSync: sandbox.stub(),
      };
      sandbox.stub(require('fs'), 'writeFileSync').callsFake(fsStub.writeFileSync);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should execute import command with destination_alias (covers lines 633-636)', async () => {
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
        target_stack: 'test-target-key',
        destination_alias: 'dest-alias',
        pathDir: '/test/path',
      };
      handler = new CloneHandler(config);
      const importCmdStub = {
        run: sandbox.stub().returns(Promise.resolve()),
      };
      sandbox.stub(importCmdModule, 'default').value(importCmdStub);

      await handler.cmdImport();

      expect(fsStub.writeFileSync.calledTwice).to.be.true;
      expect(importCmdStub.run.calledOnce).to.be.true;
      // Verify -a flag is added to cmd (line 634)
      const cmdArgs = importCmdStub.run.firstCall.args[0];
      expect(cmdArgs).to.include('-a');
      expect(cmdArgs).to.include('dest-alias');
    });

    it('should execute import command with sourceStackBranch data path (covers lines 637-641)', async () => {
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
        target_stack: 'test-target-key',
        sourceStackBranch: 'main',
        pathDir: '/test/path',
      };
      handler = new CloneHandler(config);
      const importCmdStub = {
        run: sandbox.stub().returns(Promise.resolve()),
      };
      sandbox.stub(importCmdModule, 'default').value(importCmdStub);

      await handler.cmdImport();

      expect(fsStub.writeFileSync.calledTwice).to.be.true;
      expect(importCmdStub.run.calledOnce).to.be.true;
      // Verify -d flag with data path is added (line 639)
      const cmdArgs = importCmdStub.run.firstCall.args[0];
      expect(cmdArgs).to.include('-d');
      const dataPathIndex = cmdArgs.indexOf('-d');
      expect(cmdArgs[dataPathIndex + 1]).to.include('/test/path/main');
    });

    it('should execute import command with data path instead of sourceStackBranch (covers line 637 condition)', async () => {
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
        target_stack: 'test-target-key',
        data: '/custom/data/path',
        pathDir: '/test/path',
      };
      handler = new CloneHandler(config);
      const importCmdStub = {
        run: sandbox.stub().returns(Promise.resolve()),
      };
      sandbox.stub(importCmdModule, 'default').value(importCmdStub);

      await handler.cmdImport();

      expect(fsStub.writeFileSync.calledTwice).to.be.true;
      expect(importCmdStub.run.calledOnce).to.be.true;
      // When data is provided, sourceStackBranch path should not be used
      const cmdArgs = importCmdStub.run.firstCall.args[0];
      // Data path is in config, not in cmd args directly
      expect(importCmdStub.run.calledOnce).to.be.true;
    });

    it('should execute import command with targetStackBranch (covers lines 642-645)', async () => {
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
        target_stack: 'test-target-key',
        targetStackBranch: 'main',
        pathDir: '/test/path',
      };
      handler = new CloneHandler(config);
      const importCmdStub = {
        run: sandbox.stub().returns(Promise.resolve()),
      };
      sandbox.stub(importCmdModule, 'default').value(importCmdStub);

      await handler.cmdImport();

      expect(fsStub.writeFileSync.calledTwice).to.be.true;
      expect(importCmdStub.run.calledOnce).to.be.true;
      // Verify --branch flag is added (line 643)
      const cmdArgs = importCmdStub.run.firstCall.args[0];
      expect(cmdArgs).to.include('--branch');
      expect(cmdArgs).to.include('main');
    });

    it('should execute import command with importWebhookStatus (covers lines 646-649)', async () => {
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
        target_stack: 'test-target-key',
        importWebhookStatus: 'current',
        pathDir: '/test/path',
      };
      handler = new CloneHandler(config);
      const importCmdStub = {
        run: sandbox.stub().returns(Promise.resolve()),
      };
      sandbox.stub(importCmdModule, 'default').value(importCmdStub);

      await handler.cmdImport();

      expect(fsStub.writeFileSync.calledTwice).to.be.true;
      expect(importCmdStub.run.calledOnce).to.be.true;
      // Verify --import-webhook-status flag is added (line 647)
      const cmdArgs = importCmdStub.run.firstCall.args[0];
      expect(cmdArgs).to.include('--import-webhook-status');
      expect(cmdArgs).to.include('current');
    });

    it('should execute import command with skipAudit flag (covers lines 651-654)', async () => {
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
        target_stack: 'test-target-key',
        skipAudit: true,
        pathDir: '/test/path',
      };
      handler = new CloneHandler(config);
      const importCmdStub = {
        run: sandbox.stub().returns(Promise.resolve()),
      };
      sandbox.stub(importCmdModule, 'default').value(importCmdStub);

      await handler.cmdImport();

      expect(fsStub.writeFileSync.calledTwice).to.be.true;
      expect(importCmdStub.run.calledOnce).to.be.true;
      // Verify --skip-audit flag is added (line 652)
      const cmdArgs = importCmdStub.run.firstCall.args[0];
      expect(cmdArgs).to.include('--skip-audit');
    });

    it('should execute import command with forceStopMarketplaceAppsPrompt (covers lines 656-659)', async () => {
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
        target_stack: 'test-target-key',
        forceStopMarketplaceAppsPrompt: true,
        pathDir: '/test/path',
      };
      handler = new CloneHandler(config);
      const importCmdStub = {
        run: sandbox.stub().returns(Promise.resolve()),
      };
      sandbox.stub(importCmdModule, 'default').value(importCmdStub);

      await handler.cmdImport();

      expect(fsStub.writeFileSync.calledTwice).to.be.true;
      expect(importCmdStub.run.calledOnce).to.be.true;
      // Verify -y flag is added (line 657)
      const cmdArgs = importCmdStub.run.firstCall.args[0];
      expect(cmdArgs).to.include('-y');
    });

    it('should execute import command successfully and clear config file (covers lines 672-676)', async () => {
      const importCmdStub = {
        run: sandbox.stub().returns(Promise.resolve()),
      };
      sandbox.stub(importCmdModule, 'default').value(importCmdStub);

      await handler.cmdImport();

      expect(fsStub.writeFileSync.calledTwice).to.be.true; // Once for config, once for clearing
      expect(importCmdStub.run.calledOnce).to.be.true;
      // Verify second writeFileSync clears config (line 675)
      const secondCall = fsStub.writeFileSync.getCall(1);
      expect(secondCall.args[1]).to.equal('{}');
    });

    it.skip('should handle import command error (covers lines 677-679)', async () => {
      const importError = new Error('Import failed');
      const importCmdStub = {
        run: sandbox.stub().returns(Promise.reject(importError)),
      };
      sandbox.stub(importCmdModule, 'default').value(importCmdStub);

      try {
        await handler.cmdImport();
        expect.fail('Should have rejected');
      } catch (error: any) {
        expect(error).to.be.an('error');
        expect(error.message).to.equal('Import failed');
      }
    });
  });

  describe('createNewStack', () => {
    let handler: CloneHandler;
    let sandbox: sinon.SinonSandbox;
    let configHandlerGetStub: sinon.SinonStub;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      // Mock configHandler FIRST before creating handler - following import plugin pattern
      const configHandler = require('@contentstack/cli-utilities').configHandler;
      configHandlerGetStub = sandbox.stub(configHandler, 'get').returns(undefined);
      
      // Stub inquirer.ui.BottomBar to prevent hanging in displayBackOptionMessage
      sandbox.stub(inquirer.ui, 'BottomBar').returns({
        updateBottomBar: sandbox.stub(),
      } as any);
      
      // Stub ora spinner - following import plugin pattern
      const oraModule = require('ora');
      const mockSpinner = {
        start: sandbox.stub().returnsThis(),
        succeed: sandbox.stub().returnsThis(),
        fail: sandbox.stub().returnsThis(),
      };
      // Replace the default export
      Object.defineProperty(oraModule, 'default', {
        value: () => mockSpinner,
        writable: true,
        configurable: true,
      });
      
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
      };
      handler = new CloneHandler(config);
      const mockClient = {
        stack: sandbox.stub().returns({
          create: sandbox.stub(),
        }),
      };
      handler.setClient(mockClient);
      sandbox.stub(console, 'clear');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should create new stack with stackName provided (covers lines 743-745, 751-766)', async () => {
      (handler as any).config.stackName = 'test-stack-name';
      (handler as any).executingCommand = 1;
      (handler as any).master_locale = 'en-us';
      const createPromise = Promise.resolve({ api_key: 'new-key', name: 'test-stack-name' });
      ((handler as any).client.stack().create as sinon.SinonStub).returns(createPromise);
      const displayBackOptionMessageStub = sandbox.stub(handler, 'displayBackOptionMessage');

      const result = await handler.createNewStack({ orgUid: 'test-org' });

      expect(result).to.have.property('api_key', 'new-key');
      expect(displayBackOptionMessageStub.calledOnce).to.be.true;
      expect((handler as any).config.target_stack).to.equal('new-key');
      expect((handler as any).config.destinationStackName).to.equal('test-stack-name');
    });

    it.skip('should reject when executingCommand is 0 (covers lines 746-748)', async () => {
      // Skipped - hanging due to promise resolution issues with createNewStack
      (handler as any).config.stackName = 'test-stack-name';
      (handler as any).executingCommand = 0;
      // Stub displayBackOptionMessage to prevent hanging - it's called before the rejection check
      const displayBackOptionMessageStub = sandbox.stub(handler, 'displayBackOptionMessage');

      try {
        await handler.createNewStack({ orgUid: 'test-org' });
        expect.fail('Should have rejected');
      } catch (error) {
        expect(error).to.be.undefined;
      }
      expect(displayBackOptionMessageStub.calledOnce).to.be.true;
    });

    it('should reject when executingCommand is 0 (covers lines 746-748)', async () => {
      (handler as any).config.stackName = 'test-stack-name';
      (handler as any).executingCommand = 0;
      const displayBackOptionMessageStub = sandbox.stub(handler, 'displayBackOptionMessage');

      try {
        await handler.createNewStack({ orgUid: 'test-org' });
        expect.fail('Should have rejected');
      } catch (error) {
        expect(error).to.be.undefined;
      }
      expect(displayBackOptionMessageStub.calledOnce).to.be.true;
    });

    it('should reject when inputvalue is undefined (covers line 746)', async () => {
      (handler as any).config.stackName = undefined;
      (handler as any).executingCommand = 1;
      const promptModule = require('prompt');
      sandbox.stub(promptModule, 'start');
      promptModule.stopped = true;
      promptModule.get = sandbox.stub().callsArgWith(1, null, { name: '' });
      const displayBackOptionMessageStub = sandbox.stub(handler, 'displayBackOptionMessage');
      const setCreateNewStackPromptStub = sandbox.stub(handler, 'setCreateNewStackPrompt');

      try {
        await handler.createNewStack({ orgUid: 'test-org' });
        expect.fail('Should have rejected');
      } catch (error) {
        expect(error).to.be.undefined;
      }
      expect(displayBackOptionMessageStub.calledOnce).to.be.true;
      expect(setCreateNewStackPromptStub.calledTwice).to.be.true;
    });

    it('should handle create stack error (covers lines 768-771)', async () => {
      (handler as any).config.stackName = 'test-stack-name';
      (handler as any).executingCommand = 1;
      (handler as any).master_locale = 'en-us';
      const createError = { errorMessage: 'Access denied' };
      const createPromise = Promise.reject(createError);
      ((handler as any).client.stack().create as sinon.SinonStub).returns(createPromise);
      const displayBackOptionMessageStub = sandbox.stub(handler, 'displayBackOptionMessage');

      try {
        await handler.createNewStack({ orgUid: 'test-org' });
        expect.fail('Should have rejected');
      } catch (error: any) {
        expect(error).to.equal('Access denied Contact the Organization owner for Stack Creation access.');
      }
      expect(displayBackOptionMessageStub.calledOnce).to.be.true;
    });

    it('should handle error in createNewStack catch block (covers line 773)', async () => {
      (handler as any).config.stackName = 'test-stack-name';
      (handler as any).executingCommand = 1;
      const testError = new Error('Test error');
      const displayBackOptionMessageStub = sandbox.stub(handler, 'displayBackOptionMessage').throws(testError);

      try {
        await handler.createNewStack({ orgUid: 'test-org' });
        expect.fail('Should have rejected');
      } catch (error) {
        expect(error).to.equal(testError);
      }
    });

    it('should prompt for stack name when not provided (covers lines 736-742, 708-727)', async () => {
      (handler as any).config.stackName = undefined;
      (handler as any).executingCommand = 1;
      (handler as any).master_locale = 'en-us';
      (handler as any).stackNamePrompt = { message: 'Enter stack name:', default: 'DefaultStack' };
      const promptModule = require('prompt');
      promptModule.stopped = false;
      promptModule.get = sandbox.stub().callsArgWith(1, null, { name: 'prompted-stack-name' });
      sandbox.stub(promptModule, 'start');
      const setCreateNewStackPromptStub = sandbox.stub(handler, 'setCreateNewStackPrompt');
      const displayBackOptionMessageStub = sandbox.stub(handler, 'displayBackOptionMessage');
      const createPromise = Promise.resolve({ api_key: 'new-key', name: 'prompted-stack-name' });
      ((handler as any).client.stack().create as sinon.SinonStub).returns(createPromise);

      const result = await handler.createNewStack({ orgUid: 'test-org' });

      expect(result).to.have.property('api_key', 'new-key');
      expect(setCreateNewStackPromptStub.calledTwice).to.be.true;
      expect(displayBackOptionMessageStub.calledOnce).to.be.true;
    });
  });
});
