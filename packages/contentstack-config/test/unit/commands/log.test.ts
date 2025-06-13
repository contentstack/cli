import { expect } from 'chai';
import * as sinon from 'sinon';
import { cliux, configHandler, messageHandler } from '@contentstack/cli-utilities';

import { interactive } from '../../../src/utils';
import LogSetCommand from '../../../src/commands/config/set/log';
import LogGetCommand from '../../../src/commands/config/get/log';

describe('Log Set Command', () => {
  let successMessage: string[] = [];
  let errorMessage: any;

  beforeEach(() => {
    successMessage = [];
    errorMessage = null;

    sinon.stub(cliux, 'success').callsFake((msg: string) => successMessage.push(msg));
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
      flags: { 'level': 'debug', 'path': './logs/app.log' },
    });

    sinon.stub(configHandler, 'get').returns({});
    const setStub = sinon.stub(configHandler, 'set');

    await cmd.run();

    expect(
      setStub.calledWith('log', {
        level: 'debug',
        path: './logs/app.log',
      }),
    ).to.be.true;

    expect(successMessage[0]).to.include('CLI_CONFIG_LOG_LEVEL_SET');
    expect(successMessage[1]).to.include('CLI_CONFIG_LOG_PATH_SET');
  });

  it('should prompt for log level and path when flags are not provided', async () => {
    const cmd = new LogSetCommand([], {} as any);
    sinon.stub(cmd as any, 'parse').resolves({ flags: {} });

    sinon.stub(interactive, 'askLogLevel').resolves('info');
    sinon.stub(interactive, 'askLogPath').resolves('./custom/logs/app.log');

    sinon.stub(configHandler, 'get').returns({});
    const setStub = sinon.stub(configHandler, 'set');

    await cmd.run();

    expect(
      setStub.calledWith('log', {
        level: 'info',
        path: './custom/logs/app.log',
      }),
    ).to.be.true;
;
    expect(successMessage[0]).to.include('CLI_CONFIG_LOG_LEVEL_SET');
    expect(successMessage[1]).to.include('CLI_CONFIG_LOG_PATH_SET');
  });

  it('should preserve existing config values when only setting level', async () => {
    const cmd = new LogSetCommand([], {} as any);
    sinon.stub(cmd as any, 'parse').resolves({ flags: { 'level': 'warn' } });

    sinon.stub(interactive, 'askLogPath').resolves('./existing/logs/app.log'); // ✅ Prevent hanging

    sinon.stub(configHandler, 'get').returns({ path: './existing/logs/app.log' });
    const setStub = sinon.stub(configHandler, 'set');

    await cmd.run();

    expect(
      setStub.calledWith('log', {
        level: 'warn',
        path: './existing/logs/app.log',
      }),
    ).to.be.true;

    expect(successMessage[0]).to.include('CLI_CONFIG_LOG_LEVEL_SET');
    expect(successMessage[1]).to.include('CLI_CONFIG_LOG_PATH_SET');
  });

  it('should preserve existing config values when only setting path', async () => {
    const cmd = new LogSetCommand([], {} as any);
    sinon.stub(cmd as any, 'parse').resolves({ flags: { 'path': './new/logs/app.log' } });

    sinon.stub(interactive, 'askLogLevel').resolves('error'); // ✅ Prevent hanging

    sinon.stub(configHandler, 'get').returns({ level: 'error' });
    const setStub = sinon.stub(configHandler, 'set');

    await cmd.run();

    expect(
      setStub.calledWith('log', {
        level: 'error',
        path: './new/logs/app.log',
      }),
    ).to.be.true;

    const successMessages = successMessage.join('\n');
    expect(successMessages).to.include('CLI_CONFIG_LOG_LEVEL_SET');
    expect(successMessages).to.include('CLI_CONFIG_LOG_PATH_SET');
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
  let errorMessage: any;

  beforeEach(() => {
    printMessage = [];
    errorMessage = null;

    sinon.stub(cliux, 'print').callsFake((msg: string) => printMessage.push(msg));
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

    expect(printMessage.join('\n')).to.include('Logging Configuration:');
    expect(printMessage.join('\n')).to.include('Log Level: debug');
    expect(printMessage.join('\n')).to.include('Log Path  : ./logs/app.log');
  });

  it('should display only log level when path is not configured', async () => {
    const cmd = new LogGetCommand([], {} as any);
    sinon.stub(configHandler, 'get').returns({ level: 'info' });

    await cmd.run();

    expect(printMessage.join('\n')).to.include('Log Level: info');
    expect(printMessage.join('\n')).to.not.include('Log Path');
  });

  it('should display only log path when level is not configured', async () => {
    const cmd = new LogGetCommand([], {} as any);
    sinon.stub(configHandler, 'get').returns({ path: './custom/logs/app.log' });

    await cmd.run();

    expect(printMessage.join('\n')).to.include('Log Path  : ./custom/logs/app.log');
    expect(printMessage.join('\n')).to.not.include('Log Level');
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
