import { expect } from 'chai';
import sinon from 'sinon';
import { FsUtility } from '@contentstack/cli-utilities';
import ExportContentTypes from '../../../../src/export/modules/content-types';
import ExportConfig from '../../../../src/types/export-config';

describe('ExportContentTypes', () => {
  let exportContentTypes: any;
  let mockStackClient: any;
  let mockExportConfig: ExportConfig;

  beforeEach(() => {
    mockStackClient = {
      contentType: sinon.stub().returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [
              { uid: 'ct-1', title: 'Content Type 1', description: 'Description', invalidKey: 'remove' },
              { uid: 'ct-2', title: 'Content Type 2', description: 'Description', invalidKey: 'remove' },
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
      contentTypes: [],
      context: {
        command: 'cm:stacks:export',
        module: 'content-types',
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
        types: ['content-types'],
        'content-types': {
          dirName: 'content_types',
          fileName: 'content_types.json',
          validKeys: ['uid', 'title', 'description', 'schema'],
          fetchConcurrency: 5,
          writeConcurrency: 5,
          limit: 100,
        },
      },
    } as any;

    exportContentTypes = new ExportContentTypes({
      exportConfig: mockExportConfig,
      stackAPIClient: mockStackClient,
      moduleName: 'content-types',
    });

    // Stub FsUtility methods
    sinon.stub(FsUtility.prototype, 'writeFile').resolves();
    sinon.stub(FsUtility.prototype, 'makeDirectory').resolves();
    // Stub FsUtility.prototype.readdir and readFile for readContentTypeSchemas support
    sinon.stub(FsUtility.prototype, 'readdir').returns([]);
    sinon.stub(FsUtility.prototype, 'readFile').returns(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(exportContentTypes).to.be.instanceOf(ExportContentTypes);
    });

    it('should set context module to content-types', () => {
      expect(exportContentTypes.exportConfig.context.module).to.equal('content-types');
    });

    it('should initialize contentTypesConfig', () => {
      expect(exportContentTypes.contentTypesConfig).to.exist;
      expect(exportContentTypes.contentTypesConfig.dirName).to.equal('content_types');
    });

    it('should initialize query params correctly', () => {
      expect((exportContentTypes as any).qs).to.deep.include({
        include_count: true,
        asc: 'updated_at',
        include_global_field_schema: true,
      });
    });

    it('should initialize empty contentTypes array', () => {
      expect(exportContentTypes.contentTypes).to.be.an('array');
      expect(exportContentTypes.contentTypes.length).to.equal(0);
    });

    it('should set uid filter when contentTypes are provided', () => {
      const configWithTypes = {
        ...mockExportConfig,
        contentTypes: ['ct-1', 'ct-2'],
      };

      const instance = new ExportContentTypes({
        exportConfig: configWithTypes,
        stackAPIClient: mockStackClient,
        moduleName: 'content-types',
      });

      expect((instance as any).qs.uid).to.deep.equal({ $in: ['ct-1', 'ct-2'] });
    });
  });

  describe('getContentTypes() method', () => {
    it('should fetch and process content types correctly', async () => {
      const contentTypes = [
        { uid: 'ct-1', title: 'Type 1', description: 'Desc', invalidKey: 'remove' },
        { uid: 'ct-2', title: 'Type 2', description: 'Desc', invalidKey: 'remove' },
      ];

      mockStackClient.contentType.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: contentTypes,
            count: 2,
          }),
        }),
      });

      await exportContentTypes.getContentTypes();

      // Verify content types were processed
      expect(exportContentTypes.contentTypes.length).to.equal(2);
      // Verify invalid keys were removed
      expect(exportContentTypes.contentTypes[0].invalidKey).to.be.undefined;
      expect(exportContentTypes.contentTypes[0].uid).to.equal('ct-1');
      expect(exportContentTypes.contentTypes[0].title).to.equal('Type 1');
    });

    it('should call getContentTypes recursively when more types exist', async () => {
      let callCount = 0;
      mockStackClient.contentType.returns({
        query: sinon.stub().returns({
          find: sinon.stub().callsFake(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                items: new Array(100).fill({ uid: 'test', title: 'Test', description: 'Desc' }),
                count: 150,
              });
            } else {
              return Promise.resolve({
                items: new Array(50).fill({ uid: 'test2', title: 'Test2', description: 'Desc' }),
                count: 150,
              });
            }
          }),
        }),
      });

      await exportContentTypes.getContentTypes();

      // Verify multiple calls were made
      expect(callCount).to.be.greaterThan(1);
      expect(exportContentTypes.contentTypes.length).to.equal(150);
    });

    it('should handle API errors and log them', async () => {
      mockStackClient.contentType.returns({
        query: sinon.stub().returns({
          find: sinon.stub().rejects(new Error('API Error')),
        }),
      });

      try {
        await exportContentTypes.getContentTypes();
      } catch (error: any) {
        expect(error).to.exist;
        expect(error.message).to.include('API Error');
      }
    });

    it('should handle no items response', async () => {
      mockStackClient.contentType.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [],
            count: 0,
          }),
        }),
      });

      const initialCount = exportContentTypes.contentTypes.length;
      await exportContentTypes.getContentTypes();

      // Verify no new content types were added
      expect(exportContentTypes.contentTypes.length).to.equal(initialCount);
    });

    it('should update query params with skip value', async () => {
      mockStackClient.contentType.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [{ uid: 'ct-1', title: 'Test', description: 'Desc' }],
            count: 1,
          }),
        }),
      });

      await exportContentTypes.getContentTypes(50);

      // Verify skip was set in query
      expect((exportContentTypes as any).qs.skip).to.equal(50);
    });
  });

  describe('sanitizeAttribs() method', () => {
    it('should sanitize content type attributes and remove invalid keys', () => {
      const contentTypes = [
        { uid: 'ct-1', title: 'Type 1', description: 'Desc', invalidKey: 'remove' },
        { uid: 'ct-2', title: 'Type 2', description: 'Desc', invalidKey: 'remove' },
      ];

      const result = exportContentTypes.sanitizeAttribs(contentTypes);

      // Verify invalid keys were removed
      expect(result[0].invalidKey).to.be.undefined;
      expect(result[0].uid).to.equal('ct-1');
      expect(result[0].title).to.equal('Type 1');
    });

    it('should handle content types without required keys', () => {
      const contentTypes = [{ uid: 'ct-1', invalidKey: 'remove' }];

      const result = exportContentTypes.sanitizeAttribs(contentTypes);

      expect(result[0]).to.exist;
      expect(result[0].invalidKey).to.be.undefined;
    });

    it('should handle empty content types array', () => {
      const contentTypes: any[] = [];

      const result = exportContentTypes.sanitizeAttribs(contentTypes);

      expect(result.length).to.equal(0);
    });
  });

  describe('writeContentTypes() method', () => {
    it('should write content types to individual files', async () => {
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;
      const contentTypes = [
        { uid: 'ct-1', title: 'Type 1', description: 'Desc' },
        { uid: 'ct-2', title: 'Type 2', description: 'Desc' },
      ];

      await exportContentTypes.writeContentTypes(contentTypes);

      // Verify writeFile was called (for individual files + schema file)
      expect(writeFileStub.called).to.be.true;
    });
  });

  describe('start() method', () => {
    it('should complete full export flow and write files', async () => {
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;
      const makeDirectoryStub = FsUtility.prototype.makeDirectory as sinon.SinonStub;

      const contentTypes = [
        { uid: 'ct-1', title: 'Type 1', description: 'Desc' },
        { uid: 'ct-2', title: 'Type 2', description: 'Desc' },
      ];

      mockStackClient.contentType.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: contentTypes,
            count: 2,
          }),
        }),
      });

      await exportContentTypes.start();

      // Verify content types were processed
      expect(exportContentTypes.contentTypes.length).to.equal(2);
      // Verify file operations were called
      expect(writeFileStub.called).to.be.true;
      expect(makeDirectoryStub.called).to.be.true;
    });

    it('should handle empty content types', async () => {
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;

      mockStackClient.contentType.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [],
            count: 0,
          }),
        }),
      });

      exportContentTypes.contentTypes = [];
      await exportContentTypes.start();

      // Verify writeFile was called even with empty array
      expect(writeFileStub.called).to.be.true;
    });

    it('should handle errors during export without throwing', async () => {
      mockStackClient.contentType.returns({
        query: sinon.stub().returns({
          find: sinon.stub().rejects(new Error('Export failed')),
        }),
      });

      // Should complete without throwing
      await exportContentTypes.start();
    });
  });
});
