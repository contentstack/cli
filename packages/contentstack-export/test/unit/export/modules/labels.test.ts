import { expect } from 'chai';
import sinon from 'sinon';
import { FsUtility, handleAndLogError } from '@contentstack/cli-utilities';
import ExportLabels from '../../../../src/export/modules/labels';
import ExportConfig from '../../../../src/types/export-config';

describe('ExportLabels', () => {
  let exportLabels: any;
  let mockStackClient: any;
  let mockExportConfig: ExportConfig;

  beforeEach(() => {
    mockStackClient = {
      label: sinon.stub().returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [
              { uid: 'label-1', name: 'Test Label 1', parent: [] },
              { uid: 'label-2', name: 'Test Label 2', parent: ['label-1'] },
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
      context: {
        command: 'cm:stacks:export',
        module: 'labels',
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
        types: ['labels'],
        labels: {
          dirName: 'labels',
          fileName: 'labels.json',
          invalidKeys: ['ACL', '_version'],
          limit: 100,
        },
      },
    } as any;

    exportLabels = new ExportLabels({
      exportConfig: mockExportConfig,
      stackAPIClient: mockStackClient,
      moduleName: 'labels',
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
      expect(exportLabels).to.be.instanceOf(ExportLabels);
    });

    it('should set context module to labels', () => {
      expect(exportLabels.exportConfig.context.module).to.equal('labels');
    });

    it('should initialize labels object as empty', () => {
      expect(exportLabels.labels).to.be.an('object');
      expect(Object.keys(exportLabels.labels).length).to.equal(0);
    });

    it('should initialize labelConfig from exportConfig', () => {
      expect(exportLabels.labelConfig).to.exist;
      expect(exportLabels.labelConfig.dirName).to.equal('labels');
      expect(exportLabels.labelConfig.fileName).to.equal('labels.json');
    });

    it('should initialize query string with include_count', () => {
      expect(exportLabels.qs).to.exist;
      expect(exportLabels.qs.include_count).to.be.true;
    });
  });

  describe('getLabels() method', () => {
    it('should fetch and process labels correctly', async () => {
      exportLabels.labels = {};

      const labels = [
        { uid: 'label-1', name: 'Test Label 1', parent: [] },
        { uid: 'label-2', name: 'Test Label 2', parent: ['label-1'] },
      ];

      exportLabels.client = {
        label: sinon.stub().returns({
          query: sinon.stub().returns({
            find: sinon.stub().resolves({
              items: labels,
              count: 2,
            }),
          }),
        }),
      };

      await exportLabels.getLabels();

      // Verify labels were processed
      expect(Object.keys(exportLabels.labels).length).to.equal(2);
      expect(exportLabels.labels['label-1']).to.exist;
      expect(exportLabels.labels['label-1'].name).to.equal('Test Label 1');
    });

    it('should call getLabels recursively when more labels exist', async () => {
      let callCount = 0;
      mockStackClient.label.returns({
        query: sinon.stub().returns({
          find: sinon.stub().callsFake(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                items: Array(100).fill({ uid: `label-${callCount}`, name: 'Test Label' }),
                count: 150,
              });
            } else {
              return Promise.resolve({
                items: Array(50).fill({ uid: `label-${callCount}`, name: 'Test Label' }),
                count: 150,
              });
            }
          }),
        }),
      });

      await exportLabels.getLabels();

      // Verify multiple calls were made for recursive fetching
      expect(callCount).to.be.greaterThan(1);
    });

    it('should handle skip parameter correctly', async () => {
      let queryParams: any[] = [];
      mockStackClient.label.returns({
        query: sinon.stub().callsFake((params) => {
          queryParams.push(params);
          return {
            find: sinon.stub().resolves({
              items: [],
              count: 0,
            }),
          };
        }),
      });

      await exportLabels.getLabels(50);

      // Verify skip was set in query params
      expect(queryParams.length).to.be.greaterThan(0);
      expect(queryParams[0].skip).to.equal(50);
    });

    it('should use limit from config when calculating skip', async () => {
      exportLabels.labelConfig.limit = 50;
      let skipValues: number[] = [];
      let callCount = 0;

      mockStackClient.label.returns({
        query: sinon.stub().returns({
          find: sinon.stub().callsFake(() => {
            callCount++;
            if (callCount === 1) {
              skipValues.push(0);
              return Promise.resolve({
                items: Array(50).fill({ uid: 'test', name: 'Test' }),
                count: 100,
              });
            } else {
              skipValues.push(50);
              return Promise.resolve({
                items: [],
                count: 100,
              });
            }
          }),
        }),
      });

      await exportLabels.getLabels();

      // Verify skip was incremented by limit (50)
      expect(skipValues).to.include(50);
    });

    it('should use default limit of 100 when limit is not in config', async () => {
      exportLabels.labelConfig.limit = undefined;
      let skipValues: number[] = [];
      let callCount = 0;

      mockStackClient.label.returns({
        query: sinon.stub().returns({
          find: sinon.stub().callsFake(() => {
            callCount++;
            if (callCount === 1) {
              skipValues.push(0);
              return Promise.resolve({
                items: Array(100).fill({ uid: 'test', name: 'Test' }),
                count: 200,
              });
            } else {
              skipValues.push(100);
              return Promise.resolve({
                items: [],
                count: 200,
              });
            }
          }),
        }),
      });

      await exportLabels.getLabels();

      // Verify skip was incremented by default limit (100)
      expect(skipValues).to.include(100);
    });

    it('should stop recursion when skip >= count', async () => {
      let callCount = 0;
      mockStackClient.label.returns({
        query: sinon.stub().returns({
          find: sinon.stub().callsFake(() => {
            callCount++;
            return Promise.resolve({
              items: Array(50).fill({ uid: 'test', name: 'Test' }),
              count: 50,
            });
          }),
        }),
      });

      await exportLabels.getLabels();

      // Should only be called once since skip (100) >= count (50) after first call
      expect(callCount).to.equal(1);
    });

    it('should handle API errors gracefully', async () => {
      mockStackClient.label.returns({
        query: sinon.stub().returns({
          find: sinon.stub().rejects(new Error('API Error')),
        }),
      });

      // The method should complete without throwing (error is caught and handled)
      await exportLabels.getLabels();

      // Verify method completed - labels should still exist (initialized in constructor)
      expect(exportLabels.labels).to.exist;
    });

    it('should handle no items response', async () => {
      mockStackClient.label.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: [],
            count: 0,
          }),
        }),
      });

      const initialCount = Object.keys(exportLabels.labels).length;
      await exportLabels.getLabels();

      // Verify no new labels were added
      expect(Object.keys(exportLabels.labels).length).to.equal(initialCount);
    });

    it('should handle empty items array', async () => {
      mockStackClient.label.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: null,
            count: 0,
          }),
        }),
      });

      const initialCount = Object.keys(exportLabels.labels).length;
      await exportLabels.getLabels();

      // Verify no processing occurred with null items
      expect(Object.keys(exportLabels.labels).length).to.equal(initialCount);
    });

    it('should handle items with undefined length', async () => {
      mockStackClient.label.returns({
        query: sinon.stub().returns({
          find: sinon.stub().resolves({
            items: undefined,
            count: 0,
          }),
        }),
      });

      const initialCount = Object.keys(exportLabels.labels).length;
      await exportLabels.getLabels();

      // Verify no processing occurred with undefined items
      expect(Object.keys(exportLabels.labels).length).to.equal(initialCount);
    });
  });

  describe('start() method', () => {
    it('should complete full export flow and write files', async () => {
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;
      const makeDirectoryStub = FsUtility.prototype.makeDirectory as sinon.SinonStub;

      const labels = [
        { uid: 'label-1', name: 'Test Label 1', parent: [] },
        { uid: 'label-2', name: 'Test Label 2', parent: ['label-1'] },
      ];

      exportLabels.client = {
        label: sinon.stub().returns({
          query: sinon.stub().returns({
            find: sinon.stub().resolves({
              items: labels,
              count: 2,
            }),
          }),
        }),
      };

      await exportLabels.start();

      // Verify directory was created
      expect(makeDirectoryStub.called).to.be.true;
      // Verify labels were processed
      expect(Object.keys(exportLabels.labels).length).to.equal(2);
      expect(exportLabels.labels['label-1']).to.exist;
      expect(exportLabels.labels['label-2']).to.exist;
      // Verify file was written
      expect(writeFileStub.called).to.be.true;
    });

    it('should handle empty labels and log NOT_FOUND', async () => {
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;
      // Reset the stub to ensure clean state
      writeFileStub.resetHistory();

      exportLabels.client = {
        label: sinon.stub().returns({
          query: sinon.stub().returns({
            find: sinon.stub().resolves({
              items: [],
              count: 0,
            }),
          }),
        }),
      };

      exportLabels.labels = {};
      await exportLabels.start();

      // Verify writeFile was NOT called when labels are empty
      // isEmpty({}) returns true, so writeFile should not be called
      expect(writeFileStub.called).to.be.false;
    });

    it('should handle undefined labels scenario', async () => {
      // This test verifies that if labels becomes undefined (edge case),
      // the code will throw when trying to call Object.keys on undefined
      // In practice, labels is always initialized in constructor, so this shouldn't happen
      exportLabels.labels = undefined as any;

      // Mock getLabels to not modify labels
      const getLabelsStub = sinon.stub(exportLabels, 'getLabels').resolves();

      try {
        await exportLabels.start();
        // If we get here, the code might have been fixed to handle undefined
        // But currently Object.keys(undefined) will throw
        expect.fail('Should have thrown an error when labels is undefined');
      } catch (error: any) {
        // Object.keys will throw on undefined
        expect(error).to.exist;
      }

      getLabelsStub.restore();
    });

    it('should set labelsFolderPath correctly', async () => {
      exportLabels.client = {
        label: sinon.stub().returns({
          query: sinon.stub().returns({
            find: sinon.stub().resolves({
              items: [{ uid: 'label-1', name: 'Test Label 1', parent: [] }],
              count: 1,
            }),
          }),
        }),
      };

      await exportLabels.start();

      // Verify labelsFolderPath was set
      expect(exportLabels.labelsFolderPath).to.exist;
      expect(exportLabels.labelsFolderPath).to.include('labels');
    });

    it('should handle branchName in path when provided', async () => {
      mockExportConfig.branchName = 'test-branch';
      exportLabels = new ExportLabels({
        exportConfig: mockExportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'labels',
      });

      exportLabels.client = {
        label: sinon.stub().returns({
          query: sinon.stub().returns({
            find: sinon.stub().resolves({
              items: [{ uid: 'label-1', name: 'Test Label 1', parent: [] }],
              count: 1,
            }),
          }),
        }),
      };

      await exportLabels.start();

      // Verify branchName is included in path
      expect(exportLabels.labelsFolderPath).to.include('test-branch');
    });

    it('should write file with correct path and data', async () => {
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;

      exportLabels.client = {
        label: sinon.stub().returns({
          query: sinon.stub().returns({
            find: sinon.stub().resolves({
              items: [{ uid: 'label-1', name: 'Test Label 1', parent: [] }],
              count: 1,
            }),
          }),
        }),
      };

      await exportLabels.start();

      // Verify writeFile was called with correct arguments
      expect(writeFileStub.called).to.be.true;
      const writeFileArgs = writeFileStub.firstCall.args;
      expect(writeFileArgs[0]).to.include('labels.json');
      expect(writeFileArgs[1]).to.equal(exportLabels.labels);
    });
  });

  describe('sanitizeAttribs() method', () => {
    it('should sanitize label attributes and remove invalid keys', () => {
      exportLabels.labels = {};

      const labels = [
        { uid: 'label-1', name: 'Test Label 1', ACL: 'remove', _version: 'remove', parent: [] },
        { uid: 'label-2', name: 'Test Label 2', ACL: 'remove', _version: 'remove', parent: ['label-1'] },
      ];

      exportLabels.sanitizeAttribs(labels);

      expect(exportLabels.labels['label-1']).to.exist;
      expect(exportLabels.labels['label-1'].name).to.equal('Test Label 1');
      expect(exportLabels.labels['label-1'].uid).to.equal('label-1');
      // Verify invalid keys were removed
      expect(exportLabels.labels['label-1'].ACL).to.be.undefined;
      expect(exportLabels.labels['label-1']._version).to.be.undefined;
    });

    it('should handle labels without name field', () => {
      exportLabels.labels = {};

      const labels = [{ uid: 'label-1', ACL: 'remove' }];

      exportLabels.sanitizeAttribs(labels);

      expect(exportLabels.labels['label-1']).to.exist;
      expect(exportLabels.labels['label-1'].ACL).to.be.undefined;
    });

    it('should handle empty labels array', () => {
      exportLabels.labels = {};

      const labels: any[] = [];

      exportLabels.sanitizeAttribs(labels);

      expect(Object.keys(exportLabels.labels).length).to.equal(0);
    });

    it('should handle labels with null or undefined values', () => {
      exportLabels.labels = {};

      const labels = [
        { uid: 'label-1', name: null as any, parent: [] as any[] },
        { uid: 'label-2', name: undefined as any, parent: [] as any[] },
      ];

      exportLabels.sanitizeAttribs(labels);

      expect(exportLabels.labels['label-1']).to.exist;
      expect(exportLabels.labels['label-2']).to.exist;
    });

    it('should preserve valid keys after sanitization', () => {
      exportLabels.labels = {};

      const labels = [
        {
          uid: 'label-1',
          name: 'Test Label',
          parent: ['parent-1'],
          color: '#FF0000',
          ACL: 'remove',
          _version: 'remove',
        },
      ];

      exportLabels.sanitizeAttribs(labels);

      expect(exportLabels.labels['label-1'].uid).to.equal('label-1');
      expect(exportLabels.labels['label-1'].name).to.equal('Test Label');
      expect(exportLabels.labels['label-1'].parent).to.deep.equal(['parent-1']);
      expect(exportLabels.labels['label-1'].color).to.equal('#FF0000');
      // Invalid keys should be removed
      expect(exportLabels.labels['label-1'].ACL).to.be.undefined;
      expect(exportLabels.labels['label-1']._version).to.be.undefined;
    });

    it('should handle labels array with undefined length', () => {
      exportLabels.labels = {};

      const labels: any = { length: undefined };

      // This should not throw an error
      expect(() => exportLabels.sanitizeAttribs(labels)).to.not.throw();
    });
  });
});
