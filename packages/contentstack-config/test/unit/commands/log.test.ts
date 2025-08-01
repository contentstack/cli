import { expect } from 'chai';
import * as sinon from 'sinon';
import { cliux, configHandler, messageHandler } from '@contentstack/cli-utilities';

import { interactive } from '../../../src/utils';
import LogSetCommand from '../../../src/commands/config/set/log';
import LogGetCommand from '../../../src/commands/config/get/log';

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

    it('should set log level and path from flags', async () => {
      const cmd = new LogSetCommand([], {} as any);
      sinon.stub(cmd as any, 'parse').resolves({
        flags: {
          level: 'debug',
          path: './logs/app.log',
          'show-console-logs': false, // Include default value
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

    it('should prompt for log level and path when flags are not provided', async () => {
      const cmd = new LogSetCommand([], {} as any);
      sinon.stub(cmd as any, 'parse').resolves({
        flags: {
          'show-console-logs': false, // Include default value
        },
      });

      sinon.stub(interactive, 'askLogLevel').resolves('info');
      sinon.stub(interactive, 'askLogPath').resolves('./custom/logs/app.log');

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

      expect(successMessage[0]).to.include('CLI_CONFIG_LOG_LEVEL_SET');
      expect(successMessage[1]).to.include('CLI_CONFIG_LOG_PATH_SET');
      expect(successMessage[2]).to.include('CLI_CONFIG_LOG_CONSOLE_SET');
    });

    it('should preserve existing config values when only setting level', async () => {
      const cmd = new LogSetCommand([], {} as any);
      sinon.stub(cmd as any, 'parse').resolves({
        flags: {
          level: 'warn',
          'show-console-logs': false, // Include default value
        },
      });

      sinon.stub(interactive, 'askLogPath').resolves('./existing/logs/app.log');

      sinon.stub(configHandler, 'get').returns({ path: './existing/logs/app.log' });
      const setStub = sinon.stub(configHandler, 'set');

      await cmd.run();

      expect(
        setStub.calledWith('log', {
          level: 'warn',
          path: './existing/logs/app.log',
          showConsoleLogs: false,
        }),
      ).to.be.true;

      expect(successMessage[0]).to.include('CLI_CONFIG_LOG_LEVEL_SET');
      expect(successMessage[1]).to.include('CLI_CONFIG_LOG_PATH_SET');
      expect(successMessage[2]).to.include('CLI_CONFIG_LOG_CONSOLE_SET');
    });

    it('should preserve existing config values when only setting path', async () => {
      const cmd = new LogSetCommand([], {} as any);
      sinon.stub(cmd as any, 'parse').resolves({
        flags: {
          path: './new/logs/app.log',
          'show-console-logs': false, // Include default value
        },
      });

      sinon.stub(interactive, 'askLogLevel').resolves('error');

      sinon.stub(configHandler, 'get').returns({ level: 'error' });
      const setStub = sinon.stub(configHandler, 'set');

      await cmd.run();

      expect(
        setStub.calledWith('log', {
          level: 'error',
          path: './new/logs/app.log',
          showConsoleLogs: false,
        }),
      ).to.be.true;

      expect(successMessage[0]).to.include('CLI_CONFIG_LOG_LEVEL_SET');
      expect(successMessage[1]).to.include('CLI_CONFIG_LOG_PATH_SET');
      expect(successMessage[2]).to.include('CLI_CONFIG_LOG_CONSOLE_SET');
    });

    it('should set show-console-logs flag to true', async () => {
      const cmd = new LogSetCommand([], {} as any);
      sinon.stub(cmd as any, 'parse').resolves({
        flags: { 'show-console-logs': true },
      });

      sinon.stub(interactive, 'askLogLevel').resolves('info');
      sinon.stub(interactive, 'askLogPath').resolves('./logs/app.log');

      sinon.stub(configHandler, 'get').returns({});
      const setStub = sinon.stub(configHandler, 'set');

      await cmd.run();

      expect(
        setStub.calledWith('log', {
          level: 'info',
          path: './logs/app.log',
          showConsoleLogs: true,
        }),
      ).to.be.true;

      expect(successMessage.some((msg) => msg.includes('CLI_CONFIG_LOG_CONSOLE_SET'))).to.be.true;
    });

    it('should set show-console-logs flag to false (--no-show-console-logs)', async () => {
      const cmd = new LogSetCommand([], {} as any);
      sinon.stub(cmd as any, 'parse').resolves({
        flags: { 'show-console-logs': false },
      });

      sinon.stub(interactive, 'askLogLevel').resolves('info');
      sinon.stub(interactive, 'askLogPath').resolves('./logs/app.log');

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

      expect(successMessage.some((msg) => msg.includes('CLI_CONFIG_LOG_CONSOLE_SET'))).to.be.true;
    });

    it('should set all flags together (level, path, show-console-logs)', async () => {
      const cmd = new LogSetCommand([], {} as any);
      sinon.stub(cmd as any, 'parse').resolves({
        flags: {
          level: 'warn',
          path: './logs/warnings.log',
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

      expect(successMessage).to.have.length(4); // 3 individual + 1 overall success
      expect(successMessage.some((msg) => msg.includes('CLI_CONFIG_LOG_LEVEL_SET'))).to.be.true;
      expect(successMessage.some((msg) => msg.includes('CLI_CONFIG_LOG_PATH_SET'))).to.be.true;
      expect(successMessage.some((msg) => msg.includes('CLI_CONFIG_LOG_CONSOLE_SET'))).to.be.true;
      expect(successMessage.some((msg) => msg.includes('CLI_CONFIG_LOG_SET_SUCCESS'))).to.be.true;
    });

    it('should use default values when no flags provided', async () => {
      const cmd = new LogSetCommand([], {} as any);
      sinon.stub(cmd as any, 'parse').resolves({
        flags: {
          'show-console-logs': false, // Include default value
        },
      });

      sinon.stub(interactive, 'askLogLevel').resolves('info');
      sinon.stub(interactive, 'askLogPath').resolves('./logs/app.log');

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

      expect(successMessage.some((msg) => msg.includes('CLI_CONFIG_LOG_CONSOLE_SET'))).to.be.true;
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
    let printMessage: string[] = [];
    let tableMessage: any[] = [];
    let errorMessage: any;

    beforeEach(() => {
      printMessage = [];
      tableMessage = [];
      errorMessage = null;

      sinon.stub(cliux, 'print').callsFake((msg: string) => printMessage.push(msg));
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

    it('should display log level and path when both are configured', async () => {
      const cmd = new LogGetCommand([], {} as any);
      sinon.stub(configHandler, 'get').returns({ level: 'debug', path: './logs/app.log' });

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

    it('should display only log level when path is not configured', async () => {
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

    it('should display only log path when level is not configured', async () => {
      const cmd = new LogGetCommand([], {} as any);
      sinon.stub(configHandler, 'get').returns({ path: './custom/logs/app.log' });

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

    it('should display error message when no config is found', async () => {
      const cmd = new LogGetCommand([], {} as any);
      sinon.stub(configHandler, 'get').returns({});
      sinon.stub(messageHandler, 'parse').returns('No logging configuration found');

      await cmd.run();

      expect(printMessage[0]).to.include('error: No logging configuration found');
    });

    it('should handle errors gracefully', async () => {
      const cmd = new LogGetCommand([], {} as any);
      const testError = new Error('Test error');
      sinon.stub(configHandler, 'get').throws(testError);

      await cmd.run();

      expect(errorMessage).to.equal(testError);
    });
  });
});
