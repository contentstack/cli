import { expect } from 'chai';
import sinon from 'sinon';
import EntriesImport from '../../../../src/import/modules/entries';
import { ImportConfig, ModuleClassParams } from '../../../../src/types';
import { FsUtility } from '@contentstack/cli-utilities';
import { fsUtil, fileHelper, MODULE_CONTEXTS } from '../../../../src/utils';
import * as path from 'path';

const mockData = require('./mock-data/entries/content-types.json');
const mockEntries = require('./mock-data/entries/entries.json');
const mockLocales = require('./mock-data/entries/locales.json');
const mockEnvironments = require('./mock-data/entries/environments.json');
const mockMappers = require('./mock-data/entries/mapper-data.json');

describe('EntriesImport', () => {
  let entriesImport: EntriesImport;
  let mockStackClient: any;
  let mockImportConfig: ImportConfig;
  let fsUtilityReadFileStub: sinon.SinonStub;
  let fsUtilityWriteFileStub: sinon.SinonStub;
  let fsUtilityMakeDirectoryStub: sinon.SinonStub;
  let fileHelperReadFileSyncStub: sinon.SinonStub;
  let fileHelperWriteLargeFileStub: sinon.SinonStub;
  let makeConcurrentCallStub: sinon.SinonStub;

  beforeEach(() => {
    sinon.stub(FsUtility.prototype, 'createFolderIfNotExist').callsFake(() => {
      return Promise.resolve();
    });
    
    // Stub FsUtility prototype to support readContentTypeSchemas
    // readContentTypeSchemas creates its own FsUtility instance, so we need to stub the prototype
    sinon.stub(FsUtility.prototype, 'readdir').returns([]);
    
    // Stub FsUtility.prototype.readFile for readContentTypeSchemas (returns parsed objects)
    // This also stubs fsUtil.readFile since fsUtil is an instance of FsUtility
    // Don't set a default return value - let individual tests configure it
    fsUtilityReadFileStub = sinon.stub(FsUtility.prototype, 'readFile');
    fsUtilityWriteFileStub = sinon.stub(fsUtil, 'writeFile').callsFake(() => {
      return Promise.resolve();
    });
    fsUtilityMakeDirectoryStub = sinon.stub(fsUtil, 'makeDirectory').callsFake(() => {
      return Promise.resolve('');
    });

    fileHelperReadFileSyncStub = sinon.stub(fileHelper, 'readFileSync');
    fileHelperWriteLargeFileStub = sinon.stub(fileHelper, 'writeLargeFile').callsFake(() => {
      return Promise.resolve();
    });
    mockStackClient = {
      contentType: sinon.stub().returns({
        create: sinon.stub().resolves({ uid: 'new-entry-uid' }),
        entry: sinon.stub().returns({
          create: sinon.stub().resolves({ uid: 'new-entry-uid' }),
          update: sinon.stub().resolves({ uid: 'updated-entry-uid' }),
          delete: sinon.stub().resolves({ uid: 'deleted-entry-uid' }),
          publish: sinon.stub().resolves({ uid: 'published-entry-uid' }),
          query: sinon.stub().returns({
            findOne: sinon.stub().resolves({ items: [{ uid: 'existing-entry-uid', title: 'Existing Entry' }] }),
          }),
        }),
        fetch: sinon.stub().resolves({ uid: 'ct-uid', schema: [] }),
        update: sinon.stub().resolves({ uid: 'updated-ct-uid' }),
      }),
    };

    mockImportConfig = {
      apiKey: 'test',
      contentDir: '/test/content',
      data: '/test/content',
      region: 'us',
      master_locale: { code: 'en-us' },
      masterLocale: { code: 'en-us' },
      context: {
        command: 'cm:stacks:import',
        module: 'entries',
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-123',
        apiKey: 'test',
        orgId: 'org-123',
        authenticationMethod: 'Basic Auth',
      },
      modules: {
        types: ['entries'],
        entries: {
          dirName: 'entries',
          chunkFileSize: 100,
          invalidKeys: ['_version', 'created_at', 'updated_at'],
          importConcurrency: 5,
        },
        'content-types': {
          dirName: 'content_types',
        },
        locales: {
          dirName: 'locales',
          fileName: 'locales.json',
        },
      },
      backupDir: '/test/backup',
      cliLogsPath: '/test/logs',
      canCreatePrivateApp: true,
      forceStopMarketplaceAppsPrompt: false,
      skipPrivateAppRecreationIfExist: true,
      isAuthenticated: true,
      auth_token: 'auth-token',
      selectedModules: ['entries'],
      skipAudit: false,
      skipEntriesPublish: false,
      'exclude-global-modules': false,
      replaceExisting: false,
      importConcurrency: 5,
    } as any;

    entriesImport = new EntriesImport({
      importConfig: mockImportConfig as any,
      stackAPIClient: mockStackClient,
      moduleName: 'entries',
    });

    makeConcurrentCallStub = sinon.stub(entriesImport as any, 'makeConcurrentCall').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      expect(entriesImport).to.be.instanceOf(EntriesImport);
      expect(entriesImport['importConfig']).to.equal(mockImportConfig);
      expect((entriesImport as any)['client']).to.equal(mockStackClient);
    });

    it('should set context module to entries', () => {
      expect(entriesImport['importConfig'].context.module).to.equal(MODULE_CONTEXTS.ENTRIES);
    });

    it('should initialize paths correctly', () => {
      expect(entriesImport['assetUidMapperPath']).to.include('mapper/assets/uid-mapping.json');
      expect(entriesImport['assetUrlMapperPath']).to.include('mapper/assets/url-mapping.json');
      expect(entriesImport['entriesMapperPath']).to.include('mapper/entries');
      expect(entriesImport['envPath']).to.include('environments/environments.json');
      expect(entriesImport['entriesUIDMapperPath']).to.include('uid-mapping.json');
      expect(entriesImport['uniqueUidMapperPath']).to.include('unique-mapping.json');
      expect(entriesImport['modifiedCTsPath']).to.include('modified-schemas.json');
      expect(entriesImport['marketplaceAppMapperPath']).to.include('mapper/marketplace_apps/uid-mapping.json');
      expect(entriesImport['taxonomiesPath']).to.include('mapper/taxonomies/terms/success.json');
      expect(entriesImport['entriesPath']).to.include('entries');
      expect(entriesImport['cTsPath']).to.include('content_types');
      expect(entriesImport['localesPath']).to.include('locales/locales.json');
    });

    it('should initialize empty mappings and arrays', () => {
      expect(entriesImport['entriesUidMapper']).to.deep.equal({});
      expect(entriesImport['modifiedCTs']).to.deep.equal([]);
      expect(entriesImport['refCTs']).to.deep.equal([]);
      expect(entriesImport['jsonRteCTs']).to.deep.equal([]);
      expect(entriesImport['jsonRteCTsWithRef']).to.deep.equal([]);
      expect(entriesImport['envs']).to.deep.equal({});
      expect(entriesImport['autoCreatedEntries']).to.deep.equal([]);
      expect(entriesImport['failedEntries']).to.deep.equal([]);
      expect(entriesImport['rteCTs']).to.deep.equal([]);
      expect(entriesImport['rteCTsWithRef']).to.deep.equal([]);
      expect(entriesImport['entriesForVariant']).to.deep.equal([]);
    });

    it('should set import concurrency from entries config', () => {
      expect(entriesImport['importConcurrency']).to.equal(5);
    });

    it('should fallback to global import concurrency if entries config not provided', () => {
      const configWithoutEntriesConcurrency = {
        ...mockImportConfig,
        modules: {
          ...mockImportConfig.modules,
          entries: {
            dirName: 'entries',
            chunkFileSize: 100,
            invalidKeys: ['_version', 'created_at', 'updated_at'],
            // No importConcurrency
          },
        },
      };

      const entriesImportFallback = new EntriesImport({
        importConfig: configWithoutEntriesConcurrency as any,
        stackAPIClient: mockStackClient,
        moduleName: 'entries',
      });

      expect(entriesImportFallback['importConcurrency']).to.equal(5);
    });
  });

  describe('Content Type Processing', () => {
    beforeEach(() => {
      entriesImport['cTs'] = [
        mockData.simpleContentType,
        mockData.contentTypeWithReferences,
        mockData.contentTypeWithJsonRte,
        mockData.contentTypeWithAssets,
      ];
      entriesImport['installedExtensions'] = mockMappers.installedExtensions;
    });

    describe('disableMandatoryCTReferences()', () => {
      it('should process content types and suppress references', async () => {
        makeConcurrentCallStub.callsFake(async (options) => {
          const onSuccess = options.apiParams.resolve;
          onSuccess({
            response: { uid: 'ct-uid' },
            apiData: { uid: 'ct-uid' },
          });
        });

        await entriesImport['disableMandatoryCTReferences']();

        expect(makeConcurrentCallStub.calledOnce).to.be.true;
        expect(fsUtilityWriteFileStub.called).to.be.true;
      });

      it('should handle content type processing errors', async () => {
        makeConcurrentCallStub.callsFake(async (options) => {
          const onReject = options.apiParams.reject;
          onReject({
            error: new Error('Content type processing failed'),
            apiData: { uid: 'ct-uid' },
          });
        });

        await entriesImport['disableMandatoryCTReferences']();

        expect(makeConcurrentCallStub.calledOnce).to.be.true;
      });
    });

    describe('serializeUpdateCTs()', () => {
      it('should process content type with references', () => {
        const contentTypeWithReferences = {
          ...mockData.contentTypeWithReferences,
          schema: [
            ...mockData.contentTypeWithReferences.schema,
            {
              uid: 'mandatory_field',
              data_type: 'text',
              display_name: 'Mandatory Field',
              mandatory: true,
            },
          ],
        };

        const apiOptions = {
          apiData: contentTypeWithReferences,
          entity: 'update-cts' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
        };

        const result = entriesImport['serializeUpdateCTs'](apiOptions);

        expect(result.apiData).to.not.be.null;
        expect(entriesImport['refCTs']).to.include('ref_ct');
        expect(result.apiData.uid).to.equal('ref_ct');
      });

      it('should process content type with JSON RTE fields', () => {
        const contentTypeWithJsonRte = {
          ...mockData.contentTypeWithJsonRte,
          schema: [
            ...mockData.contentTypeWithJsonRte.schema,
            {
              uid: 'mandatory_field',
              data_type: 'text',
              display_name: 'Mandatory Field',
              mandatory: true,
            },
          ],
        };

        const apiOptions = {
          apiData: contentTypeWithJsonRte,
          entity: 'update-cts' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
        };

        const result = entriesImport['serializeUpdateCTs'](apiOptions);

        expect(result.apiData).to.not.be.null;
        expect(entriesImport['jsonRteCTs']).to.include('json_rte_ct');
        expect(entriesImport['jsonRteCTsWithRef']).to.include('json_rte_ct');
        expect(entriesImport['refCTs']).to.include('json_rte_ct');
      });

      it('should process content type with RTE fields', () => {
        const contentTypeWithRte = {
          ...mockData.simpleContentType,
          uid: 'rte_ct',
          schema: [
            {
              uid: 'title',
              data_type: 'text',
              display_name: 'Title',
              mandatory: true,
              unique: true,
            },
            {
              uid: 'rte_field',
              data_type: 'text',
              display_name: 'RTE Field',
              field_metadata: {
                rich_text_type: true,
                embed_entry: true,
              },
              reference_to: ['simple_ct'],
            },
            {
              uid: 'mandatory_field',
              data_type: 'text',
              display_name: 'Mandatory Field',
              mandatory: true,
            },
          ],
        };

        const apiOptions = {
          apiData: contentTypeWithRte,
          entity: 'update-cts' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
        };

        const result = entriesImport['serializeUpdateCTs'](apiOptions);

        expect(result.apiData).to.not.be.null;
        expect(entriesImport['rteCTs']).to.include('rte_ct');
        expect(entriesImport['rteCTsWithRef']).to.include('rte_ct');
        expect(entriesImport['refCTs']).to.include('rte_ct');
      });

      it('should skip content type without references', () => {
        const apiOptions = {
          apiData: mockData.simpleContentType,
          entity: 'update-cts' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
        };

        const result = entriesImport['serializeUpdateCTs'](apiOptions);

        expect(result.apiData).to.be.null;
        expect(entriesImport['modifiedCTs']).to.have.lengthOf(0);
      });

      it('should remove field_rules from content type', () => {
        const contentTypeWithFieldRules = {
          ...mockData.contentTypeWithReferences,
          schema: [
            ...mockData.contentTypeWithReferences.schema,
            {
              uid: 'mandatory_field',
              data_type: 'text',
              display_name: 'Mandatory Field',
              mandatory: true,
            },
          ],
          field_rules: [
            {
              conditions: [{ operand_field: 'title', operator: 'equals', value: 'test' }],
              actions: [{ operand_field: 'description', action: 'show' }],
            },
          ],
        };

        const apiOptions = {
          apiData: contentTypeWithFieldRules,
          entity: 'update-cts' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
        };

        const result = entriesImport['serializeUpdateCTs'](apiOptions);

        expect(result.apiData).to.not.be.null;
        expect(result.apiData.field_rules).to.be.undefined;
      });

      it('should add content type to modifiedCTs when suppressed', () => {
        const contentTypeWithMandatory = {
          ...mockData.simpleContentType,
          schema: [
            {
              uid: 'title',
              data_type: 'text',
              display_name: 'Title',
              mandatory: true,
              unique: true,
            },
            {
              uid: 'mandatory_field',
              data_type: 'text',
              display_name: 'Mandatory Field',
              mandatory: true,
            },
          ],
        };

        const apiOptions = {
          apiData: contentTypeWithMandatory,
          entity: 'update-cts' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
        };

        entriesImport['serializeUpdateCTs'](apiOptions);

        expect(entriesImport['modifiedCTs']).to.have.lengthOf(1);
        expect(entriesImport['modifiedCTs'][0].uid).to.equal('simple_ct');
      });
    });

    describe('enableMandatoryCTReferences()', () => {
      beforeEach(() => {
        entriesImport['modifiedCTs'] = [mockData.contentTypeWithReferences];
      });

      it('should restore content type references', async () => {
        makeConcurrentCallStub.callsFake(async (options) => {
          const onSuccess = options.apiParams.resolve;
          onSuccess({
            response: { uid: 'ct-uid' },
            apiData: { uid: 'ct-uid' },
          });
        });

        await entriesImport['enableMandatoryCTReferences']();

        expect(makeConcurrentCallStub.calledOnce).to.be.true;
      });

      it('should handle content type update errors', async () => {
        makeConcurrentCallStub.callsFake(async (options) => {
          const onReject = options.apiParams.reject;
          onReject({
            error: new Error('Content type update failed'),
            apiData: { uid: 'ct-uid' },
          });
        });

        try {
          await entriesImport['enableMandatoryCTReferences']();
        } catch (error) {
          expect(error.message).to.include('Failed to update references of content type');
        }

        expect(makeConcurrentCallStub.calledOnce).to.be.true;
      });
    });

    describe('serializeUpdateCTsWithRef()', () => {
      it('should process content type for reference restoration', () => {
        const apiOptions = {
          apiData: mockData.contentTypeWithReferences,
          entity: 'update-cts' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
        };

        const result = entriesImport['serializeUpdateCTsWithRef'](apiOptions);

        expect(result.apiData).to.not.be.null;
        expect(result.apiData.uid).to.equal('ref_ct');
      });

      it('should remove field_rules from content type', () => {
        const contentTypeWithFieldRules = {
          ...mockData.contentTypeWithReferences,
          field_rules: [
            {
              conditions: [{ operand_field: 'title', operator: 'equals', value: 'test' }],
              actions: [{ operand_field: 'description', action: 'show' }],
            },
          ],
        };

        const apiOptions = {
          apiData: contentTypeWithFieldRules,
          entity: 'update-cts' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
        };

        const result = entriesImport['serializeUpdateCTsWithRef'](apiOptions);

        expect(result.apiData.field_rules).to.be.undefined;
      });
    });

    describe('updateFieldRules()', () => {
      beforeEach(() => {
        entriesImport['cTs'] = [mockData.contentTypeWithFieldRules];
        entriesImport['entriesUidMapper'] = {
          entry_uid_1: 'new_entry_uid_1',
          entry_uid_2: 'new_entry_uid_2',
        };
        fsUtilityReadFileStub.callsFake((path) => {
          if (path.includes('field_rules_uid.json')) {
            return ['field_rules_ct'];
          }
          if (path.includes('schema.json')) {
            return [mockData.contentTypeWithFieldRules];
          }
          if (path.includes('field_rules_ct.json')) {
            return mockData.contentTypeWithFieldRules;
          }
          return undefined;
        });
        
        // Override FsUtility.prototype.readdir for readContentTypeSchemas
        (FsUtility.prototype.readdir as sinon.SinonStub).returns(['field_rules_ct.json']);
      });

      it('should update field rules with new UIDs', async () => {
        const mockContentTypeResponse = {
          uid: 'field_rules_ct',
          field_rules: mockData.contentTypeWithFieldRules.field_rules,
          update: sinon.stub().resolves({ uid: 'updated-ct' }),
        };

        mockStackClient.contentType.returns({
          fetch: sinon.stub().resolves(mockContentTypeResponse),
        });

        await entriesImport['updateFieldRules']();

        expect(fsUtilityReadFileStub.called).to.be.true;
        expect(mockStackClient.contentType().fetch.called).to.be.true;
        expect(mockContentTypeResponse.update.called).to.be.true;
      });

      it('should handle missing field rules file', async () => {
        fsUtilityReadFileStub.callsFake((path) => {
          if (path.includes('field_rules_uid.json')) {
            return [];
          }
          return {};
        });

        await entriesImport['updateFieldRules']();

        expect(fsUtilityReadFileStub.called).to.be.true;
      });

      it('should handle content type not found', async () => {
        // This test expects the content type to be in schemas but API fetch returns null
        // The beforeEach already sets up field_rules_ct, so this should work
        
        mockStackClient.contentType.returns({
          fetch: sinon.stub().resolves(null),
        });

        await entriesImport['updateFieldRules']();

        expect(mockStackClient.contentType().fetch.called).to.be.true;
      });

      it('should handle content type without field rules', async () => {
        const contentTypeWithoutFieldRules = {
          ...mockData.contentTypeWithFieldRules,
          field_rules: undefined,
        };

        fsUtilityReadFileStub.callsFake((path) => {
          if (path.includes('field_rules_uid.json')) {
            return ['field_rules_ct'];
          }
          if (path.includes('schema.json')) {
            return [contentTypeWithoutFieldRules];
          }
          if (path.includes('field_rules_ct.json')) {
            return contentTypeWithoutFieldRules;
          }
          return undefined;
        });
        
        // Override FsUtility.readdir for this test
        (FsUtility.prototype.readdir as sinon.SinonStub).returns(['field_rules_ct.json']);

        await entriesImport['updateFieldRules']();

        expect(fsUtilityReadFileStub.called).to.be.true;
      });
    });
  });

  describe('Entry Creation Flow', () => {
    beforeEach(() => {
      entriesImport['cTs'] = [
        mockData.simpleContentType,
        mockData.contentTypeWithReferences,
        mockData.contentTypeWithJsonRte,
        mockData.contentTypeWithRte,
        mockData.contentTypeWithAssets,
        mockData.contentTypeWithTaxonomy,
        mockData.contentTypeWithGroups,
      ];
      entriesImport['locales'] = [
        { code: 'en-us', name: 'English (United States)' },
        { code: 'fr-fr', name: 'French (France)' },
      ];
      entriesImport['installedExtensions'] = mockMappers.installedExtensions;
      entriesImport['assetUidMapper'] = mockMappers.assetUidMapper;
      entriesImport['assetUrlMapper'] = mockMappers.assetUrlMapper;
      entriesImport['taxonomies'] = mockMappers.taxonomies;
    });

    describe('populateEntryCreatePayload()', () => {
      it('should generate request options for all locales and content types', () => {
        const result = entriesImport['populateEntryCreatePayload']();

        expect(result).to.be.an('array');
        expect(result).to.have.lengthOf(14); // 7 content types × 2 locales

        // Check that all content types are included
        const contentTypes = result.map((option) => option.cTUid);
        expect(contentTypes).to.include('simple_ct');
        expect(contentTypes).to.include('ref_ct');
        expect(contentTypes).to.include('json_rte_ct');
        expect(contentTypes).to.include('rte_ct');
        expect(contentTypes).to.include('asset_ct');
        expect(contentTypes).to.include('taxonomy_ct');
        expect(contentTypes).to.include('group_ct');

        // Check that all locales are included
        const locales = result.map((option) => option.locale);
        expect(locales).to.include('en-us');
        expect(locales).to.include('fr-fr');

        // Check structure of each option
        result.forEach((option) => {
          expect(option).to.have.property('cTUid');
          expect(option).to.have.property('locale');
          expect(option.cTUid).to.be.a('string');
          expect(option.locale).to.be.a('string');
        });
      });

      it('should handle empty content types array', () => {
        entriesImport['cTs'] = [];
        const result = entriesImport['populateEntryCreatePayload']();

        expect(result).to.be.an('array');
        expect(result).to.have.lengthOf(0);
      });

      it('should handle empty locales array', () => {
        entriesImport['locales'] = [];
        const result = entriesImport['populateEntryCreatePayload']();

        expect(result).to.be.an('array');
        expect(result).to.have.lengthOf(0);
      });
    });

    describe('createEntries()', () => {
      it('should handle empty chunks', async () => {
        const mockFsUtility = {
          indexFileContent: {},
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        await entriesImport['createEntries']({ cTUid: 'simple_ct', locale: 'en-us' });

        expect(makeConcurrentCallStub.called).to.be.false;
      });

      it('should process entries successfully in master locale', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1', 'entry2'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().resolves({
            entry1: mockEntries.simpleEntry,
            entry2: mockEntries.entryWithReferences,
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        const mockWriteIntoFile = sinon.stub().resolves();
        const mockCompleteFile = sinon.stub().resolves();
        sinon.stub(FsUtility.prototype, 'writeIntoFile').callsFake(mockWriteIntoFile);
        sinon.stub(FsUtility.prototype, 'completeFile').callsFake(mockCompleteFile);

        makeConcurrentCallStub.callsFake(async (options) => {
          const onSuccess = options.apiParams.resolve;
          // Simulate successful entry creation
          onSuccess({
            response: { uid: 'new_simple_entry_1' },
            apiData: mockEntries.simpleEntry,
            additionalInfo: {
              contentType: mockData.simpleContentType,
              locale: 'en-us',
              cTUid: 'simple_ct',
              entryFileName: 'chunk1.json',
              isMasterLocale: true,
            },
          });
        });

        // Set master locale
        entriesImport['importConfig'].master_locale = { code: 'en-us' };

        await entriesImport['createEntries']({ cTUid: 'simple_ct', locale: 'en-us' });

        expect(makeConcurrentCallStub.called).to.be.true;
        expect(mockReadChunkFiles.next.called).to.be.true;
        expect(mockWriteIntoFile.called).to.be.true;
        expect(mockCompleteFile.called).to.be.true;

        // Check that UID mapping was created
        expect(entriesImport['entriesUidMapper']['simple_entry_1']).to.equal('new_simple_entry_1');

        // Check that entry was added to variant list
        expect(entriesImport['entriesForVariant']).to.deep.include({
          content_type: 'simple_ct',
          entry_uid: 'simple_entry_1',
          locale: 'en-us',
        });
      });

      it('should process entries successfully in non-master locale', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().resolves({
            entry1: mockEntries.simpleEntry,
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        const mockWriteIntoFile = sinon.stub().resolves();
        const mockCompleteFile = sinon.stub().resolves();
        sinon.stub(FsUtility.prototype, 'writeIntoFile').callsFake(mockWriteIntoFile);
        sinon.stub(FsUtility.prototype, 'completeFile').callsFake(mockCompleteFile);

        makeConcurrentCallStub.callsFake(async (options) => {
          const onSuccess = options.apiParams.resolve;
          onSuccess({
            response: { uid: 'new_simple_entry_1' },
            apiData: mockEntries.simpleEntry,
            additionalInfo: {
              contentType: mockData.simpleContentType,
              locale: 'fr-fr',
              cTUid: 'simple_ct',
              entryFileName: 'chunk1.json',
              isMasterLocale: false,
            },
          });
        });

        // Set master locale to different locale
        entriesImport['importConfig'].master_locale = { code: 'en-us' };

        await entriesImport['createEntries']({ cTUid: 'simple_ct', locale: 'fr-fr' });

        expect(makeConcurrentCallStub.called).to.be.true;

        // Check that entry was added to auto-created entries for cleanup
        expect(entriesImport['autoCreatedEntries']).to.deep.include({
          cTUid: 'simple_ct',
          locale: 'fr-fr',
          entryUid: 'new_simple_entry_1',
        });
      });

      it('should handle localized entries correctly', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().resolves({
            entry1: mockEntries.localizedEntry,
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        const mockWriteIntoFile = sinon.stub().resolves();
        const mockCompleteFile = sinon.stub().resolves();
        sinon.stub(FsUtility.prototype, 'writeIntoFile').callsFake(mockWriteIntoFile);
        sinon.stub(FsUtility.prototype, 'completeFile').callsFake(mockCompleteFile);

        makeConcurrentCallStub.callsFake(async (options) => {
          const onSuccess = options.apiParams.resolve;
          onSuccess({
            response: { uid: 'new_localized_entry_1' },
            apiData: mockEntries.localizedEntry,
            additionalInfo: {
              contentType: mockData.simpleContentType,
              locale: 'fr-fr',
              cTUid: 'simple_ct',
              entryFileName: 'chunk1.json',
              isMasterLocale: false,
              [mockEntries.localizedEntry.uid]: {
                isLocalized: true,
                entryOldUid: 'old_localized_entry_1',
              },
            },
          });
        });

        await entriesImport['createEntries']({ cTUid: 'simple_ct', locale: 'fr-fr' });

        expect(makeConcurrentCallStub.called).to.be.true;

        // Check that localized entry was added to variant list with old UID
        expect(entriesImport['entriesForVariant']).to.deep.include({
          content_type: 'simple_ct',
          entry_uid: 'old_localized_entry_1',
          locale: 'fr-fr',
        });
      });

      it('should handle chunk read errors', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const originalCompleteFile = FsUtility.prototype.completeFile;
        FsUtility.prototype.completeFile = sinon.stub().resolves();

        const mockReadChunkFiles = {
          next: sinon.stub().rejects(new Error('Chunk read failed')),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        try {
          await entriesImport['createEntries']({ cTUid: 'simple_ct', locale: 'en-us' });
        } catch (error) {
          // Expected to throw error
        } finally {
          FsUtility.prototype.completeFile = originalCompleteFile;
        }

        expect(mockReadChunkFiles.next.called).to.be.true;
        expect(makeConcurrentCallStub.called).to.be.false;
      });

      it('should handle error code 119 with replaceExisting true', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().resolves({
            entry1: mockEntries.existingEntry,
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        const mockWriteIntoFile = sinon.stub().resolves();
        const mockCompleteFile = sinon.stub().resolves();
        sinon.stub(FsUtility.prototype, 'writeIntoFile').callsFake(mockWriteIntoFile);
        sinon.stub(FsUtility.prototype, 'completeFile').callsFake(mockCompleteFile);

        makeConcurrentCallStub.callsFake(async (options) => {
          const onReject = options.apiParams.reject;
          onReject({
            error: {
              errorCode: 119,
              errors: { title: 'already exists' },
            },
            apiData: mockEntries.existingEntry,
            additionalInfo: {
              contentType: mockData.simpleContentType,
              locale: 'en-us',
              cTUid: 'simple_ct',
              entryFileName: 'chunk1.json',
              isMasterLocale: true,
            },
          });
        });

        // Set replaceExisting to true
        entriesImport['importConfig'].replaceExisting = true;

        await entriesImport['createEntries']({ cTUid: 'simple_ct', locale: 'en-us' });

        expect(makeConcurrentCallStub.called).to.be.true;
        // Should write to existing entries file for replacement
        expect(mockWriteIntoFile.called).to.be.true;
      });

      it('should handle error code 119 with skipExisting true', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().resolves({
            entry1: mockEntries.existingEntry,
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        const mockWriteIntoFile = sinon.stub().resolves();
        const mockCompleteFile = sinon.stub().resolves();
        sinon.stub(FsUtility.prototype, 'writeIntoFile').callsFake(mockWriteIntoFile);
        sinon.stub(FsUtility.prototype, 'completeFile').callsFake(mockCompleteFile);

        makeConcurrentCallStub.callsFake(async (options) => {
          const onReject = options.apiParams.reject;
          onReject({
            error: {
              errorCode: 119,
              errors: { title: 'already exists' },
            },
            apiData: mockEntries.existingEntry,
            additionalInfo: {
              contentType: mockData.simpleContentType,
              locale: 'en-us',
              cTUid: 'simple_ct',
              entryFileName: 'chunk1.json',
              isMasterLocale: true,
            },
          });
        });

        // Set skipExisting to true
        entriesImport['importConfig'].skipExisting = true;

        await entriesImport['createEntries']({ cTUid: 'simple_ct', locale: 'en-us' });

        expect(makeConcurrentCallStub.called).to.be.true;
      });

      it('should handle error code 119 without title/uid errors', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().resolves({
            entry1: mockEntries.existingEntry,
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        const mockWriteIntoFile = sinon.stub().resolves();
        const mockCompleteFile = sinon.stub().resolves();
        sinon.stub(FsUtility.prototype, 'writeIntoFile').callsFake(mockWriteIntoFile);
        sinon.stub(FsUtility.prototype, 'completeFile').callsFake(mockCompleteFile);

        makeConcurrentCallStub.callsFake(async (options) => {
          const onReject = options.apiParams.reject;
          onReject({
            error: {
              errorCode: 119,
              errors: { other: 'some error' },
            },
            apiData: mockEntries.existingEntry,
            additionalInfo: {
              contentType: mockData.simpleContentType,
              locale: 'en-us',
              cTUid: 'simple_ct',
              entryFileName: 'chunk1.json',
              isMasterLocale: true,
            },
          });
        });

        await entriesImport['createEntries']({ cTUid: 'simple_ct', locale: 'en-us' });

        expect(makeConcurrentCallStub.called).to.be.true;
        // Should add to failed entries
        expect(entriesImport['failedEntries']).to.deep.include({
          content_type: 'simple_ct',
          locale: 'en-us',
          entry: { uid: 'existing_entry_1', title: 'Existing Entry' },
        });
      });

      it('should handle other error codes', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().resolves({
            entry1: mockEntries.simpleEntry,
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        const mockWriteIntoFile = sinon.stub().resolves();
        const mockCompleteFile = sinon.stub().resolves();
        sinon.stub(FsUtility.prototype, 'writeIntoFile').callsFake(mockWriteIntoFile);
        sinon.stub(FsUtility.prototype, 'completeFile').callsFake(mockCompleteFile);

        makeConcurrentCallStub.callsFake(async (options) => {
          const onReject = options.apiParams.reject;
          onReject({
            error: {
              errorCode: 500,
              message: 'Server error',
            },
            apiData: mockEntries.simpleEntry,
            additionalInfo: {
              contentType: mockData.simpleContentType,
              locale: 'en-us',
              cTUid: 'simple_ct',
              entryFileName: 'chunk1.json',
              isMasterLocale: true,
            },
          });
        });

        await entriesImport['createEntries']({ cTUid: 'simple_ct', locale: 'en-us' });

        expect(makeConcurrentCallStub.called).to.be.true;
        // Should add to failed entries
        expect(entriesImport['failedEntries']).to.deep.include({
          content_type: 'simple_ct',
          locale: 'en-us',
          entry: { uid: 'simple_entry_1', title: 'Simple Entry 1' },
        });
      });

      it('should remove failed entries from variant list', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().resolves({
            entry1: mockEntries.simpleEntry,
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        const mockWriteIntoFile = sinon.stub().resolves();
        const mockCompleteFile = sinon.stub().resolves();
        sinon.stub(FsUtility.prototype, 'writeIntoFile').callsFake(mockWriteIntoFile);
        sinon.stub(FsUtility.prototype, 'completeFile').callsFake(mockCompleteFile);

        // Pre-populate variant list
        entriesImport['entriesForVariant'] = [
          { content_type: 'simple_ct', entry_uid: 'simple_entry_1', locale: 'en-us' },
        ];

        makeConcurrentCallStub.callsFake(async (options) => {
          const onReject = options.apiParams.reject;
          onReject({
            error: {
              errorCode: 500,
              message: 'Server error',
            },
            apiData: mockEntries.simpleEntry,
            additionalInfo: {
              contentType: mockData.simpleContentType,
              locale: 'en-us',
              cTUid: 'simple_ct',
              entryFileName: 'chunk1.json',
              isMasterLocale: true,
            },
          });
        });

        await entriesImport['createEntries']({ cTUid: 'simple_ct', locale: 'en-us' });

        // Should remove failed entry from variant list
        expect(entriesImport['entriesForVariant']).to.not.deep.include({
          content_type: 'simple_ct',
          entry_uid: 'simple_entry_1',
          locale: 'en-us',
        });
      });

      it('should process multiple chunks correctly', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
            'chunk2.json': ['entry2'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        let chunkCallCount = 0;
        const mockReadChunkFiles = {
          next: sinon.stub().callsFake(() => {
            chunkCallCount++;
            if (chunkCallCount === 1) {
              return Promise.resolve({ entry1: mockEntries.simpleEntry });
            } else {
              return Promise.resolve({ entry2: mockEntries.entryWithReferences });
            }
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        const mockWriteIntoFile = sinon.stub().resolves();
        const mockCompleteFile = sinon.stub().resolves();
        sinon.stub(FsUtility.prototype, 'writeIntoFile').callsFake(mockWriteIntoFile);
        sinon.stub(FsUtility.prototype, 'completeFile').callsFake(mockCompleteFile);

        makeConcurrentCallStub.callsFake(async (options) => {
          const onSuccess = options.apiParams.resolve;
          onSuccess({
            response: { uid: 'new_entry_uid' },
            apiData: options.apiContent[0],
            additionalInfo: {
              contentType: mockData.simpleContentType,
              locale: 'en-us',
              cTUid: 'simple_ct',
              entryFileName: 'chunk1.json',
              isMasterLocale: true,
            },
          });
        });

        await entriesImport['createEntries']({ cTUid: 'simple_ct', locale: 'en-us' });

        expect(mockReadChunkFiles.next.calledTwice).to.be.true;
        expect(makeConcurrentCallStub.calledTwice).to.be.true;
      });
    });

    describe('serializeEntries()', () => {
      it('should serialize simple entries', () => {
        const apiOptions = {
          apiData: mockEntries.simpleEntry,
          entity: 'create-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'simple_ct',
            locale: 'en-us',
            contentType: mockData.simpleContentType,
            isMasterLocale: true,
          },
        };

        const result = entriesImport['serializeEntries'](apiOptions);

        expect(result.apiData).to.not.be.null;
        expect(result.apiData.uid).to.equal('simple_entry_1');
        expect(result.apiData.title).to.equal('Simple Entry 1');
      });

      it('should process JSON RTE fields', () => {
        const apiOptions = {
          apiData: mockEntries.entryWithJsonRte,
          entity: 'create-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'json_rte_ct',
            locale: 'en-us',
            contentType: mockData.contentTypeWithJsonRte,
            isMasterLocale: true,
          },
        };

        entriesImport['jsonRteCTs'] = ['json_rte_ct'];
        entriesImport['jsonRteCTsWithRef'] = ['json_rte_ct'];

        const result = entriesImport['serializeEntries'](apiOptions);

        expect(result.apiData).to.not.be.null;
        expect(result.apiData.uid).to.equal('json_rte_entry_1');
      });

      it('should process RTE fields', () => {
        const apiOptions = {
          apiData: mockEntries.entryWithRte,
          entity: 'create-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'rte_ct',
            locale: 'en-us',
            contentType: mockData.contentTypeWithRte,
            isMasterLocale: true,
          },
        };

        entriesImport['rteCTsWithRef'] = ['rte_ct'];

        const result = entriesImport['serializeEntries'](apiOptions);

        expect(result.apiData).to.not.be.null;
        expect(result.apiData.uid).to.equal('rte_entry_1');
      });

      it('should process taxonomy fields', () => {
        const apiOptions = {
          apiData: mockEntries.entryWithTaxonomyData,
          entity: 'create-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'taxonomy_ct',
            locale: 'en-us',
            contentType: mockData.contentTypeWithTaxonomy,
            isMasterLocale: true,
          },
        };

        const result = entriesImport['serializeEntries'](apiOptions);

        expect(result.apiData).to.not.be.null;
        expect(result.apiData.uid).to.equal('taxonomy_data_entry_1');
      });

      it('should handle localized entries', () => {
        const apiOptions = {
          apiData: mockEntries.localizedEntry,
          entity: 'create-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'simple_ct',
            locale: 'fr-fr',
            contentType: mockData.simpleContentType,
            isMasterLocale: false,
          },
        };

        entriesImport['entriesUidMapper'] = { old_localized_entry_1: 'new_localized_entry_1' };

        const originalLookupAssets = require('../../../../src/utils').lookupAssets;
        Object.defineProperty(require('../../../../src/utils'), 'lookupAssets', {
          get: () => (entryData: any) => {
            // Modify the entry in place
            entryData.entry.entryOldUid = entryData.entry.uid;
            entryData.entry.sourceEntryFilePath = '/test/content/entries/simple_ct/fr-fr/chunk1.json';
            // Return the modified entry
            return entryData.entry;
          },
          configurable: true,
        });

        const mockEntryResponse = { uid: 'new_localized_entry_1' };
        const mockEntry = {
          uid: sinon.stub().returns(mockEntryResponse),
        };
        mockStackClient.contentType = sinon.stub().returns({
          entry: sinon.stub().returns(mockEntry),
        });

        sinon.stub(entriesImport, 'stack').value(mockStackClient);

        const result = entriesImport['serializeEntries'](apiOptions);

        expect(result.apiData).to.not.be.null;
        expect(result.apiData.uid).to.equal('new_localized_entry_1'); // UID is mapped for localized entries
        expect(result.additionalInfo['new_localized_entry_1']).to.deep.include({
          isLocalized: true,
          entryOldUid: 'old_localized_entry_1',
        });

        Object.defineProperty(require('../../../../src/utils'), 'lookupAssets', {
          value: originalLookupAssets,
          configurable: true,
        });
      });

      it('should handle serialization errors', () => {
        const apiOptions = {
          apiData: { uid: 'invalid_entry', title: 'Invalid Entry' },
          entity: 'create-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'simple_ct',
            locale: 'en-us',
            contentType: mockData.simpleContentType,
            isMasterLocale: true,
          },
        };

        const invalidEntry = {
          uid: 'invalid_entry',
          title: 'Invalid Entry',
          // This will cause an error in lookupAssets due to missing required properties
          invalid_field: 'test',
        };

        const invalidApiOptions = {
          ...apiOptions,
          apiData: invalidEntry,
        };

        const lookupAssetsStub = sinon.stub().throws(new Error('Asset lookup failed'));
        const utils = require('../../../../src/utils');

        // Use Object.defineProperty to override the getter
        Object.defineProperty(utils, 'lookupAssets', {
          value: lookupAssetsStub,
          writable: true,
          configurable: true,
        });

        const result = entriesImport['serializeEntries'](invalidApiOptions);

        // The method should handle the error gracefully
        expect(result.apiData).to.be.null;
        expect(entriesImport['failedEntries']).to.have.lengthOf(1);
        expect(entriesImport['failedEntries'][0]).to.deep.include({
          content_type: 'simple_ct',
          locale: 'en-us',
          entry: { uid: 'invalid_entry', title: 'Invalid Entry' },
        });
      });
    });

    describe('createEntryDataForVariantEntry()', () => {
      it('should create variant entry data file', () => {
        entriesImport['entriesForVariant'] = [
          { content_type: 'simple_ct', entry_uid: 'entry_1', locale: 'fr-fr' },
          { content_type: 'ref_ct', entry_uid: 'entry_2', locale: 'en-us' },
        ];

        const originalWriteFileSync = require('fs').writeFileSync;
        const writeFileSyncStub = sinon.stub();
        require('fs').writeFileSync = writeFileSyncStub;

        entriesImport['createEntryDataForVariantEntry']();

        expect(writeFileSyncStub.called).to.be.true;
        const writeCall = writeFileSyncStub.getCall(0);
        expect(writeCall.args[0]).to.include('data-for-variant-entry.json');
        expect(JSON.parse(writeCall.args[1])).to.deep.equal(entriesImport['entriesForVariant']);

        require('fs').writeFileSync = originalWriteFileSync;
      });

      it('should handle empty variant entries array', () => {
        entriesImport['entriesForVariant'] = [];

        const originalWriteFileSync = require('fs').writeFileSync;
        const writeFileSyncStub = sinon.stub();
        require('fs').writeFileSync = writeFileSyncStub;

        entriesImport['createEntryDataForVariantEntry']();

        // The method should NOT write a file when the array is empty
        expect(writeFileSyncStub.called).to.be.false;

        require('fs').writeFileSync = originalWriteFileSync;
      });
    });
  });

  describe('Entry Update and Replace Flow', () => {
    beforeEach(() => {
      entriesImport['cTs'] = [
        mockData.simpleContentType,
        mockData.contentTypeWithReferences,
        mockData.contentTypeWithJsonRte,
        mockData.contentTypeWithRte,
      ];
      entriesImport['locales'] = [
        { code: 'en-us', name: 'English (United States)' },
        { code: 'fr-fr', name: 'French (France)' },
      ];
      entriesImport['refCTs'] = ['ref_ct', 'json_rte_ct', 'rte_ct'];
      entriesImport['jsonRteCTs'] = ['json_rte_ct'];
      entriesImport['rteCTs'] = ['rte_ct'];
      entriesImport['installedExtensions'] = mockMappers.installedExtensions;
      entriesImport['assetUidMapper'] = mockMappers.assetUidMapper;
      entriesImport['assetUrlMapper'] = mockMappers.assetUrlMapper;
      entriesImport['taxonomies'] = mockMappers.taxonomies;
      entriesImport['entriesUidMapper'] = {
        simple_entry_1: 'new_simple_entry_1',
        ref_entry_1: 'new_ref_entry_1',
        json_rte_entry_1: 'new_json_rte_entry_1',
        rte_entry_1: 'new_rte_entry_1',
      };
    });

    describe('populateEntryUpdatePayload()', () => {
      it('should generate update request options for reference content types', () => {
        const result = entriesImport['populateEntryUpdatePayload']();

        expect(result).to.be.an('array');
        expect(result).to.have.lengthOf(6); // 3 ref content types × 2 locales

        // Check that all reference content types are included
        const contentTypes = result.map((option) => option.cTUid);
        expect(contentTypes).to.include('ref_ct');
        expect(contentTypes).to.include('json_rte_ct');
        expect(contentTypes).to.include('rte_ct');

        // Check that all locales are included
        const locales = result.map((option) => option.locale);
        expect(locales).to.include('en-us');
        expect(locales).to.include('fr-fr');
      });

      it('should handle empty refCTs array', () => {
        entriesImport['refCTs'] = [];
        const result = entriesImport['populateEntryUpdatePayload']();

        expect(result).to.be.an('array');
        expect(result).to.have.lengthOf(0);
      });

      it('should handle empty locales array', () => {
        entriesImport['locales'] = [];
        const result = entriesImport['populateEntryUpdatePayload']();

        expect(result).to.be.an('array');
        expect(result).to.have.lengthOf(0);
      });
    });

    describe('updateEntriesWithReferences()', () => {
      it('should handle empty chunks', async () => {
        const mockFsUtility = {
          indexFileContent: {},
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        await entriesImport['updateEntriesWithReferences']({ cTUid: 'ref_ct', locale: 'en-us' });

        expect(makeConcurrentCallStub.called).to.be.false;
      });

      it('should process entries with references successfully', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1', 'entry2'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().resolves({
            entry1: mockEntries.entryWithReferences,
            entry2: mockEntries.simpleEntry,
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        makeConcurrentCallStub.callsFake(async (options) => {
          const onSuccess = options.apiParams.resolve;
          onSuccess({
            response: { uid: 'updated-entry-uid' },
            apiData: { uid: 'ref_entry_1', url: '/ref-entry-1', title: 'Entry with References' },
          });
        });

        await entriesImport['updateEntriesWithReferences']({ cTUid: 'ref_ct', locale: 'en-us' });

        expect(makeConcurrentCallStub.called).to.be.true;
        expect(mockReadChunkFiles.next.called).to.be.true;
      });

      it('should handle chunk read errors', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().rejects(new Error('Chunk read failed')),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        await entriesImport['updateEntriesWithReferences']({ cTUid: 'ref_ct', locale: 'en-us' });

        expect(mockReadChunkFiles.next.called).to.be.true;
        expect(makeConcurrentCallStub.called).to.be.false;
      });

      it('should handle API errors in onReject', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().resolves({
            entry1: mockEntries.entryWithReferences,
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        makeConcurrentCallStub.callsFake(async (options) => {
          const onReject = options.apiParams.reject;
          onReject({
            error: { status: 500, message: 'Update failed' },
            apiData: { uid: 'ref_entry_1', title: 'Entry with References' },
          });
        });

        await entriesImport['updateEntriesWithReferences']({ cTUid: 'ref_ct', locale: 'en-us' });

        expect(entriesImport['failedEntries']).to.have.lengthOf(1);
        expect(entriesImport['failedEntries'][0]).to.deep.include({
          content_type: 'ref_ct',
          locale: 'en-us',
          entry: { uid: 'new_ref_entry_1', title: 'Entry with References' },
          entryId: 'ref_entry_1',
        });
      });
    });

    describe('serializeUpdateEntries()', () => {
      it('should serialize entry update with basic data', () => {
        const apiOptions = {
          apiData: {
            uid: 'ref_entry_1',
            title: 'Entry with References',
            sourceEntryFilePath: '/path/to/source.json',
            entryOldUid: 'ref_entry_1',
          },
          entity: 'update-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'ref_ct',
            locale: 'en-us',
            contentType: mockData.contentTypeWithReferences,
          },
        };

        fsUtilityReadFileStub.callsFake((path) => {
          if (path.includes('source.json')) {
            return {
              ref_entry_1: {
                uid: 'ref_entry_1',
                title: 'Source Entry',
                single_reference: {
                  uid: 'simple_entry_1',
                  _content_type_uid: 'simple_ct',
                },
              },
            };
          }
          return {};
        });

        const originalLookupAssets = require('../../../../src/utils').lookupAssets;
        Object.defineProperty(require('../../../../src/utils'), 'lookupAssets', {
          get: () => (entryData: any) => entryData.entry,
          configurable: true,
        });

        const result = entriesImport['serializeUpdateEntries'](apiOptions);

        expect(result.apiData).to.not.be.null;
        expect(result.apiData.uid).to.equal('new_ref_entry_1');
        expect(result.apiData.title).to.equal('Entry with References');

        Object.defineProperty(require('../../../../src/utils'), 'lookupAssets', {
          get: () => originalLookupAssets,
          configurable: true,
        });
      });

      it('should restore JSON RTE entry references', () => {
        const apiOptions = {
          apiData: {
            uid: 'json_rte_entry_1',
            title: 'Entry with JSON RTE',
            sourceEntryFilePath: '/path/to/source.json',
            entryOldUid: 'json_rte_entry_1',
          },
          entity: 'update-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'json_rte_ct',
            locale: 'en-us',
            contentType: mockData.contentTypeWithJsonRte,
          },
        };

        fsUtilityReadFileStub.callsFake((path) => {
          if (path.includes('source.json')) {
            return {
              json_rte_entry_1: {
                uid: 'json_rte_entry_1',
                title: 'Source Entry',
                json_rte_field: {
                  type: 'doc',
                  children: [
                    {
                      type: 'p',
                      children: [
                        {
                          type: 'reference',
                          attrs: {
                            type: 'entry',
                            'entry-uid': 'simple_entry_1',
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            };
          }
          return {};
        });

        const originalLookupAssets = require('../../../../src/utils').lookupAssets;
        Object.defineProperty(require('../../../../src/utils'), 'lookupAssets', {
          get: () => (entryData: any) => entryData.entry,
          configurable: true,
        });

        const result = entriesImport['serializeUpdateEntries'](apiOptions);

        expect(result.apiData).to.not.be.null;
        expect(result.apiData.uid).to.equal('new_json_rte_entry_1');

        Object.defineProperty(require('../../../../src/utils'), 'lookupAssets', {
          get: () => originalLookupAssets,
          configurable: true,
        });
      });

      it('should restore RTE entry references', () => {
        const apiOptions = {
          apiData: {
            uid: 'rte_entry_1',
            title: 'Entry with RTE',
            sourceEntryFilePath: '/path/to/source.json',
            entryOldUid: 'rte_entry_1',
          },
          entity: 'update-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'rte_ct',
            locale: 'en-us',
            contentType: mockData.contentTypeWithRte,
          },
        };

        fsUtilityReadFileStub.callsFake((path) => {
          if (path.includes('source.json')) {
            return {
              rte_entry_1: {
                uid: 'rte_entry_1',
                title: 'Source Entry',
                rte_field: '<p>RTE content with <a href="entry://simple_entry_1">entry link</a></p>',
              },
            };
          }
          return {};
        });

        const originalLookupAssets = require('../../../../src/utils').lookupAssets;
        Object.defineProperty(require('../../../../src/utils'), 'lookupAssets', {
          get: () => (entryData: any) => entryData.entry,
          configurable: true,
        });

        const result = entriesImport['serializeUpdateEntries'](apiOptions);

        expect(result.apiData).to.not.be.null;
        expect(result.apiData.uid).to.equal('new_rte_entry_1');

        Object.defineProperty(require('../../../../src/utils'), 'lookupAssets', {
          get: () => originalLookupAssets,
          configurable: true,
        });
      });

      it('should handle serialization errors', () => {
        const apiOptions = {
          apiData: {
            uid: 'invalid_entry',
            title: 'Invalid Entry',
            sourceEntryFilePath: '/path/to/source.json',
            entryOldUid: 'invalid_entry',
          },
          entity: 'update-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'ref_ct',
            locale: 'en-us',
            contentType: mockData.contentTypeWithReferences,
          },
        };

        fsUtilityReadFileStub.callsFake(() => {
          throw new Error('File read failed');
        });

        const result = entriesImport['serializeUpdateEntries'](apiOptions);

        expect(result.apiData).to.be.null;
      });
    });

    describe('replaceEntries()', () => {
      it('should handle empty chunks', async () => {
        const mockFsUtility = {
          indexFileContent: {},
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        await entriesImport['replaceEntries']({ cTUid: 'ref_ct', locale: 'en-us' });

        expect(makeConcurrentCallStub.called).to.be.false;
      });

      it('should process existing entries for replacement', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().resolves({
            entry1: mockEntries.existingEntry,
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        sinon.stub(FsUtility.prototype, 'writeIntoFile').callsFake(() => {
          return Promise.resolve();
        });

        const originalWriteFileSync = require('fs').writeFileSync;
        const writeFileSyncStub = sinon.stub(require('fs'), 'writeFileSync').callsFake(() => {});

        makeConcurrentCallStub.callsFake(async (options) => {
          const onSuccess = options.apiParams.resolve;
          onSuccess({
            response: { uid: 'replaced-entry-uid' },
            apiData: mockEntries.existingEntry,
            additionalInfo: {},
          });
        });

        await entriesImport['replaceEntries']({ cTUid: 'ref_ct', locale: 'en-us' });

        expect(makeConcurrentCallStub.called).to.be.true;
        expect(mockReadChunkFiles.next.called).to.be.true;
      });

      it('should handle chunk read errors', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().rejects(new Error('Chunk read failed')),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        await entriesImport['replaceEntries']({ cTUid: 'ref_ct', locale: 'en-us' });

        expect(mockReadChunkFiles.next.called).to.be.true;
        expect(makeConcurrentCallStub.called).to.be.false;
      });

      it('should handle API errors in onReject', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().resolves({
            entry1: mockEntries.existingEntry,
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        const writeFileSyncStub = sinon.stub(require('fs'), 'writeFileSync').callsFake(() => {});

        makeConcurrentCallStub.callsFake(async (options) => {
          const onReject = options.apiParams.reject;
          onReject({
            error: { status: 500, message: 'Replacement failed' },
            apiData: { uid: 'existing_entry_1', title: 'Existing Entry' },
          });
        });

        await entriesImport['replaceEntries']({ cTUid: 'ref_ct', locale: 'en-us' });

        expect(entriesImport['failedEntries']).to.have.lengthOf(1);
        expect(entriesImport['failedEntries'][0]).to.deep.include({
          content_type: 'ref_ct',
          locale: 'en-us',
          entry: { uid: undefined, title: 'Existing Entry' },
          entryId: 'existing_entry_1',
        });
      });
    });

    describe('replaceEntriesHandler()', () => {
      it('should find and update existing entry', async () => {
        const mockEntry = {
          title: 'Existing Entry',
          uid: 'existing_entry_1',
        };

        const apiParams = {
          entity: 'update-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'ref_ct',
            locale: 'en-us',
          },
        };

        const mockQuery = {
          findOne: sinon.stub().resolves({
            items: [
              {
                uid: 'stack_entry_uid',
                title: 'Existing Entry',
                urlPath: '/existing-entry',
                stackHeaders: {},
                _version: 1,
              },
            ],
          }),
        };

        const mockEntryPayload = {
          update: sinon.stub().resolves({ uid: 'updated_entry_uid' }),
        };

        const mockQueryChain = {
          query: sinon.stub().returns({
            findOne: sinon.stub().resolves({
              items: [
                {
                  uid: 'stack_entry_uid',
                  title: 'Existing Entry',
                  urlPath: '/existing-entry',
                  stackHeaders: {},
                  _version: 1,
                },
              ],
            }),
          }),
        };

        const mockEntryChain = {
          update: sinon.stub().resolves({ uid: 'updated_entry_uid' }),
        };

        const contentTypeStub = sinon.stub();
        contentTypeStub.onFirstCall().returns({
          entry: sinon.stub().returns(mockQueryChain),
        });
        contentTypeStub.onSecondCall().returns({
          entry: sinon.stub().returns(mockEntryChain),
        });

        mockStackClient.contentType = contentTypeStub;

        const result = await entriesImport['replaceEntriesHandler']({
          apiParams,
          element: mockEntry,
          isLastRequest: false,
        });

        expect(result).to.be.true;
        expect(mockQueryChain.query.called).to.be.true;
        expect(mockEntryChain.update.called).to.be.true;
        expect(apiParams.resolve.called).to.be.true;
      });

      it('should handle entry not found in stack', async () => {
        const mockEntry = {
          title: 'Non-existent Entry',
          uid: 'non_existent_entry_1',
        };

        const apiParams = {
          entity: 'update-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'ref_ct',
            locale: 'en-us',
          },
        };

        const mockQueryChain = {
          query: sinon.stub().returns({
            findOne: sinon.stub().resolves({
              items: [],
            }),
          }),
        };

        const contentTypeStub = sinon.stub();
        contentTypeStub.returns({
          entry: sinon.stub().returns(mockQueryChain),
        });

        mockStackClient.contentType = contentTypeStub;

        try {
          const result = await entriesImport['replaceEntriesHandler']({
            apiParams,
            element: mockEntry,
            isLastRequest: false,
          });
          expect.fail('Expected method to reject');
        } catch (error) {
          expect(error).to.be.true;
          expect(apiParams.reject.called).to.be.true;
          expect(apiParams.reject.getCall(0).args[0].error.message).to.include('not found in the stack');
        }
      });

      it('should handle query errors', async () => {
        const mockEntry = {
          title: 'Error Entry',
          uid: 'error_entry_1',
        };

        const apiParams = {
          entity: 'update-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'ref_ct',
            locale: 'en-us',
          },
        };

        const mockQueryChain = {
          query: sinon.stub().returns({
            findOne: sinon.stub().rejects(new Error('Query failed')),
          }),
        };

        const contentTypeStub = sinon.stub();
        contentTypeStub.returns({
          entry: sinon.stub().returns(mockQueryChain),
        });

        mockStackClient.contentType = contentTypeStub;

        try {
          const result = await entriesImport['replaceEntriesHandler']({
            apiParams,
            element: mockEntry,
            isLastRequest: false,
          });
          expect.fail('Expected method to reject');
        } catch (error) {
          expect(error).to.be.true;
          expect(apiParams.reject.called).to.be.true;
        }
      });

      it('should handle update errors', async () => {
        const mockEntry = {
          title: 'Update Error Entry',
          uid: 'update_error_entry_1',
        };

        const apiParams = {
          entity: 'update-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'ref_ct',
            locale: 'en-us',
          },
        };

        const mockQueryChain = {
          query: sinon.stub().returns({
            findOne: sinon.stub().resolves({
              items: [
                {
                  uid: 'stack_entry_uid',
                  title: 'Update Error Entry',
                  urlPath: '/update-error-entry',
                  stackHeaders: {},
                  _version: 1,
                },
              ],
            }),
          }),
        };

        const mockEntryChain = {
          update: sinon.stub().rejects(new Error('Update failed')),
        };

        const contentTypeStub = sinon.stub();
        contentTypeStub.onFirstCall().returns({
          entry: sinon.stub().returns(mockQueryChain),
        });
        contentTypeStub.onSecondCall().returns({
          entry: sinon.stub().returns(mockEntryChain),
        });

        mockStackClient.contentType = contentTypeStub;

        try {
          const result = await entriesImport['replaceEntriesHandler']({
            apiParams,
            element: mockEntry,
            isLastRequest: false,
          });
          expect.fail('Expected method to reject');
        } catch (error) {
          expect(error).to.be.true;
          expect(apiParams.reject.called).to.be.true;
        }
      });
    });
  });

  describe('Entry Publishing Flow', () => {
    beforeEach(() => {
      entriesImport['cTs'] = [
        mockData.simpleContentType,
        mockData.contentTypeWithReferences,
        mockData.contentTypeWithJsonRte,
      ];
      entriesImport['envs'] = {
        env_1: { name: 'production', uid: 'env_1' },
        env_2: { name: 'staging', uid: 'env_2' },
      };
      entriesImport['entriesUidMapper'] = {
        simple_entry_1: 'new_simple_entry_1',
        publish_entry_1: 'new_publish_entry_1',
        json_rte_entry_1: 'new_json_rte_entry_1',
      };
    });

    describe('publishEntries()', () => {
      it('should handle empty chunks', async () => {
        const mockFsUtility = {
          indexFileContent: {},
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        await entriesImport['publishEntries']({ cTUid: 'simple_ct', locale: 'en-us' });

        expect(makeConcurrentCallStub.called).to.be.false;
      });

      it('should process entries with publish details successfully', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1', 'entry2'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().resolves({
            entry1: mockEntries.simpleEntry,
            entry2: mockEntries.entryWithPublishDetails,
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        makeConcurrentCallStub.callsFake(async (options) => {
          const onSuccess = options.apiParams.resolve;
          onSuccess({
            response: { uid: 'published-entry-uid' },
            apiData: {
              environments: ['production', 'staging'],
              entryUid: 'new_simple_entry_1',
              locales: ['en-us'],
            },
          });
        });

        await entriesImport['publishEntries']({ cTUid: 'simple_ct', locale: 'en-us' });

        expect(makeConcurrentCallStub.called).to.be.true;
        expect(mockReadChunkFiles.next.called).to.be.true;
      });

      it('should handle entries with multiple publish details', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().resolves({
            entry1: mockEntries.entryWithPublishDetails,
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        makeConcurrentCallStub.callsFake(async (options) => {
          const onSuccess = options.apiParams.resolve;
          onSuccess({
            response: { uid: 'published-entry-uid' },
            apiData: {
              environments: ['production', 'staging'],
              entryUid: 'new_publish_entry_1',
              locales: ['en-us', 'fr-fr'],
            },
          });
        });

        await entriesImport['publishEntries']({ cTUid: 'simple_ct', locale: 'en-us' });

        expect(makeConcurrentCallStub.called).to.be.true;
        // Should pass 1 entry with all publish details (serializePublishEntries aggregates them into one API call)
        expect(makeConcurrentCallStub.getCall(0).args[0].apiContent).to.have.lengthOf(1);
      });

      it('should handle entries without publish details', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const entryWithoutPublishDetails = {
          uid: 'no_publish_entry_1',
          title: 'Entry without Publish Details',
          description: 'This entry has no publish details',
          // No publish_details property
        };

        const mockReadChunkFiles = {
          next: sinon.stub().resolves({
            entry1: entryWithoutPublishDetails,
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        await entriesImport['publishEntries']({ cTUid: 'simple_ct', locale: 'en-us' });

        // Should not call makeConcurrentCall for entries without publish details
        expect(makeConcurrentCallStub.called).to.be.false;
      });

      it('should handle entries with empty publish details', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const entryWithEmptyPublishDetails = {
          uid: 'empty_publish_entry_1',
          title: 'Entry with Empty Publish Details',
          description: 'This entry has empty publish details',
          publish_details: [] as any[],
        };

        const mockReadChunkFiles = {
          next: sinon.stub().resolves({
            entry1: entryWithEmptyPublishDetails,
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        await entriesImport['publishEntries']({ cTUid: 'simple_ct', locale: 'en-us' });

        // Should not call makeConcurrentCall for entries with empty publish details
        expect(makeConcurrentCallStub.called).to.be.false;
      });

      it('should handle chunk read errors', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().rejects(new Error('Chunk read failed')),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        await entriesImport['publishEntries']({ cTUid: 'simple_ct', locale: 'en-us' });

        expect(mockReadChunkFiles.next.called).to.be.true;
        expect(makeConcurrentCallStub.called).to.be.false;
      });

      it('should handle API errors in onReject', async () => {
        const mockFsUtility = {
          indexFileContent: {
            'chunk1.json': ['entry1'],
          },
        };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockFsUtility.indexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().resolves({
            entry1: mockEntries.simpleEntry,
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        makeConcurrentCallStub.callsFake(async (options) => {
          const onReject = options.apiParams.reject;
          onReject({
            error: { status: 500, message: 'Publish failed' },
            apiData: {
              environments: ['production'],
              entryUid: 'new_simple_entry_1',
              locales: ['en-us'],
            },
          });
        });

        await entriesImport['publishEntries']({ cTUid: 'simple_ct', locale: 'en-us' });

        expect(makeConcurrentCallStub.called).to.be.true;
      });
    });

    describe('serializePublishEntries()', () => {
      it('should serialize entry with valid publish details', () => {
        const apiOptions = {
          apiData: {
            uid: 'simple_entry_1',
            title: 'Simple Entry',
            publish_details: [
              {
                environment: 'env_1',
                locale: 'en-us',
              },
              {
                environment: 'env_2',
                locale: 'fr-fr',
              },
            ],
          },
          entity: 'publish-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'simple_ct',
            locale: 'en-us',
            contentType: mockData.simpleContentType,
          },
        };

        const result = entriesImport['serializePublishEntries'](apiOptions);

        expect(result.apiData).to.not.be.null;
        expect(result.apiData).to.deep.include({
          environments: ['production', 'staging'],
          locales: ['en-us', 'fr-fr'],
          entryUid: 'new_simple_entry_1',
        });
      });

      it('should handle entry without publish details', () => {
        const apiOptions = {
          apiData: {
            uid: 'simple_entry_1',
            title: 'Simple Entry',
            // No publish_details
          },
          entity: 'publish-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'simple_ct',
            locale: 'en-us',
            contentType: mockData.simpleContentType,
          },
        };

        const result = entriesImport['serializePublishEntries'](apiOptions);

        expect(result.apiData).to.be.null;
      });

      it('should handle entry with empty publish details', () => {
        const apiOptions = {
          apiData: {
            uid: 'simple_entry_1',
            title: 'Simple Entry',
            publish_details: [] as any[],
          },
          entity: 'publish-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'simple_ct',
            locale: 'en-us',
            contentType: mockData.simpleContentType,
          },
        };

        const result = entriesImport['serializePublishEntries'](apiOptions);

        expect(result.apiData).to.be.null;
      });

      it('should handle entry with invalid environment', () => {
        const apiOptions = {
          apiData: {
            uid: 'simple_entry_1',
            title: 'Simple Entry',
            publish_details: [
              {
                environment: 'invalid_env',
                locale: 'en-us',
              },
            ],
          },
          entity: 'publish-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'simple_ct',
            locale: 'en-us',
            contentType: mockData.simpleContentType,
          },
        };

        const result = entriesImport['serializePublishEntries'](apiOptions);

        expect(result.apiData).to.be.null;
      });

      it('should handle entry with missing locale', () => {
        const apiOptions = {
          apiData: {
            uid: 'simple_entry_1',
            title: 'Simple Entry',
            publish_details: [
              {
                environment: 'env_1',
                // No locale
              },
            ],
          },
          entity: 'publish-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'simple_ct',
            locale: 'en-us',
            contentType: mockData.simpleContentType,
          },
        };

        const result = entriesImport['serializePublishEntries'](apiOptions);

        expect(result.apiData).to.be.null;
      });

      it('should deduplicate environments and locales', () => {
        const apiOptions = {
          apiData: {
            uid: 'simple_entry_1',
            title: 'Simple Entry',
            publish_details: [
              {
                environment: 'env_1',
                locale: 'en-us',
              },
              {
                environment: 'env_1', // Duplicate environment
                locale: 'en-us', // Duplicate locale
              },
              {
                environment: 'env_2',
                locale: 'fr-fr',
              },
            ],
          },
          entity: 'publish-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'simple_ct',
            locale: 'en-us',
            contentType: mockData.simpleContentType,
          },
        };

        const result = entriesImport['serializePublishEntries'](apiOptions);

        expect(result.apiData).to.not.be.null;
        expect(result.apiData.environments).to.have.lengthOf(2);
        expect(result.apiData.locales).to.have.lengthOf(2);
        expect(result.apiData.environments).to.deep.include.members(['production', 'staging']);
        expect(result.apiData.locales).to.deep.include.members(['en-us', 'fr-fr']);
      });

      it('should handle entry with missing UID mapping', () => {
        const apiOptions = {
          apiData: {
            uid: 'unknown_entry_1',
            title: 'Unknown Entry',
            publish_details: [
              {
                environment: 'env_1',
                locale: 'en-us',
              },
            ],
          },
          entity: 'publish-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'simple_ct',
            locale: 'en-us',
            contentType: mockData.simpleContentType,
          },
        };

        const result = entriesImport['serializePublishEntries'](apiOptions);

        expect(result.apiData).to.not.be.null;
        expect(result.apiData.entryUid).to.be.undefined;
      });

      it('should handle mixed valid and invalid publish details', () => {
        const apiOptions = {
          apiData: {
            uid: 'simple_entry_1',
            title: 'Simple Entry',
            publish_details: [
              {
                environment: 'env_1',
                locale: 'en-us',
              },
              {
                environment: 'invalid_env',
                locale: 'fr-fr',
              },
              {
                environment: 'env_2',
                locale: 'de-de',
              },
            ],
          },
          entity: 'publish-entries' as const,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: {
            cTUid: 'simple_ct',
            locale: 'en-us',
            contentType: mockData.simpleContentType,
          },
        };

        const result = entriesImport['serializePublishEntries'](apiOptions);

        expect(result.apiData).to.not.be.null;
        expect(result.apiData.environments).to.deep.include.members(['production', 'staging']);
        expect(result.apiData.locales).to.deep.include.members(['en-us', 'fr-fr', 'de-de']);
      });
    });
  });

  describe('start() Method Orchestration', () => {
    beforeEach(() => {
      // Reset all stubs before each test
      sinon.restore();

      sinon.stub(FsUtility.prototype, 'createFolderIfNotExist').callsFake(() => {
        return Promise.resolve();
      });

      // Recreate entriesImport instance after restore
      entriesImport = new EntriesImport({
        importConfig: mockImportConfig as any,
        stackAPIClient: mockStackClient,
        moduleName: 'entries',
      });

      entriesImport['cTs'] = [mockData.simpleContentType, mockData.contentTypeWithReferences];
      entriesImport['locales'] = [
        { code: 'en-us', name: 'English' },
        { code: 'fr-fr', name: 'French' },
      ];
      entriesImport['envs'] = {
        env_1: { name: 'production', uid: 'env_1' },
        env_2: { name: 'staging', uid: 'env_2' },
      };
      entriesImport['entriesUidMapper'] = {};
      entriesImport['failedEntries'] = [];
      entriesImport['autoCreatedEntries'] = [];
      entriesImport['entriesForVariant'] = [];

      sinon
        .stub(entriesImport as any, 'withLoadingSpinner')
        .callsFake(async (message: string, action: () => Promise<any>) => {
          return await action();
        });
    });

    it('should complete full start process successfully', async () => {
      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub(),
      };
      sinon.stub(entriesImport as any, 'analyzeEntryData').resolves([2, 2, 2, 10, 5]); // contentTypesCount, localesCount, totalEntryChunks, totalActualEntries, totalEntriesForPublishing
      sinon.stub(entriesImport as any, 'createNestedProgress').returns(mockProgress);
      sinon.stub(entriesImport as any, 'initializeProgress').callsFake(() => {}); // Not async
      sinon.stub(entriesImport as any, 'completeProgress').callsFake(() => {});

      const disableMandatoryCTReferencesStub = sinon.stub(entriesImport, 'disableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport as any, 'processEntryCreation').resolves();
      sinon.stub(entriesImport as any, 'processEntryReplacement').resolves();
      sinon.stub(entriesImport as any, 'processEntryReferenceUpdates').resolves();
      const enableMandatoryCTReferencesStub = sinon.stub(entriesImport, 'enableMandatoryCTReferences').resolves();
      const updateFieldRulesStub = sinon.stub(entriesImport, 'updateFieldRules').resolves();
      sinon.stub(entriesImport as any, 'processEntryPublishing').resolves();
      sinon.stub(entriesImport as any, 'processCleanup').resolves();
      const createEntryDataForVariantEntryStub = sinon.stub(entriesImport, 'createEntryDataForVariantEntry').returns();

      await entriesImport.start();

      // Verify all methods were called
      expect(disableMandatoryCTReferencesStub.called).to.be.true;
      expect(enableMandatoryCTReferencesStub.called).to.be.true;
      expect(updateFieldRulesStub.called).to.be.true;
      expect(createEntryDataForVariantEntryStub.called).to.be.false; // Should not be called on success
    });

    it('should handle no content types found', async () => {
      sinon.stub(entriesImport as any, 'analyzeEntryData').resolves([0, 0, 0, 0, 0]);
      const createEntryDataForVariantEntryStub = sinon.stub(entriesImport, 'createEntryDataForVariantEntry').returns();

      await entriesImport.start();

      // Verify that createEntryDataForVariantEntry was NOT called (method returns early)
      expect(createEntryDataForVariantEntryStub.called).to.be.false;
    });

    it('should handle null content types', async () => {
      sinon.stub(entriesImport as any, 'analyzeEntryData').resolves([0, 0, 0, 0, 0]);
      const createEntryDataForVariantEntryStub = sinon.stub(entriesImport, 'createEntryDataForVariantEntry').returns();

      await entriesImport.start();

      // Verify that createEntryDataForVariantEntry was NOT called (method returns early)
      expect(createEntryDataForVariantEntryStub.called).to.be.false;
    });

    it('should handle replaceExisting true', async () => {
      // Set replaceExisting to true
      entriesImport['importConfig'].replaceExisting = true;

      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub(),
      };
      sinon.stub(entriesImport as any, 'analyzeEntryData').resolves([2, 2, 2, 10, 5]);
      sinon.stub(entriesImport as any, 'createNestedProgress').returns(mockProgress);
      sinon.stub(entriesImport as any, 'initializeProgress').callsFake(() => {}); // Not async
      sinon.stub(entriesImport as any, 'completeProgress').callsFake(() => {});

      const mockFsUtil = {
        readFile: sinon
          .stub()
          .onCall(0)
          .resolves([mockData.simpleContentType])
          .onCall(1)
          .resolves({ extension_uid: {} })
          .onCall(2)
          .resolves({})
          .onCall(3)
          .resolves({})
          .onCall(4)
          .resolves({})
          .onCall(5)
          .resolves([{ code: 'en-us' }]),
        makeDirectory: sinon.stub().resolves(),
        writeFile: sinon.stub().resolves(),
      };
      sinon.stub(require('../../../../src/utils'), 'fsUtil').value(mockFsUtil);

      const isEmptyStub2 = sinon.stub().returns(false);
      sinon.stub(require('lodash'), 'isEmpty').value(isEmptyStub2);

      const mockFileHelper = {
        readFileSync: sinon.stub().returns({}),
        writeLargeFile: sinon.stub().resolves(),
      };
      sinon.stub(require('../../../../src/utils'), 'fileHelper').value(mockFileHelper);

      sinon.stub(entriesImport, 'disableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport as any, 'processEntryCreation').resolves();
      const processEntryReplacementStub = sinon.stub(entriesImport as any, 'processEntryReplacement').resolves();
      sinon.stub(entriesImport as any, 'processEntryReferenceUpdates').resolves();
      sinon.stub(entriesImport, 'enableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport, 'updateFieldRules').resolves();
      sinon.stub(entriesImport as any, 'processEntryPublishing').resolves();
      sinon.stub(entriesImport as any, 'processCleanup').resolves();

      await entriesImport.start();

      // Verify processEntryReplacement was called when replaceExisting is true
      expect(processEntryReplacementStub.calledOnce).to.be.true;
    });

    it('should handle autoCreatedEntries cleanup', async () => {
      // Set up autoCreatedEntries
      entriesImport['autoCreatedEntries'] = [{ cTUid: 'simple_ct', locale: 'en-us', entryUid: 'entry_1' }];

      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub(),
      };
      sinon.stub(entriesImport as any, 'analyzeEntryData').resolves([2, 2, 2, 10, 5]);
      sinon.stub(entriesImport as any, 'createNestedProgress').returns(mockProgress);
      sinon.stub(entriesImport as any, 'initializeProgress').callsFake(() => {});
      sinon.stub(entriesImport as any, 'completeProgress').callsFake(() => {});

      sinon.stub(entriesImport, 'disableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport as any, 'processEntryCreation').resolves();
      sinon.stub(entriesImport as any, 'processEntryReplacement').resolves();
      sinon.stub(entriesImport as any, 'processEntryReferenceUpdates').resolves();
      sinon.stub(entriesImport, 'enableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport, 'updateFieldRules').resolves();
      sinon.stub(entriesImport as any, 'processEntryPublishing').resolves();
      const processCleanupStub = sinon.stub(entriesImport as any, 'processCleanup').resolves();

      await entriesImport.start();

      // Verify processCleanup was called (which handles removeAutoCreatedEntries)
      expect(processCleanupStub.called).to.be.true;
    });

    it('should handle skipEntriesPublish true', async () => {
      // Set skipEntriesPublish to true
      entriesImport['importConfig'].skipEntriesPublish = true;

      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub(),
      };
      sinon.stub(entriesImport as any, 'analyzeEntryData').resolves([2, 2, 2, 10, 5]);
      sinon.stub(entriesImport as any, 'createNestedProgress').returns(mockProgress);
      sinon.stub(entriesImport as any, 'initializeProgress').callsFake(() => {});
      sinon.stub(entriesImport as any, 'completeProgress').callsFake(() => {});

      sinon.stub(entriesImport, 'disableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport as any, 'processEntryCreation').resolves();
      sinon.stub(entriesImport as any, 'processEntryReplacement').resolves();
      sinon.stub(entriesImport as any, 'processEntryReferenceUpdates').resolves();
      sinon.stub(entriesImport, 'enableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport, 'updateFieldRules').resolves();
      const processEntryPublishingStub = sinon.stub(entriesImport as any, 'processEntryPublishing').resolves();
      sinon.stub(entriesImport as any, 'processCleanup').resolves();

      await entriesImport.start();

      // Verify processEntryPublishing was NOT called
      expect(processEntryPublishingStub.called).to.be.false;
    });

    it('should handle no environments found for publishing', async () => {
      // Set empty environments
      entriesImport['envs'] = {};

      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub(),
      };
      sinon.stub(entriesImport as any, 'analyzeEntryData').resolves([2, 2, 2, 10, 5]);
      sinon.stub(entriesImport as any, 'createNestedProgress').returns(mockProgress);
      sinon.stub(entriesImport as any, 'initializeProgress').callsFake(() => {});
      sinon.stub(entriesImport as any, 'completeProgress').callsFake(() => {});

      sinon.stub(entriesImport, 'disableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport as any, 'processEntryCreation').resolves();
      sinon.stub(entriesImport as any, 'processEntryReplacement').resolves();
      sinon.stub(entriesImport as any, 'processEntryReferenceUpdates').resolves();
      sinon.stub(entriesImport, 'enableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport, 'updateFieldRules').resolves();
      const processEntryPublishingStub = sinon.stub(entriesImport as any, 'processEntryPublishing').resolves();
      sinon.stub(entriesImport as any, 'processCleanup').resolves();

      await entriesImport.start();

      // Verify processEntryPublishing was called (it handles empty environments internally)
      expect(processEntryPublishingStub.called).to.be.true;
    });

    it('should handle errors in replaceEntries', async () => {
      // Set replaceExisting to true
      entriesImport['importConfig'].replaceExisting = true;

      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub(),
      };
      sinon.stub(entriesImport as any, 'analyzeEntryData').resolves([2, 2, 2, 10, 5]);
      sinon.stub(entriesImport as any, 'createNestedProgress').returns(mockProgress);
      sinon.stub(entriesImport as any, 'initializeProgress').callsFake(() => {});
      const completeProgressStub = sinon.stub(entriesImport as any, 'completeProgress');

      sinon.stub(entriesImport, 'disableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport as any, 'processEntryCreation').resolves();
      sinon.stub(entriesImport as any, 'processEntryReplacement').rejects(new Error('Replace failed'));
      sinon.stub(entriesImport as any, 'processEntryReferenceUpdates').resolves();
      sinon.stub(entriesImport, 'enableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport, 'updateFieldRules').resolves();
      sinon.stub(entriesImport as any, 'processEntryPublishing').resolves();
      sinon.stub(entriesImport as any, 'processCleanup').resolves();
      const createEntryDataForVariantEntryStub = sinon.stub(entriesImport, 'createEntryDataForVariantEntry').returns();

      await entriesImport.start();

      // Verify error was handled
      expect(completeProgressStub.calledWith(false, sinon.match.string)).to.be.true;
      expect(createEntryDataForVariantEntryStub.called).to.be.true;
    });

    it('should handle errors in removeAutoCreatedEntries', async () => {
      // Set up autoCreatedEntries
      entriesImport['autoCreatedEntries'] = [{ cTUid: 'simple_ct', locale: 'en-us', entryUid: 'entry_1' }];

      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub(),
      };
      sinon.stub(entriesImport as any, 'analyzeEntryData').resolves([2, 2, 2, 10, 5]);
      sinon.stub(entriesImport as any, 'createNestedProgress').returns(mockProgress);
      sinon.stub(entriesImport as any, 'initializeProgress').callsFake(() => {});
      sinon.stub(entriesImport as any, 'completeProgress').callsFake(() => {});

      sinon.stub(entriesImport, 'disableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport as any, 'processEntryCreation').resolves();
      sinon.stub(entriesImport as any, 'processEntryReplacement').resolves();
      sinon.stub(entriesImport as any, 'processEntryReferenceUpdates').resolves();
      sinon.stub(entriesImport, 'enableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport, 'updateFieldRules').resolves();
      sinon.stub(entriesImport as any, 'processEntryPublishing').resolves();
      // processCleanup calls removeAutoCreatedEntries internally
      sinon.stub(entriesImport, 'removeAutoCreatedEntries').rejects(new Error('Remove failed'));
      const processCleanupStub = sinon.stub(entriesImport as any, 'processCleanup').rejects(new Error('Remove failed'));

      await entriesImport.start();

      // Verify processCleanup was called (which handles removeAutoCreatedEntries)
      expect(processCleanupStub.called).to.be.true;
    });

    it('should handle errors in updateEntriesWithReferences', async () => {
      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub(),
      };
      sinon.stub(entriesImport as any, 'analyzeEntryData').resolves([2, 2, 2, 10, 5]);
      sinon.stub(entriesImport as any, 'createNestedProgress').returns(mockProgress);
      sinon.stub(entriesImport as any, 'initializeProgress').callsFake(() => {});
      const completeProgressStub = sinon.stub(entriesImport as any, 'completeProgress');

      sinon.stub(entriesImport, 'disableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport as any, 'processEntryCreation').resolves();
      sinon.stub(entriesImport as any, 'processEntryReplacement').resolves();
      sinon.stub(entriesImport as any, 'processEntryReferenceUpdates').rejects(new Error('Update failed'));
      sinon.stub(entriesImport, 'enableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport, 'updateFieldRules').resolves();
      sinon.stub(entriesImport as any, 'processEntryPublishing').resolves();
      sinon.stub(entriesImport as any, 'processCleanup').resolves();
      const createEntryDataForVariantEntryStub = sinon.stub(entriesImport, 'createEntryDataForVariantEntry').returns();

      await entriesImport.start();

      // Verify error was handled
      expect(completeProgressStub.calledWith(false, sinon.match.string)).to.be.true;
      expect(createEntryDataForVariantEntryStub.called).to.be.true;
    });

    it('should handle errors in enableMandatoryCTReferences', async () => {
      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub(),
      };
      sinon.stub(entriesImport as any, 'analyzeEntryData').resolves([2, 2, 2, 10, 5]);
      sinon.stub(entriesImport as any, 'createNestedProgress').returns(mockProgress);
      sinon.stub(entriesImport as any, 'initializeProgress').callsFake(() => {});
      const completeProgressStub = sinon.stub(entriesImport as any, 'completeProgress');

      sinon.stub(entriesImport, 'disableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport as any, 'processEntryCreation').resolves();
      sinon.stub(entriesImport as any, 'processEntryReplacement').resolves();
      sinon.stub(entriesImport as any, 'processEntryReferenceUpdates').resolves();
      const enableMandatoryCTReferencesStub = sinon
        .stub(entriesImport, 'enableMandatoryCTReferences')
        .rejects(new Error('Enable failed'));
      sinon.stub(entriesImport, 'updateFieldRules').resolves();
      sinon.stub(entriesImport as any, 'processEntryPublishing').resolves();
      sinon.stub(entriesImport as any, 'processCleanup').resolves();
      const createEntryDataForVariantEntryStub = sinon.stub(entriesImport, 'createEntryDataForVariantEntry').returns();

      await entriesImport.start();

      // Verify error was handled
      expect(completeProgressStub.calledWith(false, sinon.match.string)).to.be.true;
      expect(createEntryDataForVariantEntryStub.called).to.be.true;
    });

    it('should handle errors in updateFieldRules', async () => {
      const mockFsUtil = {
        readFile: sinon
          .stub()
          .onCall(0)
          .resolves([mockData.simpleContentType])
          .onCall(1)
          .resolves({ extension_uid: {} })
          .onCall(2)
          .resolves({})
          .onCall(3)
          .resolves({})
          .onCall(4)
          .resolves({})
          .onCall(5)
          .resolves([{ code: 'en-us' }]),
        makeDirectory: sinon.stub().resolves(),
        writeFile: sinon.stub().resolves(),
      };
      sinon.stub(require('../../../../src/utils'), 'fsUtil').value(mockFsUtil);

      const isEmptyStub6 = sinon.stub().returns(false);
      sinon.stub(require('lodash'), 'isEmpty').value(isEmptyStub6);

      const mockFileHelper = {
        readFileSync: sinon.stub().returns({}),
        writeLargeFile: sinon.stub().resolves(),
      };
      sinon.stub(require('../../../../src/utils'), 'fileHelper').value(mockFileHelper);

      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub(),
      };
      sinon.stub(entriesImport as any, 'analyzeEntryData').resolves([2, 2, 2, 10, 5]);
      sinon.stub(entriesImport as any, 'createNestedProgress').returns(mockProgress);
      sinon.stub(entriesImport as any, 'initializeProgress').callsFake(() => {}); // Not async
      const completeProgressStub = sinon.stub(entriesImport as any, 'completeProgress');

      const disableMandatoryCTReferencesStub = sinon.stub(entriesImport, 'disableMandatoryCTReferences').resolves();
      const populateEntryCreatePayloadStub = sinon.stub(entriesImport, 'populateEntryCreatePayload').returns([]);
      const createEntriesStub = sinon.stub(entriesImport, 'createEntries').resolves();
      const populateEntryUpdatePayloadStub = sinon.stub(entriesImport, 'populateEntryUpdatePayload').returns([]);
      const updateEntriesWithReferencesStub = sinon.stub(entriesImport, 'updateEntriesWithReferences').resolves();
      const enableMandatoryCTReferencesStub = sinon.stub(entriesImport, 'enableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport as any, 'processEntryCreation').resolves();
      sinon.stub(entriesImport as any, 'processEntryReplacement').resolves();
      sinon.stub(entriesImport as any, 'processEntryReferenceUpdates').resolves();
      // enableMandatoryCTReferences is a public method, not processMandatoryCTReferences
      // updateFieldRules is a public method, not processFieldRules
      sinon.stub(entriesImport as any, 'processEntryPublishing').resolves();
      sinon.stub(entriesImport as any, 'processCleanup').resolves();
      sinon.stub(entriesImport as any, 'removeAutoCreatedEntries').resolves();
      const updateFieldRulesStub = sinon
        .stub(entriesImport, 'updateFieldRules')
        .rejects(new Error('Field rules failed'));
      const createEntryDataForVariantEntryStub = sinon.stub(entriesImport, 'createEntryDataForVariantEntry').returns();

      await entriesImport.start();

      // Verify error was handled
      expect(completeProgressStub.calledWith(false, sinon.match.string)).to.be.true;
    });

    it('should handle errors in publishEntries', async () => {
      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub(),
      };
      sinon.stub(entriesImport as any, 'analyzeEntryData').resolves([2, 2, 2, 10, 5]);
      sinon.stub(entriesImport as any, 'createNestedProgress').returns(mockProgress);
      sinon.stub(entriesImport as any, 'initializeProgress').callsFake(() => {});
      const completeProgressStub = sinon.stub(entriesImport as any, 'completeProgress');

      sinon.stub(entriesImport, 'disableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport as any, 'processEntryCreation').resolves();
      sinon.stub(entriesImport as any, 'processEntryReplacement').resolves();
      sinon.stub(entriesImport as any, 'processEntryReferenceUpdates').resolves();
      sinon.stub(entriesImport, 'enableMandatoryCTReferences').resolves();
      sinon.stub(entriesImport, 'updateFieldRules').resolves();
      sinon.stub(entriesImport as any, 'processEntryPublishing').rejects(new Error('Publish failed'));
      sinon.stub(entriesImport as any, 'processCleanup').resolves();
      const createEntryDataForVariantEntryStub = sinon.stub(entriesImport, 'createEntryDataForVariantEntry').returns();

      await entriesImport.start();

      // Verify error was handled
      expect(completeProgressStub.calledWith(false, sinon.match.string)).to.be.true;
      expect(createEntryDataForVariantEntryStub.called).to.be.true;
    });

    it('should handle general errors in try-catch', async () => {
      sinon.stub(entriesImport as any, 'analyzeEntryData').rejects(new Error('File read failed'));
      const completeProgressStub = sinon.stub(entriesImport as any, 'completeProgress');
      const createEntryDataForVariantEntryStub = sinon.stub(entriesImport, 'createEntryDataForVariantEntry').returns();

      await entriesImport.start();

      // Verify createEntryDataForVariantEntry was called in catch block
      expect(createEntryDataForVariantEntryStub.called).to.be.true;
      // Verify completeProgress was called with error
      expect(completeProgressStub.calledWith(false, sinon.match.string)).to.be.true;
    });
  });

  // ==========================================
  // ADDITIONAL BRANCH COVERAGE TESTS
  // ==========================================

  describe('Additional Branch Coverage Tests', () => {
    beforeEach(() => {
      entriesImport['entriesForVariant'] = [];
      entriesImport['autoCreatedEntries'] = [];
      // Reset the fsUtilityReadFileStub
      fsUtilityReadFileStub.reset();
    });

    describe('removeAutoCreatedEntries() Method', () => {
      it('should successfully remove auto-created entries', async () => {
        entriesImport['autoCreatedEntries'] = [
          { entryUid: 'auto_entry_1', title: 'Auto Entry 1' },
          { entryUid: 'auto_entry_2', title: 'Auto Entry 2' },
        ];
        entriesImport['entriesForVariant'] = [
          { entry_uid: 'auto_entry_1', locale: 'en-us', content_type: 'simple_ct' },
          { entry_uid: 'auto_entry_2', locale: 'en-us', content_type: 'ref_ct' },
          { entry_uid: 'other_entry', locale: 'fr-fr', content_type: 'simple_ct' },
        ];

        // Use the existing makeConcurrentCall stub to simulate successful removal
        makeConcurrentCallStub.callsFake(async (options) => {
          // Simulate onSuccess callback for first entry
          await options.apiParams.resolve({
            response: { uid: 'auto_entry_1' },
            apiData: { entryUid: 'auto_entry_1' },
          });
          // Simulate onSuccess callback for second entry
          await options.apiParams.resolve({
            response: { uid: 'auto_entry_2' },
            apiData: { entryUid: 'auto_entry_2' },
          });
        });

        await entriesImport.removeAutoCreatedEntries();

        // Verify makeConcurrentCall was called with correct parameters
        expect(makeConcurrentCallStub.calledOnce).to.be.true;
        const callArgs = makeConcurrentCallStub.getCall(0).args[0];
        expect(callArgs.processName).to.equal('Remove auto created entry in master locale');
        expect(callArgs.apiContent).to.deep.equal(entriesImport['autoCreatedEntries']);
        expect(callArgs.apiParams.entity).to.equal('delete-entries');
        expect(callArgs.apiParams.additionalInfo.locale).to.equal('en-us');

        // Verify entriesForVariant was filtered correctly
        expect(entriesImport['entriesForVariant']).to.have.length(1);
        expect(entriesImport['entriesForVariant'][0].entry_uid).to.equal('other_entry');
      });

      it('should handle errors when removing auto-created entries', async () => {
        entriesImport['autoCreatedEntries'] = [{ entryUid: 'auto_entry_1', title: 'Auto Entry 1' }];
        entriesImport['entriesForVariant'] = [
          { entry_uid: 'auto_entry_1', locale: 'en-us', content_type: 'simple_ct' },
          { entry_uid: 'other_entry', locale: 'fr-fr', content_type: 'simple_ct' },
        ];

        // Use the existing makeConcurrentCall stub to simulate error
        makeConcurrentCallStub.callsFake(async (options) => {
          // Simulate onReject callback
          await options.apiParams.reject({
            error: new Error('Delete failed'),
            apiData: { entryUid: 'auto_entry_1' },
          });
        });

        await entriesImport.removeAutoCreatedEntries();

        // Verify makeConcurrentCall was called
        expect(makeConcurrentCallStub.calledOnce).to.be.true;

        // Verify entriesForVariant was filtered correctly
        expect(entriesImport['entriesForVariant']).to.have.length(1);
        expect(entriesImport['entriesForVariant'][0].entry_uid).to.equal('other_entry');
      });

      it('should handle empty auto-created entries array', async () => {
        entriesImport['autoCreatedEntries'] = [];
        entriesImport['entriesForVariant'] = [{ entry_uid: 'other_entry', locale: 'fr-fr', content_type: 'simple_ct' }];

        // Use the existing makeConcurrentCall stub
        makeConcurrentCallStub.resolves();

        await entriesImport.removeAutoCreatedEntries();

        // Verify makeConcurrentCall was called with empty array
        expect(makeConcurrentCallStub.calledOnce).to.be.true;
        expect(makeConcurrentCallStub.getCall(0).args[0].apiContent).to.deep.equal([]);
      });
    });

    describe('createEntryDataForVariantEntry() Method', () => {
      it('should write file when entriesForVariant is not empty', () => {
        entriesImport['entriesForVariant'] = [
          { entry_uid: 'entry_1', locale: 'en-us', content_type: 'simple_ct' },
          { entry_uid: 'entry_2', locale: 'fr-fr', content_type: 'ref_ct' },
        ];

        const writeFileSyncStub = sinon.stub(require('fs'), 'writeFileSync');

        entriesImport.createEntryDataForVariantEntry();

        // Verify writeFileSync was called with correct data
        expect(writeFileSyncStub.calledOnce).to.be.true;
        const callArgs = writeFileSyncStub.getCall(0).args;
        expect(callArgs[0]).to.include('data-for-variant-entry.json');
        expect(callArgs[1]).to.equal(JSON.stringify(entriesImport['entriesForVariant']));
        expect(callArgs[2]).to.deep.equal({ encoding: 'utf8' });
      });

      it('should not write file when entriesForVariant is empty', () => {
        entriesImport['entriesForVariant'] = [];

        const writeFileSyncStub = sinon.stub(require('fs'), 'writeFileSync');

        entriesImport.createEntryDataForVariantEntry();

        // Verify writeFileSync was not called
        expect(writeFileSyncStub.called).to.be.false;
      });
    });

    describe('updateFieldRules() Method Error Handling', () => {
      beforeEach(() => {
        // Override FsUtility stubs to return mock content types
        (FsUtility.prototype.readdir as sinon.SinonStub).returns(['simple_ct.json', 'ref_ct.json']);
      });

      it('should handle content type fetch error', async () => {
        const mockContentTypes = [mockData.simpleContentType, mockData.contentTypeWithReferences];

        // Configure FsUtility.readFile to handle all file reads (for both fsUtil and readContentTypeSchemas)
        fsUtilityReadFileStub.callsFake((filePath) => {
          if (filePath.includes('field_rules_uid.json')) {
            return ['simple_ct', 'ref_ct']; // array of strings
          }
          if (filePath.includes('simple_ct.json')) return mockData.simpleContentType;
          if (filePath.includes('ref_ct.json')) return mockData.contentTypeWithReferences;
          if (filePath.includes('schema.json')) {
            return mockContentTypes;
          }
          return undefined;
        });

        const mockContentType = {
          fetch: sinon.stub().rejects(new Error('Fetch failed')),
        };
        const mockStackClient = {
          contentType: sinon.stub().returns(mockContentType),
        };
        sinon.stub(entriesImport, 'stack').value(mockStackClient);

        await entriesImport.updateFieldRules();

        // Verify fsUtil.readFile was called
        expect(fsUtilityReadFileStub.callCount).to.be.greaterThan(0);

        // Verify stack client was called
        expect(mockStackClient.contentType.called).to.be.true;
        expect(mockContentType.fetch.called).to.be.true;
      });

      it('should handle content type update error', async () => {
        const mockContentTypes = [mockData.simpleContentType, mockData.contentTypeWithReferences];

        (FsUtility.prototype.readdir as sinon.SinonStub).returns(['simple_ct.json']);

        fsUtilityReadFileStub.callsFake((path) => {
          if (path.includes('field_rules_uid.json')) {
            return ['simple_ct']; // array of strings
          }
          if (path.includes('simple_ct.json')) return mockData.simpleContentType;
          if (path.includes('schema.json')) {
            return mockContentTypes;
          }
          return undefined;
        });

        const mockUpdate = sinon.stub().rejects(new Error('Update failed'));
        const mockContentType = {
          fetch: sinon.stub().resolves({
            uid: 'simple_ct',
            field_rules: [],
            update: mockUpdate,
          }),
        };
        const mockStackClient = {
          contentType: sinon.stub().returns(mockContentType),
        };
        sinon.stub(entriesImport, 'stack').value(mockStackClient);

        await entriesImport.updateFieldRules();

        // Verify fsUtil.readFile was called
        expect(fsUtilityReadFileStub.callCount).to.be.greaterThan(0);

        // Verify stack client was called
        expect(mockStackClient.contentType.called).to.be.true;
        expect(mockContentType.fetch.called).to.be.true;
        expect(mockUpdate.called).to.be.true;
      });

      it('should skip when content type not found', async () => {
        const mockContentTypes = [mockData.simpleContentType, mockData.contentTypeWithReferences];

        (FsUtility.prototype.readdir as sinon.SinonStub).returns(['simple_ct.json']);

        fsUtilityReadFileStub.callsFake((path) => {
          if (path.includes('field_rules_uid.json')) {
            return ['simple_ct']; // array of strings
          }
          if (path.includes('simple_ct.json')) return mockData.simpleContentType;
          if (path.includes('schema.json')) {
            return mockContentTypes;
          }
          return undefined;
        });

        const mockContentType = {
          fetch: sinon.stub().resolves(null),
        };
        const mockStackClient = {
          contentType: sinon.stub().returns(mockContentType),
        };
        sinon.stub(entriesImport, 'stack').value(mockStackClient);

        const mockLog = {
          debug: sinon.stub(),
          info: sinon.stub(),
          success: sinon.stub(),
          warn: sinon.stub(),
          error: sinon.stub(),
        };
        sinon.stub(require('@contentstack/cli-utilities'), 'log').value(mockLog);

        await entriesImport.updateFieldRules();

        // Verify debug log was called for skipping
        expect(mockLog.debug.called).to.be.true;
        const skipCall = mockLog.debug
          .getCalls()
          .find((call: any) => call.args[0] && call.args[0].includes('Skipping field rules update'));
        expect(skipCall).to.exist;
      });

      it('should handle no field rules found', async () => {
        const contentTypeWithoutRules = { ...mockData.simpleContentType };
        delete contentTypeWithoutRules.field_rules;
        const mockContentTypes = [contentTypeWithoutRules];

        (FsUtility.prototype.readdir as sinon.SinonStub).returns(['simple_ct.json']);

        fsUtilityReadFileStub.callsFake((path) => {
          if (path.includes('field_rules_uid.json')) {
            return ['simple_ct']; // array of strings
          }
          if (path.includes('simple_ct.json')) return contentTypeWithoutRules;
          if (path.includes('schema.json')) {
            return mockContentTypes;
          }
          return undefined;
        });

        const mockLog = {
          debug: sinon.stub(),
          info: sinon.stub(),
          success: sinon.stub(),
          warn: sinon.stub(),
          error: sinon.stub(),
        };
        sinon.stub(require('@contentstack/cli-utilities'), 'log').value(mockLog);

        await entriesImport.updateFieldRules();

        // Verify info log was called for no field rules
        expect(mockLog.info.called).to.be.true;
        const noRulesCall = mockLog.info
          .getCalls()
          .find((call: any) => call.args[0] && call.args[0].includes('No field rules found'));
        expect(noRulesCall).to.exist;
      });
    });

    describe('serializeEntries() Localized Entry Handling', () => {
      it('should handle localized entry with UID mapping', () => {
        const entry = {
          uid: 'localized_entry_1',
          title: 'Localized Entry',
          description: 'A localized entry',
        };
        const contentType = mockData.simpleContentType;
        const isMasterLocale = false;

        entriesImport['entriesUidMapper'] = {
          localized_entry_1: 'new_localized_entry_1',
        };

        entriesImport['assetUidMapper'] = {};
        entriesImport['assetUrlMapper'] = {};
        entriesImport['installedExtensions'] = [];

        const originalLookupAssets = require('../../../../src/utils').lookupAssets;
        Object.defineProperty(require('../../../../src/utils'), 'lookupAssets', {
          get: () => (entryData: any) => entryData.entry,
          configurable: true,
        });

        const mockEntryResponse = {
          uid: 'new_localized_entry_1',
          title: 'Localized Entry',
          description: 'A localized entry',
        };
        const mockContentType = {
          entry: sinon.stub().returns(mockEntryResponse),
        };
        const mockStackClient = {
          contentType: sinon.stub().returns(mockContentType),
        };
        sinon.stub(entriesImport, 'stack').value(mockStackClient);

        const apiOptions = {
          entity: 'create-entries' as any,
          apiData: entry,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: { cTUid: 'simple_ct', locale: 'fr-fr', contentType, isMasterLocale },
        };

        const result = entriesImport.serializeEntries(apiOptions);

        // Verify result structure
        expect(result).to.have.property('apiData');
        expect(result.apiData.uid).to.equal('new_localized_entry_1');
        expect(result.apiData.title).to.equal('Localized Entry');
        expect(result.additionalInfo['new_localized_entry_1']).to.deep.equal({
          isLocalized: true,
          entryOldUid: 'localized_entry_1',
        });

        Object.defineProperty(require('../../../../src/utils'), 'lookupAssets', {
          value: originalLookupAssets,
          configurable: true,
        });
      });

      it('should handle localized entry without UID mapping', () => {
        const entry = {
          uid: 'localized_entry_1',
          title: 'Localized Entry',
          description: 'A localized entry',
        };
        const contentType = mockData.simpleContentType;
        const isMasterLocale = false;

        entriesImport['entriesUidMapper'] = {};

        entriesImport['assetUidMapper'] = {};
        entriesImport['assetUrlMapper'] = {};
        entriesImport['installedExtensions'] = [];

        const originalLookupAssets = require('../../../../src/utils').lookupAssets;
        Object.defineProperty(require('../../../../src/utils'), 'lookupAssets', {
          get: () => (entryData: any) => entryData.entry,
          configurable: true,
        });

        const apiOptions = {
          entity: 'create-entries' as any,
          apiData: entry,
          resolve: sinon.stub(),
          reject: sinon.stub(),
          additionalInfo: { cTUid: 'simple_ct', locale: 'fr-fr', contentType, isMasterLocale },
        };

        const result = entriesImport.serializeEntries(apiOptions);

        // Verify result structure (should not be localized)
        expect(result).to.have.property('apiData');
        expect(result.apiData.uid).to.equal('localized_entry_1');
        expect(result.apiData.title).to.equal('Localized Entry');
        expect(result.additionalInfo).to.not.be.empty;

        Object.defineProperty(require('../../../../src/utils'), 'lookupAssets', {
          value: originalLookupAssets,
          configurable: true,
        });
      });
    });

    describe('Filter Conditions in onReject Callbacks', () => {
      it('should filter entriesForVariant in updateEntriesWithReferences onReject', async () => {
        entriesImport['entriesForVariant'] = [
          { entry_uid: 'entry_1', locale: 'en-us', content_type: 'simple_ct' },
          { entry_uid: 'entry_2', locale: 'fr-fr', content_type: 'ref_ct' },
          { entry_uid: 'entry_3', locale: 'en-us', content_type: 'simple_ct' },
        ];

        // Use the existing makeConcurrentCall stub to trigger onReject
        makeConcurrentCallStub.callsFake(async (options) => {
          // Simulate onReject callback - uid should match entry_uid in entriesForVariant
          await options.apiParams.reject({
            error: new Error('Update failed'),
            apiData: { uid: 'entry_1', title: 'Entry 1' },
          });
        });

        const handleAndLogErrorStub = sinon.stub(require('@contentstack/cli-utilities'), 'handleAndLogError');

        const mockIndexFileContent = { chunk1: true };
        sinon.stub(FsUtility.prototype, 'indexFileContent').get(() => mockIndexFileContent);

        const mockReadChunkFiles = {
          next: sinon.stub().resolves({
            entry1: { uid: 'entry_1', title: 'Entry 1' },
          }),
        };
        sinon.stub(FsUtility.prototype, 'readChunkFiles').get(() => mockReadChunkFiles);

        // FsUtility.createFolderIfNotExist is already stubbed globally

        await entriesImport.updateEntriesWithReferences({ cTUid: 'simple_ct', locale: 'en-us' });

        // Verify entriesForVariant was filtered correctly
        expect(entriesImport['entriesForVariant']).to.have.length(2);
        expect(entriesImport['entriesForVariant'].find((e) => e.entry_uid === 'entry_1')).to.be.undefined;
        expect(entriesImport['entriesForVariant'].find((e) => e.entry_uid === 'entry_2')).to.exist;
        expect(entriesImport['entriesForVariant'].find((e) => e.entry_uid === 'entry_3')).to.exist;
      });
    });
  });

  // ==========================================
  // PROGRESS BAR METHODS TESTS
  // ==========================================

  describe('Progress Bar Methods', () => {
    let mockProgress: any;
    let progressEntriesImport: EntriesImport;

    beforeEach(() => {
      sinon.restore();

      sinon.stub(FsUtility.prototype, 'createFolderIfNotExist').callsFake(() => {
        return Promise.resolve();
      });

      // Recreate entriesImport instance after restore
      progressEntriesImport = new EntriesImport({
        importConfig: mockImportConfig as any,
        stackAPIClient: mockStackClient,
        moduleName: 'entries',
      });

      // Initialize required properties (will be set by analyzeEntryData from mocks)

      mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub(),
      };
    });

    describe('analyzeEntryData()', () => {
      it('should analyze entry data and return correct counts', async () => {
        // This test verifies the method structure and return type
        // Full integration test would require complex mocking of file system operations
        const result = await progressEntriesImport['analyzeEntryData']();

        expect(result).to.be.an('array');
        expect(result.length).to.equal(5);
        expect(result[0]).to.be.a('number'); // contentTypesCount
        expect(result[1]).to.be.a('number'); // localesCount
        expect(result[2]).to.be.a('number'); // totalEntryChunks
        expect(result[3]).to.be.a('number'); // totalActualEntries
        expect(result[4]).to.be.a('number'); // totalEntriesForPublishing
      });

      it('should return zeros when no content types found', async () => {
        const fsUtilReadFileStub = sinon.stub(fsUtil, 'readFile').resolves([]);
        const fsUtilMakeDirectoryStub = sinon.stub(fsUtil, 'makeDirectory').resolves();

        const isEmptyStub = sinon.stub().returns(true);
        sinon.stub(require('lodash'), 'isEmpty').value(isEmptyStub);

        sinon
          .stub(progressEntriesImport as any, 'withLoadingSpinner')
          .callsFake(async (message: string, action: () => Promise<any>) => {
            return await action();
          });

        const result = await progressEntriesImport['analyzeEntryData']();

        expect(result).to.deep.equal([0, 0, 0, 0, 0]);

        fsUtilReadFileStub.restore();
        fsUtilMakeDirectoryStub.restore();
      });
    });

    describe('initializeProgress()', () => {
      it('should initialize progress with correct process counts', () => {
        const counts = {
          contentTypesCount: 2,
          localesCount: 2,
          totalEntryChunks: 5,
          totalActualEntries: 10,
          totalEntriesForPublishing: 5,
        };

        progressEntriesImport['importConfig'].replaceExisting = false;
        progressEntriesImport['importConfig'].skipEntriesPublish = false;

        progressEntriesImport['initializeProgress'](mockProgress, counts);

        expect(mockProgress.addProcess.called).to.be.true;
        expect(mockProgress.addProcess.callCount).to.be.greaterThan(0);
      });

      it('should add replace existing process when replaceExisting is true', () => {
        const counts = {
          contentTypesCount: 2,
          localesCount: 2,
          totalEntryChunks: 5,
          totalActualEntries: 10,
          totalEntriesForPublishing: 5,
        };

        progressEntriesImport['importConfig'].replaceExisting = true;
        progressEntriesImport['importConfig'].skipEntriesPublish = false;

        progressEntriesImport['initializeProgress'](mockProgress, counts);

        expect(mockProgress.addProcess.called).to.be.true;
      });

      it('should skip entries publish process when skipEntriesPublish is true', () => {
        const counts = {
          contentTypesCount: 2,
          localesCount: 2,
          totalEntryChunks: 5,
          totalActualEntries: 10,
          totalEntriesForPublishing: 5,
        };

        progressEntriesImport['importConfig'].replaceExisting = false;
        progressEntriesImport['importConfig'].skipEntriesPublish = true;

        progressEntriesImport['initializeProgress'](mockProgress, counts);

        expect(mockProgress.addProcess.called).to.be.true;
      });
    });

    describe('processEntryCreation()', () => {
      it('should process entry creation successfully', async () => {
        const writeFileStub = sinon.stub(fsUtil, 'writeFile').resolves();
        const writeLargeFileStub = sinon.stub(fileHelper, 'writeLargeFile').resolves();

        const populateStub = sinon
          .stub(progressEntriesImport, 'populateEntryCreatePayload')
          .returns([{ cTUid: 'simple_ct', locale: 'en-us' }]);
        const createEntriesStub = sinon.stub(progressEntriesImport, 'createEntries').resolves();

        await progressEntriesImport['processEntryCreation']();

        expect(populateStub.called).to.be.true;
        expect(createEntriesStub.called).to.be.true;
        expect(writeLargeFileStub.called).to.be.true;
        expect(writeFileStub.called).to.be.true;
      });
    });

    describe('processEntryReplacement()', () => {
      it('should process entry replacement successfully', async () => {
        const populateStub = sinon
          .stub(progressEntriesImport, 'populateEntryCreatePayload')
          .returns([{ cTUid: 'simple_ct', locale: 'en-us' }]);
        const replaceEntriesStub = sinon.stub(progressEntriesImport, 'replaceEntries').resolves();

        await progressEntriesImport['processEntryReplacement']();

        expect(populateStub.called).to.be.true;
        expect(replaceEntriesStub.called).to.be.true;
      });

      it('should handle errors in replaceEntries gracefully', async () => {
        const populateStub = sinon
          .stub(progressEntriesImport, 'populateEntryCreatePayload')
          .returns([{ cTUid: 'simple_ct', locale: 'en-us' }]);
        const replaceEntriesStub = sinon
          .stub(progressEntriesImport, 'replaceEntries')
          .rejects(new Error('Replace failed'));
        const handleErrorStub = sinon.stub(require('@contentstack/cli-utilities'), 'handleAndLogError');

        await progressEntriesImport['processEntryReplacement']();

        expect(populateStub.called).to.be.true;
        expect(replaceEntriesStub.called).to.be.true;
      });
    });

    describe('processEntryReferenceUpdates()', () => {
      beforeEach(() => {
        sinon.stub(fsUtil, 'writeFile').resolves();
      });

      it('should process entry reference updates successfully', async () => {
        const populateStub = sinon
          .stub(progressEntriesImport, 'populateEntryUpdatePayload')
          .returns([{ cTUid: 'simple_ct', locale: 'en-us' }]);
        const updateStub = sinon.stub(progressEntriesImport, 'updateEntriesWithReferences').resolves();

        await progressEntriesImport['processEntryReferenceUpdates']();

        expect(populateStub.called).to.be.true;
        expect(updateStub.called).to.be.true;
        expect((fsUtil.writeFile as sinon.SinonStub).called).to.be.true;
      });

      it('should handle errors in updateEntriesWithReferences gracefully', async () => {
        const populateStub = sinon
          .stub(progressEntriesImport, 'populateEntryUpdatePayload')
          .returns([{ cTUid: 'simple_ct', locale: 'en-us' }]);
        const updateStub = sinon
          .stub(progressEntriesImport, 'updateEntriesWithReferences')
          .rejects(new Error('Update failed'));
        const handleErrorStub = sinon.stub(require('@contentstack/cli-utilities'), 'handleAndLogError');

        try {
          await progressEntriesImport['processEntryReferenceUpdates']();
        } catch (error) {
          // Expected to throw
        }

        expect(populateStub.called).to.be.true;
        expect(updateStub.called).to.be.true;
      });
    });

    describe('processEntryPublishing()', () => {
      beforeEach(() => {
        progressEntriesImport['envs'] = {
          env_1: { name: 'production', uid: 'env_1' },
        };
        sinon.stub(fileHelper, 'readFileSync').returns(progressEntriesImport['envs']);
      });

      it('should process entry publishing successfully', async () => {
        const populateStub = sinon
          .stub(progressEntriesImport, 'populateEntryCreatePayload')
          .returns([{ cTUid: 'simple_ct', locale: 'en-us' }]);
        const publishStub = sinon.stub(progressEntriesImport, 'publishEntries').resolves();

        await progressEntriesImport['processEntryPublishing']();

        expect((fileHelper.readFileSync as sinon.SinonStub).called).to.be.true;
        expect(populateStub.called).to.be.true;
        expect(publishStub.called).to.be.true;
      });

      it('should handle errors in publishEntries gracefully', async () => {
        const handleErrorStub = sinon.stub(require('@contentstack/cli-utilities'), 'handleAndLogError');
        const populateStub = sinon
          .stub(progressEntriesImport, 'populateEntryCreatePayload')
          .returns([{ cTUid: 'simple_ct', locale: 'en-us' }]);
        const publishStub = sinon.stub(progressEntriesImport, 'publishEntries').rejects(new Error('Publish failed'));

        await progressEntriesImport['processEntryPublishing']();

        expect((fileHelper.readFileSync as sinon.SinonStub).called).to.be.true;
        expect(populateStub.called).to.be.true;
        expect(publishStub.called).to.be.true;
      });
    });

    describe('processCleanup()', () => {
      it('should process cleanup successfully when autoCreatedEntries exist', async () => {
        progressEntriesImport['autoCreatedEntries'] = [{ cTUid: 'simple_ct', locale: 'en-us', entryUid: 'entry_1' }];
        progressEntriesImport['progressManager'] = mockProgress;
        const removeStub = sinon.stub(progressEntriesImport, 'removeAutoCreatedEntries').resolves();
        const createVariantStub = sinon.stub(progressEntriesImport, 'createEntryDataForVariantEntry').returns();

        await progressEntriesImport['processCleanup']();

        expect(removeStub.called).to.be.true;
        expect(createVariantStub.called).to.be.true;
      });

      it('should process cleanup successfully when no autoCreatedEntries', async () => {
        progressEntriesImport['autoCreatedEntries'] = [];
        progressEntriesImport['progressManager'] = mockProgress;
        const createVariantStub = sinon.stub(progressEntriesImport, 'createEntryDataForVariantEntry').returns();

        await progressEntriesImport['processCleanup']();

        expect(createVariantStub.called).to.be.true;
      });

      it('should handle errors in removeAutoCreatedEntries gracefully', async () => {
        progressEntriesImport['autoCreatedEntries'] = [{ cTUid: 'simple_ct', locale: 'en-us', entryUid: 'entry_1' }];
        const removeStub = sinon
          .stub(progressEntriesImport, 'removeAutoCreatedEntries')
          .rejects(new Error('Remove failed'));
        const handleErrorStub = sinon.stub(require('@contentstack/cli-utilities'), 'handleAndLogError');
        const createVariantStub = sinon.stub(progressEntriesImport, 'createEntryDataForVariantEntry').returns();

        await progressEntriesImport['processCleanup']();

        expect(removeStub.called).to.be.true;
        expect(createVariantStub.called).to.be.true;
      });
    });
  });
});
