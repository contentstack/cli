import { expect } from 'chai';
import sinon from 'sinon';
import { FsUtility } from '@contentstack/cli-utilities';
import ExportWorkflows from '../../../../src/export/modules/workflows';
import ExportConfig from '../../../../src/types/export-config';

describe('ExportWorkflows', () => {
  let exportWorkflows: any;
  let mockStackClient: any;
  let mockExportConfig: ExportConfig;

  beforeEach(() => {
    mockStackClient = {
      workflow: sinon.stub().returns({
        fetchAll: sinon.stub().resolves({
          items: [
            {
              uid: 'workflow-1',
              name: 'Workflow 1',
              workflow_stages: [
                {
                  name: 'Draft',
                  SYS_ACL: {
                    roles: {
                      uids: [1, 2],
                    },
                  },
                },
              ],
              invalidKey: 'remove',
            },
          ],
          count: 1,
        }),
      }),
      role: sinon.stub().returns({
        fetch: sinon.stub().resolves({ uid: 'role-1', name: 'Role 1' }),
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
        module: 'workflows',
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
        types: ['workflows'],
        workflows: {
          dirName: 'workflows',
          fileName: 'workflows.json',
          limit: 100,
          invalidKeys: ['invalidKey'],
        },
      },
    } as any;

    exportWorkflows = new ExportWorkflows({
      exportConfig: mockExportConfig,
      stackAPIClient: mockStackClient,
      moduleName: 'workflows',
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
      expect(exportWorkflows).to.be.instanceOf(ExportWorkflows);
    });

    it('should set context module to workflows', () => {
      expect(exportWorkflows.exportConfig.context.module).to.equal('workflows');
    });

    it('should initialize workflowConfig', () => {
      expect(exportWorkflows.workflowConfig).to.exist;
      expect(exportWorkflows.workflowConfig.dirName).to.equal('workflows');
    });

    it('should initialize empty workflows object', () => {
      expect(exportWorkflows.workflows).to.be.an('object');
      expect(Object.keys(exportWorkflows.workflows).length).to.equal(0);
    });

    it('should initialize query params', () => {
      expect((exportWorkflows as any).qs).to.deep.equal({ include_count: true });
    });
  });

  describe('getWorkflows() method', () => {
    it('should fetch and process workflows correctly', async () => {
      await exportWorkflows.getWorkflows();

      // Verify workflows were processed
      expect(Object.keys(exportWorkflows.workflows).length).to.equal(1);
      expect(exportWorkflows.workflows['workflow-1']).to.exist;
      expect(exportWorkflows.workflows['workflow-1'].name).to.equal('Workflow 1');
      // Verify invalid key was removed
      expect(exportWorkflows.workflows['workflow-1'].invalidKey).to.be.undefined;
    });

    it('should call getWorkflows recursively when more workflows exist', async () => {
      let callCount = 0;
      mockStackClient.workflow.returns({
        fetchAll: sinon.stub().callsFake(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              items: new Array(100).fill({ uid: 'test', name: 'Test', workflow_stages: [] as any[] }),
              count: 150,
            });
          } else {
            return Promise.resolve({
              items: new Array(50).fill({ uid: 'test2', name: 'Test2', workflow_stages: [] as any[] }),
              count: 150,
            });
          }
        }),
      });

      await exportWorkflows.getWorkflows();

      // Verify multiple calls were made
      expect(callCount).to.be.greaterThan(1);
    });

    it('should handle API errors gracefully without throwing', async () => {
      mockStackClient.workflow.returns({
        fetchAll: sinon.stub().rejects(new Error('API Error')),
      });

      // Should complete without throwing
      await exportWorkflows.getWorkflows();
    });

    it('should handle no items response', async () => {
      mockStackClient.workflow.returns({
        fetchAll: sinon.stub().resolves({
          items: [],
          count: 0,
        }),
      });

      const initialCount = Object.keys(exportWorkflows.workflows).length;
      await exportWorkflows.getWorkflows();

      // Verify no new workflows were added
      expect(Object.keys(exportWorkflows.workflows).length).to.equal(initialCount);
    });

    it('should update query params with skip value', async () => {
      mockStackClient.workflow.returns({
        fetchAll: sinon.stub().resolves({
          items: [{ uid: 'wf-1', name: 'Test' }],
          count: 1,
        }),
      });

      await exportWorkflows.getWorkflows(50);

      // Verify skip was set in query
      expect((exportWorkflows as any).qs.skip).to.equal(50);
    });
  });

  describe('sanitizeAttribs() method', () => {
    it('should sanitize workflow attributes and remove invalid keys', async () => {
      const workflows = [
        {
          uid: 'wf-1',
          name: 'Workflow 1',
          invalidKey: 'remove',
          workflow_stages: [] as any[],
        },
      ];

      await exportWorkflows.sanitizeAttribs(workflows);

      // Verify invalid key was removed
      expect(exportWorkflows.workflows['wf-1'].invalidKey).to.be.undefined;
      expect(exportWorkflows.workflows['wf-1'].name).to.equal('Workflow 1');
    });

    it('should fetch roles for workflow stages', async () => {
      const workflows = [
        {
          uid: 'wf-1',
          name: 'Workflow 1',
          workflow_stages: [
            {
              name: 'Draft',
              SYS_ACL: {
                roles: {
                  uids: [1, 2],
                },
              },
            },
          ],
        },
      ];

      await exportWorkflows.sanitizeAttribs(workflows);

      // Verify role fetch was called
      expect(mockStackClient.role.called).to.be.true;
    });

    it('should handle workflows without stages', async () => {
      const workflows = [
        {
          uid: 'wf-1',
          name: 'Workflow 1',
          workflow_stages: [] as any[],
        },
      ];

      await exportWorkflows.sanitizeAttribs(workflows);

      // Verify workflow was still processed
      expect(exportWorkflows.workflows['wf-1']).to.exist;
    });

    it('should handle empty workflows array', async () => {
      const workflows: any[] = [];

      await exportWorkflows.sanitizeAttribs(workflows);

      expect(Object.keys(exportWorkflows.workflows).length).to.equal(0);
    });
  });

  describe('getRoles() method', () => {
    it('should fetch role data correctly', async () => {
      const roleData = await exportWorkflows.getRoles(123);

      expect(roleData).to.exist;
      expect(mockStackClient.role.called).to.be.true;
    });

    it('should handle API errors gracefully', async () => {
      mockStackClient.role.returns({
        fetch: sinon.stub().rejects(new Error('API Error')),
      });

      // Should complete without throwing
      await exportWorkflows.getRoles(123);
    });
  });

  describe('start() method', () => {
    it('should complete full export flow and write files', async () => {
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;
      const makeDirectoryStub = FsUtility.prototype.makeDirectory as sinon.SinonStub;

      await exportWorkflows.start();

      // Verify workflows were processed
      expect(Object.keys(exportWorkflows.workflows).length).to.be.greaterThan(0);
      // Verify file operations were called
      expect(writeFileStub.called).to.be.true;
      expect(makeDirectoryStub.called).to.be.true;
    });

    it('should handle empty workflows and log NOT_FOUND', async () => {
      mockStackClient.workflow.returns({
        fetchAll: sinon.stub().resolves({
          items: [],
          count: 0,
        }),
      });

      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;

      exportWorkflows.workflows = {};
      await exportWorkflows.start();

      // Verify writeFile was NOT called when workflows are empty
      expect(writeFileStub.called).to.be.false;
    });

    it('should handle errors during export without throwing', async () => {
      mockStackClient.workflow.returns({
        fetchAll: sinon.stub().rejects(new Error('Export failed')),
      });

      // Should complete without throwing
      await exportWorkflows.start();
    });
  });
});
