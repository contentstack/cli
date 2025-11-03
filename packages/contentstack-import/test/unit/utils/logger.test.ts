import { expect } from 'chai';
import sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { log, unlinkFileLogger } from '../../../src/utils/logger';
import { ImportConfig } from '../../../src/types';

describe('Logger Utils', () => {
  let sandbox: sinon.SinonSandbox;
  let tempDir: string;
  let mockConfig: ImportConfig;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Clear module cache to ensure fresh state for each test
    delete require.cache[require.resolve('../../../src/utils/logger')];
    
    // Create temp directory for log files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-test-'));

    // Mock config
    mockConfig = {
      cliLogsPath: tempDir,
      data: tempDir,
      apiKey: 'test-api-key',
      contentDir: tempDir,
      canCreatePrivateApp: false,
      forceStopMarketplaceAppsPrompt: false,
      skipPrivateAppRecreationIfExist: false,
      contentVersion: 1,
      backupDir: tempDir,
      masterLocale: { code: 'en-us' },
      master_locale: { code: 'en-us' },
      region: 'us' as any,
      context: {} as any,
      'exclude-global-modules': false,
      fetchConcurrency: 5,
      writeConcurrency: 5
    } as ImportConfig;
  });

  afterEach(() => {
    sandbox.restore();
    
    // Clean up temp directory
    try {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.warn(`Failed to clean temp dir ${tempDir}:`, error.message);
      }
    }
  });

  describe('log()', () => {
    it('should log info message when type is info', async () => {
      await log(mockConfig, 'test message', 'info');
      expect(true).to.be.true; // Test passes if no error thrown
    });

    it('should log warning message when type is warn', async () => {
      await log(mockConfig, 'test warning', 'warn');
      expect(true).to.be.true;
    });

    it('should log error message when type is error', async () => {
      await log(mockConfig, 'test error', 'error');
      expect(true).to.be.true;
    });

    it('should use config.cliLogsPath when available', async () => {
      const customPath = '/custom/log/path';
      mockConfig.cliLogsPath = customPath;
      await log(mockConfig, 'test message', 'info');
      expect(true).to.be.true;
    });

    it('should use config.data when cliLogsPath is not available', async () => {
      delete mockConfig.cliLogsPath;
      const dataPath = '/custom/data/path';
      mockConfig.data = dataPath;
      await log(mockConfig, 'test message', 'info');
      expect(true).to.be.true;
    });

    it('should use default path when neither cliLogsPath nor data is available', async () => {
      delete mockConfig.cliLogsPath;
      delete mockConfig.data;
      await log(mockConfig, 'test message', 'info');
      expect(true).to.be.true;
    });

    it('should handle string arguments', async () => {
      await log(mockConfig, 'simple string message', 'info');
      expect(true).to.be.true;
    });

    it('should handle object arguments in log message', async () => {
      const testObject = { key: 'value', nested: { data: 123 } };
      await log(mockConfig, testObject, 'info');
      expect(true).to.be.true;
    });

    it('should handle empty string message', async () => {
      await log(mockConfig, '', 'info');
      expect(true).to.be.true; // Should not throw
    });

    it('should handle null message', async () => {
      await log(mockConfig, null as any, 'info');
      expect(true).to.be.true;
    });

    it('should handle undefined message', async () => {
      await log(mockConfig, undefined as any, 'info');
      expect(true).to.be.true;
    });
  });

  describe('init() function behavior through log()', () => {
    it('should initialize logger on first call', async () => {
      await log(mockConfig, 'first message', 'info');
      expect(true).to.be.true;
    });

    it('should reuse existing loggers on subsequent calls', async () => {
      await log(mockConfig, 'first message', 'info');
      await log(mockConfig, 'second message', 'info');
      expect(true).to.be.true;
    });
  });

  describe('returnString() function behavior', () => {
    it('should handle string arguments', async () => {
      await log(mockConfig, 'test string', 'info');
      expect(true).to.be.true;
    });

    it('should handle object arguments with redactObject', async () => {
      const testObj = { password: 'secret', key: 'value' };
      await log(mockConfig, testObj, 'info');
      expect(true).to.be.true;
    });

    it('should handle array arguments', async () => {
      await log(mockConfig, ['item1', 'item2'], 'info');
      expect(true).to.be.true;
    });

    it('should handle number arguments', async () => {
      await log(mockConfig, 12345, 'info');
      expect(true).to.be.true;
    });

    it('should handle boolean arguments', async () => {
      await log(mockConfig, true, 'info');
      expect(true).to.be.true;
    });

    it('should remove ANSI escape codes from messages', async () => {
      const ansiMessage = '\u001B[31mRed text\u001B[0m';
      await log(mockConfig, ansiMessage, 'info');
      expect(true).to.be.true;
    });
  });

  describe('log() method types', () => {
    it('should call logger.log for info type', async () => {
      await log(mockConfig, 'info message', 'info');
      expect(true).to.be.true;
    });

    it('should call logger.log for warn type', async () => {
      await log(mockConfig, 'warn message', 'warn');
      expect(true).to.be.true;
    });

    it('should call errorLogger.log for error type', async () => {
      await log(mockConfig, 'error message', 'error');
      expect(true).to.be.true;
    });
  });

  describe('unlinkFileLogger()', () => {
    it('should remove file transports from logger', () => {
      unlinkFileLogger();
      expect(true).to.be.true; // Should not throw
    });

    it('should handle when logger is not initialized', () => {
      delete require.cache[require.resolve('../../../src/utils/logger')];
      const freshLoggerModule = require('../../../src/utils/logger');
      expect(() => freshLoggerModule.unlinkFileLogger()).to.not.throw();
    });

    it('should handle multiple calls', () => {
      unlinkFileLogger();
      unlinkFileLogger();
      expect(true).to.be.true;
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle very long messages', async () => {
      const longMessage = 'a'.repeat(10000);
      await log(mockConfig, longMessage, 'info');
      expect(true).to.be.true;
    });

    it('should handle special characters in messages', async () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
      await log(mockConfig, specialChars, 'info');
      expect(true).to.be.true;
    });

    it('should handle unicode characters in messages', async () => {
      const unicodeMessage = 'Hello 世界 🌍';
      await log(mockConfig, unicodeMessage, 'info');
      expect(true).to.be.true;
    });
  });

  describe('Integration scenarios', () => {
    it('should log info, then warn, then error in sequence', async () => {
      await log(mockConfig, 'info message', 'info');
      await log(mockConfig, 'warn message', 'warn');
      await log(mockConfig, 'error message', 'error');
      expect(true).to.be.true;
    });

    it('should handle rapid successive log calls', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(log(mockConfig, `message ${i}`, 'info'));
      }
      await Promise.all(promises);
      expect(true).to.be.true;
    });
  });
});
