import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import TaxonomiesImportSetup from '../../../src/import/modules/taxonomies';
import * as loggerModule from '../../../src/utils/logger';
import * as fsUtilModule from '../../../src/utils/file-helper';
import { ImportConfig } from '../../../src/types';
import * as path from 'path';
import { sanitizePath } from '@contentstack/cli-utilities';

describe('TaxonomiesImportSetup', () => {
  let taxonomiesSetup: TaxonomiesImportSetup;
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
    selectedModules: ['taxonomies'],
    backupDir: '/path/to/backup',
    contentVersion: 1,
    region: 'us',
    fetchConcurrency: 2,
    writeConcurrency: 1,
    modules: {
      taxonomies: {
        dirName: 'taxonomies',
        fileName: 'taxonomies',
        dependencies: [],
        invalidKeys: [],
      },
    } as any,
  };

  beforeEach(() => {
    restore();

    mockStackAPIClient = {
      taxonomy: stub().returns({
        query: stub().returnsThis(),
        find: stub().resolves({ items: [] }),
      }),
    };

    logStub = stub(loggerModule, 'log');
    makeDirStub = stub(fsUtilModule, 'makeDirectory');
    writeFileStub = stub(fsUtilModule, 'writeFile');

    taxonomiesSetup = new TaxonomiesImportSetup({
      config: baseConfig as ImportConfig,
      stackAPIClient: mockStackAPIClient,
      dependencies: {} as any,
    });
  });

  afterEach(() => {
    restore();
  });

  it('should initialize with the correct configuration', () => {
    expect((taxonomiesSetup as any).config).to.equal(baseConfig);
    expect((taxonomiesSetup as any).stackAPIClient).to.equal(mockStackAPIClient);
  });
});
