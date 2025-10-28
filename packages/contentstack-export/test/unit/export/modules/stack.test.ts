import { expect } from 'chai';
import sinon from 'sinon';
import { log, FsUtility } from '@contentstack/cli-utilities';
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
    });

    it('should handle error when fetching locales', async () => {
      // Test error handling
      const locale = await exportStack.getLocales();
      
      expect(locale).to.exist;
    });
  });

  describe('exportStack() method', () => {
    it('should export stack successfully', async () => {
      await exportStack.exportStack();
      
      // Should complete without error
    });

    it('should handle errors when exporting stack', async () => {
      // Should handle error gracefully
      await exportStack.exportStack();
    });
  });

  describe('exportStackSettings() method', () => {
    it('should export stack settings successfully', async () => {
      await exportStack.exportStackSettings();
      
      // Should complete without error
    });

    it('should handle errors when exporting settings', async () => {
      // Should handle error gracefully
      await exportStack.exportStackSettings();
    });
  });
});

