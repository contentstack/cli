import { expect } from 'chai';
import * as path from 'path';
import { stub, restore } from 'sinon';
import * as fileHelper from '../../src/utils/file-helper';
import * as os from 'os';
import * as fs from 'fs';

describe('File Helper Utilities', () => {
  // Create a temporary test directory
  const tmpDir = path.join(os.tmpdir(), `test-${Date.now()}`);
  const testFilePath = path.join(tmpDir, 'test-file.json');
  const testContent = { test: 'content' };

  before(() => {
    // Create test directory
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  });

  after(() => {
    // Clean up test directory
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    restore();
  });

  describe('readFile and writeFile', () => {
    it('should write and read JSON file successfully', async () => {
      // Write test file
      await fileHelper.writeFile(testFilePath, testContent);

      // Read it back
      const result = await fileHelper.readFile(testFilePath);

      // Verify content
      expect(result).to.deep.equal(testContent);
    });

    it('should write and read text file successfully', async () => {
      const textContent = 'Plain text content';
      const textPath = path.join(tmpDir, 'test.txt');

      // Write text file
      await fileHelper.writeFile(textPath, textContent);

      // Read as text
      const result = await fileHelper.readFile(textPath, { type: 'text' });

      expect(result).to.equal(textContent);
    });

    it('should return empty string for non-existent file', async () => {
      const nonExistentPath = path.join(tmpDir, 'does-not-exist.json');

      // Make sure file doesn't exist
      if (fs.existsSync(nonExistentPath)) {
        fs.unlinkSync(nonExistentPath);
      }

      const result = await fileHelper.readFile(nonExistentPath);
      expect(result).to.equal('');
    });
  });

  describe('fileExistsSync', () => {
    it('should return true when file exists', () => {
      // Create a test file
      fs.writeFileSync(testFilePath, JSON.stringify(testContent));

      const result = fileHelper.fileExistsSync(testFilePath);
      expect(result).to.be.true;
    });

    it('should return false when file does not exist', () => {
      const nonExistentPath = path.join(tmpDir, 'missing.json');

      // Ensure file doesn't exist
      if (fs.existsSync(nonExistentPath)) {
        fs.unlinkSync(nonExistentPath);
      }

      const result = fileHelper.fileExistsSync(nonExistentPath);
      expect(result).to.be.false;
    });
  });

  describe('makeDirectory and removeDirSync', () => {
    it('should create and remove directory', () => {
      const newDir = path.join(tmpDir, 'new-dir');

      // Clean up if exists
      if (fs.existsSync(newDir)) {
        fs.rmSync(newDir, { recursive: true });
      }

      // Create directory
      fileHelper.makeDirectory(newDir);
      expect(fs.existsSync(newDir)).to.be.true;

      // Remove directory
      fileHelper.removeDirSync(newDir);
      expect(fs.existsSync(newDir)).to.be.false;
    });
  });

  describe('readdirSync', () => {
    it('should return directory contents', () => {
      // Create test files
      const file1 = path.join(tmpDir, 'file1.txt');
      const file2 = path.join(tmpDir, 'file2.txt');

      fs.writeFileSync(file1, 'test1');
      fs.writeFileSync(file2, 'test2');

      const result = fileHelper.readdirSync(tmpDir);

      expect(result).to.include('file1.txt');
      expect(result).to.include('file2.txt');
    });

    it('should return empty array for non-existent directory', () => {
      const nonExistentDir = path.join(tmpDir, 'does-not-exist');

      // Ensure directory doesn't exist
      if (fs.existsSync(nonExistentDir)) {
        fs.rmSync(nonExistentDir, { recursive: true });
      }

      const result = fileHelper.readdirSync(nonExistentDir);
      expect(result).to.deep.equal([]);
    });
  });

  describe('isFolderExist', () => {
    it('should resolve with true when folder exists', async () => {
      const result = await fileHelper.isFolderExist(tmpDir);
      expect(result).to.be.true;
    });

    it('should resolve with false when folder does not exist', async () => {
      const nonExistentDir = path.join(tmpDir, 'not-a-real-folder');

      // Ensure directory doesn't exist
      if (fs.existsSync(nonExistentDir)) {
        fs.rmSync(nonExistentDir, { recursive: true });
      }

      const result = await fileHelper.isFolderExist(nonExistentDir);
      expect(result).to.be.false;
    });
  });
});
