import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import MarketplaceAppsImportSetup from '../../../src/import/modules/marketplace-apps';
import * as loggerModule from '../../../src/utils/logger';
import * as fsUtilModule from '../../../src/utils/file-helper';
import { ImportConfig } from '../../../src/types';

describe('MarketplaceAppsImportSetup', () => {
  let marketplaceAppsSetup: MarketplaceAppsImportSetup;
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
    selectedModules: ['marketplace-apps'],
    backupDir: '/path/to/backup',
    contentVersion: 1,
    region: 'us',
    fetchConcurrency: 2,
    writeConcurrency: 1,
    modules: {
      'marketplace-apps': {
        dirName: 'marketplace-apps',
        fileName: 'marketplace-apps',
        dependencies: [],
      },
    } as any,
  };

  beforeEach(() => {
    restore();

    mockStackAPIClient = {
      marketplace: stub().returns({
        app: stub().returns({
          query: stub().returnsThis(),
          find: stub().resolves({ items: [] }),
        }),
      }),
    };

    logStub = stub(loggerModule, 'log');
    makeDirStub = stub(fsUtilModule, 'makeDirectory');
    writeFileStub = stub(fsUtilModule, 'writeFile');

    marketplaceAppsSetup = new MarketplaceAppsImportSetup({
      config: baseConfig as ImportConfig,
      stackAPIClient: mockStackAPIClient,
      dependencies: {} as any,
    });
  });

  afterEach(() => {
    restore();
  });

  it('should initialize with the correct configuration', () => {
    expect((marketplaceAppsSetup as any).config).to.equal(baseConfig);
    expect((marketplaceAppsSetup as any).stackAPIClient).to.equal(mockStackAPIClient);
  });
});
