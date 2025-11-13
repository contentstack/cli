import { expect } from 'chai';
import sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as cliUtilities from '@contentstack/cli-utilities';
import backupHandler from '../../../src/utils/backup-handler';
import * as fileHelper from '../../../src/utils/file-helper';
import { ImportConfig } from '../../../src/types';

describe('Backup Handler', () => {
  let mockImportConfig: ImportConfig;
  let logStub: any;
  let cliuxStub: any;
  let tempDir: string;
  let sourceDir: string;
  let backupDir: string;
  let originalCwd: string;
  let processCwdStub: sinon.SinonStub;

  beforeEach(() => {
    // Store original working directory
    originalCwd = process.cwd();
    
    // Create temp directory - os.tmpdir() works in both local and CI environments (e.g., /tmp on Linux)
    // This ensures backups are created in isolated temp space, not in the working directory
    // In CI, os.tmpdir() returns a safe temp directory that's cleaned up automatically
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-handler-test-'));
    sourceDir = path.join(tempDir, 'source');
    backupDir = path.join(tempDir, 'backup');
    
    // Stub process.cwd() to return tempDir so backups are created there, not in actual working directory
    // This is critical for CI - prevents creating files in the workspace during tests
    processCwdStub = sinon.stub(process, 'cwd').returns(tempDir);
    
    // Create source directory with some files
    fs.mkdirSync(sourceDir);
    fs.writeFileSync(path.join(sourceDir, 'test.json'), JSON.stringify({ key: 'value' }));
    fs.writeFileSync(path.join(sourceDir, 'test.txt'), 'test content');

    mockImportConfig = {
      apiKey: 'test-api-key',
      data: '/test/data',
      contentDir: sourceDir,
      context: {
        command: 'cm:stacks:import',
        module: 'all',
      },
      contentVersion: 1,
      masterLocale: { code: 'en-us' },
      backupDir: backupDir,
      region: 'us',
      modules: {} as any,
      host: 'https://api.contentstack.io',
      'exclude-global-modules': false,
    } as any as ImportConfig;

    logStub = {
      debug: sinon.stub(),
      info: sinon.stub(),
      error: sinon.stub(),
    };
    sinon.stub(cliUtilities, 'log').value(logStub);

    cliuxStub = {
      print: sinon.stub(),
    };
    sinon.stub(cliUtilities, 'cliux').value(cliuxStub);
  });

  afterEach(() => {
    // Restore process.cwd stub first
    if (processCwdStub) {
      processCwdStub.restore();
    }
    
    // Restore all stubs
    sinon.restore();
    
    // Clean up temp directory (which includes any backup dirs created in it)
    // This is critical for CI - must clean up temp files
    try {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors - temp dirs will be cleaned by OS
      console.warn(`Failed to clean temp dir ${tempDir}:`, error);
    }
    
    // Clean up any backup directories that might have been created in original working directory
    // This ensures CI doesn't leave files behind
    // Note: In CI (GitHub Actions), os.tmpdir() returns /tmp and we stub process.cwd(),
    // so this should rarely be needed, but it's a safety net
    try {
      if (originalCwd && fs.existsSync(originalCwd) && originalCwd !== tempDir) {
        const files = fs.readdirSync(originalCwd);
        for (const file of files) {
          // Only clean up backup dirs that match our test pattern
          // This prevents accidentally deleting unrelated backup dirs
          if (file.startsWith('_backup_') && /^_backup_\d+$/.test(file)) {
            const backupPath = path.join(originalCwd, file);
            try {
              const stat = fs.statSync(backupPath);
              if (stat.isDirectory()) {
                // Use force and recursive to handle permissions in CI
                fs.rmSync(backupPath, { recursive: true, force: true, maxRetries: 3 });
              }
            } catch (err: any) {
              // Ignore cleanup errors - might be permission issues in CI or already cleaned
              // Don't fail tests on cleanup errors
            }
          }
        }
      }
    } catch (error: any) {
      // Ignore all cleanup errors - CI environments may have permission restrictions
      // The temp directory cleanup above is sufficient for normal operation
    }
  });

  describe('backupHandler()', () => {
    it('should return existing backup directory when useBackedupDir is provided', async () => {
      const existingBackupPath = '/existing/backup/path';
      const config = {
        ...mockImportConfig,
        useBackedupDir: existingBackupPath,
      };

      const result = await backupHandler(config);

      expect(result).to.equal(existingBackupPath);
      expect(logStub.debug.calledWith(`Using existing backup directory: ${existingBackupPath}`)).to.be.true;
    });

    it('should use branchDir over contentDir when both are provided', async () => {
      const branchDir = path.join(tempDir, 'branch');
      fs.mkdirSync(branchDir);
      fs.writeFileSync(path.join(branchDir, 'branch-file.json'), '{}');

      const config = {
        ...mockImportConfig,
        branchDir: branchDir,
        contentDir: sourceDir,
      };

      const result = await backupHandler(config);

      expect(result).to.be.a('string');
      expect(fs.existsSync(result)).to.be.true;
      expect(logStub.debug.called).to.be.true;
    });

    it('should use contentDir when branchDir is not provided', async () => {
      const config = {
        ...mockImportConfig,
        contentDir: sourceDir,
      };

      const result = await backupHandler(config);

      expect(result).to.be.a('string');
      expect(fs.existsSync(result)).to.be.true;
      // Verify files were copied
      expect(fs.existsSync(path.join(result, 'test.json'))).to.be.true;
    });

    it('should create backup in subdirectory when createBackupDir is a subdirectory', async () => {
      const subDir = path.join(sourceDir, 'subdirectory');
      const config = {
        ...mockImportConfig,
        contentDir: sourceDir,
        createBackupDir: subDir,
      };

      const result = await backupHandler(config);

      expect(result).to.be.a('string');
      expect(result).to.not.equal(subDir); // Should create a different backup dir
      expect(logStub.debug.called).to.be.true;
    });

    it('should show warning when backup directory is a subdirectory and createBackupDir is set', async () => {
      const subDir = path.join(sourceDir, 'subdirectory');
      const config = {
        ...mockImportConfig,
        contentDir: sourceDir,
        createBackupDir: subDir,
      };

      await backupHandler(config);

      expect(cliuxStub.print.called).to.be.true;
      const printCall = cliuxStub.print.getCall(0);
      expect(printCall.args[0]).to.include('Warning!!!');
      expect(printCall.args[1]).to.deep.equal({ color: 'yellow' });
    });

    it('should create default backup directory when createBackupDir is not provided', async () => {
      const config = {
        ...mockImportConfig,
        contentDir: sourceDir,
      };

      const result = await backupHandler(config);

      expect(result).to.be.a('string');
      expect(result).to.include('_backup_');
      expect(fs.existsSync(result)).to.be.true;
    });

    it('should use custom backup directory when createBackupDir is provided and not a subdirectory', async () => {
      const customBackupPath = path.join(tempDir, 'custom-backup');
      const config = {
        ...mockImportConfig,
        contentDir: sourceDir,
        createBackupDir: customBackupPath,
      };

      const result = await backupHandler(config);

      expect(result).to.equal(customBackupPath);
      expect(fs.existsSync(customBackupPath)).to.be.true;
      expect(fs.existsSync(path.join(customBackupPath, 'test.json'))).to.be.true;
    });

    it('should remove existing backup directory before creating new one', async () => {
      const customBackupPath = path.join(tempDir, 'custom-backup');
      fs.mkdirSync(customBackupPath);
      fs.writeFileSync(path.join(customBackupPath, 'old-file.txt'), 'old content');

      const config = {
        ...mockImportConfig,
        contentDir: sourceDir,
        createBackupDir: customBackupPath,
      };

      const result = await backupHandler(config);

      expect(result).to.equal(customBackupPath);
      // Old file should be gone, new files should be present
      expect(fs.existsSync(path.join(customBackupPath, 'old-file.txt'))).to.be.false;
      expect(fs.existsSync(path.join(customBackupPath, 'test.json'))).to.be.true;
    });

    it('should successfully copy content to backup directory', async () => {
      const config = {
        ...mockImportConfig,
        contentDir: sourceDir,
      };

      const result = await backupHandler(config);

      expect(result).to.be.a('string');
      expect(fs.existsSync(result)).to.be.true;
      expect(fs.existsSync(path.join(result, 'test.json'))).to.be.true;
      expect(fs.existsSync(path.join(result, 'test.txt'))).to.be.true;
      expect(logStub.info.calledWith('Copying content to the backup directory...', config.context)).to.be.true;
    });

    it('should handle isSubDirectory when relative path is empty (same paths)', async () => {
      const config = {
        ...mockImportConfig,
        contentDir: sourceDir,
        createBackupDir: sourceDir,
      };

      const result = await backupHandler(config);

      expect(result).to.be.a('string');
      expect(result).to.not.equal(sourceDir); // Should create backup outside
      expect(logStub.debug.called).to.be.true;
    });

    it('should handle isSubDirectory when relative path starts with .. (not subdirectory)', async () => {
      const parentDir = path.join(tempDir, 'parent');
      const childDir = path.join(tempDir, 'child');
      fs.mkdirSync(parentDir);
      fs.mkdirSync(childDir);

      const config = {
        ...mockImportConfig,
        contentDir: parentDir,
        createBackupDir: childDir,
      };

      const result = await backupHandler(config);

      expect(result).to.equal(childDir);
      expect(fs.existsSync(result)).to.be.true;
    });
  });
});
