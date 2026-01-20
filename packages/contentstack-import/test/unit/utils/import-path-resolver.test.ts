import { expect } from 'chai';
import sinon from 'sinon';
import * as path from 'path';
import {
  selectBranchFromDirectory,
  resolveImportPath,
  updateImportConfigWithResolvedPath,
  executeImportPathLogic,
} from '../../../src/utils/import-path-resolver';
import { ImportConfig } from '../../../src/types';
import * as fileHelper from '../../../src/utils/file-helper';
import * as interactive from '../../../src/utils/interactive';
import * as cliUtilities from '@contentstack/cli-utilities';
import defaultConfig from '../../../src/config';

describe('Import Path Resolver', () => {
  let sandbox: sinon.SinonSandbox;
  let fileExistsSyncStub: sinon.SinonStub;
  let readFileStub: sinon.SinonStub;
  let askBranchSelectionStub: sinon.SinonStub;
  let logStub: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    // Mock file-helper
    fileExistsSyncStub = sandbox.stub(fileHelper, 'fileExistsSync');
    readFileStub = sandbox.stub(fileHelper, 'readFile');

    // Mock interactive
    askBranchSelectionStub = sandbox.stub(interactive, 'askBranchSelection');

    // Mock log
    logStub = {
      debug: sandbox.stub(),
      warn: sandbox.stub(),
      error: sandbox.stub(),
    };
    sandbox.stub(cliUtilities, 'log').value(logStub);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('selectBranchFromDirectory', () => {
    const contentDir = '/test/content';

    it('should return null when branches.json does not exist', async () => {
      const branchesJsonPath = path.join(contentDir, 'branches.json');
      fileExistsSyncStub.withArgs(branchesJsonPath).returns(false);

      const result = await selectBranchFromDirectory(contentDir);

      expect(result).to.be.null;
      expect(fileExistsSyncStub.calledWith(branchesJsonPath)).to.be.true;
      expect(readFileStub.called).to.be.false;
    });

    it('should return null when branches.json is empty array', async () => {
      const branchesJsonPath = path.join(contentDir, 'branches.json');
      fileExistsSyncStub.withArgs(branchesJsonPath).returns(true);
      readFileStub.withArgs(branchesJsonPath).resolves([]);

      const result = await selectBranchFromDirectory(contentDir);

      expect(result).to.be.null;
    });

    it('should return null when branches.json is not an array', async () => {
      const branchesJsonPath = path.join(contentDir, 'branches.json');
      fileExistsSyncStub.withArgs(branchesJsonPath).returns(true);
      readFileStub.withArgs(branchesJsonPath).resolves({ invalid: 'data' });

      const result = await selectBranchFromDirectory(contentDir);

      expect(result).to.be.null;
    });

    it('should return null when branches.json is null', async () => {
      const branchesJsonPath = path.join(contentDir, 'branches.json');
      fileExistsSyncStub.withArgs(branchesJsonPath).returns(true);
      readFileStub.withArgs(branchesJsonPath).resolves(null);

      const result = await selectBranchFromDirectory(contentDir);

      expect(result).to.be.null;
    });

    it('should auto-resolve single branch when branch path exists', async () => {
      const branchesJsonPath = path.join(contentDir, 'branches.json');
      const branchPath = path.join(contentDir, 'branch1');
      const branchesData = [{ uid: 'branch1' }];

      fileExistsSyncStub.withArgs(branchesJsonPath).returns(true);
      fileExistsSyncStub.withArgs(branchPath).returns(true);
      readFileStub.withArgs(branchesJsonPath).resolves(branchesData);

      const result = await selectBranchFromDirectory(contentDir);

      expect(result).to.deep.equal({ branchPath });
      expect(askBranchSelectionStub.called).to.be.false;
    });

    it('should return null when single branch path does not exist', async () => {
      const branchesJsonPath = path.join(contentDir, 'branches.json');
      const branchPath = path.join(contentDir, 'branch1');
      const branchesData = [{ uid: 'branch1' }];

      fileExistsSyncStub.withArgs(branchesJsonPath).returns(true);
      fileExistsSyncStub.withArgs(branchPath).returns(false);
      readFileStub.withArgs(branchesJsonPath).resolves(branchesData);

      const result = await selectBranchFromDirectory(contentDir);

      expect(result).to.be.null;
    });

    it('should prompt user when multiple branches exist', async () => {
      const branchesJsonPath = path.join(contentDir, 'branches.json');
      const selectedBranchPath = path.join(contentDir, 'branch2');
      const branchesData = [{ uid: 'branch1' }, { uid: 'branch2' }, { uid: 'branch3' }];

      fileExistsSyncStub.withArgs(branchesJsonPath).returns(true);
      fileExistsSyncStub.withArgs(selectedBranchPath).returns(true);
      readFileStub.withArgs(branchesJsonPath).resolves(branchesData);
      askBranchSelectionStub.withArgs(['branch1', 'branch2', 'branch3']).resolves('branch2');

      const result = await selectBranchFromDirectory(contentDir);

      expect(result).to.deep.equal({ branchPath: selectedBranchPath });
      expect(askBranchSelectionStub.calledOnce).to.be.true;
      expect(askBranchSelectionStub.calledWith(['branch1', 'branch2', 'branch3'])).to.be.true;
    });

    it('should return null when selected branch path does not exist', async () => {
      const branchesJsonPath = path.join(contentDir, 'branches.json');
      const selectedBranchPath = path.join(contentDir, 'branch2');
      const branchesData = [{ uid: 'branch1' }, { uid: 'branch2' }];

      fileExistsSyncStub.withArgs(branchesJsonPath).returns(true);
      fileExistsSyncStub.withArgs(selectedBranchPath).returns(false);
      readFileStub.withArgs(branchesJsonPath).resolves(branchesData);
      askBranchSelectionStub.withArgs(['branch1', 'branch2']).resolves('branch2');

      const result = await selectBranchFromDirectory(contentDir);

      expect(result).to.be.null;
    });

    it('should throw error when readFile fails', async () => {
      const branchesJsonPath = path.join(contentDir, 'branches.json');
      const error = new Error('Read file error');

      fileExistsSyncStub.withArgs(branchesJsonPath).returns(true);
      readFileStub.withArgs(branchesJsonPath).rejects(error);

      try {
        await selectBranchFromDirectory(contentDir);
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err).to.equal(error);
        expect(logStub.error.called).to.be.true;
      }
    });
  });

  describe('resolveImportPath', () => {
    let mockConfig: ImportConfig;
    let mockStackAPIClient: any;

    beforeEach(() => {
      mockStackAPIClient = {};
      mockConfig = {
        contentDir: '/test/content',
        apiKey: 'test',
      } as ImportConfig;
    });

    it('should throw error when content directory does not exist', async () => {
      fileExistsSyncStub.withArgs('/test/content').returns(false);

      try {
        await resolveImportPath(mockConfig, mockStackAPIClient);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Content directory does not exist');
      }
    });

    it('should use contentDir from importConfig.data when contentDir is not set', async () => {
      delete (mockConfig as any).contentDir;
      (mockConfig as any).data = '/test/data';
      fileExistsSyncStub.withArgs('/test/data').returns(true);

      // Mock module types check
      defaultConfig.modules.types.forEach((moduleType) => {
        fileExistsSyncStub.withArgs(path.join('/test/data', moduleType)).returns(false);
      });

      const result = await resolveImportPath(mockConfig, mockStackAPIClient);

      expect(result).to.equal('/test/data');
    });

    it('should return contentDir when branchName matches current directory name', async () => {
      mockConfig.branchName = 'content';
      fileExistsSyncStub.withArgs('/test/content').returns(true);

      const result = await resolveImportPath(mockConfig, mockStackAPIClient);

      expect(result).to.equal('/test/content');
    });

    it('should return branch path when branchName is specified and path exists', async () => {
      mockConfig.branchName = 'branch1';
      const branchPath = path.join('/test/content', 'branch1');

      fileExistsSyncStub.withArgs('/test/content').returns(true);
      fileExistsSyncStub.withArgs(branchPath).returns(true);

      const result = await resolveImportPath(mockConfig, mockStackAPIClient);

      expect(result).to.equal(branchPath);
    });

    it('should return contentDir when branchName is specified but path does not exist', async () => {
      mockConfig.branchName = 'branch1';
      const branchPath = path.join('/test/content', 'branch1');

      fileExistsSyncStub.withArgs('/test/content').returns(true);
      fileExistsSyncStub.withArgs(branchPath).returns(false);

      const result = await resolveImportPath(mockConfig, mockStackAPIClient);

      expect(result).to.equal('/test/content');
    });

    it('should return contentDir when module folders exist', async () => {
      const modulePath = path.join('/test/content', defaultConfig.modules.types[0]);

      fileExistsSyncStub.withArgs('/test/content').returns(true);
      fileExistsSyncStub.withArgs(modulePath).returns(true);

      const result = await resolveImportPath(mockConfig, mockStackAPIClient);

      expect(result).to.equal('/test/content');
    });

    it('should call selectBranchFromDirectory when no branch name', async () => {
      const branchPath = path.join('/test/content', 'branch1');

      fileExistsSyncStub.withArgs('/test/content').returns(true);

      // Mock module types check - all return false
      defaultConfig.modules.types.forEach((moduleType) => {
        fileExistsSyncStub.withArgs(path.join('/test/content', moduleType)).returns(false);
      });

      // Mock branches.json and branch selection
      const branchesJsonPath = path.join('/test/content', 'branches.json');
      fileExistsSyncStub.withArgs(branchesJsonPath).returns(true);
      fileExistsSyncStub.withArgs(branchPath).returns(true);
      readFileStub.withArgs(branchesJsonPath).resolves([{ uid: 'branch1' }]);

      const result = await resolveImportPath(mockConfig, mockStackAPIClient);

      expect(result).to.equal(branchPath);
    });

    it('should return contentDir when selectBranchFromDirectory returns null', async () => {
      fileExistsSyncStub.withArgs('/test/content').returns(true);

      // Mock module types check - all return false
      defaultConfig.modules.types.forEach((moduleType) => {
        fileExistsSyncStub.withArgs(path.join('/test/content', moduleType)).returns(false);
      });

      // Mock branches.json not found
      const branchesJsonPath = path.join('/test/content', 'branches.json');
      fileExistsSyncStub.withArgs(branchesJsonPath).returns(false);

      const result = await resolveImportPath(mockConfig, mockStackAPIClient);

      expect(result).to.equal('/test/content');
    });
  });

  describe('updateImportConfigWithResolvedPath', () => {
    let mockConfig: ImportConfig;

    beforeEach(() => {
      mockConfig = {
        contentDir: '/test/content',
        data: '/test/data',
        apiKey: 'test',
      } as ImportConfig;
    });

    it('should skip update when resolved path does not exist', async () => {
      const resolvedPath = '/test/resolved';
      fileExistsSyncStub.withArgs(resolvedPath).returns(false);

      await updateImportConfigWithResolvedPath(mockConfig, resolvedPath);

      expect(mockConfig.branchDir).to.be.undefined;
      expect(mockConfig.contentDir).to.equal('/test/content');
      expect(mockConfig.data).to.equal('/test/data');
    });

    it('should update config with resolved path', async () => {
      const resolvedPath = '/test/resolved';

      fileExistsSyncStub.withArgs(resolvedPath).returns(true);

      await updateImportConfigWithResolvedPath(mockConfig, resolvedPath);

      expect(mockConfig.branchDir).to.equal(resolvedPath);
      expect(mockConfig.contentDir).to.equal(resolvedPath);
      expect(mockConfig.data).to.equal(resolvedPath);
    });
  });

  describe('executeImportPathLogic', () => {
    let mockConfig: ImportConfig;
    let mockStackAPIClient: any;

    beforeEach(() => {
      mockStackAPIClient = {};
      mockConfig = {
        contentDir: '/test/content',
        apiKey: 'test',
      } as ImportConfig;
    });

    it('should execute complete path resolution logic', async () => {
      const resolvedPath = path.join('/test/content', 'branch1');

      fileExistsSyncStub.withArgs('/test/content').returns(true);
      fileExistsSyncStub.withArgs(resolvedPath).returns(true);

      // Mock module types check
      defaultConfig.modules.types.forEach((moduleType) => {
        fileExistsSyncStub.withArgs(path.join('/test/content', moduleType)).returns(false);
      });

      // Mock branches.json - single branch
      const branchesJsonPath = path.join('/test/content', 'branches.json');
      fileExistsSyncStub.withArgs(branchesJsonPath).returns(true);
      fileExistsSyncStub.withArgs(resolvedPath).returns(true);
      readFileStub.withArgs(branchesJsonPath).resolves([{ uid: 'branch1' }]);

      const result = await executeImportPathLogic(mockConfig, mockStackAPIClient);

      expect(result).to.equal(resolvedPath);
      expect(mockConfig.branchDir).to.equal(resolvedPath);
      expect(mockConfig.contentDir).to.equal(resolvedPath);
      expect(mockConfig.data).to.equal(resolvedPath);
    });
  });
});
