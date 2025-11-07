import { expect } from 'chai';
import sinon from 'sinon';
import { lookupExtension } from '../../../src/utils/extension-helper';
import { ImportConfig } from '../../../src/types';
import { FsUtility } from '@contentstack/cli-utilities';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Extension Helper', () => {
  let sandbox: sinon.SinonSandbox;
  let fsUtilityStub: sinon.SinonStub;
  let logDebugStub: sinon.SinonStub;
  let tempDir: string;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'extension-helper-test-'));
    fsUtilityStub = sandbox.stub(FsUtility.prototype, 'readFile');
    logDebugStub = sandbox.stub(console, 'log'); // Mock log.debug
  });

  afterEach(() => {
    sandbox.restore();
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const createMockConfig = (backupDir?: string): ImportConfig => ({
    backupDir: backupDir || '',
    apiKey: 'test-api-key',
    management_token: 'test-token',
    contentDir: '/test/content',
    data: '/test/content',
    modules: {
      apiConcurrency: 1,
      types: [],
      locales: { dirName: 'locales', fileName: 'locales.json', requiredKeys: ['code', 'name'] },
      customRoles: { dirName: 'custom_roles', fileName: 'custom_roles.json', customRolesLocalesFileName: 'custom_roles_locales.json' },
      environments: { dirName: 'environments', fileName: 'environments.json' },
      labels: { dirName: 'labels', fileName: 'labels.json' },
      extensions: { dirName: 'extensions', fileName: 'extensions.json', validKeys: ['uid', 'title'] },
      webhooks: { dirName: 'webhooks', fileName: 'webhooks.json' },
      releases: { dirName: 'releases', fileName: 'releases.json', invalidKeys: ['uid'] },
      workflows: { dirName: 'workflows', fileName: 'workflows.json', invalidKeys: ['uid'] },
      assets: { 
        dirName: 'assets', 
        assetBatchLimit: 10, 
        fileName: 'assets.json', 
        importSameStructure: false, 
        uploadAssetsConcurrency: 1, 
        displayExecutionTime: false, 
        importFoldersConcurrency: 1, 
        includeVersionedAssets: false, 
        host: 'https://api.contentstack.io', 
        folderValidKeys: ['uid', 'name'], 
        validKeys: ['uid', 'title'] 
      },
      'assets-old': { 
        dirName: 'assets', 
        fileName: 'assets.json', 
        limit: 100, 
        host: 'https://api.contentstack.io', 
        validKeys: ['uid', 'title'], 
        assetBatchLimit: 10, 
        uploadAssetsConcurrency: 1, 
        importFoldersConcurrency: 1 
      },
      content_types: { dirName: 'content_types', fileName: 'content_types.json', validKeys: ['uid', 'title'], limit: 100 },
      'content-types': { dirName: 'content_types', fileName: 'content_types.json', validKeys: ['uid', 'title'], limit: 100 },
      entries: { dirName: 'entries', fileName: 'entries.json', invalidKeys: ['uid'], limit: 100, assetBatchLimit: 10 },
      globalfields: { dirName: 'globalfields', fileName: 'globalfields.json', validKeys: ['uid', 'title'], limit: 100 },
      'global-fields': { dirName: 'globalfields', fileName: 'globalfields.json', validKeys: ['uid', 'title'], limit: 100 },
      stack: { dirName: 'stack', fileName: 'stack.json' },
      marketplace_apps: { dirName: 'marketplace_apps', fileName: 'marketplace_apps.json' },
      masterLocale: { dirName: 'master_locale', fileName: 'master_locale.json', requiredKeys: ['code', 'name'] },
      taxonomies: { dirName: 'taxonomies', fileName: 'taxonomies.json' },
      personalize: {
        baseURL: {},
        dirName: 'personalize',
        importData: false,
        importOrder: [],
        projects: { dirName: 'projects', fileName: 'projects.json' },
        attributes: { dirName: 'attributes', fileName: 'attributes.json' },
        audiences: { dirName: 'audiences', fileName: 'audiences.json' },
        events: { dirName: 'events', fileName: 'events.json' },
        experiences: { dirName: 'experiences', fileName: 'experiences.json', thresholdTimer: 1000, checkIntervalDuration: 100 }
      },
      variantEntry: { dirName: 'variant_entries', fileName: 'variant_entries.json', apiConcurrency: 1, query: { locale: 'en-us' } }
    },
    branches: [{ uid: 'main', source: 'main' }],
    isAuthenticated: true,
    authenticationMethod: 'Management Token',
    // Add other required properties with minimal values
    versioning: false,
    host: 'https://api.contentstack.io',
    extensionHost: 'https://api.contentstack.io',
    developerHubUrls: {},
    languagesCode: ['en-us'],
    apis: {
      userSession: '/v3/user-session',
      locales: '/v3/locales',
      environments: '/v3/environments',
      assets: '/v3/assets',
      content_types: '/v3/content_types',
      entries: '/v3/entries',
      extensions: '/v3/extensions',
      webhooks: '/v3/webhooks',
      globalfields: '/v3/globalfields',
      folders: '/v3/folders',
      stacks: '/v3/stacks',
      labels: '/v3/labels'
    },
    rateLimit: 5,
    preserveStackVersion: false,
    concurrency: 1,
    importConcurrency: 1,
    fetchConcurrency: 1,
    writeConcurrency: 1,
    developerHubBaseUrl: 'https://developerhub-api.contentstack.com',
    marketplaceAppEncryptionKey: 'test-key',
    getEncryptionKeyMaxRetry: 3,
    overwriteSupportedModules: [],
    globalModules: [],
    entriesPublish: false,
    cliLogsPath: '/test/logs',
    canCreatePrivateApp: false,
    forceStopMarketplaceAppsPrompt: false,
    skipPrivateAppRecreationIfExist: false,
    master_locale: { code: 'en-us' },
    masterLocale: { code: 'en-us' },
    contentVersion: 1,
    region: 'us' as any,
    'exclude-global-modules': false,
    context: {} as any
  });

  describe('lookupExtension', () => {
    it('should be a function', () => {
      expect(lookupExtension).to.be.a('function');
    });

    it('should process group fields recursively', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'group-field',
          data_type: 'group',
          schema: [
            {
              uid: 'nested-field',
              data_type: 'text',
              extension_uid: 'ext-123'
            }
          ]
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {};

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(fsUtilityStub.called).to.be.true;
    });

    it('should process blocks fields with reference_to', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'blocks-field',
          data_type: 'blocks',
          blocks: [
            {
              uid: 'block-1',
              reference_to: 'content-type-1',
              schema: [
                {
                  uid: 'block-field',
                  data_type: 'text'
                }
              ]
            }
          ]
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {};

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      // Should delete schema from block with reference_to
      expect(schema[0].blocks[0].schema).to.be.undefined;
    });

    it('should process blocks fields without reference_to', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'blocks-field',
          data_type: 'blocks',
          blocks: [
            {
              uid: 'block-1',
              schema: [
                {
                  uid: 'block-field',
                  data_type: 'text',
                  extension_uid: 'ext-123'
                }
              ]
            }
          ]
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {};

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(fsUtilityStub.called).to.be.true;
    });

    it('should convert reference field to multi-reference when preserveStackVersion is false', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'ref-field',
          data_type: 'reference',
          reference_to: 'content-type-1',
          field_metadata: {} as any
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {};

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(schema[0].reference_to).to.deep.equal(['content-type-1']);
      expect(schema[0].field_metadata.ref_multiple_content_types).to.be.true;
    });

    it('should not convert reference field when preserveStackVersion is true', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'ref-field',
          data_type: 'reference',
          reference_to: 'content-type-1',
          field_metadata: {} as any
        }
      ];
      const preserveStackVersion = true;
      const installedExtensions = {};

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(schema[0].reference_to).to.equal('content-type-1');
      expect(schema[0].field_metadata.ref_multiple_content_types).to.be.undefined;
    });

    it('should update extension UID for reference field with installed extensions', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'ref-field',
          data_type: 'reference',
          extension_uid: 'old-ext-123',
          field_metadata: {
            ref_multiple_content_types: true
          }
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {
        'old-ext-123': 'new-ext-456'
      };

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(schema[0].extension_uid).to.equal('new-ext-456');
    });

    it('should update extension UID for text field with installed extensions', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'text-field',
          data_type: 'text',
          extension_uid: 'old-ext-123'
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {
        'old-ext-123': 'new-ext-456'
      };

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(schema[0].extension_uid).to.equal('new-ext-456');
    });

    it('should process global field with mapping', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'global-field',
          data_type: 'global_field',
          reference_to: 'global-field-123'
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {};

      const globalFieldsMapping = {
        'global-field-123': 'mapped-global-field-456'
      };

      fsUtilityStub.withArgs(path.join(tempDir, 'mapper/globalfields/uid-mapping.json')).returns(globalFieldsMapping);

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(schema[0].reference_to).to.equal('mapped-global-field-456');
    });

    it('should handle global field without mapping', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'global-field',
          data_type: 'global_field',
          reference_to: 'global-field-123'
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {};

      fsUtilityStub.withArgs(path.join(tempDir, 'mapper/globalfields/uid-mapping.json')).returns({});

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(schema[0].reference_to).to.equal('global-field-123');
    });

    it('should process field with extension UID and mapping', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'ext-field',
          data_type: 'text',
          extension_uid: 'old-ext-123'
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {};

      const extensionMapping = {
        'old-ext-123': 'new-ext-456'
      };

      fsUtilityStub.withArgs(path.join(tempDir, 'mapper/extensions/uid-mapping.json')).returns(extensionMapping);

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(schema[0].extension_uid).to.equal('new-ext-456');
    });

    it('should handle field with extension UID but no mapping', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'ext-field',
          data_type: 'text',
          extension_uid: 'old-ext-123',
          field_metadata: {
            extension: true
          }
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {};

      fsUtilityStub.withArgs(path.join(tempDir, 'mapper/extensions/uid-mapping.json')).returns({});

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(schema[0].extension_uid).to.equal('old-ext-123');
    });

    it('should use installed extensions when no file mapping exists', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'ext-field',
          data_type: 'text',
          extension_uid: 'old-ext-123',
          field_metadata: {
            extension: true
          }
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {
        'old-ext-123': 'new-ext-456'
      };

      fsUtilityStub.withArgs(path.join(tempDir, 'mapper/extensions/uid-mapping.json')).returns({});

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(schema[0].extension_uid).to.equal('new-ext-456');
    });

    it('should process JSON field with plugins', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'json-field',
          data_type: 'json',
          plugins: ['plugin-1', 'plugin-2']
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {};

      const extensionMapping = {
        'plugin-1': 'mapped-plugin-1'
      };

      const marketplaceMapping = {
        extension_uid: {
          'plugin-2': 'mapped-plugin-2'
        }
      };

      fsUtilityStub.withArgs(path.join(tempDir, 'mapper/extensions/uid-mapping.json')).returns(extensionMapping);
      fsUtilityStub.withArgs(path.join(tempDir, 'mapper/marketplace_apps/uid-mapping.json')).returns(marketplaceMapping);

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(schema[0].plugins).to.deep.equal(['mapped-plugin-1', 'mapped-plugin-2']);
    });

    it('should handle JSON field with plugins and no mappings', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'json-field',
          data_type: 'json',
          plugins: ['plugin-1', 'plugin-2']
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {};

      fsUtilityStub.withArgs(path.join(tempDir, 'mapper/extensions/uid-mapping.json')).returns({});
      fsUtilityStub.withArgs(path.join(tempDir, 'mapper/marketplace_apps/uid-mapping.json')).returns({});

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(schema[0].plugins).to.deep.equal([]);
    });

    it('should handle JSON field with empty plugins array', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'json-field',
          data_type: 'json',
          plugins: [] as string[]
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {};

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(schema[0].plugins).to.deep.equal([]);
    });

    it('should handle mixed field types in schema', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'text-field',
          data_type: 'text',
          extension_uid: 'ext-1'
        },
        {
          uid: 'ref-field',
          data_type: 'reference',
          reference_to: 'content-type-1',
          field_metadata: {} as any
        },
        {
          uid: 'global-field',
          data_type: 'global_field',
          reference_to: 'global-1'
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {
        'ext-1': 'new-ext-1'
      };

      const globalFieldsMapping = {
        'global-1': 'mapped-global-1'
      };

      fsUtilityStub.withArgs(path.join(tempDir, 'mapper/globalfields/uid-mapping.json')).returns(globalFieldsMapping);

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(schema[0].extension_uid).to.equal('new-ext-1');
      expect(schema[1].reference_to).to.deep.equal(['content-type-1']);
      expect(schema[2].reference_to).to.equal('mapped-global-1');
    });

    it('should handle null/undefined data from file reads', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'global-field',
          data_type: 'global_field',
          reference_to: 'global-1'
        },
        {
          uid: 'ext-field',
          data_type: 'text',
          extension_uid: 'ext-1'
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {};

      fsUtilityStub.returns(null);

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(schema[0].reference_to).to.equal('global-1');
      expect(schema[1].extension_uid).to.equal('ext-1');
    });

    it('should handle empty schema array', () => {
      const config = createMockConfig(tempDir);
      const schema: any[] = [];
      const preserveStackVersion = false;
      const installedExtensions = {};

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(schema).to.deep.equal([]);
    });

    it('should handle reference field with ref_multiple_content_types already set', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'ref-field',
          data_type: 'reference',
          reference_to: 'content-type-1',
          field_metadata: {
            ref_multiple_content_types: true
          },
          extension_uid: 'ext-123'
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {
        'ext-123': 'new-ext-456'
      };

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(schema[0].reference_to).to.equal('content-type-1');
      expect(schema[0].field_metadata.ref_multiple_content_types).to.be.true;
      expect(schema[0].extension_uid).to.equal('new-ext-456');
    });

    it('should handle JSON field with marketplace apps mapping', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'json-field',
          data_type: 'json',
          plugins: ['marketplace-plugin-1', 'extension-plugin-1']
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {};

      const extensionMapping = {
        'extension-plugin-1': 'mapped-extension-plugin-1'
      };

      const marketplaceMapping = {
        extension_uid: {
          'marketplace-plugin-1': 'mapped-marketplace-plugin-1'
        }
      };

      fsUtilityStub.withArgs(path.join(tempDir, 'mapper/extensions/uid-mapping.json')).returns(extensionMapping);
      fsUtilityStub.withArgs(path.join(tempDir, 'mapper/marketplace_apps/uid-mapping.json')).returns(marketplaceMapping);

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(schema[0].plugins).to.deep.equal(['mapped-marketplace-plugin-1', 'mapped-extension-plugin-1']);
    });

    it('should handle field with extension_uid but no field_metadata.extension', () => {
      const config = createMockConfig(tempDir);
      const schema = [
        {
          uid: 'ext-field',
          data_type: 'text',
          extension_uid: 'old-ext-123'
        }
      ];
      const preserveStackVersion = false;
      const installedExtensions = {};

      const extensionMapping = {
        'old-ext-123': 'new-ext-456'
      };

      fsUtilityStub.withArgs(path.join(tempDir, 'mapper/extensions/uid-mapping.json')).returns(extensionMapping);

      lookupExtension(config, schema, preserveStackVersion, installedExtensions);

      expect(schema[0].extension_uid).to.equal('new-ext-456');
    });
  });
});
