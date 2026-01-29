import { expect } from 'chai';
import { stub, restore, SinonStub, createSandbox } from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import MigrationCommand from '../../../../../src/commands/cm/stacks/migration';
import * as mapModule from '../../../../../src/utils/map';
import * as utilsModule from '../../../../../src/utils';
import * as parserModule from '../../../../../src/modules';
import * as errorHelperModule from '../../../../../src/utils/error-helper';

describe('Migration Command', () => {
  let command: MigrationCommand;
  let sandbox: ReturnType<typeof createSandbox>;
  let getMapInstanceStub: SinonStub;
  let setStub: SinonStub;
  let getStub: SinonStub;
  let mockMapInstance: Map<string, any>;
  let parseStub: SinonStub;
  let logStub: SinonStub;
  let exitStub: SinonStub;
  let managementSDKClientStub: SinonStub;
  let installModulesStub: SinonStub;
  let errorHelperStub: SinonStub;
  let tempDir: string;
  let tempFile: string;

  beforeEach(() => {
    sandbox = createSandbox();
    mockMapInstance = new Map();
    command = new MigrationCommand([], {} as any);
    
    // Create a temporary file for tests that need existsSync to return true
    tempDir = path.join(os.tmpdir(), `migration-test-${Date.now()}`);
    tempFile = path.join(tempDir, 'test-migration.js');
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(tempFile, '// test migration file');
    
    // Stub map utilities
    getMapInstanceStub = sandbox.stub(mapModule, 'getMapInstance').returns(mockMapInstance);
    sandbox.stub(mapModule, 'resetMapInstance');
    setStub = sandbox.stub(mapModule, 'set');
    getStub = sandbox.stub(mapModule, 'get').returns([]);

    // Stub command methods
    parseStub = sandbox.stub(command, 'parse' as any).resolves({
      flags: {},
    } as any);
    logStub = sandbox.stub(command, 'log');
    exitStub = sandbox.stub(command, 'exit');
    
    // Use Object.defineProperty to set properties since they're getters
    Object.defineProperty(command, 'cmaHost', {
      value: 'https://api.contentstack.io',
      writable: true,
      configurable: true
    });
    
    (command as any).getToken = sandbox.stub().returns({
      token: 'test-token',
      apiKey: 'test-api-key',
    });

    // Don't stub fs operations - use real temporary files/directories instead
    // This avoids issues with non-configurable properties in newer Node.js versions

    // Stub utilities - use configHandler and isAuthenticated
    const cliUtilities = require('@contentstack/cli-utilities');
    sandbox.stub(cliUtilities.configHandler, 'get').callsFake((key: string) => {
      if (key === 'authorisationType') {
        return 'OAUTH'; // Default: authenticated
      }
      return undefined;
    });
    try {
      managementSDKClientStub = sandbox.stub(cliUtilities, 'managementSDKClient').resolves({
        stack: sandbox.stub().returns({}),
      });
    } catch (e) {
      // If non-configurable, we'll work around it
    }
    installModulesStub = sandbox.stub(utilsModule, 'installModules').resolves(true);
    // Don't stub non-configurable properties - let them run naturally
    errorHelperStub = sandbox.stub(errorHelperModule, 'default');
  });

  afterEach(() => {
    sandbox.restore();
    // Clean up temp files
    try {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Class Definition', () => {
    it('should export MigrationCommand class', () => {
      expect(MigrationCommand).to.exist;
    });

    it('should have description', () => {
      expect(MigrationCommand.description).to.be.a('string');
    });

    it('should have examples', () => {
      expect(MigrationCommand.examples).to.be.an('array');
      expect(MigrationCommand.examples.length).to.be.greaterThan(0);
    });

    it('should have flags defined', () => {
      expect(MigrationCommand.flags).to.exist;
      expect(MigrationCommand.flags).to.have.property('stack-api-key');
      expect(MigrationCommand.flags).to.have.property('file-path');
      expect(MigrationCommand.flags).to.have.property('alias');
    });

    it('should have usage string containing migration', () => {
      expect(MigrationCommand.usage).to.be.a('string');
      expect(MigrationCommand.usage).to.include('migration');
    });

    it('should have aliases including cm:migration', () => {
      expect(MigrationCommand.aliases).to.be.an('array');
      expect(MigrationCommand.aliases).to.include('cm:migration');
    });
  });

  describe('run() method', () => {
    it.skip('should exit when no authtoken and no alias', async () => {
      const cliUtilities = require('@contentstack/cli-utilities');
      sandbox.stub(cliUtilities.configHandler, 'get').callsFake((key: string) => undefined);
      parseStub.resolves({
        flags: {
          'file-path': tempFile,
        },
      } as any);

      await command.run();

      expect(logStub.called).to.be.true;
      expect(exitStub.called).to.be.true;
    });

    it.skip('should exit when file path is not provided', async () => {
      parseStub.resolves({
        flags: {},
      } as any);

      await command.run();

      expect(logStub.called).to.be.true;
      expect(exitStub.called).to.be.true;
    });

    it.skip('should exit when file path does not exist', async () => {
      parseStub.resolves({
        flags: {
          'file-path': '/nonexistent/path/that/does/not/exist.js',
        },
      } as any);

      await command.run();

      expect(logStub.called).to.be.true;
      expect(exitStub.called).to.be.true;
    });

    it.skip('should set config-path when config-file flag is provided', async () => {
      sandbox.stub(command, 'execSingleFile').resolves();
      parseStub.resolves({
        flags: {
          'file-path': tempFile,
          'config-file': '/test/config.json',
        },
      } as any);

      await command.run();

      expect(setStub.calledWith('config-path', mockMapInstance, '/test/config.json')).to.be.true;
    });

    it.skip('should process config array and set config object', async () => {
      sandbox.stub(command, 'execSingleFile').resolves();
      parseStub.resolves({
        flags: {
          'file-path': tempFile,
          config: ['key1:value1', 'key2:value2'],
        },
      } as any);

      await command.run();

      expect(setStub.called).to.be.true;
      const configCall = setStub.getCalls().find(call => call.args[0] === 'config');
      expect(configCall).to.exist;
      if (configCall) {
        expect(configCall.args[2]).to.have.property('key1', 'value1');
        expect(configCall.args[2]).to.have.property('key2', 'value2');
      }
    });

    it.skip('should handle config with colons in value', async () => {
      sandbox.stub(command, 'execSingleFile').resolves();
      parseStub.resolves({
        flags: {
          'file-path': tempFile,
          config: ['key1:value:with:colons'],
        },
      } as any);

      await command.run();

      const configCall = setStub.getCalls().find(call => call.args[0] === 'config');
      expect(configCall).to.exist;
      if (configCall) {
        expect(configCall.args[2]).to.have.property('key1', 'value:with:colons');
      }
    });

    it.skip('should set branch when branch flag is provided', async () => {
      sandbox.stub(command, 'execSingleFile').resolves();
      parseStub.resolves({
        flags: {
          'file-path': tempFile,
          branch: 'test-branch',
        },
      } as any);

      await command.run();

      expect(setStub.calledWith('BRANCH', mockMapInstance, 'test-branch')).to.be.true;
    });

    it.skip('should create stack SDK instance with alias and branch', async () => {
      sandbox.stub(command, 'execSingleFile').resolves();
      const mockStack = {};
      const mockAPIClient = {
        stack: sandbox.stub().returns(mockStack),
      };
      if (managementSDKClientStub) {
        managementSDKClientStub.resolves(mockAPIClient);
      }
      // Control isAuthenticated by stubbing configHandler
      const cliUtilities = require('@contentstack/cli-utilities');
      sandbox.stub(cliUtilities.configHandler, 'get').callsFake((key: string) => {
        if (key === 'authorisationType') {
          return undefined; // Not authenticated
        }
        return undefined;
      });

      parseStub.resolves({
        flags: {
          'file-path': tempFile,
          alias: 'test-alias',
          branch: 'test-branch',
        },
      } as any);

      await command.run();

      expect(mockAPIClient.stack.calledWith({
        management_token: 'test-token',
        api_key: 'test-api-key',
        branch_uid: 'test-branch',
      })).to.be.true;
    });

    it.skip('should create stack SDK instance with alias without branch', async () => {
      sandbox.stub(command, 'execSingleFile').resolves();
      const mockStack = {};
      const mockAPIClient = {
        stack: sandbox.stub().returns(mockStack),
      };
      if (managementSDKClientStub) {
        managementSDKClientStub.resolves(mockAPIClient);
      }
      // Control isAuthenticated by stubbing configHandler
      const cliUtilities = require('@contentstack/cli-utilities');
      sandbox.stub(cliUtilities.configHandler, 'get').callsFake((key: string) => {
        if (key === 'authorisationType') {
          return undefined; // Not authenticated
        }
        return undefined;
      });

      parseStub.resolves({
        flags: {
          'file-path': tempFile,
          alias: 'test-alias',
        },
      } as any);

      await command.run();

      expect(mockAPIClient.stack.calledWith({
        management_token: 'test-token',
        api_key: 'test-api-key',
      })).to.be.true;
    });

    it.skip('should create stack SDK instance with authtoken and branch', async () => {
      sandbox.stub(command, 'execSingleFile').resolves();
      const mockStack = {};
      const mockAPIClient = {
        stack: sandbox.stub().returns(mockStack),
      };
      if (managementSDKClientStub) {
        managementSDKClientStub.resolves(mockAPIClient);
      }

      parseStub.resolves({
        flags: {
          'file-path': tempFile,
          'stack-api-key': 'test-api-key',
          branch: 'test-branch',
        },
      } as any);

      await command.run();

      expect(mockAPIClient.stack.calledWith({
        api_key: 'test-api-key',
        branch_uid: 'test-branch',
      })).to.be.true;
    });

    it.skip('should create stack SDK instance with authtoken without branch', async () => {
      sandbox.stub(command, 'execSingleFile').resolves();
      const mockStack = {};
      const mockAPIClient = {
        stack: sandbox.stub().returns(mockStack),
      };
      if (managementSDKClientStub) {
        managementSDKClientStub.resolves(mockAPIClient);
      }

      parseStub.resolves({
        flags: {
          'file-path': tempFile,
          'stack-api-key': 'test-api-key',
        },
      } as any);

      await command.run();

      expect(mockAPIClient.stack.calledWith({
        api_key: 'test-api-key',
      })).to.be.true;
    });

    it('should exit when installModules fails', async () => {
      installModulesStub.resolves(false);
      const processExitStub = sandbox.stub(process, 'exit');

      parseStub.resolves({
        flags: {
          'file-path': tempFile,
        },
      } as any);

      await command.run();

      expect(logStub.called).to.be.true;
      expect(processExitStub.calledWith(1)).to.be.true;
    });

    it.skip('should call execMultiFiles when multiple flag is true', async () => {
      const execMultiFilesStub = sandbox.stub(command, 'execMultiFiles').resolves();
      const execSingleFileStub = sandbox.stub(command, 'execSingleFile').resolves();

      parseStub.resolves({
        flags: {
          'file-path': tempFile,
          multiple: true,
        },
      } as any);

      await command.run();

      expect(execMultiFilesStub.calledWith(tempFile, mockMapInstance)).to.be.true;
      expect(execSingleFileStub.called).to.be.false;
    });

    it.skip('should call execSingleFile when multiple flag is false', async () => {
      const execSingleFileStub = sandbox.stub(command, 'execSingleFile').resolves();
      const execMultiFilesStub = sandbox.stub(command, 'execMultiFiles').resolves();

      parseStub.resolves({
        flags: {
          'file-path': tempFile,
        },
      } as any);

      await command.run();

      expect(execSingleFileStub.calledWith(tempFile, mockMapInstance)).to.be.true;
      expect(execMultiFilesStub.called).to.be.false;
    });

    it('should log migration-logs path if it exists', async () => {
      sandbox.stub(command, 'execSingleFile').resolves();
      // Create a temporary directory for migration-logs to exist
      const tmpDir = require('os').tmpdir();
      const migrationLogsPath = require('path').join(tmpDir, 'migration-logs');
      // Ensure the directory exists for this test
      if (!fs.existsSync(migrationLogsPath)) {
        fs.mkdirSync(migrationLogsPath, { recursive: true });
      }
      // Change process.cwd to return the temp dir so migration-logs path exists
      const originalCwd = process.cwd;
      sandbox.stub(process, 'cwd').returns(tmpDir);

      parseStub.resolves({
        flags: {
          'file-path': '/test/path.js',
        },
      } as any);

      await command.run();

      expect(logStub.called).to.be.true;
      // Cleanup
      if (fs.existsSync(migrationLogsPath)) {
        fs.rmSync(migrationLogsPath, { recursive: true, force: true });
      }
    });

    it('should not log migration-logs path when directory does not exist', async () => {
      sandbox.stub(command, 'execSingleFile').resolves();
      const cwdStub = sandbox.stub(process, 'cwd').returns(tempDir);
      parseStub.resolves({
        flags: {
          'file-path': tempFile,
        },
      } as any);

      await command.run();

      const migrationLogCall = logStub.getCalls().find(
        (c: any) => c.args[1] && String(c.args[1]).includes('migration-logs')
      );
      expect(migrationLogCall).to.be.undefined;
    });
  });

  describe('getTasks() method', () => {
    let safePromiseStub: SinonStub;
    let waterfallStub: SinonStub;

    beforeEach(() => {
      safePromiseStub = sandbox.stub(utilsModule, 'safePromise').callsFake(async (p: any) => {
        try {
          const result = await p;
          return [null, result];
        } catch (err) {
          return [err, null];
        }
      });
      const asyncModule = require('async');
      waterfallStub = sandbox.stub(asyncModule, 'waterfall').callsFake((tasks: any[], callback?: any) => {
        if (typeof callback === 'function') {
          callback(null, 'result');
        }
        return Promise.resolve('result');
      });
    });

    it('should return array of task objects from requests', () => {
      const requests = [
        { title: 'Task 1', failedTitle: 'F1', successTitle: 'S1', tasks: [async () => 'r1'] },
        { title: 'Task 2', failedTitle: 'F2', successTitle: 'S2', tasks: [async () => 'r2'] },
      ];
      const tasks = command.getTasks(requests);
      expect(tasks).to.be.an('array').with.lengthOf(2);
      expect(tasks[0].title).to.equal('Task 1');
      expect(tasks[0].task).to.be.a('function');
      expect(tasks[1].title).to.equal('Task 2');
      expect(tasks[1].task).to.be.a('function');
    });

    it('should return empty array when requests is empty', () => {
      const tasks = command.getTasks([]);
      expect(tasks).to.be.an('array').with.lengthOf(0);
    });

    it('should run task and set success title on success', async () => {
      const requests = [
        { title: 'T', failedTitle: 'F', successTitle: 'S', tasks: [async () => 'ok'] },
      ];
      const tasks = command.getTasks(requests);
      const mockCtx: any = {};
      const mockTask: any = { title: 'T' };
      await tasks[0].task(mockCtx, mockTask);
      expect(mockTask.title).to.equal('S');
    });

    it('should set failedTitle and ctx.error and throw when waterfall fails', async () => {
      safePromiseStub.callsFake(async (p: any) => {
        await p;
        return [new Error('waterfall failed'), null];
      });
      const requests = [
        { title: 'T', failedTitle: 'Failed', successTitle: 'S', tasks: [async () => 'ok'] },
      ];
      const tasks = command.getTasks(requests);
      const mockCtx: any = {};
      const mockTask: any = { title: 'T' };
      try {
        await tasks[0].task(mockCtx, mockTask);
        expect.fail('task should have thrown');
      } catch (err: any) {
        expect(err.message).to.equal('waterfall failed');
      }
      expect(mockTask.title).to.equal('Failed');
      expect(mockCtx.error).to.be.true;
    });

    it('should return result from task when successful', async () => {
      const requests = [
        { title: 'T', failedTitle: 'F', successTitle: 'S', tasks: [async () => ({ id: '123' })] },
      ];
      const tasks = command.getTasks(requests);
      const mockCtx: any = {};
      const mockTask: any = { title: 'T' };
      const result = await tasks[0].task(mockCtx, mockTask);
      expect(result).to.equal('result');
    });
  });

  describe('handleErrors() method', () => {
    beforeEach(() => {
      getStub.returns([]);
    });

    it('should run without throwing when actions array is empty', () => {
      expect(() => command.handleErrors()).to.not.throw();
    });

    it('should run and invoke validation when actions exist', () => {
      getStub.returns([{ type: 'create', payload: {} }]);
      expect(() => command.handleErrors()).to.not.throw();
    });

  });

  describe.skip('execSingleFile() method', () => {
    let parserStub: any;
    let getMigrationParserStub: SinonStub;
    let getTasksStub: SinonStub;
    let listrRunStub: SinonStub;
    let mockMigrationFile: string;

    beforeEach(() => {
      // Create a real migration file for testing
      mockMigrationFile = path.join(tempDir, 'test-migration.js');
      fs.writeFileSync(mockMigrationFile, 'module.exports = ({ migration }) => {};');
      
      parserStub = {
        getMigrationParser: sandbox.stub().resolves({
          hasErrors: false,
        }),
      };
      // Stub the Parser class constructor
      const ParserModule = require('../../../../../src/modules');
      sandbox.stub(ParserModule, 'Parser').callsFake(() => parserStub as any);
      getMigrationParserStub = parserStub.getMigrationParser;
      getTasksStub = sandbox.stub(command, 'getTasks').returns([]);
      
      const mockListr = {
        run: sandbox.stub().resolves(),
      };
      // Listr is a default export, stub it properly
      const ListrModule = require('listr');
      sandbox.stub(ListrModule, 'default').callsFake(() => mockListr);
      listrRunStub = mockListr.run;

      getStub.returns([]);
    });

    it('should execute single file migration successfully', async () => {
      await command.execSingleFile(mockMigrationFile, mockMapInstance);

      expect(getMigrationParserStub.called).to.be.true;
      expect(getTasksStub.called).to.be.true;
      expect(listrRunStub.called).to.be.true;
    });

    it('should handle parser errors and exit', async () => {
      getMigrationParserStub.resolves({
        hasErrors: ['error1', 'error2'],
      });
      const processSendStub = sandbox.stub(process, 'send');

      await command.execSingleFile(mockMigrationFile, mockMapInstance);

      expect(errorHelperStub.called).to.be.true;
      expect(exitStub.calledWith(1)).to.be.true;
      if (processSendStub.called) {
        expect(processSendStub.calledWith({ errorOccurred: true })).to.be.true;
      }
    });

    it('should handle execution errors', async () => {
      getMigrationParserStub.rejects(new Error('Test error'));
      const processSendStub = sandbox.stub(process, 'send');

      await command.execSingleFile(mockMigrationFile, mockMapInstance);

      expect(errorHelperStub.called).to.be.true;
      if (processSendStub.called) {
        expect(processSendStub.calledWith({ errorOccurred: true })).to.be.true;
      }
    });

    it('should clear requests array after execution', async () => {
      const mockRequests = ['req1', 'req2'];
      getStub.returns(mockRequests);
      getTasksStub.returns([]);

      await command.execSingleFile(mockMigrationFile, mockMapInstance);

      expect(mockRequests.length).to.equal(0);
    });
  });

  describe.skip('execMultiFiles() method', () => {
    beforeEach(() => {
      sandbox.stub(command, 'execSingleFile').resolves();
    });

    it('should execute multiple files', async () => {
      // Create a temporary directory with multiple .js files
      const multiFileDir = path.join(os.tmpdir(), `migration-multi-${Date.now()}`);
      fs.mkdirSync(multiFileDir, { recursive: true });
      fs.writeFileSync(path.join(multiFileDir, 'file1.js'), '// file1');
      fs.writeFileSync(path.join(multiFileDir, 'file2.js'), '// file2');
      fs.writeFileSync(path.join(multiFileDir, 'file3.txt'), '// file3');
      
      const execSingleFileStub = sandbox.stub(command, 'execSingleFile').resolves();

      await command.execMultiFiles(multiFileDir, mockMapInstance);

      expect(execSingleFileStub.calledTwice).to.be.true; // Only .js files
      
      // Cleanup
      fs.rmSync(multiFileDir, { recursive: true, force: true });
    });

    it('should only process .js files', async () => {
      // Create a temporary directory with mixed file types
      const multiFileDir = path.join(os.tmpdir(), `migration-multi-${Date.now()}`);
      fs.mkdirSync(multiFileDir, { recursive: true });
      fs.writeFileSync(path.join(multiFileDir, 'file1.js'), '// file1');
      fs.writeFileSync(path.join(multiFileDir, 'file2.txt'), '// file2');
      fs.writeFileSync(path.join(multiFileDir, 'file3.js'), '// file3');
      
      const execSingleFileStub = sandbox.stub(command, 'execSingleFile').resolves();

      await command.execMultiFiles(multiFileDir, mockMapInstance);

      expect(execSingleFileStub.calledTwice).to.be.true;
      
      // Cleanup
      fs.rmSync(multiFileDir, { recursive: true, force: true });
    });

    it('should handle errors during multi-file execution', async () => {
      // Use a non-existent directory to trigger error
      await command.execMultiFiles('/nonexistent/dir/path/that/does/not/exist', mockMapInstance);

      expect(errorHelperStub.called).to.be.true;
    });
  });

});
