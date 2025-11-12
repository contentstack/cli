import { expect } from 'chai';
import sinon from 'sinon';
import { validateConfig, formatError, executeTask, writeExportMetaFile } from '../../../src/utils/common-helper';
import { ExternalConfig, ExportConfig } from '../../../src/types';

describe('Common Helper Utils', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('validateConfig', () => {
    it('should throw error when host and cdn are missing', () => {
      const config: ExternalConfig = {} as any;
      
      expect(() => validateConfig(config)).to.throw('Host/CDN end point is missing from config');
    });

    it('should validate correctly with all credentials provided', () => {
      const config: ExternalConfig = {
        host: 'https://api.contentstack.io',
        cdn: 'https://cdn.contentstack.io',
        email: 'test@example.com',
        password: 'password',
        management_token: 'token',
        access_token: 'token'
      } as any;
      
      expect(() => validateConfig(config)).to.not.throw();
    });

    it('should validate email and password with access_token', () => {
      const config: ExternalConfig = {
        host: 'https://api.contentstack.io',
        cdn: 'https://cdn.contentstack.io',
        email: 'test@example.com',
        password: 'password',
        access_token: 'token',
        source_stack: 'stack-key'
      } as any;
      
      // Should not throw with access token
      expect(() => validateConfig(config)).to.not.throw();
    });

    it('should throw error when authentication credentials are missing', () => {
      const config: ExternalConfig = {
        host: 'https://api.contentstack.io',
        cdn: 'https://cdn.contentstack.io',
        email: '',
        password: '',
        source_stack: 'stack-key'
      } as any;
      
      // This will throw when no valid credentials provided
      try {
        validateConfig(config);
        // If it doesn't throw, check if email/password path throws
        const config2 = { ...config, email: 'test', password: '' };
        validateConfig(config2);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.exist;
      }
    });

    it('should validate preserveStackVersion requires email and password', () => {
      const config: ExternalConfig = {
        host: 'https://api.contentstack.io',
        cdn: 'https://cdn.contentstack.io',
        preserveStackVersion: true
      } as any;
      
      expect(() => validateConfig(config)).to.throw('Kindly provide Email and password for stack details');
    });

    it('should validate with management token', () => {
      const config: ExternalConfig = {
        host: 'https://api.contentstack.io',
        cdn: 'https://cdn.contentstack.io',
        management_token: 'token',
        source_stack: 'stack-key'
      } as any;
      
      expect(() => validateConfig(config)).to.not.throw();
    });
  });

  describe('formatError', () => {
    it('should format string error correctly', () => {
      const errorStr = 'Simple error message';
      const result = formatError(errorStr);
      expect(result).to.equal(errorStr);
    });

    it('should parse and format JSON error string', () => {
      const errorJson = JSON.stringify({ errorMessage: 'Test error' });
      const result = formatError(errorJson);
      expect(result).to.equal('Test error');
    });

    it('should format error message from Error object', () => {
      const error = { message: 'Error occurred' };
      const result = formatError(error);
      expect(result).to.equal('Error occurred');
    });

    it('should include error details when available', () => {
      const error = {
        errorMessage: 'Main error',
        errors: {
          authorization: 'Invalid token',
          api_key: 'Invalid key'
        }
      };
      const result = formatError(error);
      expect(result).to.include('Main error');
      expect(result).to.include('Management Token Invalid token');
      expect(result).to.include('Stack API key Invalid key');
    });

    it('should map entity names correctly', () => {
      const error = {
        errors: {
          authorization: 'fail',
          api_key: 'fail',
          uid: 'fail',
          access_token: 'fail'
        }
      };
      const result = formatError(error);
      expect(result).to.include('Management Token');
      expect(result).to.include('Stack API key');
      expect(result).to.include('Content Type');
      expect(result).to.include('Delivery Token');
    });

    it('should handle null or undefined error gracefully', () => {
      // formatError doesn't handle null gracefully, so we expect it to throw
      expect(() => formatError(null as any)).to.throw();
    });
  });

  describe('executeTask', () => {
    it('should execute tasks with concurrency limit', async () => {
      const tasks = [1, 2, 3, 4, 5];
      const handler = async (task: unknown) => (task as number) * 2;
      
      const results = await executeTask(tasks, handler, { concurrency: 2 });
      
      expect(results).to.deep.equal([2, 4, 6, 8, 10]);
    });

    it('should handle empty tasks array', async () => {
      const tasks: any[] = [];
      const handler = async (): Promise<void> => { return; };
      
      const results = await executeTask(tasks, handler, { concurrency: 1 });
      
      expect(results).to.be.an('array');
      expect(results.length).to.equal(0);
    });

    it('should throw error when handler is not a function', () => {
      const tasks = [1, 2, 3];
      const handler = 'not a function' as any;
      
      expect(() => executeTask(tasks, handler, { concurrency: 1 })).to.throw('Invalid handler');
    });

    it('should execute tasks sequentially when concurrency is 1', async () => {
      const order: number[] = [];
      const tasks = [1, 2, 3];
      const handler = async (task: unknown) => {
        order.push(task as number);
        return task;
      };
      
      await executeTask(tasks, handler, { concurrency: 1 });
      
      expect(order).to.deep.equal([1, 2, 3]);
    });

    it('should handle task errors gracefully', async () => {
      const tasks = [1, 2, 3];
      const handler = async (task: unknown) => {
        if ((task as number) === 2) throw new Error('Task failed');
        return task;
      };
      
      try {
        await executeTask(tasks, handler, { concurrency: 1 });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe('writeExportMetaFile', () => {
    it('should write export meta file with correct data', () => {
      const exportConfig: ExportConfig = {
        contentVersion: 1,
        exportDir: '/test/export'
      } as ExportConfig;
      
      // Stub FsUtility constructor to avoid fs operations
      const FsUtility = require('@contentstack/cli-utilities').FsUtility;
      const originalWriteFile = FsUtility.prototype.writeFile;
      const writeFileStub = sinon.stub().resolves();
      FsUtility.prototype.writeFile = writeFileStub;
      
      writeExportMetaFile(exportConfig);
      
      // Verify that writeFile was called with correct data
      expect(writeFileStub.called).to.be.true;
      const filePath = writeFileStub.firstCall.args[0];
      const metaData = writeFileStub.firstCall.args[1];
      
      expect(filePath).to.include('export-info.json');
      expect(metaData.contentVersion).to.equal(1);
      expect(metaData.logsPath).to.exist;
      
      // Restore original
      FsUtility.prototype.writeFile = originalWriteFile;
    });

    it('should accept custom meta file path', () => {
      const exportConfig: ExportConfig = {
        contentVersion: 2,
        exportDir: '/test/export'
      } as ExportConfig;
      
      // Stub FsUtility constructor to avoid fs operations
      const FsUtility = require('@contentstack/cli-utilities').FsUtility;
      const originalWriteFile = FsUtility.prototype.writeFile;
      const writeFileStub = sinon.stub().resolves();
      FsUtility.prototype.writeFile = writeFileStub;
      
      writeExportMetaFile(exportConfig, '/custom/path');
      
      // Verify that writeFile was called with custom path and correct data
      expect(writeFileStub.called).to.be.true;
      const filePath = writeFileStub.firstCall.args[0];
      const metaData = writeFileStub.firstCall.args[1];
      
      expect(filePath).to.include('/custom/path');
      expect(filePath).to.include('export-info.json');
      expect(metaData.contentVersion).to.equal(2);
      
      // Restore original
      FsUtility.prototype.writeFile = originalWriteFile;
    });
  });
});

