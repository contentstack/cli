import { expect } from 'chai';
import * as sinon from 'sinon';
import * as path from 'path';
import { cliux, configHandler } from '@contentstack/cli-utilities';

import LogSetCommand from '../../../src/commands/config/set/log';
import LogGetCommand from '../../../src/commands/config/get/log';
import { LOG_CONFIG_DEFAULTS } from '../../../src/utils/log-config-defaults';

describe('Log Commands', () => {
  describe('Log Set Command', () => {
    let successMessage: string[] = [];
    let errorMessage: any;

    beforeEach(() => {
      successMessage = [];
      errorMessage = null;

      sinon.stub(cliux, 'success').callsFake((msg: string) => successMessage.push(msg));
      sinon.stub(cliux, 'print').callsFake((msg: string) => successMessage.push(msg)); // Add this to capture print messages
      sinon.stub(cliux, 'error').callsFake((_, err) => {
        errorMessage = err;
      });
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should set log level and path from flags with absolute path resolution and file-to-directory conversion', async () => {
      const cmd = new LogSetCommand([], {} as any);
      const relativePath = './logs/app.log';
      const expectedAbsolutePath = path.resolve(process.cwd(), './logs'); // Directory, not file
      
      sinon.stub(cmd as any, 'parse').resolves({
        flags: {
          level: 'debug',
          path: relativePath,
          'show-console-logs': false,
        },
      });

      sinon.stub(configHandler, 'get').returns({});
      const setStub = sinon.stub(configHandler, 'set');

      await cmd.run();

      expect(
        setStub.calledWith('log', {
          level: 'debug',
          path: './logs/app.log',
          showConsoleLogs: false,
        }),
      ).to.be.true;

      expect(successMessage[0]).to.include('CLI_CONFIG_LOG_LEVEL_SET');
      expect(successMessage[1]).to.include('CLI_CONFIG_LOG_PATH_SET');
      expect(successMessage[2]).to.include('CLI_CONFIG_LOG_CONSOLE_SET');
    });

    it('should call set even when no flags are provided', async () => {
      const cmd = new LogSetCommand([], {} as any);
      sinon.stub(cmd as any, 'parse').resolves({
        flags: {},
      });

      sinon.stub(configHandler, 'get').returns({ level: 'warn', path: './existing.log' });
      const setStub = sinon.stub(configHandler, 'set');

      await cmd.run();

      // Should call set even when no flags are provided
      expect(setStub.called).to.be.true;
      expect(setStub.calledWith('log', { level: 'warn', path: './existing.log' })).to.be.true;

      // Should not display any success messages when no flags are provided
      expect(successMessage.length).to.equal(0);
    });

    it('should call set even when no flags are provided and no existing config', async () => {
      const cmd = new LogSetCommand([], {} as any);
      sinon.stub(cmd as any, 'parse').resolves({
        flags: {},
      });

      sinon.stub(configHandler, 'get').returns({});
      const setStub = sinon.stub(configHandler, 'set');

      await cmd.run();

      expect(
        setStub.calledWith('log', {
          level: 'info',
          path: './custom/logs/app.log',
          showConsoleLogs: false,
        }),
      ).to.be.true;

      // Should not display any success messages when no flags are provided
      expect(successMessage.length).to.equal(0);
    });

    it('should preserve existing config values when only setting level', async () => {
      const cmd = new LogSetCommand([], {} as any);
      const existingPath = './existing/logs/app.log';
      
      sinon.stub(cmd as any, 'parse').resolves({
        flags: {
          level: 'warn',
        },
      });

      sinon.stub(configHandler, 'get').returns({ 
        path: existingPath,
        'show-console-logs': true 
      });
      const setStub = sinon.stub(configHandler, 'set');

      await cmd.run();

      expect(
        setStub.calledWith('log', {
          level: 'warn',
          path: './existing/logs/app.log',
          showConsoleLogs: false,
        }),
      ).to.be.true;

      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_LEVEL_SET'))).to.be.true;
      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_PATH_SET'))).to.be.false;
      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_CONSOLE_SET'))).to.be.false;
    });

    it('should preserve existing config values when only setting path', async () => {
      const cmd = new LogSetCommand([], {} as any);
      const newPath = './new/logs/app.log';
      const expectedAbsolutePath = path.resolve(process.cwd(), './new/logs');
      
      sinon.stub(cmd as any, 'parse').resolves({
        flags: {
          path: newPath,
        },
      });

      sinon.stub(configHandler, 'get').returns({ 
        level: 'error',
        'show-console-logs': false 
      });
      const setStub = sinon.stub(configHandler, 'set');

      await cmd.run();

      expect(
        setStub.calledWith('log', {
          level: 'error',
          path: './new/logs/app.log',
          showConsoleLogs: false,
        }),
      ).to.be.true;

      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_LEVEL_SET'))).to.be.false;
      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_PATH_SET'))).to.be.true;
      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_CONSOLE_SET'))).to.be.false;
    });

    it('should set show-console-logs flag only when explicitly provided', async () => {
      const cmd = new LogSetCommand([], {} as any);
      sinon.stub(cmd as any, 'parse').resolves({
        flags: { 'show-console-logs': true },
      });

      sinon.stub(configHandler, 'get').returns({ level: 'debug', path: './existing.log' });
      const setStub = sinon.stub(configHandler, 'set');

      await cmd.run();

      expect(
        setStub.calledWith('log', {
          level: 'info',
          path: './logs/app.log',
          showConsoleLogs: true,
        }),
      ).to.be.true;

      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_LEVEL_SET'))).to.be.false;
      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_PATH_SET'))).to.be.false;
      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_CONSOLE_SET'))).to.be.true;
    });

    it('should set show-console-logs flag to false (--no-show-console-logs)', async () => {
      const cmd = new LogSetCommand([], {} as any);
      sinon.stub(cmd as any, 'parse').resolves({
        flags: { 'show-console-logs': false },
      });

      sinon.stub(configHandler, 'get').returns({ level: 'info' });
      const setStub = sinon.stub(configHandler, 'set');

      await cmd.run();

      expect(
        setStub.calledWith('log', {
          level: 'info',
          path: './logs/app.log',
          showConsoleLogs: false,
        }),
      ).to.be.true;

      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_LEVEL_SET'))).to.be.false;
      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_PATH_SET'))).to.be.false;
      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_CONSOLE_SET'))).to.be.true;
    });

    it('should set all flags together (level, path, show-console-logs) with absolute path', async () => {
      const cmd = new LogSetCommand([], {} as any);
      const relativePath = './logs/warnings.log';
      const expectedAbsolutePath = path.resolve(process.cwd(), './logs'); 
      
      sinon.stub(cmd as any, 'parse').resolves({
        flags: {
          level: 'warn',
          path: relativePath,
          'show-console-logs': true,
        },
      });

      sinon.stub(configHandler, 'get').returns({});
      const setStub = sinon.stub(configHandler, 'set');

      await cmd.run();

      expect(
        setStub.calledWith('log', {
          level: 'warn',
          path: './logs/warnings.log',
          showConsoleLogs: true,
        }),
      ).to.be.true;

      expect(successMessage).to.have.length(3);
      expect(successMessage.some((msg) => msg.includes('CLI_CONFIG_LOG_LEVEL_SET'))).to.be.true;
      expect(successMessage.some((msg) => msg.includes('CLI_CONFIG_LOG_PATH_SET'))).to.be.true;
      expect(successMessage.some((msg) => msg.includes('CLI_CONFIG_LOG_CONSOLE_SET'))).to.be.true;
    });

    it('should handle absolute paths correctly', async () => {
      const cmd = new LogSetCommand([], {} as any);
      const absolutePath = '/tmp/cli.log';
      const expectedDirectoryPath = '/tmp'; 
      
      sinon.stub(cmd as any, 'parse').resolves({
        flags: {
          path: absolutePath,
          'show-console-logs': false,
        },
      });

      sinon.stub(configHandler, 'get').returns({});
      const setStub = sinon.stub(configHandler, 'set');

      await cmd.run();

      expect(
        setStub.calledWith('log', {
          level: 'info',
          path: './logs/app.log',
          showConsoleLogs: false,
        }),
      ).to.be.true;
    });

    it('should handle errors gracefully', async () => {
      const cmd = new LogSetCommand([], {} as any);
      const testError = new Error('Test error');

      sinon.stub(cmd as any, 'parse').throws(testError);

      await cmd.run();

      expect(errorMessage).to.equal(testError);
    });
  });

  describe('Log Get Command', () => {
    let tableMessage: any[] = [];
    let errorMessage: any;

    beforeEach(() => {
      tableMessage = [];
      errorMessage = null;

      sinon.stub(cliux, 'table').callsFake((headers: any, data: any) => {
        tableMessage.push({ headers, data });
      });
      sinon.stub(cliux, 'error').callsFake((_, err) => {
        errorMessage = err;
      });
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should display log level and path when both are configured with absolute path', async () => {
      const cmd = new LogGetCommand([], {} as any);
      const relativePath = './logs/app.log';
      const expectedAbsolutePath = path.resolve(process.cwd(), relativePath);
      
      sinon.stub(configHandler, 'get').returns({ level: 'debug', path: relativePath });

      await cmd.run();

      expect(tableMessage).to.have.length(1);
      expect(tableMessage[0].headers).to.deep.equal([{ value: 'Log Level' }, { value: 'Log Path' }, { value: 'Show Console Logs' }]);
      expect(tableMessage[0].data).to.deep.equal([
        {
          'Log Level': 'debug',
          'Log Path': './logs/app.log',
          'Show Console Logs': 'Not set',
        },
      ]);
    });

    it('should display configured level with default path', async () => {
      const cmd = new LogGetCommand([], {} as any);
      sinon.stub(configHandler, 'get').returns({ level: 'info' });

      await cmd.run();

      expect(tableMessage).to.have.length(1);
      expect(tableMessage[0].headers).to.deep.equal([{ value: 'Log Level' }, { value: 'Log Path' }, { value: 'Show Console Logs' }]);
      expect(tableMessage[0].data).to.deep.equal([
        {
          'Log Level': 'info',
          'Log Path': 'Not set',
          'Show Console Logs': 'Not set',
        },
      ]);
    });

    it('should display configured path with default level', async () => {
      const cmd = new LogGetCommand([], {} as any);
      const customPath = './custom/logs/app.log';
      const expectedAbsolutePath = path.resolve(process.cwd(), customPath);
      
      sinon.stub(configHandler, 'get').returns({ path: customPath });

      await cmd.run();

      expect(tableMessage).to.have.length(1);
      expect(tableMessage[0].headers).to.deep.equal([{ value: 'Log Level' }, { value: 'Log Path' }, { value: 'Show Console Logs' }]);
      expect(tableMessage[0].data).to.deep.equal([
        {
          'Log Level': 'Not set',
          'Log Path': './custom/logs/app.log',
          'Show Console Logs': 'Not set',
        },
      ]);
    });

    it('should display all defaults when no config is found', async () => {
      const cmd = new LogGetCommand([], {} as any);
      sinon.stub(configHandler, 'get').returns({});

      await cmd.run();

      expect(tableMessage).to.have.length(1);
      expect(tableMessage[0].data).to.deep.equal([
        {
          'Setting': 'Log Level',
          'Value': LOG_CONFIG_DEFAULTS.LEVEL
        },
        {
          'Setting': 'Log Path',
          'Value': LOG_CONFIG_DEFAULTS.PATH
        },
        {
          'Setting': 'Show Console Logs',
          'Value': 'false'
        },
      ]);
    });

    it('should display configured console logs setting', async () => {
      const cmd = new LogGetCommand([], {} as any);
      sinon.stub(configHandler, 'get').returns({ 
        level: 'debug', 
        path: '/tmp/cli.log',
        'show-console-logs': true 
      });

      await cmd.run();

      expect(tableMessage).to.have.length(1);
      expect(tableMessage[0].data).to.deep.equal([
        {
          'Setting': 'Log Level',
          'Value': 'debug'
        },
        {
          'Setting': 'Log Path',
          'Value': '/tmp/cli.log' 
        },
        {
          'Setting': 'Show Console Logs',
          'Value': 'true'
        },
      ]);
    });

    it('should handle errors gracefully', async () => {
      const cmd = new LogGetCommand([], {} as any);
      const testError = new Error('Test error');
      sinon.stub(configHandler, 'get').throws(testError);

      await cmd.run();

      expect(errorMessage).to.equal(testError);
    });
  });

  describe('Log Set Command - New Functionality', () => {
    let successMessage: string[] = [];
    let errorMessage: any;

    beforeEach(() => {
      successMessage = [];
      errorMessage = null;

      sinon.stub(cliux, 'success').callsFake((msg: string) => successMessage.push(msg));
      sinon.stub(cliux, 'print').callsFake((msg: string) => successMessage.push(msg));
      sinon.stub(cliux, 'error').callsFake((_, err) => {
        errorMessage = err;
      });
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should use existing config values when available and no flags provided', async () => {
      const cmd = new LogSetCommand([], {} as any);
      const existingPath = '/existing/path/cli.log';
      
      sinon.stub(cmd as any, 'parse').resolves({
        flags: { 'show-console-logs': false },
      });

      sinon.stub(configHandler, 'get').returns({ 
        level: 'warn', 
        path: existingPath 
      });
      const setStub = sinon.stub(configHandler, 'set');

      await cmd.run();

      expect(
        setStub.calledWith('log', {
          level: 'warn', 
          path: existingPath, 
          'show-console-logs': false,
        }),
      ).to.be.true;
    });

    it('should mix existing config with new flag values', async () => {
      const cmd = new LogSetCommand([], {} as any);
      const newPath = './new-logs/cli.log';
      const expectedAbsolutePath = path.resolve(process.cwd(), './new-logs'); 
      
      sinon.stub(cmd as any, 'parse').resolves({
        flags: { 
          path: newPath,
          'show-console-logs': true 
        },
      });

      sinon.stub(configHandler, 'get').returns({ 
        level: 'error' 
      });
      const setStub = sinon.stub(configHandler, 'set');

      await cmd.run();

      expect(
        setStub.calledWith('log', {
          level: 'error', 
          path: expectedAbsolutePath, 
          'show-console-logs': true, 
        }),
      ).to.be.true;
    });

    it('should handle Windows-style paths correctly with file-to-directory conversion', async () => {
      const cmd = new LogSetCommand([], {} as any);
      const windowsPath = 'C:\\logs\\cli.log';
      const resolvedPath = path.resolve(process.cwd(), windowsPath);
      const expectedPath = path.dirname(resolvedPath); 
      
      sinon.stub(cmd as any, 'parse').resolves({
        flags: { 
          path: windowsPath,
          'show-console-logs': false 
        },
      });

      sinon.stub(configHandler, 'get').returns({ level: 'debug' });
      const setStub = sinon.stub(configHandler, 'set');

      await cmd.run();

      expect(
        setStub.calledWith('log', {
          level: 'debug', 
          path: expectedPath, 
          'show-console-logs': false,
        }),
      ).to.be.true;
      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_LEVEL_SET'))).to.be.false;
      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_PATH_SET'))).to.be.true;
      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_CONSOLE_SET'))).to.be.true;
    });

    it('should override existing values when flags are provided with file-to-directory conversion', async () => {
      const cmd = new LogSetCommand([], {} as any);
      const newPath = './override/logs/cli.log';
      const expectedAbsolutePath = path.resolve(process.cwd(), './override/logs'); // Directory, not file
      
      sinon.stub(cmd as any, 'parse').resolves({
        flags: { 
          level: 'error',
          path: newPath,
          'show-console-logs': true
        },
      });

      sinon.stub(configHandler, 'get').returns({ 
        level: 'debug', 
        path: './old/path.log',
        'show-console-logs': false
      });
      const setStub = sinon.stub(configHandler, 'set');

      await cmd.run();

      expect(
        setStub.calledWith('log', {
          level: 'error', 
          path: expectedAbsolutePath,
          'show-console-logs': true,  
        }),
      ).to.be.true;

      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_LEVEL_SET'))).to.be.true;
      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_PATH_SET'))).to.be.true;
      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_CONSOLE_SET'))).to.be.true;
    });

    it('should convert file paths to directory paths automatically', async () => {
      const cmd = new LogSetCommand([], {} as any);
      const filePath = './custom/logs/debug.log';
      const expectedDirectoryPath = path.resolve(process.cwd(), './custom/logs');
      
      sinon.stub(cmd as any, 'parse').resolves({
        flags: { 
          path: filePath
        },
      });

      sinon.stub(configHandler, 'get').returns({});
      const setStub = sinon.stub(configHandler, 'set');

      await cmd.run();

      expect(
        setStub.calledWith('log', {
          path: expectedDirectoryPath,
        }),
      ).to.be.true;

      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_PATH_SET'))).to.be.true;
    });

    it('should keep directory paths unchanged', async () => {
      const cmd = new LogSetCommand([], {} as any);
      const directoryPath = './custom/logs';
      const expectedDirectoryPath = path.resolve(process.cwd(), directoryPath);
      
      sinon.stub(cmd as any, 'parse').resolves({
        flags: { 
          path: directoryPath
        },
      });

      sinon.stub(configHandler, 'get').returns({});
      const setStub = sinon.stub(configHandler, 'set');

      await cmd.run();

      expect(
        setStub.calledWith('log', {
          path: expectedDirectoryPath, 
        }),
      ).to.be.true;

      // Should show success message for path only
      expect(successMessage.some(msg => msg.includes('CLI_CONFIG_LOG_PATH_SET'))).to.be.true;
    });
  });
});
