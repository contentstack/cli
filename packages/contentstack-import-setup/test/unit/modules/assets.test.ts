import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import AssetImportSetup from '../../../src/import/modules/assets';
import * as loggerModule from '../../../src/utils/logger';
import * as fsUtilModule from '../../../src/utils/file-helper';
import { ImportConfig } from '../../../src/types';
import * as path from 'path';
import { sanitizePath } from '@contentstack/cli-utilities';

describe('AssetImportSetup', () => {
  let assetSetup: AssetImportSetup;
  let mockStackAPIClient: any;
  let logStub: SinonStub;
  let makeDirStub: SinonStub;
  let writeFileStub: SinonStub;

  const baseConfig: Partial<ImportConfig> = {
    contentDir: '/path/to/content',
    data: '/path/to/content',
    apiKey: 'test-api-key',
    forceStopMarketplaceAppsPrompt: false,
    master_locale: { code: 'en-us' },
    masterLocale: { code: 'en-us' },
    branchName: '',
    selectedModules: ['assets'],
    backupDir: '/path/to/backup',
    contentVersion: 1,
    region: 'us',
    fetchConcurrency: 2,
    writeConcurrency: 1,
    modules: {
      assets: {
        fetchConcurrency: 2,
        dirName: 'assets',
        fileName: 'assets',
      },
    } as any,
  };

  beforeEach(() => {
    restore();

    mockStackAPIClient = {
      asset: stub().returns({
        query: stub().returnsThis(),
        find: stub().resolves({ items: [] }),
      }),
    };

    logStub = stub(loggerModule, 'log');
    makeDirStub = stub(fsUtilModule, 'makeDirectory');
    writeFileStub = stub(fsUtilModule, 'writeFile');

    assetSetup = new AssetImportSetup({
      config: baseConfig as ImportConfig,
      stackAPIClient: mockStackAPIClient,
      dependencies: {} as any,
    });
  });

  afterEach(() => {
    restore();
  });

  it('should initialize with the correct paths', () => {
    expect((assetSetup as any).assetsFolderPath).to.equal(path.join(sanitizePath('/path/to/content'), 'assets'));
    expect((assetSetup as any).assetsFilePath).to.equal(
      path.join(sanitizePath('/path/to/content'), 'assets', 'assets.json'),
    );
    expect((assetSetup as any).mapperDirPath).to.equal(path.join(sanitizePath('/path/to/backup'), 'mapper', 'assets'));
  });

  //   it('should create mapper directory during start', async () => {
  //     // Stub fetchAndMapAssets to avoid actual implementation
  //     const fetchAndMapStub = stub(assetSetup as any, 'fetchAndMapAssets').resolves();

  //     await assetSetup.start();

  //     expect(makeDirStub.calledOnce).to.be.true;
  //     expect(makeDirStub.firstCall.args[0]).to.equal((assetSetup as any).mapperDirPath);
  //     expect(fetchAndMapStub.calledOnce).to.be.true;
  //   });

  it('should log success message after setup', async () => {
    // Stub fetchAndMapAssets to avoid actual implementation
    stub(assetSetup as any, 'fetchAndMapAssets').resolves();

    await assetSetup.start();

    expect(logStub.calledOnce).to.be.true;
    expect(logStub.firstCall.args[1]).to.include('successfully');
    expect(logStub.firstCall.args[2]).to.equal('success');
  });

  it('should handle errors during start process', async () => {
    const testError = new Error('Test error');
    stub(assetSetup as any, 'fetchAndMapAssets').rejects(testError);

    await assetSetup.start();

    expect(logStub.calledOnce).to.be.true;
    expect(logStub.firstCall.args[1]).to.include('Error occurred');
    expect(logStub.firstCall.args[2]).to.equal('error');
  });

  //   it('should write mapper files when assets are found', async () => {
  //     // Set up the asset mappers with test data
  //     (assetSetup as any).assetUidMapper = { 'old-uid': 'new-uid' };
  //     (assetSetup as any).assetUrlMapper = { 'old-url': 'new-url' };

  //     // Call the method directly
  //     await (assetSetup as any).fetchAndMapAssets();

  //     // Check that writeFile was called twice (once for each mapper)
  //     expect(writeFileStub.calledTwice).to.be.true;
  //   });

  //   it('should write duplicate assets file when duplicates are found', async () => {
  //     // Set up the duplicate assets with test data
  //     (assetSetup as any).duplicateAssets = { 'asset-uid': [{ uid: 'dup1', title: 'Duplicate 1' }] };

  //     // Call the method directly
  //     await (assetSetup as any).fetchAndMapAssets();

  //     // Check that writeFile was called for duplicate assets
  //     expect(writeFileStub.calledWith((assetSetup as any).duplicateAssetPath)).to.be.true;
  //     // expect(logStub.calledWith(baseConfig, sinon.match.string, 'info')).to.be.true;
  //   });
});
