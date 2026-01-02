import { expect } from 'chai';
import { fancy } from 'fancy-test';
import sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import Logger from '../../src/logger/logger';
import { getSessionLogPath } from '../../src/logger/session-path';
import configHandler from '../../src/config-handler';

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

    // Test file mode redaction (consoleMode = false)
    const redacted = logger['redact'](testMeta, false);
    // In file mode, only token and secret are redacted (not password or email)
    expect(redacted.token).to.equal('[REDACTED]');
    expect(redacted.other).to.equal('safe');
  });

  fancy.it('should handle complex nested objects in redaction', () => {
    const complexObj = {
      user: {
        email: 'test@example.com',
        profile: {
          password: 'secret123',
          settings: {
            apiKey: 'key123',
            normal: 'value'
          }
        }
      },
      config: {
        token: 'token123',
        other: 'safe'
      }
    };

    const redacted = logger['redact'](complexObj);
    expect(redacted.user.email).to.equal('[REDACTED]');
    expect(redacted.user.profile.password).to.equal('[REDACTED]');
    expect(redacted.user.profile.settings.apiKey).to.equal('[REDACTED]');
    expect(redacted.user.profile.settings.normal).to.equal('value');
    expect(redacted.config.token).to.equal('[REDACTED]');
    expect(redacted.config.other).to.equal('safe');
  });

  fancy.it('should log error messages using error method', () => {
    const errorLogger = logger['loggers'].error;
    const spy = sinon.spy();
    const originalError = errorLogger.error.bind(errorLogger);
    errorLogger.error = spy;

    logger.error('error message', { some: 'meta' });
    expect(spy.calledOnce).to.be.true;
    expect(spy.calledWith('error message', { some: 'meta', level: 'error' })).to.be.true;
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
    const originalLog = successLogger.log.bind(successLogger);
    successLogger.log = spy;

    logger.logSuccess({ type: 'test', message: 'Success message' });
    expect(spy.calledOnce).to.be.true;
    // logSuccess creates a logPayload object with level, message, timestamp, and meta
    const logPayload = spy.args[0][0];
    expect(logPayload.message).to.equal('Success message');
    expect(logPayload.meta.type).to.equal('test');
    
    // Restore original
    successLogger.log = originalLog;
  });

  fancy.it('shouldLog should handle file target level filtering', () => {
    const result = logger['shouldLog']('debug', 'file'); // logLevel = info
    expect(result).to.equal(false);
  });

  fancy.it('success logger should call log method', () => {
    const successLogger = logger['loggers'].success;
    const spy = sinon.spy();
    const originalLog = successLogger.log.bind(successLogger);
    successLogger.log = spy;

    logger.success('It worked!', { extra: 'meta' });
    expect(spy.calledOnce).to.be.true;
    // success() calls log('success', message, meta)
    expect(spy.calledWith('success', 'It worked!', { extra: 'meta' })).to.be.true;
    
    // Restore original
    successLogger.log = originalLog;
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
    // Test file mode (consoleMode = false) - token is redacted, password is not
    const result = logger['redact'](obj, false);
    expect(result.token).to.equal('[REDACTED]');
    // In file mode, password is not redacted
    expect(result[Symbol.for('splat')][0].password).to.equal('1234');
    
    // Test console mode (consoleMode = true) - both token and password are redacted
    const consoleResult = logger['redact'](obj, true);
    expect(consoleResult.token).to.equal('[REDACTED]');
    expect(consoleResult[Symbol.for('splat')][0].password).to.equal('[REDACTED]');
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
      context: { module: 'test' },
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

  fancy.it('shouldLog should handle undefined levels gracefully', () => {
    expect(logger['shouldLog']('unknown' as any, 'console')).to.equal(true); // Should default to info level
  });

  fancy.it('success method should use info logger with success type', () => {
    const successLogger = logger['loggers'].success;
    const spy = sinon.spy();
    successLogger.info = spy;

    logger.success('Success message', { extra: 'data' });
    expect(spy.calledOnce).to.be.true;
    expect(spy.args[0][1].type).to.equal('success');
  });

  fancy.it('logSuccess should use info method instead of log', () => {
    const successLogger = logger['loggers'].success;
    const spy = sinon.spy();
    successLogger.info = spy;

    logger.logSuccess({
      type: 'test',
      message: 'Test success',
      data: { test: 'data' },
    });

    expect(spy.calledOnce).to.be.true;
    expect(spy.args[0][0].meta.type).to.equal('test');
    expect(spy.args[0][0].meta.data.test).to.equal('data');
  });

  fancy.it('should handle redaction errors gracefully', () => {
    const problematicLogger = new Logger({
      basePath: './logs',
      consoleLogLevel: 'info',
      logLevel: 'info',
    });

    const obj = {
      password: 'secret',
      get circular() {
        return this;
      },
    };

    // Should not throw error
    const result = problematicLogger['redact'](obj);
    // If redaction fails, it should return the original object
    expect(result).to.not.be.undefined;
  });

  fancy.it('should detect sensitive keys correctly', () => {
    expect(logger['isSensitiveKey']('password')).to.be.true;
    expect(logger['isSensitiveKey']('authtoken')).to.be.true;
    expect(logger['isSensitiveKey']('api_key')).to.be.true;
    expect(logger['isSensitiveKey']('management-token')).to.be.true;
    expect(logger['isSensitiveKey']('normalKey')).to.be.false;
    expect(logger['isSensitiveKey']('')).to.be.false;
  });

  fancy.it('should handle non-string keys in sensitive key detection', () => {
    expect(logger['isSensitiveKey'](123 as any)).to.be.false;
    expect(logger['isSensitiveKey'](null as any)).to.be.false;
    expect(logger['isSensitiveKey'](undefined as any)).to.be.false;
  });
});
