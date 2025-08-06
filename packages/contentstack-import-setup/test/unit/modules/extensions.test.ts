import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import ExtensionsImportSetup from '../../../src/import/modules/extensions';
import * as loggerModule from '../../../src/utils/logger';
import * as fsUtilModule from '../../../src/utils/file-helper';
import { ImportConfig } from '../../../src/types';

describe('ExtensionsImportSetup', () => {
  let extensionsSetup: ExtensionsImportSetup;
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
    selectedModules: ['extensions'],
    backupDir: '/path/to/backup',
    contentVersion: 1,
    region: 'us',
    fetchConcurrency: 2,
    writeConcurrency: 1,
    modules: {
      extensions: {
        dirName: 'extensions',
        fileName: 'extensions',
        dependencies: [],
      },
    } as any,
  };

  beforeEach(() => {
    restore();

    mockStackAPIClient = {
      extension: stub().returns({
        query: stub().returnsThis(),
        find: stub().resolves({ items: [] }),
      }),
    };

    logStub = stub(loggerModule, 'log');
    makeDirStub = stub(fsUtilModule, 'makeDirectory');
    writeFileStub = stub(fsUtilModule, 'writeFile');

    extensionsSetup = new ExtensionsImportSetup({
      config: baseConfig as ImportConfig,
      stackAPIClient: mockStackAPIClient,
      dependencies: {} as any,
    });
  });

  afterEach(() => {
    restore();
  });

  it('should initialize with the correct configuration', () => {
    expect((extensionsSetup as any).config).to.equal(baseConfig);
    expect((extensionsSetup as any).stackAPIClient).to.equal(mockStackAPIClient);
  });
});
