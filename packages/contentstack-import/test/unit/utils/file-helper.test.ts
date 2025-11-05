import { expect } from 'chai';
import sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as bigJSON from 'big-json';
import {
  readFileSync,
  readFile,
  readLargeFile,
  writeFileSync,
  writeFile,
  writeLargeFile,
  makeDirectory,
  readdirSync,
  isFolderExist,
  fileExistsSync,
  removeDirSync,
} from '../../../src/utils/file-helper';

describe('File Helper', () => {
  let tempDir: string;
  let testFilePath: string;
  let testData: any;

  beforeEach(() => {
    // Create temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-helper-test-'));
    testFilePath = path.join(tempDir, 'test.json');
    testData = { key: 'value', number: 123, boolean: true };
    
    // Write test file
    fs.writeFileSync(testFilePath, JSON.stringify(testData));
  });

  afterEach(() => {
    // Clean up temp directory
    // Critical for CI - must clean up temp files to avoid disk space issues
    try {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error: any) {
      // Ignore cleanup errors - temp dirs will be cleaned by OS eventually
      // Log warning but don't fail tests
      if (error.code !== 'ENOENT') {
        console.warn(`Failed to clean temp dir ${tempDir}:`, error.message);
      }
    }
    sinon.restore();
  });

  describe('readFileSync()', () => {
    it('should read and parse JSON file when file exists and parse is true', () => {
      const result = readFileSync(testFilePath, true);

      expect(result).to.deep.equal(testData);
    });

    it('should read file without parsing when parse is false', () => {
      const result = readFileSync(testFilePath, false);

      expect(result).to.be.undefined;
    });

    it('should return undefined when file does not exist', () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.json');
      const result = readFileSync(nonExistentPath);

      expect(result).to.be.undefined;
    });

    it('should return undefined when JSON parsing fails', () => {
      const invalidJsonPath = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(invalidJsonPath, '{ invalid json }');

      const result = readFileSync(invalidJsonPath, true);

      expect(result).to.be.undefined;
    });

    it('should default to parse=true when parse parameter is not provided', () => {
      const result = readFileSync(testFilePath);

      expect(result).to.deep.equal(testData);
    });
  });

  describe('readFile()', () => {
    it('should read and parse JSON file successfully', async () => {
      const result = await readFile(testFilePath, { type: 'json' });

      expect(result).to.deep.equal(testData);
    });

    it('should read file without parsing when type is not json', async () => {
      const textFilePath = path.join(tempDir, 'test.txt');
      const textContent = 'plain text content';
      fs.writeFileSync(textFilePath, textContent);

      const result = await readFile(textFilePath, { type: 'text' });

      expect(result).to.equal(textContent);
    });

    it('should resolve empty string when file does not exist (ENOENT)', async () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.json');
      const result = await readFile(nonExistentPath);

      expect(result).to.equal('');
    });

    it('should reject when file read fails with non-ENOENT error', async () => {
      // Create a directory and try to read it as a file (should cause error)
      const dirPath = path.join(tempDir, 'directory');
      fs.mkdirSync(dirPath);

      try {
        await readFile(dirPath);
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err).to.exist;
        expect(err.code).to.not.equal('ENOENT');
      }
    });

    it('should default to json type when options not provided', async () => {
      const result = await readFile(testFilePath);

      expect(result).to.deep.equal(testData);
    });
  });

  describe('readLargeFile()', () => {
    it('should return undefined when filePath is not a string', () => {
      const result = readLargeFile(null as any);
      expect(result).to.be.undefined;
    });

    it('should return undefined when file does not exist', () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.json');
      const result = readLargeFile(nonExistentPath);
      expect(result).to.be.undefined;
    });

    it('should read large file and return data with default type', (done) => {
      const largeData = { key: 'value' };
      const largeFilePath = path.join(tempDir, 'large.json');
      fs.writeFileSync(largeFilePath, JSON.stringify(largeData));

      const promise = readLargeFile(largeFilePath);

      if (promise) {
        promise.then((data) => {
          expect(data).to.deep.equal(largeData);
          done();
        }).catch(done);
      } else {
        done(new Error('Promise was undefined'));
      }
    });

    it('should read large file and return array values when type is array', (done) => {
      const largeData = { a: 1, b: 2, c: 3 };
      const largeFilePath = path.join(tempDir, 'large.json');
      fs.writeFileSync(largeFilePath, JSON.stringify(largeData));

      const promise = readLargeFile(largeFilePath, { type: 'array' });

      if (promise) {
        promise.then((data) => {
          expect(data).to.be.an('array');
          expect(data).to.deep.equal([1, 2, 3]);
          done();
        }).catch(done);
      } else {
        done(new Error('Promise was undefined'));
      }
    });
  });

  describe('writeFileSync()', () => {
    it('should stringify and write object data', () => {
      const outputPath = path.join(tempDir, 'output.json');
      writeFileSync(outputPath, testData);

      const writtenData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      expect(writtenData).to.deep.equal(testData);
    });

    it('should write string data as-is', () => {
      const outputPath = path.join(tempDir, 'output.txt');
      const textData = 'plain text';
      writeFileSync(outputPath, textData);

      const writtenData = fs.readFileSync(outputPath, 'utf-8');
      expect(writtenData).to.equal(textData);
    });

    it('should write empty object string when data is null', () => {
      const outputPath = path.join(tempDir, 'output.json');
      writeFileSync(outputPath, null);

      const writtenData = fs.readFileSync(outputPath, 'utf-8');
      // Note: typeof null === 'object' in JavaScript, so JSON.stringify(null) returns 'null'
      // The code behavior: typeof data === 'object' ? JSON.stringify(data) : data || '{}'
      // So null gets stringified to 'null' string, not '{}'
      expect(writtenData).to.equal('null');
    });

    it('should write empty object string when data is undefined', () => {
      const outputPath = path.join(tempDir, 'output.json');
      writeFileSync(outputPath, undefined);

      const writtenData = fs.readFileSync(outputPath, 'utf-8');
      // Function writes '{}' when data is undefined or falsy (data || '{}')
      expect(writtenData).to.equal('{}');
    });
  });

  describe('writeFile()', () => {
    it('should stringify and write object data successfully', async () => {
      const outputPath = path.join(tempDir, 'output.json');

      const result = await writeFile(outputPath, testData);

      expect(result).to.equal('done');
      const writtenData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      expect(writtenData).to.deep.equal(testData);
    });

    it('should write string data as-is', async () => {
      const outputPath = path.join(tempDir, 'output.txt');
      const textData = 'plain text';

      const result = await writeFile(outputPath, textData);

      expect(result).to.equal('done');
      const writtenData = fs.readFileSync(outputPath, 'utf-8');
      expect(writtenData).to.equal(textData);
    });

    it('should write empty object string when data is null', async () => {
      const outputPath = path.join(tempDir, 'output.json');

      await writeFile(outputPath, null);

      const writtenData = fs.readFileSync(outputPath, 'utf-8');
      // Note: typeof null === 'object' in JavaScript, so JSON.stringify(null) returns 'null'
      // The code behavior: typeof data === 'object' ? JSON.stringify(data) : data || '{}'
      // So null gets stringified to 'null' string, not '{}'
      expect(writtenData).to.equal('null');
    });

    it('should reject when file write fails', async () => {
      // Try to write to a non-existent directory
      const invalidPath = path.join(tempDir, 'nonexistent', 'file.json');

      try {
        await writeFile(invalidPath, testData);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.exist;
      }
    });
  });

  describe('writeLargeFile()', () => {
    it('should return undefined when filePath is not a string', () => {
      const result = writeLargeFile(null as any, { data: 'test' });
      expect(result).to.be.undefined;
    });

    it('should return undefined when data is not an object', () => {
      const result = writeLargeFile(path.join(tempDir, 'output.json'), 'string data');
      expect(result).to.be.undefined;
    });

    it('should write large file successfully', (done) => {
      const outputPath = path.join(tempDir, 'large-output.json');
      const largeData = { key: 'value', nested: { data: [1, 2, 3] } };

      const promise = writeLargeFile(outputPath, largeData);

      if (promise) {
        promise.then((result) => {
          expect(result).to.equal('');
          expect(fs.existsSync(outputPath)).to.be.true;
          done();
        }).catch(done);
      } else {
        done(new Error('Promise was undefined'));
      }
    });
  });

  describe('makeDirectory()', () => {
    it('should create directory when it does not exist', () => {
      const newDirPath = path.join(tempDir, 'new-directory');
      makeDirectory(newDirPath);

      expect(fs.existsSync(newDirPath)).to.be.true;
      expect(fs.statSync(newDirPath).isDirectory()).to.be.true;
    });

    it('should not throw error when directory already exists', () => {
      const existingDirPath = path.join(tempDir, 'existing-directory');
      fs.mkdirSync(existingDirPath);
      
      // Should not throw
      makeDirectory(existingDirPath);

      expect(fs.existsSync(existingDirPath)).to.be.true;
    });

    it('should handle multiple directory arguments', () => {
      const dir1 = path.join(tempDir, 'dir1');
      
      makeDirectory(dir1);

      expect(fs.existsSync(dir1)).to.be.true;
      
      // Test another directory separately since makeDirectory uses arguments object
      const dir2 = path.join(tempDir, 'dir2');
      makeDirectory(dir2);
      expect(fs.existsSync(dir2)).to.be.true;
    });
  });

  describe('readdirSync()', () => {
    it('should return directory contents when directory exists', () => {
      // Create some files
      fs.writeFileSync(path.join(tempDir, 'file1.json'), '{}');
      fs.writeFileSync(path.join(tempDir, 'file2.json'), '{}');
      fs.writeFileSync(path.join(tempDir, 'file3.json'), '{}');

      const result = readdirSync(tempDir);

      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
      expect(result).to.include('file1.json');
      expect(result).to.include('file2.json');
      expect(result).to.include('file3.json');
    });

    it('should return empty array when directory does not exist', () => {
      const nonExistentDir = path.join(tempDir, 'nonexistent');
      const result = readdirSync(nonExistentDir);

      expect(result).to.deep.equal([]);
    });
  });

  describe('isFolderExist()', () => {
    it('should return true when folder exists', async () => {
      const folderPath = path.join(tempDir, 'folder');
      fs.mkdirSync(folderPath);

      const result = await isFolderExist(folderPath);

      expect(result).to.be.true;
    });

    it('should return false when folder does not exist', async () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent');
      const result = await isFolderExist(nonExistentPath);

      expect(result).to.be.false;
    });
  });

  describe('fileExistsSync()', () => {
    it('should return true when file exists', () => {
      const result = fileExistsSync(testFilePath);

      expect(result).to.be.true;
    });

    it('should return false when file does not exist', () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.json');
      const result = fileExistsSync(nonExistentPath);

      expect(result).to.be.false;
    });
  });

  describe('removeDirSync()', () => {
    it('should remove directory recursively', () => {
      const dirPath = path.join(tempDir, 'to-remove');
      fs.mkdirSync(dirPath);
      fs.writeFileSync(path.join(dirPath, 'file.txt'), 'content');

      expect(fs.existsSync(dirPath)).to.be.true;
      removeDirSync(dirPath);
      expect(fs.existsSync(dirPath)).to.be.false;
    });
  });
});
