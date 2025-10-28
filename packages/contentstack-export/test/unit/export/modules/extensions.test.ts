import { expect } from 'chai';
import sinon from 'sinon';
import { FsUtility } from '@contentstack/cli-utilities';
import ExportExtensions from '../../../../src/export/modules/extensions';
import ExportConfig from '../../../../src/types/export-config';

describe('ExportExtensions', () => {
  let exportExtensions: any;
  let mockStackClient: any;
  let mockExportConfig: ExportConfig;

  beforeEach(() => {
    mockStackClient = {
      extension: sinon.stub().returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [
              { uid: 'ext-1', title: 'Extension 1' },
              { uid: 'ext-2', title: 'Extension 2' }
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
        module: 'extensions',
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
        types: ['extensions'],
        extensions: {
          dirName: 'extensions',
          fileName: 'extensions.json',
          limit: 100,
          invalidKeys: []
        }
      }
    } as any;

    exportExtensions = new ExportExtensions({
      exportConfig: mockExportConfig,
      stackAPIClient: mockStackClient,
      moduleName: 'extensions'
    });

    sinon.stub(FsUtility.prototype, 'writeFile').resolves();
    sinon.stub(FsUtility.prototype, 'makeDirectory').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(exportExtensions).to.be.instanceOf(ExportExtensions);
    });

    it('should initialize extensions object', () => {
      expect(exportExtensions.extensions).to.be.an('object');
    });

    it('should set context module to extensions', () => {
      expect(exportExtensions.exportConfig.context.module).to.equal('extensions');
    });
  });

  describe('getExtensions() method', () => {
    it('should fetch and process extensions correctly', async () => {
      const extensions = [
        { uid: 'ext-1', title: 'Extension 1', SYS_ACL: 'test' },
        { uid: 'ext-2', title: 'Extension 2', SYS_ACL: 'test' }
      ];

      mockStackClient.extension.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: extensions,
            count: 2
          })
        })
      });

      await exportExtensions.getExtensions();
      
      // Verify extensions were processed
      expect(Object.keys(exportExtensions.extensions).length).to.equal(2);
      expect(exportExtensions.extensions['ext-1']).to.exist;
      expect(exportExtensions.extensions['ext-1'].title).to.equal('Extension 1');
      // Verify SYS_ACL was removed
      expect(exportExtensions.extensions['ext-1'].SYS_ACL).to.be.undefined;
    });

    it('should call getExtensions recursively when more extensions exist', async () => {
      let callCount = 0;
      mockStackClient.extension.returns({
        query: sinon.stub().returns({
          find: sinon.stub().callsFake(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                items: Array(100).fill({ uid: 'test', title: 'Test' }),
                count: 150
              });
            } else {
              return Promise.resolve({
                items: Array(50).fill({ uid: 'test2', title: 'Test2' }),
                count: 150
              });
            }
          })
        })
      });

      await exportExtensions.getExtensions();
      
      // Verify multiple calls were made for recursive fetching
      expect(callCount).to.be.greaterThan(1);
    });

    it('should handle API errors gracefully', async () => {
      mockStackClient.extension.returns({
        query: sinon.stub().returns({
          find: sinon.stub().rejects(new Error('API Error'))
        })
      });

      await exportExtensions.getExtensions();
      
      // Verify method completes without throwing
      expect(exportExtensions.extensions).to.exist;
    });

    it('should handle no items response and not process extensions', async () => {
      mockStackClient.extension.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [],
            count: 0
          })
        })
      });

      const initialCount = Object.keys(exportExtensions.extensions).length;
      await exportExtensions.getExtensions();
      
      // Verify no new extensions were added
      expect(Object.keys(exportExtensions.extensions).length).to.equal(initialCount);
    });

    it('should handle empty extensions array gracefully', async () => {
      mockStackClient.extension.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: null,
            count: 0
          })
        })
      });

      const initialCount = Object.keys(exportExtensions.extensions).length;
      await exportExtensions.getExtensions();
      
      // Verify no processing occurred with null items
      expect(Object.keys(exportExtensions.extensions).length).to.equal(initialCount);
    });
  });

  describe('start() method', () => {
    it('should complete full export flow and write files', async () => {
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;
      
      const extensions = [
        { uid: 'ext-1', title: 'Extension 1' },
        { uid: 'ext-2', title: 'Extension 2' }
      ];

      mockStackClient.extension.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: extensions,
            count: 2
          })
        })
      });

      await exportExtensions.start();
      
      // Verify extensions were processed
      expect(Object.keys(exportExtensions.extensions).length).to.equal(2);
      expect(exportExtensions.extensions['ext-1']).to.exist;
      expect(exportExtensions.extensions['ext-2']).to.exist;
      // Verify file was written
      expect(writeFileStub.called).to.be.true;
    });

    it('should handle empty extensions and log NOT_FOUND', async () => {
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;

      mockStackClient.extension.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [],
            count: 0
          })
        })
      });

      exportExtensions.extensions = {};
      await exportExtensions.start();
      
      // Verify writeFile was NOT called when extensions are empty
      expect(writeFileStub.called).to.be.false;
    });
  });

  describe('sanitizeAttribs() method', () => {
    it('should sanitize extension attributes and remove SYS_ACL', () => {
      const extensions = [
        { uid: 'ext-1', title: 'Extension 1', SYS_ACL: 'remove' },
        { uid: 'ext-2', title: 'Extension 2', SYS_ACL: 'remove' }
      ];

      exportExtensions.sanitizeAttribs(extensions);

      expect(exportExtensions.extensions['ext-1'].SYS_ACL).to.be.undefined;
      expect(exportExtensions.extensions['ext-1'].title).to.equal('Extension 1');
    });

    it('should handle extensions without title field', () => {
      const extensions = [
        { uid: 'ext-1', SYS_ACL: 'remove' }
      ];

      exportExtensions.sanitizeAttribs(extensions);

      expect(exportExtensions.extensions['ext-1']).to.exist;
      expect(exportExtensions.extensions['ext-1'].SYS_ACL).to.be.undefined;
    });

    it('should handle empty extensions array', () => {
      const extensions: any[] = [];

      exportExtensions.sanitizeAttribs(extensions);

      expect(Object.keys(exportExtensions.extensions).length).to.equal(0);
    });
  });
});

