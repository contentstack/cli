import { expect } from 'chai';
import sinon from 'sinon';
import { FsUtility } from '@contentstack/cli-utilities';
import ExportTaxonomies from '../../../../src/export/modules/taxonomies';
import ExportConfig from '../../../../src/types/export-config';

describe('ExportTaxonomies', () => {
  let exportTaxonomies: any;
  let mockStackClient: any;
  let mockExportConfig: ExportConfig;

  beforeEach(() => {
    mockStackClient = {
      taxonomy: sinon.stub().returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [
              { uid: 'taxonomy-1', name: 'Category' },
              { uid: 'taxonomy-2', name: 'Tag' },
            ],
            count: 2,
          }),
        }),
      }),
    };

    mockExportConfig = {
      versioning: false,
      host: 'https://api.contentstack.io',
      developerHubUrls: {},
      apiKey: 'test-api-key',
      exportDir: '/test/export',
      data: '/test/data',
      branchName: '',
      context: {
        command: 'cm:stacks:export',
        module: 'taxonomies',
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-123',
        apiKey: 'test-api-key',
        orgId: 'org-123',
        authenticationMethod: 'Basic Auth',
      },
      cliLogsPath: '/test/logs',
      forceStopMarketplaceAppsPrompt: false,
      master_locale: { code: 'en-us' },
      region: {
        name: 'us',
        cma: 'https://api.contentstack.io',
        cda: 'https://cdn.contentstack.io',
        uiHost: 'https://app.contentstack.com',
      },
      skipStackSettings: false,
      skipDependencies: false,
      languagesCode: ['en'],
      apis: {},
      preserveStackVersion: false,
      personalizationEnabled: false,
      fetchConcurrency: 5,
      writeConcurrency: 5,
      developerHubBaseUrl: '',
      marketplaceAppEncryptionKey: '',
      modules: {
        types: ['taxonomies'],
        taxonomies: {
          dirName: 'taxonomies',
          fileName: 'taxonomies.json',
          invalidKeys: [],
          limit: 100,
        },
        locales: {
          dirName: 'locales',
          fileName: 'locales.json',
          requiredKeys: ['code', 'uid', 'name', 'fallback_locale'],
        },
      },
    } as any;

    exportTaxonomies = new ExportTaxonomies({
      exportConfig: mockExportConfig,
      stackAPIClient: mockStackClient,
      moduleName: 'taxonomies',
    });

    sinon.stub(FsUtility.prototype, 'writeFile').resolves();
    sinon.stub(FsUtility.prototype, 'makeDirectory').resolves();
    sinon.stub(FsUtility.prototype, 'readFile').resolves({});
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(exportTaxonomies).to.be.instanceOf(ExportTaxonomies);
    });

    it('should initialize taxonomies object', () => {
      expect(exportTaxonomies.taxonomies).to.be.an('object');
    });

    it('should set context module to taxonomies', () => {
      expect(exportTaxonomies.exportConfig.context.module).to.equal('taxonomies');
    });
  });

  describe('fetchTaxonomies() method', () => {
    it('should fetch and process taxonomies correctly', async () => {
      const taxonomies = [
        { uid: 'taxonomy-1', name: 'Category', invalidField: 'remove' },
        { uid: 'taxonomy-2', name: 'Tag', invalidField: 'remove' },
      ];

      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: taxonomies,
            count: 2,
          }),
        }),
      });

      await exportTaxonomies.fetchTaxonomies();

      // Verify taxonomies were processed
      expect(Object.keys(exportTaxonomies.taxonomies).length).to.equal(2);
      expect(exportTaxonomies.taxonomies['taxonomy-1']).to.exist;
      expect(exportTaxonomies.taxonomies['taxonomy-1'].name).to.equal('Category');
    });

    it('should call fetchTaxonomies recursively when more taxonomies exist', async () => {
      let callCount = 0;
      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().callsFake(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                items: Array(100).fill({ uid: `taxonomy-${callCount}`, name: 'Test' }),
                count: 150,
              });
            } else {
              return Promise.resolve({
                items: Array(50).fill({ uid: `taxonomy-${callCount}`, name: 'Test' }),
                count: 150,
              });
            }
          }),
        }),
      });

      await exportTaxonomies.fetchTaxonomies();

      // Verify multiple calls were made
      expect(callCount).to.be.greaterThan(1);
    });
  });

  describe('start() method', () => {
    it('should complete full export flow and call makeAPICall for each taxonomy', async () => {
      const mockMakeAPICall = sinon.stub(exportTaxonomies, 'makeAPICall').resolves();
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;

      // Mock fetchTaxonomies to return one taxonomy
      const mockTaxonomy = {
        uid: 'taxonomy-1',
        name: 'Category',
      };

      // Mock the API call to return taxonomies
      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [mockTaxonomy],
            count: 1,
          }),
        }),
      });

      await exportTaxonomies.start();

      // Verify makeAPICall was called for the taxonomy
      expect(mockMakeAPICall.called).to.be.true;
      expect(mockMakeAPICall.callCount).to.equal(1);
      // Verify writeFile was called for taxonomies.json
      expect(writeFileStub.called).to.be.true;

      mockMakeAPICall.restore();
    });

    it('should handle empty taxonomies and not call makeAPICall', async () => {
      const mockMakeAPICall = sinon.stub(exportTaxonomies, 'makeAPICall').resolves();

      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [],
            count: 0,
          }),
        }),
      });

      exportTaxonomies.taxonomies = {};
      await exportTaxonomies.start();

      // Verify makeAPICall was NOT called when taxonomies are empty
      expect(mockMakeAPICall.called).to.be.false;

      mockMakeAPICall.restore();
    });
  });

  describe('fetchTaxonomies() method - edge cases', () => {
    it('should handle no items response and not process taxonomies', async () => {
      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [],
            count: 0,
          }),
        }),
      });

      const initialCount = Object.keys(exportTaxonomies.taxonomies).length;
      await exportTaxonomies.fetchTaxonomies();

      // Verify no new taxonomies were added
      expect(Object.keys(exportTaxonomies.taxonomies).length).to.equal(initialCount);
    });

    it('should handle empty taxonomies array gracefully', async () => {
      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: null,
            count: 0,
          }),
        }),
      });

      const initialCount = Object.keys(exportTaxonomies.taxonomies).length;
      await exportTaxonomies.fetchTaxonomies();

      // Verify no processing occurred with null items
      expect(Object.keys(exportTaxonomies.taxonomies).length).to.equal(initialCount);
    });

    it('should handle API errors gracefully without crashing', async () => {
      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().rejects(new Error('API Error')),
        }),
      });

      await exportTaxonomies.fetchTaxonomies();

      // Verify method completes without throwing
      expect(exportTaxonomies.taxonomies).to.exist;
    });

    it('should handle count undefined scenario and use items length', async () => {
      const taxonomies = [{ uid: 'taxonomy-1', name: 'Category' }];

      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: taxonomies,
            count: undefined,
          }),
        }),
      });

      await exportTaxonomies.fetchTaxonomies();

      // Verify taxonomies were still processed despite undefined count
      expect(exportTaxonomies.taxonomies['taxonomy-1']).to.exist;
    });
  });

  describe('sanitizeTaxonomiesAttribs() method', () => {
    it('should sanitize taxonomy attributes', () => {
      const taxonomies = [
        { uid: 'taxonomy-1', name: 'Category', invalidField: 'remove' },
        { uid: 'taxonomy-2', name: 'Tag', invalidField: 'remove' },
      ];

      exportTaxonomies.sanitizeTaxonomiesAttribs(taxonomies);

      expect(exportTaxonomies.taxonomies['taxonomy-1']).to.exist;
      expect(exportTaxonomies.taxonomies['taxonomy-1'].name).to.equal('Category');
    });

    it('should handle taxonomies without name field', () => {
      const taxonomies = [{ uid: 'taxonomy-1', invalidField: 'remove' }];

      exportTaxonomies.sanitizeTaxonomiesAttribs(taxonomies);

      expect(exportTaxonomies.taxonomies['taxonomy-1']).to.exist;
    });

    it('should handle empty taxonomies array', () => {
      const taxonomies: any[] = [];

      exportTaxonomies.sanitizeTaxonomiesAttribs(taxonomies);

      expect(Object.keys(exportTaxonomies.taxonomies).length).to.equal(0);
    });

    //   const taxonomies = [
    //     { uid: 'taxonomy-1', name: 'Category' },
    //     { uid: 'taxonomy-2', name: 'Tag' }
    //   ];

    //   exportTaxonomies.sanitizeTaxonomiesAttribs(taxonomies, 'en-us');

    //   expect(exportTaxonomies.taxonomies['taxonomy-1']).to.exist;
    //   expect(exportTaxonomies.taxonomies['taxonomy-2']).to.exist;
    //   // Verify taxonomies are tracked by locale
    //   expect(exportTaxonomies.taxonomiesByLocale['en-us']).to.exist;
    //   expect(exportTaxonomies.taxonomiesByLocale['en-us'].has('taxonomy-1')).to.be.true;
    //   expect(exportTaxonomies.taxonomiesByLocale['en-us'].has('taxonomy-2')).to.be.true;
    // });

    it('should not duplicate taxonomy metadata when processing same taxonomy multiple times', () => {
      const taxonomies1 = [{ uid: 'taxonomy-1', name: 'Category', field1: 'value1' }];
      const taxonomies2 = [{ uid: 'taxonomy-1', name: 'Category', field2: 'value2' }];

      exportTaxonomies.sanitizeTaxonomiesAttribs(taxonomies1);
      exportTaxonomies.sanitizeTaxonomiesAttribs(taxonomies2);

      // Should only have one entry for taxonomy-1
      expect(Object.keys(exportTaxonomies.taxonomies).length).to.equal(1);
      // Should have the first processed version (field1, not field2)
      expect(exportTaxonomies.taxonomies['taxonomy-1'].field1).to.equal('value1');
      expect(exportTaxonomies.taxonomies['taxonomy-1'].field2).to.be.undefined;
    });
  });

  describe('getLocalesToExport() method', () => {
    it('should return master locale when no locales file exists', () => {
      const readFileStub = FsUtility.prototype.readFile as sinon.SinonStub;
      readFileStub.throws(new Error('File not found'));

      const locales = exportTaxonomies.getLocalesToExport();

      expect(locales).to.be.an('array');
      expect(locales.length).to.equal(1);
      expect(locales[0]).to.equal('en-us'); // master locale
    });

    //   const localesData = {
    //     'locale-1': { code: 'en-us', name: 'English' },
    //     'locale-2': { code: 'es-es', name: 'Spanish' },
    //     'locale-3': { code: 'fr-fr', name: 'French' }
    //   };
    //   const readFileStub = FsUtility.prototype.readFile as sinon.SinonStub;
    //   readFileStub.returns(localesData);

    //   const locales = exportTaxonomies.getLocalesToExport();

    //   expect(locales.length).to.equal(4); // 3 from file + 1 master locale
    //   expect(locales).to.include('en-us');
    //   expect(locales).to.include('es-es');
    //   expect(locales).to.include('fr-fr');
    // });

    it('should handle locales file with missing code field', () => {
      const localesData = {
        'locale-1': { name: 'English' }, // missing code
        'locale-2': { code: 'es-es', name: 'Spanish' },
      };
      const readFileStub = FsUtility.prototype.readFile as sinon.SinonStub;
      readFileStub.returns(localesData);

      const locales = exportTaxonomies.getLocalesToExport();

      // Should only include locales with code field
      expect(locales.length).to.equal(2); // 1 from file + 1 master locale
      expect(locales).to.include('en-us');
      expect(locales).to.include('es-es');
    });

    it('should deduplicate locales with same code', () => {
      const localesData = {
        'locale-1': { code: 'en-us', name: 'English US' },
        'locale-2': { code: 'en-us', name: 'English UK' }, // duplicate code
        'locale-3': { code: 'es-es', name: 'Spanish' },
      };
      const readFileStub = FsUtility.prototype.readFile as sinon.SinonStub;
      readFileStub.returns(localesData);

      const locales = exportTaxonomies.getLocalesToExport();

      // Should deduplicate en-us
      expect(locales.length).to.equal(2); // 1 unique from file + 1 master locale (but master is also en-us, so total 2)
      expect(locales).to.include('en-us');
      expect(locales).to.include('es-es');
    });

    it('should handle empty locales file', () => {
      const readFileStub = FsUtility.prototype.readFile as sinon.SinonStub;
      readFileStub.returns({});

      const locales = exportTaxonomies.getLocalesToExport();

      expect(locales.length).to.equal(1); // Only master locale
      expect(locales[0]).to.equal('en-us');
    });
  });

  describe('processLocaleExport() method', () => {
    it('should export taxonomies for locale when taxonomies exist', async () => {
      const exportTaxonomiesStub = sinon.stub(exportTaxonomies, 'exportTaxonomies').resolves();
      exportTaxonomies.taxonomiesByLocale['en-us'] = new Set(['taxonomy-1', 'taxonomy-2']);

      await exportTaxonomies.processLocaleExport('en-us');

      expect(exportTaxonomiesStub.called).to.be.true;
      expect(exportTaxonomiesStub.calledWith('en-us')).to.be.true;

      exportTaxonomiesStub.restore();
    });

    it('should skip export when no taxonomies exist for locale', async () => {
      const exportTaxonomiesStub = sinon.stub(exportTaxonomies, 'exportTaxonomies').resolves();
      exportTaxonomies.taxonomiesByLocale['en-us'] = new Set();

      await exportTaxonomies.processLocaleExport('en-us');

      expect(exportTaxonomiesStub.called).to.be.false;

      exportTaxonomiesStub.restore();
    });

    it('should handle locale with undefined taxonomies set', async () => {
      const exportTaxonomiesStub = sinon.stub(exportTaxonomies, 'exportTaxonomies').resolves();
      exportTaxonomies.taxonomiesByLocale['en-us'] = undefined as any;

      await exportTaxonomies.processLocaleExport('en-us');

      expect(exportTaxonomiesStub.called).to.be.false;

      exportTaxonomiesStub.restore();
    });
  });

  describe('writeTaxonomiesMetadata() method', () => {
    it('should skip writing when taxonomies object is empty', () => {
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;
      exportTaxonomies.taxonomies = {};

      exportTaxonomies.writeTaxonomiesMetadata();

      expect(writeFileStub.called).to.be.false;
    });

    it('should skip writing when taxonomies is null or undefined', () => {
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;
      exportTaxonomies.taxonomies = null as any;

      exportTaxonomies.writeTaxonomiesMetadata();

      expect(writeFileStub.called).to.be.false;
    });
  });

  describe('fetchTaxonomies() method - locale-based export', () => {
    it('should fetch taxonomies with locale code', async () => {
      const taxonomies = [
        { uid: 'taxonomy-1', name: 'Category', locale: 'en-us' },
        { uid: 'taxonomy-2', name: 'Tag', locale: 'en-us' },
      ];

      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: taxonomies,
            count: 2,
          }),
        }),
      });

      await exportTaxonomies.fetchTaxonomies('en-us');

      expect(Object.keys(exportTaxonomies.taxonomies).length).to.equal(2);
      expect(exportTaxonomies.taxonomiesByLocale['en-us']).to.exist;
      expect(exportTaxonomies.taxonomiesByLocale['en-us'].has('taxonomy-1')).to.be.true;
    });

    it('should detect locale-based export support when items have locale field', async () => {
      const taxonomies = [{ uid: 'taxonomy-1', name: 'Category', locale: 'en-us' }];

      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: taxonomies,
            count: 1,
          }),
        }),
      });

      await exportTaxonomies.fetchTaxonomies('en-us', true);

      // Should support locale-based export when items have locale field
      expect(exportTaxonomies.isLocaleBasedExportSupported).to.be.true;
    });

    it('should disable locale-based export when items lack locale field', async () => {
      const taxonomies = [
        { uid: 'taxonomy-1', name: 'Category' }, // no locale field
      ];

      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: taxonomies,
            count: 1,
          }),
        }),
      });

      await exportTaxonomies.fetchTaxonomies('en-us', true);

      // Should disable locale-based export when items lack locale field
      expect(exportTaxonomies.isLocaleBasedExportSupported).to.be.false;
    });

    it('should disable locale-based export on API error when checkLocaleSupport is true', async () => {
      // Create a structured API error (not a plan limitation error)
      const apiError: any = new Error('API Error');
      apiError.status = 500;
      apiError.errors = { general: ['Internal server error'] };

      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().rejects(apiError),
        }),
      });

      await exportTaxonomies.fetchTaxonomies('en-us', true);

      // Should disable locale-based export on error
      expect(exportTaxonomies.isLocaleBasedExportSupported).to.be.false;
    });

    it('should handle taxonomy localization plan limitation error gracefully', async () => {
      // Create the exact 403 error from the plan limitation
      const planLimitationError: any = new Error('Forbidden');
      planLimitationError.status = 403;
      planLimitationError.statusText = 'Forbidden';
      planLimitationError.errors = {
        taxonomies: [
          'Taxonomy localization is not included in your plan. Please contact the support@contentstack.com team for assistance.',
        ],
      };

      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().rejects(planLimitationError),
        }),
      });

      await exportTaxonomies.fetchTaxonomies('en-us', true);

      // Should disable locale-based export and not throw error
      expect(exportTaxonomies.isLocaleBasedExportSupported).to.be.false;
    });
  });

  describe('exportTaxonomies() method - locale-based export', () => {
    it('should skip export when no taxonomies for locale', async () => {
      const mockMakeAPICall = sinon.stub(exportTaxonomies, 'makeAPICall').resolves();
      exportTaxonomies.taxonomiesByLocale['en-us'] = new Set();

      await exportTaxonomies.exportTaxonomies('en-us');

      expect(mockMakeAPICall.called).to.be.false;

      mockMakeAPICall.restore();
    });
  });

  describe('start() method - locale-based export scenarios', () => {
    it('should use legacy export when locale-based export is not supported', async () => {
      const mockFetchTaxonomies = sinon
        .stub(exportTaxonomies, 'fetchTaxonomies')
        .callsFake(async (locale, checkSupport) => {
          if (checkSupport) {
            exportTaxonomies.isLocaleBasedExportSupported = false;
          }
        });
      const mockExportTaxonomies = sinon.stub(exportTaxonomies, 'exportTaxonomies').resolves();
      const mockWriteMetadata = sinon.stub(exportTaxonomies, 'writeTaxonomiesMetadata').resolves();
      const mockGetLocales = sinon.stub(exportTaxonomies, 'getLocalesToExport').returns(['en-us']);

      await exportTaxonomies.start();

      // Should use legacy export (no locale parameter)
      expect(mockExportTaxonomies.called).to.be.true;
      expect(mockExportTaxonomies.calledWith()).to.be.true; // Called without locale
      expect(mockWriteMetadata.called).to.be.true;

      mockFetchTaxonomies.restore();
      mockExportTaxonomies.restore();
      mockWriteMetadata.restore();
      mockGetLocales.restore();
    });

    it('should clear taxonomies and re-fetch when falling back to legacy export', async () => {
      let fetchCallCount = 0;
      const mockFetchTaxonomies = sinon
        .stub(exportTaxonomies, 'fetchTaxonomies')
        .callsFake(async (locale, checkSupport) => {
          fetchCallCount++;
          if (checkSupport) {
            // First call fails locale check
            exportTaxonomies.isLocaleBasedExportSupported = false;
            exportTaxonomies.taxonomies = { 'partial-data': { uid: 'partial-data' } }; // Simulate partial data
          } else {
            // Second call should have cleared data
            expect(exportTaxonomies.taxonomies).to.deep.equal({});
          }
        });
      const mockExportTaxonomies = sinon.stub(exportTaxonomies, 'exportTaxonomies').resolves();
      const mockWriteMetadata = sinon.stub(exportTaxonomies, 'writeTaxonomiesMetadata').resolves();
      const mockGetLocales = sinon.stub(exportTaxonomies, 'getLocalesToExport').returns(['en-us']);

      await exportTaxonomies.start();

      // Should call fetchTaxonomies twice: once for check, once for legacy
      expect(fetchCallCount).to.equal(2);
      // First call with locale, second without
      expect(mockFetchTaxonomies.firstCall.args).to.deep.equal(['en-us', true]);
      expect(mockFetchTaxonomies.secondCall.args).to.deep.equal([]);

      mockFetchTaxonomies.restore();
      mockExportTaxonomies.restore();
      mockWriteMetadata.restore();
      mockGetLocales.restore();
    });

    it('should use locale-based export when supported', async () => {
      const mockFetchTaxonomies = sinon
        .stub(exportTaxonomies, 'fetchTaxonomies')
        .callsFake(async (locale, checkSupport) => {
          if (checkSupport) {
            exportTaxonomies.isLocaleBasedExportSupported = true;
          }
          if (locale && typeof locale === 'string' && !exportTaxonomies.taxonomiesByLocale[locale]) {
            exportTaxonomies.taxonomiesByLocale[locale] = new Set(['taxonomy-1']);
          }
        });
      const mockProcessLocale = sinon.stub(exportTaxonomies, 'processLocaleExport').resolves();
      const mockWriteMetadata = sinon.stub(exportTaxonomies, 'writeTaxonomiesMetadata').resolves();
      const mockGetLocales = sinon.stub(exportTaxonomies, 'getLocalesToExport').returns(['en-us', 'es-es']);

      await exportTaxonomies.start();

      // Should process each locale
      expect(mockProcessLocale.called).to.be.true;
      expect(mockProcessLocale.callCount).to.equal(2); // Two locales
      expect(mockWriteMetadata.called).to.be.true;

      mockFetchTaxonomies.restore();
      mockProcessLocale.restore();
      mockWriteMetadata.restore();
      mockGetLocales.restore();
    });

    it('should return early when no locales to export', async () => {
      const mockGetLocales = sinon.stub(exportTaxonomies, 'getLocalesToExport').returns([]);
      const mockFetchTaxonomies = sinon.stub(exportTaxonomies, 'fetchTaxonomies').resolves();

      await exportTaxonomies.start();

      // Should not fetch taxonomies when no locales
      expect(mockFetchTaxonomies.called).to.be.false;

      mockGetLocales.restore();
      mockFetchTaxonomies.restore();
    });
  });
});
