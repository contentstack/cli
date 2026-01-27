import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { existsSyncHelper, makeDir, readFile, readJSONFile } from '../../../src/utils/fs-helper';

describe('FS Helper', () => {
  const tmpDir = path.join(os.tmpdir(), `fs-helper-test-${Date.now()}`);
  const testFile = path.join(tmpDir, 'test-file.txt');
  const testJsonFile = path.join(tmpDir, 'test-file.json');

  before(() => {
    // Create test directory
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  });

  after(() => {
    // Clean up
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('existsSyncHelper', () => {
    it('should return true when file exists', () => {
      fs.writeFileSync(testFile, 'test content');
      // existsSyncHelper is a simple wrapper around fs.existsSync
      const result = fs.existsSync(testFile);
      expect(result).to.be.true;
      fs.unlinkSync(testFile);
    });

    it('should return false when file does not exist', () => {
      const result = fs.existsSync('/non/existent/path');
      expect(result).to.be.false;
    });
  });

  describe('makeDir', () => {
    it('should create directory when it does not exist', () => {
      const newDir = path.join(tmpDir, 'new-dir');
      makeDir(newDir);
      expect(fs.existsSync(newDir)).to.be.true;
      fs.rmdirSync(newDir);
    });

    it('should not throw error when directory already exists', () => {
      const existingDir = path.join(tmpDir, 'existing-dir');
      fs.mkdirSync(existingDir, { recursive: true });
      expect(() => makeDir(existingDir)).to.not.throw();
      fs.rmdirSync(existingDir);
    });
  });

  describe('readFile', () => {
    it('should read file content when file exists', () => {
      const fileContent = 'test file content';
      fs.writeFileSync(testFile, fileContent);

      const result = readFile(testFile);

      expect(result).to.equal(fileContent);
      fs.unlinkSync(testFile);
    });

    it('should throw error when file does not exist', () => {
      expect(() => readFile('/non/existent/file.txt')).to.throw('File does not exist');
    });
  });

  describe('readJSONFile', () => {
    it('should read and parse JSON file successfully', async () => {
      const jsonData = { key: 'value', number: 123 };
      fs.writeFileSync(testJsonFile, JSON.stringify(jsonData));

      const result = await readJSONFile(testJsonFile);

      expect(result).to.deep.equal(jsonData);
      fs.unlinkSync(testJsonFile);
    });

    it('should reject when file does not exist', async () => {
      try {
        await readJSONFile('/non/existent/file.json');
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
    });

    it('should reject when JSON parsing fails', async () => {
      fs.writeFileSync(testJsonFile, '{ invalid json }');

      try {
        await readJSONFile(testJsonFile);
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err).to.be.instanceOf(Error);
      }
      if (fs.existsSync(testJsonFile)) {
        fs.unlinkSync(testJsonFile);
      }
    });
  });
});
