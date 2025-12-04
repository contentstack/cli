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
    
    // Test console mode redaction (consoleMode = true)
    const consoleRedacted = logger['redact'](testMeta, true);
    // In console mode, password and token are redacted (email is not in consoleSensitiveKeys)
    expect(consoleRedacted.password).to.equal('[REDACTED]');
    expect(consoleRedacted.token).to.equal('[REDACTED]');
    expect(consoleRedacted.email).to.equal('user@example.com'); // Email is not redacted
    expect(consoleRedacted.other).to.equal('safe');
  });

  // Note: isLogEntry method doesn't exist in the Logger class
  // This test is removed as it tests non-existent functionality

  fancy.it('should log error messages using error method', () => {
    const errorLogger = logger['loggers'].error;
    const spy = sinon.spy();
    const originalError = errorLogger.error.bind(errorLogger);
    errorLogger.error = spy;

    logger.error('error message', { some: 'meta' });
    expect(spy.calledOnce).to.be.true;
    // The logger adds level: 'error' to meta
    expect(spy.calledWith('error message', { some: 'meta', level: 'error' })).to.be.true;
    
    // Restore original
    errorLogger.error = originalError;
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
      context: { context: 'warnContext' },
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

describe('Session Log Path', () => {
  let sandbox: sinon.SinonSandbox;
  let tempDir: string;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Create a temporary directory for testing
    tempDir = path.join(os.tmpdir(), `csdx-log-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    sandbox.restore();
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  fancy
    .stub(configHandler, 'get', (...args: any[]) => {
      const key = args[0];
      if (key === 'log.path') return tempDir;
      if (key === 'currentCommandId') return 'import';
      if (key === 'sessionId') return 'test-session-123';
      return undefined;
    })
    .it('should create session path with correct date folder structure', () => {
      const sessionPath = getSessionLogPath();
      
      // Verify path contains date folder (YYYY-MM-DD)
      const dateRegex = /\d{4}-\d{2}-\d{2}/;
      expect(sessionPath).to.match(dateRegex);
      
      // Verify path contains session folder with command-timestamp-sessionId format
      const sessionFolderRegex = /import-\d{8}-\d{6}-test-session-123/;
      expect(sessionPath).to.match(sessionFolderRegex);
      
      // Verify directory was created
      expect(fs.existsSync(sessionPath)).to.be.true;
      
      // Verify it's a directory
      const stats = fs.statSync(sessionPath);
      expect(stats.isDirectory()).to.be.true;
    });

  fancy
    .stub(configHandler, 'get', (...args: any[]) => {
      const key = args[0];
      if (key === 'log.path') return tempDir;
      if (key === 'currentCommandId') return 'export:stack';
      if (key === 'sessionId') return 'test-session-456';
      return undefined;
    })
    .it('should sanitize command ID by replacing colons with hyphens', () => {
      const sessionPath = getSessionLogPath();
      
      // Verify colons are replaced with hyphens
      expect(sessionPath).to.include('export-stack');
      expect(sessionPath).to.not.include('export:stack');
      
      // Verify directory was created
      expect(fs.existsSync(sessionPath)).to.be.true;
    });

  fancy
    .stub(configHandler, 'get', (...args: any[]) => {
      const key = args[0];
      if (key === 'log.path') return tempDir;
      if (key === 'currentCommandId') return undefined;
      if (key === 'sessionId') return 'test-session-789';
      return undefined;
    })
    .it('should use "unknown" as command ID when not set', () => {
      const sessionPath = getSessionLogPath();
      
      // Verify "unknown" is used as command ID
      expect(sessionPath).to.include('unknown-');
      
      // Verify directory was created
      expect(fs.existsSync(sessionPath)).to.be.true;
    });

  fancy
    .stub(configHandler, 'get', (...args: any[]) => {
      const key = args[0];
      if (key === 'log.path') return tempDir;
      if (key === 'currentCommandId') return 'auth';
      if (key === 'sessionId') return undefined;
      return undefined;
    })
    .stub(configHandler, 'set', () => {})
    .it('should generate sessionId when not set', () => {
      const sessionPath = getSessionLogPath();
      
      // Verify path contains a session ID (short UUID format)
      // Short UUIDs are typically 22 characters
      const sessionIdMatch = sessionPath.match(/auth-\d{8}-\d{6}-(.+)$/);
      expect(sessionIdMatch).to.not.be.null;
      expect(sessionIdMatch![1]).to.have.length.greaterThan(0);
      
      // Verify directory was created
      expect(fs.existsSync(sessionPath)).to.be.true;
    });

  fancy
    .stub(configHandler, 'get', (...args: any[]) => {
      const key = args[0];
      if (key === 'log.path') return tempDir;
      if (key === 'currentCommandId') return 'test-command';
      if (key === 'sessionId') return 'session-abc';
      return undefined;
    })
    .it('should create session path with correct format: command-YYYYMMDD-HHMMSS-sessionId', () => {
      const sessionPath = getSessionLogPath();
      
      // Extract the session folder name
      const parts = sessionPath.split(path.sep);
      const sessionFolder = parts[parts.length - 1];
      
      // Verify format: command-YYYYMMDD-HHMMSS-sessionId
      const formatRegex = /^test-command-\d{8}-\d{6}-session-abc$/;
      expect(sessionFolder).to.match(formatRegex);
      
      // Verify date folder format: YYYY-MM-DD
      const dateFolder = parts[parts.length - 2];
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(dateFolder).to.match(dateRegex);
    });

  fancy
    .stub(configHandler, 'get', (...args: any[]) => {
      const key = args[0];
      if (key === 'log.path') return tempDir;
      if (key === 'currentCommandId') return 'import';
      if (key === 'sessionId') return 'test-session';
      return undefined;
    })
    .it('should create nested directories recursively', () => {
      const sessionPath = getSessionLogPath();
      
      // Verify all parent directories exist
      const dateFolder = path.dirname(sessionPath);
      const baseFolder = path.dirname(dateFolder);
      
      expect(fs.existsSync(baseFolder)).to.be.true;
      expect(fs.existsSync(dateFolder)).to.be.true;
      expect(fs.existsSync(sessionPath)).to.be.true;
    });

  fancy
    .stub(configHandler, 'get', (...args: any[]) => {
      const key = args[0];
      if (key === 'log.path') return tempDir;
      if (key === 'currentCommandId') return 'import';
      if (key === 'sessionId') return 'test-session';
      return undefined;
    })
    .it('should use session path for logger file paths', () => {
      // Get the session path before creating logger to ensure consistency
      // (Logger constructor calls getSessionLogPath multiple times, but with same stub
      // it should generate the same path within the same second)
      const expectedSessionPath = getSessionLogPath();
      
      // Verify the session path has the correct structure
      expect(expectedSessionPath).to.match(/import-\d{8}-\d{6}-test-session/);
      expect(expectedSessionPath).to.match(/\d{4}-\d{2}-\d{2}/); // Contains date folder
      
      const logger = new Logger({
        basePath: tempDir,
        consoleLogLevel: 'info',
        logLevel: 'info',
      });

      const winLogger = logger.getLoggerInstance('error');
      
      // The winston logger should have transports configured
      expect(winLogger.transports).to.have.length.greaterThan(0);
      
      // Verify file transport exists
      const fileTransport = winLogger.transports.find((t: any) => t.filename);
      expect(fileTransport).to.not.be.undefined;
      
      // Logger constructor calls getSessionLogPath() 5 times, creating log files
      // Write a log entry to ensure the file is actually created
      winLogger.error('Test log entry');
      
      // Winston may write asynchronously, so we need to check the actual file path
      // Get the actual filename from winston transport
      const winstonFilePath = (fileTransport as any).filename;
      
      // Winston stores the full path in filename, but it might be normalized
      // If it's just a filename, resolve it relative to the session path
      let actualLogFile: string;
      if (path.isAbsolute(winstonFilePath)) {
        actualLogFile = winstonFilePath;
      } else if (winstonFilePath.includes('/')) {
        // Relative path - resolve from tempDir
        actualLogFile = path.resolve(tempDir, winstonFilePath);
      } else {
        // Just filename - use expected session path
        actualLogFile = path.join(expectedSessionPath, winstonFilePath);
      }
      
      // Verify the log file path contains the session structure
      expect(actualLogFile).to.match(/import-\d{8}-\d{6}-test-session/);
      expect(actualLogFile).to.match(/error\.log$/);
      
      // Verify the directory structure exists
      const logDir = path.dirname(actualLogFile);
      expect(fs.existsSync(logDir)).to.be.true;
      expect(logDir).to.match(/import-\d{8}-\d{6}-test-session/);
      
      // Verify the date folder exists
      const dateFolder = path.dirname(logDir);
      expect(fs.existsSync(dateFolder)).to.be.true;
      expect(dateFolder).to.match(/\d{4}-\d{2}-\d{2}/);
      
      // Verify the log file exists (winston writes asynchronously, so wait a bit)
      // Wait for winston to flush the file with timeout
      return new Promise<void>((resolve, reject) => {
        const maxAttempts = 20; // 20 * 50ms = 1 second max wait
        let attempts = 0;
        const checkFile = () => {
          attempts++;
          if (fs.existsSync(actualLogFile)) {
            resolve();
          } else if (attempts >= maxAttempts) {
            reject(new Error(`Log file ${actualLogFile} was not created within timeout`));
          } else {
            setTimeout(checkFile, 50);
          }
        };
        checkFile();
      }).then(() => {
        expect(fs.existsSync(actualLogFile)).to.be.true;
      });
    });

  describe('Session Metadata (session.json)', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = path.join(os.tmpdir(), `cli-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
      configHandler.delete('currentCommandId');
      configHandler.delete('sessionId');
      configHandler.delete('email');
      configHandler.delete('authorisationType');
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      configHandler.delete('currentCommandId');
      configHandler.delete('sessionId');
      configHandler.delete('email');
      configHandler.delete('authorisationType');
    });

    fancy
      .stub(configHandler, 'get', (...args: any[]) => {
        const key = args[0];
        if (key === 'log.path') return tempDir;
        if (key === 'currentCommandId') return 'cm:stacks:audit';
        if (key === 'sessionId') return 'a3f8c9';
        if (key === 'email') return 'user@example.com';
        if (key === 'authorisationType') return 'OAUTH';
        return undefined;
      })
      .it('should create session.json with correct metadata structure', () => {
        const sessionPath = getSessionLogPath();
        const metadataPath = path.join(sessionPath, 'session.json');
        
        // Verify session.json exists
        expect(fs.existsSync(metadataPath)).to.be.true;
        
        // Read and parse session.json
        const metadataContent = fs.readFileSync(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataContent);
        
        // Verify required fields
        expect(metadata).to.have.property('command');
        expect(metadata).to.have.property('module');
        expect(metadata).to.have.property('sessionId');
        expect(metadata).to.have.property('startTimestamp');
        expect(metadata).to.have.property('authenticationMethod');
        expect(metadata).to.have.property('email');
        expect(metadata).to.have.property('MachineEnvironment');
        
        // Verify values
        expect(metadata.command).to.equal('cm:stacks:audit');
        expect(metadata.module).to.equal('audit');
        expect(metadata.sessionId).to.equal('a3f8c9');
        expect(metadata.authenticationMethod).to.equal('OAuth');
        expect(metadata.email).to.equal('user@example.com');
        
        // Verify MachineEnvironment object
        expect(metadata.MachineEnvironment).to.have.property('nodeVersion');
        expect(metadata.MachineEnvironment).to.have.property('os');
        expect(metadata.MachineEnvironment).to.have.property('hostname');
        expect(metadata.MachineEnvironment.nodeVersion).to.equal(process.version);
        expect(metadata.MachineEnvironment.os).to.equal(process.platform);
        expect(metadata.MachineEnvironment.hostname).to.equal(os.hostname());
        
        // Verify timestamp is ISO format
        expect(metadata.startTimestamp).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });

    fancy
      .stub(configHandler, 'get', (...args: any[]) => {
        const key = args[0];
        if (key === 'log.path') return tempDir;
        if (key === 'currentCommandId') return 'cm:stacks:export';
        if (key === 'sessionId') return 'test-session-123';
        if (key === 'email') return undefined;
        if (key === 'authorisationType') return 'BASIC';
        return undefined;
      })
      .it('should create session.json with Basic Auth authentication method', () => {
        const sessionPath = getSessionLogPath();
        const metadataPath = path.join(sessionPath, 'session.json');
        
        const metadataContent = fs.readFileSync(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataContent);
        
        expect(metadata.authenticationMethod).to.equal('Basic Auth');
        expect(metadata.email).to.equal('');
        expect(metadata.module).to.equal('export');
      });

    fancy
      .stub(configHandler, 'get', (...args: any[]) => {
        const key = args[0];
        if (key === 'log.path') return tempDir;
        if (key === 'currentCommandId') return 'cm:stacks:import';
        if (key === 'sessionId') return 'test-session-456';
        if (key === 'email') return 'test@example.com';
        if (key === 'authorisationType') return undefined;
        return undefined;
      })
      .it('should create session.json with empty authentication method when not set', () => {
        const sessionPath = getSessionLogPath();
        const metadataPath = path.join(sessionPath, 'session.json');
        
        const metadataContent = fs.readFileSync(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataContent);
        
        expect(metadata.authenticationMethod).to.equal('');
        expect(metadata.email).to.equal('test@example.com');
        expect(metadata.module).to.equal('import');
      });

    fancy
      .stub(configHandler, 'get', (...args: any[]) => {
        const key = args[0];
        if (key === 'log.path') return tempDir;
        if (key === 'currentCommandId') return 'unknown';
        if (key === 'sessionId') return 'test-session-789';
        if (key === 'email') return undefined;
        if (key === 'authorisationType') return undefined;
        return undefined;
      })
      .it('should create session.json with empty module when command is unknown', () => {
        const sessionPath = getSessionLogPath();
        const metadataPath = path.join(sessionPath, 'session.json');
        
        const metadataContent = fs.readFileSync(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataContent);
        
        expect(metadata.command).to.equal('unknown');
        expect(metadata.module).to.equal('');
      });

    fancy
      .stub(configHandler, 'get', (...args: any[]) => {
        const key = args[0];
        if (key === 'log.path') return tempDir;
        if (key === 'currentCommandId') return 'cm:stacks:audit';
        if (key === 'sessionId') return 'a3f8c9';
        if (key === 'email') return 'user@example.com';
        if (key === 'authorisationType') return 'OAUTH';
        return undefined;
      })
      .it('should create session.json only once per session folder', () => {
        // First call creates the session folder and metadata
        const sessionPath1 = getSessionLogPath();
        const metadataPath = path.join(sessionPath1, 'session.json');
        
        // Read first metadata
        const metadataContent1 = fs.readFileSync(metadataPath, 'utf8');
        const metadata1 = JSON.parse(metadataContent1);
        const firstTimestamp = metadata1.startTimestamp;
        
        // Second call should return same path (session already exists)
        const sessionPath2 = getSessionLogPath();
        expect(sessionPath1).to.equal(sessionPath2);
        
        // Verify metadata file still exists and wasn't overwritten
        expect(fs.existsSync(metadataPath)).to.be.true;
        const metadataContent2 = fs.readFileSync(metadataPath, 'utf8');
        const metadata2 = JSON.parse(metadataContent2);
        
        // Timestamp should be the same (created only once)
        expect(metadata2.startTimestamp).to.equal(firstTimestamp);
      });

    fancy
      .stub(configHandler, 'get', (...args: any[]) => {
        const key = args[0];
        if (key === 'log.path') return tempDir;
        if (key === 'currentCommandId') return 'cm:stacks:clone';
        if (key === 'sessionId') return 'clone-session';
        if (key === 'email') return 'clone@example.com';
        if (key === 'authorisationType') return 'BASIC';
        return undefined;
      })
      .it('should create session.json before any logs are written', () => {
        const sessionPath = getSessionLogPath();
        const metadataPath = path.join(sessionPath, 'session.json');
        
        // Verify session.json exists immediately after getSessionLogPath
        expect(fs.existsSync(metadataPath)).to.be.true;
        
        // Now create logger and write a log
        const logger = new Logger({
          basePath: tempDir,
          consoleLogLevel: 'info',
          logLevel: 'info',
        });
        
        const winLogger = logger.getLoggerInstance('error');
        winLogger.error('Test log entry');
        
        // Verify session.json still exists and wasn't overwritten
        expect(fs.existsSync(metadataPath)).to.be.true;
        
        // Verify log file exists (winston writes asynchronously, so wait a bit)
        const logFilePath = path.join(sessionPath, 'error.log');
        return new Promise<void>((resolve, reject) => {
          const maxAttempts = 20; // 20 * 50ms = 1 second max wait
          let attempts = 0;
          const checkFile = () => {
            attempts++;
            if (fs.existsSync(logFilePath)) {
              resolve();
            } else if (attempts >= maxAttempts) {
              reject(new Error(`Log file ${logFilePath} was not created within timeout`));
            } else {
              setTimeout(checkFile, 50);
            }
          };
          checkFile();
        }).then(() => {
          expect(fs.existsSync(logFilePath)).to.be.true;
          
          // Verify metadata is valid JSON
          const metadataContent = fs.readFileSync(metadataPath, 'utf8');
          const metadata = JSON.parse(metadataContent);
          expect(metadata.command).to.equal('cm:stacks:clone');
          expect(metadata.module).to.equal('clone');
        });
      });
    });
});
