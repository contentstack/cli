import { expect } from 'chai';
import sinon from 'sinon';
import { FsUtility } from '@contentstack/cli-utilities';
import ExportStack from '../../../../src/export/modules/stack';
import ExportConfig from '../../../../src/types/export-config';

describe('ExportStack', () => {
  let exportStack: ExportStack;
  let mockStackClient: any;
  let mockExportConfig: ExportConfig;

  beforeEach(() => {
    mockStackClient = {
      fetch: sinon.stub().resolves({ name: 'Test Stack', uid: 'stack-uid', org_uid: 'org-uid' }),
      settings: sinon.stub().resolves({ 
        name: 'Stack Settings', 
        description: 'Stack settings description',
        settings: { global: { example: 'value' } }
      }),
      locale: sinon.stub().returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({ 
            items: [
              { uid: 'locale-1', name: 'English (United States)', code: 'en-us', fallback_locale: null }
            ], 
            count: 1 
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
      source_stack: 'test-stack',
      preserveStackVersion: false,
      hasOwnProperty: sinon.stub().returns(false),
      org_uid: '',
      sourceStackName: '',
      context: {
        command: 'cm:stacks:export',
        module: 'stack',
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-123',
        apiKey: 'test-api-key',
        orgId: 'org-123',
        authenticationMethod: 'Basic Auth'
      },
      cliLogsPath: '/test/logs',
      forceStopMarketplaceAppsPrompt: false,
      management_token: '',
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
        stacks: ''
      },
      personalizationEnabled: false,
      fetchConcurrency: 5,
      writeConcurrency: 5,
      developerHubBaseUrl: '',
      marketplaceAppEncryptionKey: '',
      onlyTSModules: [],
      modules: {
        types: ['stack'],
        locales: {
          dirName: 'locales',
          fileName: 'locales.json',
          requiredKeys: ['code']
        },
        customRoles: {
          dirName: 'custom_roles',
          fileName: 'custom_roles.json',
          customRolesLocalesFileName: ''
        },
        'custom-roles': {
          dirName: 'custom_roles',
          fileName: 'custom_roles.json',
          customRolesLocalesFileName: ''
        },
        environments: {
          dirName: 'environments',
          fileName: 'environments.json'
        },
        labels: {
          dirName: 'labels',
          fileName: 'labels.json',
          invalidKeys: []
        },
        webhooks: {
          dirName: 'webhooks',
          fileName: 'webhooks.json'
        },
        releases: {
          dirName: 'releases',
          fileName: 'releases.json',
          releasesList: 'releases_list.json',
          invalidKeys: []
        },
        workflows: {
          dirName: 'workflows',
          fileName: 'workflows.json',
          invalidKeys: []
        },
        globalfields: {
          dirName: 'global_fields',
          fileName: 'globalfields.json',
          validKeys: ['title', 'uid']
        },
        'global-fields': {
          dirName: 'global_fields',
          fileName: 'globalfields.json',
          validKeys: ['title', 'uid']
        },
        assets: {
          dirName: 'assets',
          fileName: 'assets.json',
          batchLimit: 100,
          host: 'https://api.contentstack.io',
          invalidKeys: [],
          chunkFileSize: 5,
          downloadLimit: 5,
          fetchConcurrency: 5,
          assetsMetaKeys: [],
          securedAssets: false,
          displayExecutionTime: false,
          enableDownloadStatus: false,
          includeVersionedAssets: false
        },
        content_types: {
          dirName: 'content_types',
          fileName: 'content_types.json',
          validKeys: ['title', 'uid'],
          limit: 100
        },
        'content-types': {
          dirName: 'content_types',
          fileName: 'content_types.json',
          validKeys: ['title', 'uid'],
          limit: 100
        },
        entries: {
          dirName: 'entries',
          fileName: 'entries.json',
          invalidKeys: [],
          batchLimit: 100,
          downloadLimit: 5,
          limit: 100,
          exportVersions: false
        },
        personalize: {
          dirName: 'personalize',
          baseURL: {}
        },
        variantEntry: {
          dirName: 'variant_entries',
          fileName: 'variant_entries.json',
          chunkFileSize: 5,
          query: { skip: 0, limit: 100, include_variant: true, include_count: false, include_publish_details: true }
        },
        extensions: {
          dirName: 'extensions',
          fileName: 'extensions.json'
        },
        stack: {
          dirName: 'stack',
          fileName: 'stack.json',
          limit: 100
        },
        dependency: {
          entries: []
        },
        marketplace_apps: {
          dirName: 'marketplace_apps',
          fileName: 'marketplace_apps.json'
        },
        'marketplace-apps': {
          dirName: 'marketplace_apps',
          fileName: 'marketplace_apps.json'
        },
        masterLocale: {
          dirName: 'master_locale',
          fileName: 'master_locale.json',
          requiredKeys: ['code']
        },
        taxonomies: {
          dirName: 'taxonomies',
          fileName: 'taxonomies.json',
          invalidKeys: [],
          limit: 100
        },
        events: {
          dirName: 'events',
          fileName: 'events.json',
          invalidKeys: []
        },
        audiences: {
          dirName: 'audiences',
          fileName: 'audiences.json',
          invalidKeys: []
        },
        attributes: {
          dirName: 'attributes',
          fileName: 'attributes.json',
          invalidKeys: []
        }
      }
    } as any;

    exportStack = new ExportStack({
      exportConfig: mockExportConfig,
      stackAPIClient: mockStackClient,
      moduleName: 'stack'
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
      expect(exportStack).to.be.instanceOf(ExportStack);
    });

    it('should set context module to stack', () => {
      expect((exportStack as any).exportConfig.context.module).to.equal('stack');
    });

    it('should initialize stackConfig', () => {
      expect((exportStack as any).stackConfig).to.exist;
    });

    it('should initialize query params', () => {
      expect((exportStack as any).qs).to.deep.equal({ include_count: true });
    });
  });

  describe('getStack() method', () => {
 

  });

  describe('getLocales() method', () => {
    it('should fetch and return master locale', async () => {
      const locale = await exportStack.getLocales();
      
      expect(locale).to.exist;
      expect(locale.code).to.equal('en-us');
      expect(locale.name).to.equal('English (United States)');
    });

    it('should recursively search for master locale across multiple pages', async () => {
      let callCount = 0;
      const localeStub = {
        query: sinon.stub().returns({
          find: sinon.stub().callsFake(() => {
            callCount++;
            if (callCount === 1) {
              // First batch without master locale
              return Promise.resolve({
                items: new Array(100).fill({ uid: 'locale-test', code: 'en', fallback_locale: 'en-us' }),
                count: 150
              });
            } else {
              // Second batch with master locale
              return Promise.resolve({
                items: [{ uid: 'locale-master', code: 'en-us', fallback_locale: null, name: 'English' }],
                count: 150
              });
            }
          })
        })
      };
      
      mockStackClient.locale.returns(localeStub);
      const locale = await exportStack.getLocales();
      
      expect(callCount).to.be.greaterThan(1);
      expect(locale.code).to.equal('en-us');
    });

    it('should handle error when fetching locales', async () => {
      const localeStub = {
        query: sinon.stub().returns({
          find: sinon.stub().rejects(new Error('API Error'))
        })
      };
      
      mockStackClient.locale.returns(localeStub);
      
      try {
        await exportStack.getLocales();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should handle no items response and skip searching', async () => {
      const localeStub = {
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [],
            count: 0
          })
        })
      };
      
      mockStackClient.locale.returns(localeStub);
      const locale = await exportStack.getLocales();
      
      expect(locale).to.be.undefined;
    });

    it('should find master locale in first batch when present', async () => {
      const localeStub = {
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [
              { uid: 'locale-1', code: 'es-es', fallback_locale: 'en-us' },
              { uid: 'locale-master', code: 'en-us', fallback_locale: null, name: 'English' }
            ],
            count: 2
          })
        })
      };
      
      mockStackClient.locale.returns(localeStub);
      const locale = await exportStack.getLocales();
      
      expect(locale.code).to.equal('en-us');
    });
  });

  describe('exportStack() method', () => {
    it('should export stack successfully and write to file', async () => {
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;
      const makeDirectoryStub = FsUtility.prototype.makeDirectory as sinon.SinonStub;
      
      await exportStack.exportStack();
      
      expect(writeFileStub.called).to.be.true;
      expect(makeDirectoryStub.called).to.be.true;
    });

    it('should handle errors when exporting stack without throwing', async () => {
      mockStackClient.fetch = sinon.stub().rejects(new Error('Stack fetch failed'));
      
      // Should complete without throwing despite error
      // The assertion is that await doesn't throw
      await exportStack.exportStack();
    });
  });

  describe('exportStackSettings() method', () => {
    it('should export stack settings successfully and write to file', async () => {
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;
      const makeDirectoryStub = FsUtility.prototype.makeDirectory as sinon.SinonStub;
      
      await exportStack.exportStackSettings();
      
      expect(writeFileStub.called).to.be.true;
      expect(makeDirectoryStub.called).to.be.true;
    });

    it('should handle errors when exporting settings without throwing', async () => {
      mockStackClient.settings = sinon.stub().rejects(new Error('Settings fetch failed'));

      // Should complete without throwing despite error
      // The assertion is that await doesn't throw
      await exportStack.exportStackSettings();
    });
  });

  describe('start() method', () => {
    it('should export stack when preserveStackVersion is true', async () => {
      const exportStackStub = sinon.stub(exportStack, 'exportStack').resolves({ name: 'test-stack' });
      const exportStackSettingsStub = sinon.stub(exportStack, 'exportStackSettings').resolves();
      const getStackStub = sinon.stub(exportStack, 'getStack').resolves({});
      
      exportStack.exportConfig.preserveStackVersion = true;
      
      await exportStack.start();
      
      expect(exportStackStub.called).to.be.true;
      
      exportStackStub.restore();
      exportStackSettingsStub.restore();
      getStackStub.restore();
    });

    it('should skip exportStackSettings when management_token is present', async () => {
      const getStackStub = sinon.stub(exportStack, 'getStack').resolves({});
      const exportStackSettingsSpy = sinon.spy(exportStack, 'exportStackSettings');
      
      exportStack.exportConfig.management_token = 'some-token';
      exportStack.exportConfig.preserveStackVersion = false;
      exportStack.exportConfig.master_locale = { code: 'en-us' };
      exportStack.exportConfig.hasOwnProperty = sinon.stub().returns(true);
      
      await exportStack.start();
      
      // Verify exportStackSettings was NOT called
      expect(exportStackSettingsSpy.called).to.be.false;
      
      getStackStub.restore();
      exportStackSettingsSpy.restore();
    });
  });
});

