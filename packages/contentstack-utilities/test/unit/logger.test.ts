import { expect } from 'chai';
import { fancy } from 'fancy-test';
import sinon from 'sinon';
import Logger from '../../src/logger/logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger({
      basePath: './logs',
      consoleLogLevel: 'info',
      logLevel: 'info',
    });
  });

  fancy.it('should create logger instance with correct level', () => {
    const winLogger = logger.getLoggerInstance('error');
    expect(winLogger.level).to.equal('error');
  });

  fancy.it('should create hidden logger as error level', () => {
    const hiddenLogger = logger.getLoggerInstance('hidden');
    expect(hiddenLogger.level).to.equal('error');
  });

  fancy.it('should redact sensitive keys', () => {
    const testMeta = {
      password: 'secret123',
      token: 'tokenvalue',
      email: 'user@example.com',
      other: 'safe',
    };

    const redacted = logger['redact'](testMeta);
    expect(redacted.password).to.equal('[REDACTED]');
    expect(redacted.token).to.equal('[REDACTED]');
    expect(redacted.email).to.equal('[REDACTED]');
    expect(redacted.other).to.equal('safe');
  });

  fancy.it('should detect valid LogEntry object', () => {
    const validEntry = { level: 'info', message: 'Test message' };
    expect(logger['isLogEntry'](validEntry)).to.equal(true);

    const invalidEntry = { msg: 'nope' };
    expect(logger['isLogEntry'](invalidEntry)).to.equal(false);
  });

  fancy.it('should log error messages using error method', () => {
    const errorLogger = logger['loggers'].error;
    const spy = sinon.spy();
    errorLogger.error = spy;

    logger.error('error message', { some: 'meta' });
    expect(spy.calledOnce).to.be.true;
    expect(spy.calledWith('error message', { some: 'meta' })).to.be.true;
  });

  fancy.it('should return correct result from shouldLog()', () => {
    const shouldLogInfoConsole = logger['shouldLog']('info', 'console');
    const shouldLogDebugConsole = logger['shouldLog']('debug', 'console');

    expect(shouldLogInfoConsole).to.equal(true);
    expect(shouldLogDebugConsole).to.equal(false);
  });

  fancy.it('logSuccess should call success info logger', () => {
    const successLogger = logger['loggers'].success;
    const spy = sinon.spy();
    successLogger.info = spy;

    logger.logSuccess({ type: 'test', message: 'Success message' });
    expect(spy.calledOnce).to.be.true;
    expect(spy.args[0][0].message).to.equal('Success message');
  });

  fancy.it('shouldLog should handle file target level filtering', () => {
    const result = logger['shouldLog']('debug', 'file'); // logLevel = info
    expect(result).to.equal(false);
  });

  fancy.it('success logger should include success type in meta', () => {
    const spy = sinon.spy();
    logger['loggers'].success.info = spy;

    logger.success('It worked!', { extra: 'meta' });
    expect(spy.calledOnce).to.be.true;
    expect(spy.args[0][1].type).to.equal('success');
  });

  fancy.it('logError with hidden true logs to debug logger', () => {
    const debugLogger = new Logger({
      basePath: './logs',
      consoleLogLevel: 'debug',
      logLevel: 'debug',
    });

    const spy = sinon.spy();
    debugLogger['loggers'].debug.error = spy;

    debugLogger.logError({
      type: 'hiddenType',
      message: 'Something secret',
      error: new Error('oops'),
      hidden: true,
    });

    expect(spy.calledOnce).to.be.true;
    const [logPayload] = spy.args[0];
    expect(logPayload.meta.type).to.equal('hiddenType');
  });

  fancy.it('redact handles splat symbol', () => {
    const obj = {
      token: 'abc',
      [Symbol.for('splat')]: [{ password: '1234' }],
    };
    const result = logger['redact'](obj);
    expect(result.token).to.equal('[REDACTED]');
    expect(result[Symbol.for('splat')][0].password).to.equal('[REDACTED]');
  });

  fancy.it('redact should return original if klona fails', () => {
    const faultyLogger = new Logger({
      basePath: './logs',
      consoleLogLevel: 'info',
      logLevel: 'info',
    });

    const obj = {
      toJSON: () => {
        throw new Error('klona fails');
      }
    };

    const result = faultyLogger['redact'](obj);
    expect(result).to.deep.equal(obj);
  });

  fancy.it('should call logWarn with correct meta', () => {
    const warnSpy = sinon.spy();
    logger['loggers'].warn.warn = warnSpy;

    logger.logWarn({
      type: 'testType',
      message: 'Warn occurred',
      context: 'warnContext',
      meta: { custom: 'value' }
    });

    expect(warnSpy.calledOnce).to.be.true;
    expect(warnSpy.args[0][0].meta.type).to.equal('testType');
    expect(warnSpy.args[0][0].meta.custom).to.equal('value');
  });

  fancy.it('should call logInfo with correct meta', () => {
    const infoSpy = sinon.spy();
    logger['loggers'].info.info = infoSpy;

    logger.logInfo({
      type: 'infoType',
      message: 'This is info',
      meta: { foo: 'bar' },
    });

    expect(infoSpy.calledOnce).to.be.true;
    expect(infoSpy.args[0][0].meta.foo).to.equal('bar');
  });

  fancy.it('should call logDebug with correct meta', () => {
    const debugLogger = new Logger({
      basePath: './logs',
      consoleLogLevel: 'debug',
      logLevel: 'debug',
    });

    const debugSpy = sinon.spy();
    debugLogger['loggers'].debug.debug = debugSpy;

    debugLogger.logDebug({
      type: 'debugType',
      message: 'Debug data',
      meta: { extra: 'info' },
    });

    expect(debugSpy.calledOnce).to.be.true;
    expect(debugSpy.args[0][0].meta.extra).to.equal('info');
  });

  fancy.it('shouldLog should default to info when config not defined', () => {
    const defaultLogger = new Logger({
      basePath: './logs',
      consoleLogLevel: undefined as any,
      logLevel: undefined as any,
    });

    expect(defaultLogger['shouldLog']('info', 'console')).to.equal(true);
    expect(defaultLogger['shouldLog']('debug', 'console')).to.equal(false);
  });
});
