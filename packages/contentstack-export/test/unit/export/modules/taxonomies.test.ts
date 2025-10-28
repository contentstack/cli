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
              { uid: 'taxonomy-2', name: 'Tag' }
            ],
            count: 2
          })
        })
      })
    };

    mockExportConfig = {
      contentVersion: 1,
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
        authenticationMethod: 'Basic Auth'
      },
      cliLogsPath: '/test/logs',
      forceStopMarketplaceAppsPrompt: false,
      master_locale: { code: 'en-us' },
      region: {
        name: 'us',
        cma: 'https://api.contentstack.io',
        cda: 'https://cdn.contentstack.io',
        uiHost: 'https://app.contentstack.com'
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
      onlyTSModules: [],
      modules: {
        types: ['taxonomies'],
        taxonomies: {
          dirName: 'taxonomies',
          fileName: 'taxonomies.json',
          invalidKeys: [],
          limit: 100
        }
      }
    } as any;

    exportTaxonomies = new ExportTaxonomies({
      exportConfig: mockExportConfig,
      stackAPIClient: mockStackClient,
      moduleName: 'taxonomies'
    });

    sinon.stub(FsUtility.prototype, 'writeFile').resolves();
    sinon.stub(FsUtility.prototype, 'makeDirectory').resolves();
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

  describe('getAllTaxonomies() method', () => {
    it('should fetch and process taxonomies correctly', async () => {
      const taxonomies = [
        { uid: 'taxonomy-1', name: 'Category', invalidField: 'remove' },
        { uid: 'taxonomy-2', name: 'Tag', invalidField: 'remove' }
      ];

      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: taxonomies,
            count: 2
          })
        })
      });

      await exportTaxonomies.getAllTaxonomies();
      
      // Verify taxonomies were processed
      expect(Object.keys(exportTaxonomies.taxonomies).length).to.equal(2);
      expect(exportTaxonomies.taxonomies['taxonomy-1']).to.exist;
      expect(exportTaxonomies.taxonomies['taxonomy-1'].name).to.equal('Category');
    });

    it('should call getAllTaxonomies recursively when more taxonomies exist', async () => {
      let callCount = 0;
      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().callsFake(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                items: Array(100).fill({ uid: `taxonomy-${callCount}`, name: 'Test' }),
                count: 150
              });
            } else {
              return Promise.resolve({
                items: Array(50).fill({ uid: `taxonomy-${callCount}`, name: 'Test' }),
                count: 150
              });
            }
          })
        })
      });

      await exportTaxonomies.getAllTaxonomies();
      
      // Verify multiple calls were made
      expect(callCount).to.be.greaterThan(1);
    });
  });

  describe('start() method', () => {
    it('should complete full export flow and call makeAPICall for each taxonomy', async () => {
      const mockMakeAPICall = sinon.stub(exportTaxonomies, 'makeAPICall').resolves();
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;
      
      // Mock getAllTaxonomies to return one taxonomy
      const mockTaxonomy = {
        uid: 'taxonomy-1',
        name: 'Category'
      };
      
      // Mock the API call to return taxonomies
      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [mockTaxonomy],
            count: 1
          })
        })
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
            count: 0
          })
        })
      });

      exportTaxonomies.taxonomies = {};
      await exportTaxonomies.start();
      
      // Verify makeAPICall was NOT called when taxonomies are empty
      expect(mockMakeAPICall.called).to.be.false;
      
      mockMakeAPICall.restore();
    });
  });

  describe('getAllTaxonomies() method - edge cases', () => {
    it('should handle no items response and not process taxonomies', async () => {
      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [],
            count: 0
          })
        })
      });

      const initialCount = Object.keys(exportTaxonomies.taxonomies).length;
      await exportTaxonomies.getAllTaxonomies();
      
      // Verify no new taxonomies were added
      expect(Object.keys(exportTaxonomies.taxonomies).length).to.equal(initialCount);
    });

    it('should handle empty taxonomies array gracefully', async () => {
      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: null,
            count: 0
          })
        })
      });

      const initialCount = Object.keys(exportTaxonomies.taxonomies).length;
      await exportTaxonomies.getAllTaxonomies();
      
      // Verify no processing occurred with null items
      expect(Object.keys(exportTaxonomies.taxonomies).length).to.equal(initialCount);
    });

    it('should handle API errors gracefully without crashing', async () => {
      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().rejects(new Error('API Error'))
        })
      });

      await exportTaxonomies.getAllTaxonomies();
      
      // Verify method completes without throwing
      expect(exportTaxonomies.taxonomies).to.exist;
    });

    it('should handle count undefined scenario and use items length', async () => {
      const taxonomies = [{ uid: 'taxonomy-1', name: 'Category' }];
      
      mockStackClient.taxonomy.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: taxonomies,
            count: undefined
          })
        })
      });

      await exportTaxonomies.getAllTaxonomies();
      
      // Verify taxonomies were still processed despite undefined count
      expect(exportTaxonomies.taxonomies['taxonomy-1']).to.exist;
    });
  });

  describe('sanitizeTaxonomiesAttribs() method', () => {
    it('should sanitize taxonomy attributes', () => {
      const taxonomies = [
        { uid: 'taxonomy-1', name: 'Category', invalidField: 'remove' },
        { uid: 'taxonomy-2', name: 'Tag', invalidField: 'remove' }
      ];

      exportTaxonomies.sanitizeTaxonomiesAttribs(taxonomies);

      expect(exportTaxonomies.taxonomies['taxonomy-1']).to.exist;
      expect(exportTaxonomies.taxonomies['taxonomy-1'].name).to.equal('Category');
    });

    it('should handle taxonomies without name field', () => {
      const taxonomies = [
        { uid: 'taxonomy-1', invalidField: 'remove' }
      ];

      exportTaxonomies.sanitizeTaxonomiesAttribs(taxonomies);

      expect(exportTaxonomies.taxonomies['taxonomy-1']).to.exist;
    });

    it('should handle empty taxonomies array', () => {
      const taxonomies: any[] = [];

      exportTaxonomies.sanitizeTaxonomiesAttribs(taxonomies);

      expect(Object.keys(exportTaxonomies.taxonomies).length).to.equal(0);
    });
  });
});

