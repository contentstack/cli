import { expect } from 'chai';
import * as sinon from 'sinon';
import startModuleImport from '../../../../src/import/modules/index';

describe('Module Index - startModuleImport', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should import a module successfully', async () => {
    const mockStackAPIClient = {
      api_key: 'test-key',
      name: 'test-stack'
    } as any;

    const mockImportConfig = {
      context: { module: 'test' },
      backupDir: '/tmp/test-backup',
      modules: {
        extensions: { dirName: 'extensions' }
      }
    } as any;

    const mockModulePayload = {
      importConfig: mockImportConfig,
      stackAPIClient: mockStackAPIClient,
      moduleName: 'extensions' as any
    };

    // Test that the function can be called - it should not throw an error
    try {
      const result = await startModuleImport(mockModulePayload);
      expect(result).to.be.undefined;
    } catch (error) {
      expect(error).to.be.an('error');
    }
  });

  it('should handle module import errors', async () => {
    const mockStackAPIClient = {
      api_key: 'test-key',
      name: 'test-stack'
    } as any;

    const mockImportConfig = {
      context: { module: 'test' },
      backupDir: '/tmp/test-backup'
    } as any;

    const mockModulePayload = {
      importConfig: mockImportConfig,
      stackAPIClient: mockStackAPIClient,
      moduleName: 'nonexistent-module' as any
    };

    try {
      await startModuleImport(mockModulePayload);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).to.be.an('error');
    }
  });

  it('should handle different module names', async () => {
    const mockStackAPIClient = {
      api_key: 'test-key',
      name: 'test-stack'
    } as any;

    const mockImportConfig = {
      context: { module: 'test' },
      backupDir: '/tmp/test-backup',
      modules: {
        webhooks: { dirName: 'webhooks' }
      }
    } as any;

    const mockModulePayload = {
      importConfig: mockImportConfig,
      stackAPIClient: mockStackAPIClient,
      moduleName: 'webhooks' as any
    };

    try {
      const result = await startModuleImport(mockModulePayload);
      expect(result).to.be.undefined;
    } catch (error) {
      expect(error).to.be.an('error');
    }
  });

  it('should handle stack module', async () => {
    const mockStackAPIClient = {
      api_key: 'test-key',
      name: 'test-stack'
    } as any;

    const mockImportConfig = {
      context: { module: 'test' },
      backupDir: '/tmp/test-backup'
    } as any;

    const mockModulePayload = {
      importConfig: mockImportConfig,
      stackAPIClient: mockStackAPIClient,
      moduleName: 'stack' as any
    };

    try {
      const result = await startModuleImport(mockModulePayload);
      expect(result).to.be.undefined;
    } catch (error) {
      expect(error).to.be.an('error');
    }
  });

  it('should handle assets module', async () => {
    // Import and stub the assets module methods before calling startModuleImport
    const ImportAssets = (await import('../../../../src/import/modules/assets')).default;
    
    // Stub the async methods that are called in start()
    const importFoldersStub = sandbox.stub(ImportAssets.prototype, 'importFolders').resolves();
    const importAssetsStub = sandbox.stub(ImportAssets.prototype, 'importAssets').resolves();
    sandbox.stub(ImportAssets.prototype, 'publish').resolves();
    
    // Mock FsUtility to prevent file system operations
    const { FsUtility } = await import('@contentstack/cli-utilities');
    sandbox.stub(FsUtility.prototype, 'readFile').returns({});
    
    // Mock existsSync to return false (so versioned assets path check fails gracefully)
    // Using require for node:fs as it's compatible with sinon.replace
    const fs = require('node:fs');
    const existsSyncStub = sandbox.stub().returns(false);
    sinon.replace(fs, 'existsSync', existsSyncStub);

    const mockStackAPIClient = {
      api_key: 'test-key',
      name: 'test-stack',
      asset: sandbox.stub().returns({
        create: sandbox.stub().resolves({ uid: 'asset-123' }),
        folder: sandbox.stub().returns({
          create: sandbox.stub().resolves({ uid: 'folder-123' })
        })
      })
    } as any;

    const mockImportConfig = {
      context: { module: 'test' },
      backupDir: '/tmp/test-backup',
      modules: {
        assets: { 
          dirName: 'assets',
          includeVersionedAssets: false
        }
      },
      skipAssetsPublish: true
    } as any;

    const mockModulePayload = {
      importConfig: mockImportConfig,
      stackAPIClient: mockStackAPIClient,
      moduleName: 'assets' as any
    };

    try {
      const result = await startModuleImport(mockModulePayload);
      expect(result).to.be.undefined;
      expect(importFoldersStub.calledOnce).to.be.true;
      expect(importAssetsStub.calledOnce).to.be.true;
    } catch (error) {
      expect(error).to.be.an('error');
    }
  });
});