import { expect } from 'chai';
import sinon from 'sinon';
import { FsUtility } from '@contentstack/cli-utilities';
import ExportEnvironments from '../../../../src/export/modules/environments';
import ExportConfig from '../../../../src/types/export-config';

describe('ExportEnvironments', () => {
  let exportEnvironments: any;
  let mockStackClient: any;
  let mockExportConfig: ExportConfig;

  beforeEach(() => {
    mockStackClient = {
      environment: sinon.stub().returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [
              { uid: 'env-1', name: 'Production' },
              { uid: 'env-2', name: 'Development' }
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
        module: 'environments',
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
        types: ['environments'],
        environments: {
          dirName: 'environments',
          fileName: 'environments.json',
          limit: 100,
          invalidKeys: []
        }
      }
    } as any;

    exportEnvironments = new ExportEnvironments({
      exportConfig: mockExportConfig,
      stackAPIClient: mockStackClient,
      moduleName: 'environments'
    });

    sinon.stub(FsUtility.prototype, 'writeFile').resolves();
    sinon.stub(FsUtility.prototype, 'makeDirectory').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(exportEnvironments).to.be.instanceOf(ExportEnvironments);
    });

    it('should initialize environments object', () => {
      expect(exportEnvironments.environments).to.be.an('object');
    });

    it('should set context module to environments', () => {
      expect(exportEnvironments.exportConfig.context.module).to.equal('environments');
    });
  });

  describe('getEnvironments() method', () => {
    it('should fetch and process environments correctly', async () => {
      const environments = [
        { uid: 'env-1', name: 'Production', ACL: 'test' },
        { uid: 'env-2', name: 'Development', ACL: 'test' }
      ];

      mockStackClient.environment.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: environments,
            count: 2
          })
        })
      });

      await exportEnvironments.getEnvironments();
      
      // Verify environments were processed
      expect(Object.keys(exportEnvironments.environments).length).to.equal(2);
      expect(exportEnvironments.environments['env-1']).to.exist;
      expect(exportEnvironments.environments['env-1'].name).to.equal('Production');
      // Verify ACL was removed
      expect(exportEnvironments.environments['env-1'].ACL).to.be.undefined;
    });

    it('should call getEnvironments recursively when more environments exist', async () => {
      let callCount = 0;
      mockStackClient.environment.returns({
        query: sinon.stub().returns({
          find: sinon.stub().callsFake(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                items: Array(100).fill({ uid: 'test', name: 'Test' }),
                count: 150
              });
            } else {
              return Promise.resolve({
                items: Array(50).fill({ uid: 'test2', name: 'Test2' }),
                count: 150
              });
            }
          })
        })
      });

      await exportEnvironments.getEnvironments();
      
      // Verify multiple calls were made for recursive fetching
      expect(callCount).to.be.greaterThan(1);
    });

    it('should handle API errors gracefully', async () => {
      mockStackClient.environment.returns({
        query: sinon.stub().returns({
          find: sinon.stub().rejects(new Error('API Error'))
        })
      });

      await exportEnvironments.getEnvironments();
      
      // Verify method completes without throwing
      expect(exportEnvironments.environments).to.exist;
    });

    it('should handle no items response and not process environments', async () => {
      mockStackClient.environment.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [],
            count: 0
          })
        })
      });

      const initialCount = Object.keys(exportEnvironments.environments).length;
      await exportEnvironments.getEnvironments();
      
      // Verify no new environments were added
      expect(Object.keys(exportEnvironments.environments).length).to.equal(initialCount);
    });

    it('should handle empty environments array gracefully', async () => {
      mockStackClient.environment.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: null,
            count: 0
          })
        })
      });

      const initialCount = Object.keys(exportEnvironments.environments).length;
      await exportEnvironments.getEnvironments();
      
      // Verify no processing occurred with null items
      expect(Object.keys(exportEnvironments.environments).length).to.equal(initialCount);
    });
  });

  describe('start() method', () => {
    it('should complete full export flow and write files', async () => {
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;
      
      const environments = [
        { uid: 'env-1', name: 'Production' },
        { uid: 'env-2', name: 'Development' }
      ];

      mockStackClient.environment.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: environments,
            count: 2
          })
        })
      });

      await exportEnvironments.start();
      
      // Verify environments were processed
      expect(Object.keys(exportEnvironments.environments).length).to.equal(2);
      expect(exportEnvironments.environments['env-1']).to.exist;
      expect(exportEnvironments.environments['env-2']).to.exist;
      // Verify file was written
      expect(writeFileStub.called).to.be.true;
    });

    it('should handle empty environments and log NOT_FOUND', async () => {
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;

      mockStackClient.environment.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [],
            count: 0
          })
        })
      });

      exportEnvironments.environments = {};
      await exportEnvironments.start();
      
      // Verify writeFile was NOT called when environments are empty
      expect(writeFileStub.called).to.be.false;
    });
  });

  describe('sanitizeAttribs() method', () => {
    it('should sanitize environment attributes and remove ACL', () => {
      const environments = [
        { uid: 'env-1', name: 'Production', ACL: 'remove' },
        { uid: 'env-2', name: 'Development', ACL: 'remove' }
      ];

      exportEnvironments.sanitizeAttribs(environments);

      expect(exportEnvironments.environments['env-1'].ACL).to.be.undefined;
      expect(exportEnvironments.environments['env-1'].name).to.equal('Production');
    });

    it('should handle environments without name field', () => {
      const environments = [
        { uid: 'env-1', ACL: 'remove' }
      ];

      exportEnvironments.sanitizeAttribs(environments);

      expect(exportEnvironments.environments['env-1']).to.exist;
      expect(exportEnvironments.environments['env-1'].ACL).to.be.undefined;
    });

    it('should handle empty environments array', () => {
      const environments: any[] = [];

      exportEnvironments.sanitizeAttribs(environments);

      expect(Object.keys(exportEnvironments.environments).length).to.equal(0);
    });
  });
});

