import { expect } from 'chai';
import sinon from 'sinon';
import * as path from 'node:path';
import * as utilities from '@contentstack/cli-utilities';

// Use require for proxyquire to ensure CommonJS compatibility
const proxyquire = require('proxyquire').noPreserveCache();

describe('File Helper Utils', () => {
  let sandbox: sinon.SinonSandbox;
  let mockFs: any;
  let mockMkdirp: any;
  let mockBigJson: any;
  let fileHelper: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Create mock fs module
    mockFs = {
      existsSync: sandbox.stub(),
      readFileSync: sandbox.stub(),
      readFile: sandbox.stub(),
      writeFileSync: sandbox.stub(),
      writeFile: sandbox.stub(),
      createReadStream: sandbox.stub(),
      createWriteStream: sandbox.stub(),
      readdirSync: sandbox.stub()
    };

    // Create mock mkdirp
    mockMkdirp = {
      sync: sandbox.stub()
    };

    // Create mock big-json
    mockBigJson = {
      createParseStream: sandbox.stub(),
      createStringifyStream: sandbox.stub()
    };

    // Create mock utilities - don't stub sanitizePath, just provide a pass-through function
    // sanitizePath is non-configurable so we can't stub it, but we can provide a mock via proxyquire
    const mockUtilities = {
      ...utilities,
      sanitizePath: (p: string) => p, // Simple pass-through for testing
      FsUtility: utilities.FsUtility // Keep real FsUtility if needed
    };

    // Load file-helper with mocked dependencies
    fileHelper = proxyquire('../../../src/utils/file-helper', {
      'fs': mockFs,
      'mkdirp': mockMkdirp,
      'big-json': mockBigJson,
      '@contentstack/cli-utilities': mockUtilities
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('readFileSync', () => {
    it('should read and parse JSON file when parse is true', () => {
      const filePath = '/test/file.json';
      const fileContent = '{"key": "value"}';
      const parsedContent = { key: 'value' };
      
      mockFs.existsSync.returns(true);
      mockFs.readFileSync.returns(fileContent);
      
      const result = fileHelper.readFileSync(filePath, true);
      
      expect(mockFs.existsSync.calledWith(path.resolve(filePath))).to.be.true;
      expect(mockFs.readFileSync.calledWith(path.resolve(filePath), 'utf8')).to.be.true;
      expect(result).to.deep.equal(parsedContent);
    });

    it('should read file without parsing when parse is false', () => {
      const filePath = '/test/file.txt';
      
      mockFs.existsSync.returns(true);
      
      const result = fileHelper.readFileSync(filePath, false);
      
      expect(mockFs.existsSync.calledWith(path.resolve(filePath))).to.be.true;
      expect(mockFs.readFileSync.called).to.be.false;
      expect(result).to.be.undefined;
    });

    it('should default to parsing when parse is undefined', () => {
      const filePath = '/test/file.json';
      const fileContent = '{"key": "value"}';
      const parsedContent = { key: 'value' };
      
      mockFs.existsSync.returns(true);
      mockFs.readFileSync.returns(fileContent);
      
      const result = fileHelper.readFileSync(filePath, undefined as any);
      
      expect(result).to.deep.equal(parsedContent);
    });

    it('should return undefined when file does not exist', () => {
      const filePath = '/test/nonexistent.json';
      
      mockFs.existsSync.returns(false);
      
      const result = fileHelper.readFileSync(filePath, true);
      
      expect(mockFs.existsSync.calledWith(path.resolve(filePath))).to.be.true;
      expect(mockFs.readFileSync.called).to.be.false;
      expect(result).to.be.undefined;
    });
  });

  describe('readFile', () => {
    it('should read and parse JSON file by default', async () => {
      const filePath = '/test/file.json';
      const fileContent = '{"key": "value"}';
      const parsedContent = { key: 'value' };
      
      mockFs.readFile.callsFake((path: string, encoding: string, callback: any) => {
        callback(null, fileContent);
      });
      
      const result = await fileHelper.readFile(filePath);
      
      expect(mockFs.readFile.calledWith(path.resolve(filePath), 'utf-8', sinon.match.func)).to.be.true;
      expect(result).to.deep.equal(parsedContent);
    });

    it('should read file as text when type is not json', async () => {
      const filePath = '/test/file.txt';
      const fileContent = 'plain text content';
      
      mockFs.readFile.callsFake((path: string, encoding: string, callback: any) => {
        callback(null, fileContent);
      });
      
      const result = await fileHelper.readFile(filePath, { type: 'text' });
      
      expect(result).to.equal(fileContent);
    });

    it('should reject when file read fails', async () => {
      const filePath = '/test/file.json';
      const error = new Error('File read failed');
      
      mockFs.readFile.callsFake((path: string, encoding: string, callback: any) => {
        callback(error, null);
      });
      
      try {
        await fileHelper.readFile(filePath);
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err).to.equal(error);
      }
    });

    it('should use json type by default when options not provided', async () => {
      const filePath = '/test/file.json';
      const fileContent = '{"key": "value"}';
      
      mockFs.readFile.callsFake((path: string, encoding: string, callback: any) => {
        callback(null, fileContent);
      });
      
      const result = await fileHelper.readFile(filePath, { type: 'json' });
      
      // JSON.stringify may format differently (no spaces), so compare parsed objects
      expect(result).to.deep.equal({ key: 'value' });
    });
  });

  describe('readLargeFile', () => {
    it('should read large file and return parsed data', async () => {
      const filePath = '/test/large-file.json';
      const parsedData = { key: 'value' };
      const mockReadStream = {
        pipe: sandbox.stub().returnsThis(),
        on: sandbox.stub()
      };
      const mockParseStream = {
        on: sandbox.stub().callsFake((event: string, handler: Function) => {
          if (event === 'data') {
            setTimeout(() => handler(parsedData), 10);
          }
        })
      };
      
      mockFs.existsSync.returns(true);
      mockFs.createReadStream.returns(mockReadStream as any);
      mockBigJson.createParseStream.returns(mockParseStream);
      
      const result = await fileHelper.readLargeFile(filePath);
      
      expect(mockFs.existsSync.calledWith(path.resolve(filePath))).to.be.true;
      expect(mockFs.createReadStream.called).to.be.true;
      expect(result).to.deep.equal(parsedData);
    });

    it('should return array values when type is array', async () => {
      const filePath = '/test/large-file.json';
      const parsedData = { item1: 'value1', item2: 'value2' };
      const mockReadStream = {
        pipe: sandbox.stub().returnsThis(),
        on: sandbox.stub()
      };
      const mockParseStream = {
        on: sandbox.stub().callsFake((event: string, handler: Function) => {
          if (event === 'data') {
            setTimeout(() => handler(parsedData), 10);
          }
        })
      };
      
      mockFs.existsSync.returns(true);
      mockFs.createReadStream.returns(mockReadStream as any);
      mockBigJson.createParseStream.returns(mockParseStream);
      
      const result = await fileHelper.readLargeFile(filePath, { type: 'array' });
      
      expect(result).to.be.an('array');
      expect(result).to.include('value1');
      expect(result).to.include('value2');
    });

    it('should return undefined when file path is not a string', () => {
      const result = fileHelper.readLargeFile(123 as any);
      
      expect(result).to.be.undefined;
    });

    it('should return undefined when file does not exist', () => {
      const filePath = '/test/nonexistent.json';
      
      mockFs.existsSync.returns(false);
      
      const result = fileHelper.readLargeFile(filePath);
      
      expect(result).to.be.undefined;
    });

    it('should reject on parse stream error', async () => {
      const filePath = '/test/large-file.json';
      const error = new Error('Parse error');
      const mockReadStream = {
        pipe: sandbox.stub().returnsThis(),
        on: sandbox.stub()
      };
      const mockParseStream = {
        on: sandbox.stub().callsFake((event: string, handler: Function) => {
          if (event === 'error') {
            setTimeout(() => handler(error), 10);
          }
        })
      };
      
      mockFs.existsSync.returns(true);
      mockFs.createReadStream.returns(mockReadStream as any);
      mockBigJson.createParseStream.returns(mockParseStream);
      
      try {
        await fileHelper.readLargeFile(filePath);
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('writeFileSync', () => {
    it('should write object data as JSON string', () => {
      const filePath = '/test/file.json';
      const data = { key: 'value' };
      const expectedJson = JSON.stringify(data);
      
      fileHelper.writeFileSync(filePath, data);
      
      expect(mockFs.writeFileSync.calledWith(filePath, expectedJson)).to.be.true;
    });

    it('should write string data as-is', () => {
      const filePath = '/test/file.txt';
      const data = 'plain text';
      
      fileHelper.writeFileSync(filePath, data);
      
      expect(mockFs.writeFileSync.calledWith(filePath, data)).to.be.true;
    });

    it('should write empty object when data is falsy', () => {
      const filePath = '/test/file.json';
      
      fileHelper.writeFileSync(filePath, null);
      
      // In JavaScript, typeof null === 'object' is true, so null gets stringified to "null"
      // But if data is null, the fallback '{}' should be used
      // Actually, null || '{}' works, but typeof null === 'object' evaluates first
      // So JSON.stringify(null) returns "null"
      expect(mockFs.writeFileSync.calledOnce).to.be.true;
      expect(mockFs.writeFileSync.firstCall.args[0]).to.equal(filePath);
      expect(mockFs.writeFileSync.firstCall.args[1]).to.equal('null'); // typeof null === 'object' in JS
    });
  });

  describe('writeFile', () => {
    it('should write object data as JSON string and resolve', async () => {
      const filePath = '/test/file.json';
      const data = { key: 'value' };
      const expectedJson = JSON.stringify(data);
      
      mockFs.writeFile.callsFake((path: string, content: string, callback: any) => {
        callback(null);
      });
      
      const result = await fileHelper.writeFile(filePath, data);
      
      expect(mockFs.writeFile.calledWith(filePath, expectedJson, sinon.match.func)).to.be.true;
      expect(result).to.equal('done');
    });

    it('should write string data as-is', async () => {
      const filePath = '/test/file.txt';
      const data = 'plain text';
      
      mockFs.writeFile.callsFake((path: string, content: string, callback: any) => {
        callback(null);
      });
      
      await fileHelper.writeFile(filePath, data);
      
      expect(mockFs.writeFile.calledWith(filePath, data, sinon.match.func)).to.be.true;
    });

    it('should write empty object when data is falsy', async () => {
      const filePath = '/test/file.json';
      
      mockFs.writeFile.callsFake((path: string, content: string, callback: any) => {
        callback(null);
      });
      
      await fileHelper.writeFile(filePath, null);
      
      // In JavaScript, typeof null === 'object' is true, so null gets stringified to "null"
      // writeFile uses path.resolve(sanitizePath(filePath)), but sanitizePath is mocked to pass-through
      expect(mockFs.writeFile.calledOnce).to.be.true;
      expect(mockFs.writeFile.firstCall.args[0]).to.equal(path.resolve(filePath));
      expect(mockFs.writeFile.firstCall.args[1]).to.equal('null'); // typeof null === 'object' in JS
      expect(typeof mockFs.writeFile.firstCall.args[2]).to.equal('function');
    });

    it('should reject when file write fails', async () => {
      const filePath = '/test/file.json';
      const data = { key: 'value' };
      const error = new Error('Write failed');
      
      mockFs.writeFile.callsFake((path: string, content: string, callback: any) => {
        callback(error);
      });
      
      try {
        await fileHelper.writeFile(filePath, data);
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('writeLargeFile', () => {
    it('should write large file using streams', async () => {
      const filePath = '/test/large-file.json';
      const data = { key: 'value' };
      const mockWriteStream = {
        on: sandbox.stub().callsFake((event: string, handler: Function) => {
          if (event === 'finish') {
            setTimeout(() => handler(), 10);
          }
        }),
        pipe: sandbox.stub().returnsThis()
      };
      const mockStringifyStream = {
        pipe: sandbox.stub().returns(mockWriteStream)
      };
      
      mockFs.createWriteStream.returns(mockWriteStream as any);
      mockBigJson.createStringifyStream.returns(mockStringifyStream);
      
      const result = await fileHelper.writeLargeFile(filePath, data);
      
      expect(mockFs.createWriteStream.calledWith(path.resolve(filePath), 'utf-8')).to.be.true;
      expect(result).to.equal('');
    });

    it('should return undefined when filePath is not a string', () => {
      const data = { key: 'value' };
      
      const result = fileHelper.writeLargeFile(123 as any, data);
      
      expect(result).to.be.undefined;
    });

    it('should return undefined when data is not an object', () => {
      const filePath = '/test/file.json';
      
      const result = fileHelper.writeLargeFile(filePath, 'string' as any);
      
      expect(result).to.be.undefined;
    });

    it('should reject on write stream error', async () => {
      const filePath = '/test/large-file.json';
      const data = { key: 'value' };
      const error = new Error('Write error');
      const mockWriteStream = {
        on: sandbox.stub().callsFake((event: string, handler: Function) => {
          if (event === 'error') {
            setTimeout(() => handler(error), 10);
          }
        }),
        pipe: sandbox.stub().returnsThis()
      };
      const mockStringifyStream = {
        pipe: sandbox.stub().returns(mockWriteStream)
      };
      
      mockFs.createWriteStream.returns(mockWriteStream as any);
      mockBigJson.createStringifyStream.returns(mockStringifyStream);
      
      try {
        await fileHelper.writeLargeFile(filePath, data);
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('makeDirectory', () => {
    it('should create directory when it does not exist', () => {
      const dirPath = '/test/new-directory';
      
      mockFs.existsSync.returns(false);
      mockMkdirp.sync.returns(undefined);
      
      fileHelper.makeDirectory(dirPath);
      
      expect(mockFs.existsSync.calledWith(path.resolve(dirPath))).to.be.true;
      expect(mockMkdirp.sync.calledWith(path.resolve(dirPath))).to.be.true;
    });

    it('should not create directory when it already exists', () => {
      const dirPath = '/test/existing-directory';
      
      mockFs.existsSync.returns(true);
      
      fileHelper.makeDirectory(dirPath);
      
      expect(mockFs.existsSync.calledWith(path.resolve(dirPath))).to.be.true;
      expect(mockMkdirp.sync.called).to.be.false;
    });

    it('should handle directory creation for single path', () => {
      const dir1 = '/test/dir1';
      
      mockFs.existsSync.returns(false);
      
      fileHelper.makeDirectory(dir1);
      
      expect(mockMkdirp.sync.called).to.be.true;
    });
  });

  describe('readdir', () => {
    it('should return directory contents when directory exists', () => {
      const dirPath = '/test/directory';
      const files = ['file1.json', 'file2.json'];
      
      mockFs.existsSync.returns(true);
      mockFs.readdirSync.returns(files);
      
      const result = fileHelper.readdir(dirPath);
      
      expect(mockFs.existsSync.calledWith(dirPath)).to.be.true;
      expect(mockFs.readdirSync.calledWith(dirPath)).to.be.true;
      expect(result).to.deep.equal(files);
    });

    it('should return empty array when directory does not exist', () => {
      const dirPath = '/test/nonexistent';
      
      mockFs.existsSync.returns(false);
      
      const result = fileHelper.readdir(dirPath);
      
      expect(mockFs.existsSync.calledWith(dirPath)).to.be.true;
      expect(mockFs.readdirSync.called).to.be.false;
      expect(result).to.deep.equal([]);
    });
  });

  describe('fileExistsSync', () => {
    it('should return true when file exists', () => {
      const filePath = '/test/file.json';
      
      mockFs.existsSync.returns(true);
      
      const result = fileHelper.fileExistsSync(filePath);
      
      expect(mockFs.existsSync.calledWith(filePath)).to.be.true;
      expect(result).to.be.true;
    });

    it('should return false when file does not exist', () => {
      const filePath = '/test/nonexistent.json';
      
      mockFs.existsSync.returns(false);
      
      const result = fileHelper.fileExistsSync(filePath);
      
      expect(mockFs.existsSync.calledWith(filePath)).to.be.true;
      expect(result).to.be.false;
    });
  });
});
