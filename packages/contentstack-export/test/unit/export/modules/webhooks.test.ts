import { expect } from 'chai';
import sinon from 'sinon';
import { FsUtility } from '@contentstack/cli-utilities';
import ExportWebhooks from '../../../../src/export/modules/webhooks';
import ExportConfig from '../../../../src/types/export-config';

describe('ExportWebhooks', () => {
  let exportWebhooks: any;
  let mockStackClient: any;
  let mockExportConfig: ExportConfig;

  beforeEach(() => {
    mockStackClient = {
      webhook: sinon.stub().returns({
        fetchAll: sinon.stub().resolves({
          items: [
            { uid: 'webhook-1', name: 'Webhook 1' },
            { uid: 'webhook-2', name: 'Webhook 2' },
          ],
          count: 2,
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
        module: 'webhooks',
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
        types: ['webhooks'],
        webhooks: {
          dirName: 'webhooks',
          fileName: 'webhooks.json',
          limit: 100,
          invalidKeys: [],
        },
      },
    } as any;

    exportWebhooks = new ExportWebhooks({
      exportConfig: mockExportConfig,
      stackAPIClient: mockStackClient,
      moduleName: 'webhooks',
    });

    // Stub FsUtility methods - created once in beforeEach
    sinon.stub(FsUtility.prototype, 'writeFile').resolves();
    sinon.stub(FsUtility.prototype, 'makeDirectory').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(exportWebhooks).to.be.instanceOf(ExportWebhooks);
    });

    it('should initialize webhooks object', () => {
      expect(exportWebhooks.webhooks).to.be.an('object');
    });

    it('should set context module to webhooks', () => {
      expect(exportWebhooks.exportConfig.context.module).to.equal('webhooks');
    });
  });

  describe('getWebhooks() method', () => {
    it('should fetch and process webhooks correctly', async () => {
      const webhooks = [
        { uid: 'webhook-1', name: 'Webhook 1', SYS_ACL: 'test' },
        { uid: 'webhook-2', name: 'Webhook 2', SYS_ACL: 'test' },
      ];

      mockStackClient.webhook.returns({
        fetchAll: sinon.stub().resolves({
          items: webhooks,
          count: 2,
        }),
      });

      await exportWebhooks.getWebhooks();

      // Verify webhooks were processed and SYS_ACL was removed
      expect(Object.keys(exportWebhooks.webhooks).length).to.equal(2);
      expect(exportWebhooks.webhooks['webhook-1'].SYS_ACL).to.be.undefined;
      expect(exportWebhooks.webhooks['webhook-1'].name).to.equal('Webhook 1');
    });

    it('should call getWebhooks recursively when more webhooks exist', async () => {
      let callCount = 0;
      mockStackClient.webhook.returns({
        fetchAll: sinon.stub().callsFake(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              items: Array(100).fill({ uid: `webhook-${callCount}`, name: 'Test' }),
              count: 150,
            });
          } else {
            return Promise.resolve({
              items: Array(50).fill({ uid: `webhook-${callCount}`, name: 'Test' }),
              count: 150,
            });
          }
        }),
      });

      await exportWebhooks.getWebhooks();

      // Verify multiple calls were made
      expect(callCount).to.be.greaterThan(1);
    });
  });

  describe('start() method', () => {
    it('should complete full export flow and write webhooks to file', async () => {
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;
      const makeDirectoryStub = FsUtility.prototype.makeDirectory as sinon.SinonStub;

      const webhooks = [
        { uid: 'webhook-1', name: 'Webhook 1' },
        { uid: 'webhook-2', name: 'Webhook 2' },
      ];

      mockStackClient.webhook.returns({
        fetchAll: sinon.stub().resolves({
          items: webhooks,
          count: 2,
        }),
      });

      await exportWebhooks.start();

      // Verify webhooks were processed
      expect(Object.keys(exportWebhooks.webhooks).length).to.equal(2);
      expect(exportWebhooks.webhooks['webhook-1']).to.exist;
      expect(exportWebhooks.webhooks['webhook-2']).to.exist;
      // Verify file was written
      expect(writeFileStub.called).to.be.true;
      expect(makeDirectoryStub.called).to.be.true;
    });

    it('should handle empty webhooks and log NOT_FOUND', async () => {
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;

      mockStackClient.webhook.returns({
        fetchAll: sinon.stub().resolves({
          items: [],
          count: 0,
        }),
      });

      exportWebhooks.webhooks = {};
      await exportWebhooks.start();

      // Verify writeFile was NOT called when webhooks are empty
      expect(writeFileStub.called).to.be.false;
    });
  });

  describe('sanitizeAttribs() method', () => {
    it('should sanitize webhook attributes and remove SYS_ACL', () => {
      const webhooks = [
        { uid: 'webhook-1', name: 'Webhook 1', SYS_ACL: 'remove' },
        { uid: 'webhook-2', name: 'Webhook 2', SYS_ACL: 'remove' },
      ];

      exportWebhooks.sanitizeAttribs(webhooks);

      expect(exportWebhooks.webhooks['webhook-1'].SYS_ACL).to.be.undefined;
      expect(exportWebhooks.webhooks['webhook-1'].name).to.equal('Webhook 1');
    });

    it('should handle webhooks without name field', () => {
      const webhooks = [{ uid: 'webhook-1', SYS_ACL: 'remove' }];

      exportWebhooks.sanitizeAttribs(webhooks);

      expect(exportWebhooks.webhooks['webhook-1']).to.exist;
      expect(exportWebhooks.webhooks['webhook-1'].SYS_ACL).to.be.undefined;
    });

    it('should handle empty webhooks array', () => {
      const webhooks: any[] = [];

      exportWebhooks.sanitizeAttribs(webhooks);

      expect(Object.keys(exportWebhooks.webhooks).length).to.equal(0);
    });
  });
});
