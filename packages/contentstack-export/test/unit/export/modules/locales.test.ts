import { expect } from 'chai';
import sinon from 'sinon';
import { FsUtility } from '@contentstack/cli-utilities';
import ExportLocales from '../../../../src/export/modules/locales';
import ExportConfig from '../../../../src/types/export-config';

describe('ExportLocales', () => {
  let exportLocales: any;
  let mockStackClient: any;
  let mockExportConfig: ExportConfig;

  beforeEach(() => {
    mockStackClient = {
      locale: sinon.stub().returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [{ uid: 'locale-1', code: 'en-us', name: 'English (US)', fallback_locale: null }],
            count: 1,
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
        module: 'locales',
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
      apis: {
        userSession: '',
        globalfields: '',
        locales: '',
        labels: '',
        environments: '',
        assets: '',
        content_types: '',
        entries: '',
        users: '',
        extension: '',
        webhooks: '',
        stacks: '',
      },
      preserveStackVersion: false,
      personalizationEnabled: false,
      fetchConcurrency: 5,
      writeConcurrency: 5,
      developerHubBaseUrl: '',
      marketplaceAppEncryptionKey: '',
      modules: {
        types: ['locales'],
        locales: {
          dirName: 'locales',
          fileName: 'locales.json',
          requiredKeys: ['code', 'name'],
        },
        masterLocale: {
          dirName: 'master_locale',
          fileName: 'master_locale.json',
          requiredKeys: ['code'],
        },
      },
    } as any;

    exportLocales = new ExportLocales({
      exportConfig: mockExportConfig,
      stackAPIClient: mockStackClient,
      moduleName: 'locales',
    });

    // Stub FsUtility methods
    sinon.stub(FsUtility.prototype, 'writeFile').resolves();
    sinon.stub(FsUtility.prototype, 'makeDirectory').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(exportLocales).to.be.instanceOf(ExportLocales);
    });

    it('should set context module to locales', () => {
      expect(exportLocales.exportConfig.context.module).to.equal('locales');
    });

    it('should initialize locale config', () => {
      expect(exportLocales.localeConfig).to.exist;
    });

    it('should initialize empty locales objects', () => {
      expect(exportLocales.locales).to.be.an('object');
      expect(exportLocales.masterLocale).to.be.an('object');
    });
  });

  describe('getLocales() method', () => {
    it('should fetch and process locales correctly', async () => {
      exportLocales.locales = {};
      exportLocales.masterLocale = {};
      exportLocales.exportConfig.master_locale = { code: 'en-us' };

      const locales = [
        { uid: 'locale-1', code: 'en-us', name: 'English' },
        { uid: 'locale-2', code: 'es-es', name: 'Spanish' },
      ];

      exportLocales.stackAPIClient = {
        locale: sinon.stub().returns({
          query: sinon.stub().returns({
            find: sinon.stub().resolves({
              items: locales,
              count: 2,
            }),
          }),
        }),
      };

      await exportLocales.getLocales();

      // Verify locales were processed
      expect(Object.keys(exportLocales.locales).length).to.be.greaterThan(0);
      expect(Object.keys(exportLocales.masterLocale).length).to.be.greaterThan(0);
    });

    it('should call getLocales recursively when more locales exist', async () => {
      let callCount = 0;
      mockStackClient.locale.returns({
        query: sinon.stub().returns({
          find: sinon.stub().callsFake(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                items: Array(100).fill({ uid: `locale-${callCount}`, code: 'en' }),
                count: 150,
              });
            } else {
              return Promise.resolve({
                items: Array(50).fill({ uid: `locale-${callCount}`, code: 'en' }),
                count: 150,
              });
            }
          }),
        }),
      });

      await exportLocales.getLocales();

      // Verify multiple calls were made
      expect(callCount).to.be.greaterThan(1);
    });

    it('should handle API errors and throw', async () => {
      mockStackClient.locale.returns({
        query: sinon.stub().returns({
          find: sinon.stub().rejects(new Error('API Error')),
        }),
      });

      try {
        await exportLocales.getLocales();
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).to.exist;
        expect(error.message).to.include('API Error');
      }
    });
  });

  describe('start() method', () => {
    it('should complete full export flow and write files', async () => {
      exportLocales.exportConfig.master_locale = { code: 'en-us' };

      exportLocales.stackAPIClient = {
        locale: sinon.stub().returns({
          query: sinon.stub().returns({
            find: sinon.stub().resolves({
              items: [
                { uid: 'locale-1', code: 'en-us', name: 'English' },
                { uid: 'locale-2', code: 'es-es', name: 'Spanish' },
              ],
              count: 2,
            }),
          }),
        }),
      };

      await exportLocales.start();

      // Verify locales were fetched and processed
      expect(Object.keys(exportLocales.locales).length).to.be.greaterThan(0);
      // Verify writeFile was called (stub created in beforeEach)
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;
      expect(writeFileStub.called).to.be.true;
    });

    it('should handle errors during export', async () => {
      exportLocales.stackAPIClient = {
        locale: sinon.stub().returns({
          query: sinon.stub().returns({
            find: sinon.stub().rejects(new Error('API Error')),
          }),
        }),
      };

      try {
        await exportLocales.start();
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).to.exist;
        expect(error.message).to.include('API Error');
      }
    });
  });

  describe('getLocales() method', () => {
    it('should handle no items response', async () => {
      mockStackClient.locale.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [],
            count: 0,
          }),
        }),
      });

      await exportLocales.getLocales();

      expect(mockStackClient.locale.called).to.be.true;
    });

    it('should handle empty locales array', async () => {
      mockStackClient.locale.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: null,
            count: 0,
          }),
        }),
      });

      await exportLocales.getLocales();

      expect(mockStackClient.locale.called).to.be.true;
    });
  });

  describe('sanitizeAttribs() method', () => {
    it('should sanitize locale attributes', () => {
      exportLocales.locales = {};
      exportLocales.masterLocale = {};

      const locales = [
        { uid: 'locale-1', code: 'en-us', name: 'English', extraField: 'remove' },
        { uid: 'locale-2', code: 'es-es', name: 'Spanish', extraField: 'remove' },
      ];

      exportLocales.sanitizeAttribs(locales);

      expect(exportLocales.locales).to.be.an('object');
    });

    it('should separate master locale from regular locales', () => {
      exportLocales.locales = {};
      exportLocales.masterLocale = {};
      exportLocales.exportConfig.master_locale = { code: 'en-us' };

      const locales = [
        { uid: 'locale-1', code: 'en-us', name: 'English' },
        { uid: 'locale-2', code: 'es-es', name: 'Spanish' },
      ];

      exportLocales.sanitizeAttribs(locales);

      // Master locale with code 'en-us' should be in masterLocale object
      expect(Object.keys(exportLocales.masterLocale).length).to.be.greaterThan(0);
      // Spanish locale should be in regular locales
      expect(Object.keys(exportLocales.locales).length).to.be.greaterThan(0);
    });

    it('should handle empty locales array', () => {
      exportLocales.locales = {};
      exportLocales.masterLocale = {};

      const locales: any[] = [];

      exportLocales.sanitizeAttribs(locales);

      expect(Object.keys(exportLocales.locales).length).to.equal(0);
    });
  });
});
