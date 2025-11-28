import { expect } from 'chai';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import { stub, restore, SinonStub } from 'sinon';
import { cliux } from '@contentstack/cli-utilities';
import backupHandler from '../../src/utils/backup-handler';
import { ImportConfig } from '../../src/types';

describe('Backup Handler', () => {
  const tmpDir = path.join(os.tmpdir(), `backup-test-${Date.now()}`);
  const contentDir = path.join(tmpDir, 'content');
  const backupDir = path.join(tmpDir, 'backup');

  let cliuxPrintStub: SinonStub;

  const baseConfig: Partial<ImportConfig> = {
    contentDir: contentDir,
    data: contentDir,
    apiKey: 'test-api-key',
    forceStopMarketplaceAppsPrompt: false,
    master_locale: { code: 'en-us' },
    masterLocale: { code: 'en-us' },
    branchName: '',
    selectedModules: ['entries'],
    backupDir: '',
    region: 'us',
  };

  before(() => {
    // Create test directories and files
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.mkdirSync(contentDir, { recursive: true });
    fs.writeFileSync(path.join(contentDir, 'test-file.json'), '{"test": "content"}');
  });

  after(() => {
    // Clean up
    if (fs.existsSync(tmpDir)) {
      fsExtra.removeSync(tmpDir);
    }
  });

  beforeEach(() => {
    restore();
    cliuxPrintStub = stub(cliux, 'print');
  });

  afterEach(() => {
    restore();
    // Clean up any backup directories created during tests
    if (fs.existsSync(backupDir)) {
      fsExtra.removeSync(backupDir);
    }
  });

  it('should return provided backup directory when useBackedupDir is given', async () => {
    const mockConfig = {
      ...baseConfig,
      useBackedupDir: backupDir,
    } as ImportConfig;

    const result = await backupHandler(mockConfig);

    expect(result).to.equal(backupDir);
  });

  it('should create backup directory and copy files when createBackupDir is given', async () => {
    const customBackupDir = path.join(tmpDir, 'custom-backup');

    const mockConfig = {
      ...baseConfig,
      createBackupDir: customBackupDir,
    } as ImportConfig;

    const result = await backupHandler(mockConfig);

    expect(result).to.equal(customBackupDir);
    expect(fs.existsSync(customBackupDir)).to.be.true;
    expect(fs.existsSync(path.join(customBackupDir, 'test-file.json'))).to.be.true;

    // Clean up
    fsExtra.removeSync(customBackupDir);
  });
});
