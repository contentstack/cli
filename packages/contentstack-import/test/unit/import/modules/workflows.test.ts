import { expect } from 'chai';
import sinon from 'sinon';
import ImportWorkflows from '../../../../src/import/modules/workflows';
import { ImportConfig } from '../../../../src/types';
import { fsUtil, fileHelper } from '../../../../src/utils';

describe('ImportWorkflows', () => {
  let importWorkflows: ImportWorkflows;
  let mockStackClient: any;
  let mockImportConfig: ImportConfig;
  let fsUtilStub: any;
  let fileHelperStub: any;
  let makeConcurrentCallStub: sinon.SinonStub;

  beforeEach(() => {
    // Setup filesystem stubs using sinon.replace to avoid interference
    fsUtilStub = {
      readFile: sinon.stub(),
      writeFile: sinon.stub(),
      makeDirectory: sinon.stub().resolves()
    };
    
    fileHelperStub = {
      fileExistsSync: sinon.stub()
    };

    // Use sinon.replace to replace the entire modules
    sinon.replace(require('../../../../src/utils'), 'fileHelper', fileHelperStub);
    sinon.replaceGetter(require('../../../../src/utils'), 'fsUtil', () => fsUtilStub);

    // Setup mock stack client
    const mockWorkflowUpdate = sinon.stub().resolves({ uid: 'wf-123', name: 'Test WF' });
    mockStackClient = {
      role: sinon.stub().returns({
        fetchAll: sinon.stub().resolves({ items: [{ name: 'Test Role', uid: 'role-123' }] })
      }),
      workflow: sinon.stub().returns({
        create: sinon.stub().resolves({ uid: 'wf-123', name: 'Test WF', workflow_stages: [] }),
        update: mockWorkflowUpdate
      })
    };

    mockImportConfig = {
      apiKey: 'test',
      backupDir: '/test/backup',
      data: '/test/content',
      contentVersion: 1,
      region: 'us',
      fetchConcurrency: 2,
      context: {
        command: 'cm:stacks:import',
        module: 'workflows',
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-123',
        apiKey: 'test',
        orgId: 'org-123',
        authenticationMethod: 'Basic Auth'
      },
      modules: {
        workflows: {
          dirName: 'workflows',
          fileName: 'workflows.json'
        }
      }
    } as any;

    importWorkflows = new ImportWorkflows({
      importConfig: mockImportConfig as any,
      stackAPIClient: mockStackClient,
      moduleName: 'workflows'
    });

    // Stub makeConcurrentCall after instance creation
    makeConcurrentCallStub = sinon.stub(importWorkflows as any, 'makeConcurrentCall').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(importWorkflows).to.be.instanceOf(ImportWorkflows);
      expect(importWorkflows['importConfig']).to.equal(mockImportConfig);
      expect((importWorkflows as any)['client']).to.equal(mockStackClient);
    });

    it('should set context module to workflows', () => {
      expect(importWorkflows['importConfig'].context.module).to.equal('workflows');
    });

    it('should initialize paths correctly', () => {
      expect(importWorkflows['workflowsFolderPath']).to.include('workflows');
      expect(importWorkflows['mapperDirPath']).to.include('mapper');
      expect(importWorkflows['workflowUidMapperPath']).to.include('uid-mapping.json');
      expect(importWorkflows['createdWorkflowsPath']).to.include('success.json');
      expect(importWorkflows['failedWorkflowsPath']).to.include('fails.json');
    });

    it('should initialize empty arrays and objects', () => {
      expect(importWorkflows['workflows']).to.deep.equal({});
      expect(importWorkflows['createdWorkflows']).to.deep.equal([]);
      expect(importWorkflows['failedWebhooks']).to.deep.equal([]);
      expect(importWorkflows['workflowUidMapper']).to.deep.equal({});
      expect(importWorkflows['roleNameMap']).to.deep.equal({});
    });
  });

  describe('start()', () => {
    it('should return early when workflows folder does not exist', async () => {
      fileHelperStub.fileExistsSync.returns(false);

      await importWorkflows.start();

      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should return early when workflows is empty', async () => {
      fileHelperStub.fileExistsSync.returns(true);
      fsUtilStub.readFile.returns({});

      await importWorkflows.start();

      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should process workflows when available', async () => {
      const mockWorkflows = {
        wf1: { uid: 'wf1', name: 'Workflow 1', workflow_stages: [] as any }
      };

      fileHelperStub.fileExistsSync.withArgs(sinon.match(/workflows$/)).returns(true);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/uid-mapping\.json/)).returns(false);
      fsUtilStub.readFile.returns(mockWorkflows);

      await importWorkflows.start();

      expect(makeConcurrentCallStub.called).to.be.true;
      expect(fsUtilStub.makeDirectory.called).to.be.true;
    });

    it('should load existing UID mapper when file exists', async () => {
      const mockWorkflows = { wf1: { uid: 'wf1', name: 'WF 1', workflow_stages: [] as any } };
      const mockUidMapper = { wf1: 'mapped-wf1' };

      fileHelperStub.fileExistsSync.returns(true);
      fsUtilStub.readFile.withArgs(sinon.match(/workflows\.json/)).returns(mockWorkflows);
      fsUtilStub.readFile.withArgs(sinon.match(/uid-mapping\.json/)).returns(mockUidMapper);

      await importWorkflows.start();

      expect(importWorkflows['workflowUidMapper']).to.deep.equal(mockUidMapper);
    });

    it('should write success file when workflows created', async () => {
      const mockWorkflows = { wf1: { uid: 'wf1', name: 'WF 1', workflow_stages: [] as any } };

      fileHelperStub.fileExistsSync.withArgs(sinon.match(/workflows$/)).returns(true);
      fileHelperStub.fileExistsSync.returns(false);
      fsUtilStub.readFile.returns(mockWorkflows);

      importWorkflows['createdWorkflows'] = [{ uid: 'wf1' }];

      await importWorkflows.start();

      expect(fsUtilStub.writeFile.calledWith(sinon.match(/success\.json/))).to.be.true;
    });

    it('should write fails file when workflows failed', async () => {
      const mockWorkflows = { wf1: { uid: 'wf1', name: 'WF 1', workflow_stages: [] as any } };

      fileHelperStub.fileExistsSync.withArgs(sinon.match(/workflows$/)).returns(true);
      fileHelperStub.fileExistsSync.returns(false);
      fsUtilStub.readFile.returns(mockWorkflows);

      importWorkflows['failedWebhooks'] = [{ uid: 'wf1' }];

      await importWorkflows.start();

      expect(fsUtilStub.writeFile.calledWith(sinon.match(/fails\.json/))).to.be.true;
    });
  });

  describe('getRoles()', () => {
    it('should fetch roles and create name map', async () => {
      const mockRoles = [
        { name: 'Role 1', uid: 'role1' },
        { name: 'Role 2', uid: 'role2' }
      ];

      mockStackClient.role.returns({
        fetchAll: sinon.stub().resolves({ items: mockRoles })
      });

      await importWorkflows.getRoles();

      expect(importWorkflows['roleNameMap']).to.deep.equal({
        'Role 1': 'role1',
        'Role 2': 'role2'
      });
    });

    it('should handle role fetch error', async () => {
      mockStackClient.role.returns({
        fetchAll: sinon.stub().rejects(new Error('Fetch failed'))
      });

      await importWorkflows.getRoles();

      expect(importWorkflows['roleNameMap']).to.deep.equal({});
    });

    it('should handle empty roles response', async () => {
      mockStackClient.role.returns({
        fetchAll: sinon.stub().resolves({ items: [] })
      });

      await importWorkflows.getRoles();

      expect(importWorkflows['roleNameMap']).to.deep.equal({});
    });
  });

  describe('importWorkflows()', () => {
    beforeEach(() => {
      importWorkflows['workflows'] = {
        wf1: { uid: 'wf1', name: 'Workflow 1', workflow_stages: [] as any }
      };
    });

    it('should call makeConcurrentCall with correct parameters', async () => {
      await importWorkflows.importWorkflows();

      expect(makeConcurrentCallStub.calledOnce).to.be.true;
      const callArgs = makeConcurrentCallStub.firstCall.args[0];
      expect(callArgs.processName).to.equal('create workflows');
      expect(callArgs.apiParams.entity).to.equal('create-workflows');
    });

    it('should handle successful workflow creation', async () => {
      await importWorkflows.importWorkflows();

      const onSuccess = makeConcurrentCallStub.firstCall.args[0].apiParams.resolve;
      const mockWorkflow = { uid: 'wf-new', name: 'Workflow 1', workflow_stages: [] as any };
      await onSuccess({ response: mockWorkflow, apiData: { uid: 'wf1', name: 'Workflow 1' } });

      expect(importWorkflows['createdWorkflows']).to.include(mockWorkflow);
      expect(importWorkflows['workflowUidMapper']['wf1']).to.equal('wf-new');
    });

    it('should handle existing workflow error', async () => {
      await importWorkflows.importWorkflows();

      const onReject = makeConcurrentCallStub.firstCall.args[0].apiParams.reject;
      onReject({
        error: { message: JSON.stringify({ errors: { name: 'exists' } }) },
        apiData: { name: 'Workflow 1', uid: 'wf1' }
      });

      expect(importWorkflows['failedWebhooks']).to.have.lengthOf(0);
    });

    it('should handle workflow_stages.0.users error', async () => {
      await importWorkflows.importWorkflows();

      const onReject = makeConcurrentCallStub.firstCall.args[0].apiParams.reject;
      onReject({
        error: { errors: { 'workflow_stages.0.users': 'error' } },
        apiData: { name: 'Workflow 1', uid: 'wf1' }
      });

      expect(importWorkflows['failedWebhooks']).to.have.lengthOf(1);
    });

    it('should handle other errors during import', async () => {
      await importWorkflows.importWorkflows();

      const onReject = makeConcurrentCallStub.firstCall.args[0].apiParams.reject;
      onReject({
        error: { message: JSON.stringify({ errorCode: 500 }) },
        apiData: { name: 'Workflow 1', uid: 'wf1' }
      });

      expect(importWorkflows['failedWebhooks']).to.have.lengthOf(1);
    });

    it('should update next_available_stages when present', async () => {
      const mockWorkflow = {
        uid: 'wf1',
        name: 'WF 1',
        workflow_stages: [
          { uid: 'stage1', name: 'Stage 1', next_available_stages: ['stage2'] }
        ]
      };
      importWorkflows['workflows'] = { wf1: mockWorkflow };

      await importWorkflows.importWorkflows();

      const onSuccess = makeConcurrentCallStub.firstCall.args[0].apiParams.resolve;
      const response = {
        uid: 'wf-new',
        name: 'WF 1',
        workflow_stages: [{ uid: 'new-stage1', name: 'Stage 1' }]
      };

      await onSuccess({ response, apiData: { uid: 'wf1', name: 'WF 1' } });

      expect(mockStackClient.workflow.called).to.be.true;
    });
  });

  describe('serializeWorkflows()', () => {
    it('should skip workflow if already exists in mapper', () => {
      importWorkflows['workflowUidMapper'] = { wf1: 'mapped-wf1' };
      const apiOptions = {
        apiData: { uid: 'wf1', name: 'Workflow 1', workflow_stages: [] as any },
        entity: 'create-workflows'
      };

      const result = importWorkflows.serializeWorkflows(apiOptions as any);

      expect(result.entity).to.be.undefined;
    });

    it('should delete admin_users if present', () => {
      const apiOptions = {
        apiData: {
          uid: 'wf1',
          name: 'Workflow 1',
          admin_users: ['user1'],
          workflow_stages: [] as any
        }
      };

      const result = importWorkflows.serializeWorkflows(apiOptions as any);

      expect(result.apiData.admin_users).to.be.undefined;
    });

    it('should add default branches if not present', () => {
      const apiOptions = {
        apiData: { uid: 'wf1', name: 'Workflow 1', workflow_stages: [] as any }
      };

      const result = importWorkflows.serializeWorkflows(apiOptions as any);

      expect(result.apiData.branches).to.deep.equal(['main']);
    });

    it('should not override existing branches', () => {
      const apiOptions = {
        apiData: {
          uid: 'wf1',
          name: 'Workflow 1',
          branches: ['custom-branch'],
          workflow_stages: [] as any
        }
      };

      const result = importWorkflows.serializeWorkflows(apiOptions as any);

      expect(result.apiData.branches).to.deep.equal(['custom-branch']);
    });

    it('should remove stage UIDs and set next_available_stages to $all', () => {
      const apiOptions = {
        apiData: {
          uid: 'wf1',
          name: 'Workflow 1',
          workflow_stages: [
            { uid: 'stage1', name: 'Stage 1', next_available_stages: ['stage2'] }
          ] as any
        }
      };

      const result = importWorkflows.serializeWorkflows(apiOptions as any);

      expect(result.apiData.workflow_stages[0].uid).to.be.undefined;
      expect(result.apiData.workflow_stages[0].next_available_stages).to.deep.equal(['$all']);
    });

    it('should not modify empty next_available_stages', () => {
      const apiOptions = {
        apiData: {
          uid: 'wf1',
          name: 'Workflow 1',
          workflow_stages: [{ uid: 'stage1', name: 'Stage 1', next_available_stages: [] }] as any
        }
      };

      const result = importWorkflows.serializeWorkflows(apiOptions as any);

      expect(result.apiData.workflow_stages[0].next_available_stages).to.deep.equal([]);
    });
  });

  describe('updateNextAvailableStagesUid()', () => {
    it('should update next_available_stages with new UIDs', () => {
      const workflow = { uid: 'wf1', name: 'WF 1' };
      const newStages = [
        { uid: 'new-stage1', name: 'Stage 1' },
        { uid: 'new-stage2', name: 'Stage 2' }
      ];
      const oldStages = [
        { uid: 'old-stage1', name: 'Stage 1', next_available_stages: ['old-stage2'] as any },
        { uid: 'old-stage2', name: 'Stage 2', next_available_stages: [] as any }
      ];

      const result = importWorkflows.updateNextAvailableStagesUid(workflow, newStages, oldStages);

      expect(result).to.exist;
      expect(mockStackClient.workflow.calledWith('wf1')).to.be.true;
    });

    it('should preserve $all in next_available_stages', () => {
      const workflow = { uid: 'wf1', name: 'WF 1' };
      const newStages = [{ uid: 'new-stage1', name: 'Stage 1' }];
      const oldStages = [{ uid: 'old-stage1', name: 'Stage 1', next_available_stages: ['$all'] }];

      importWorkflows.updateNextAvailableStagesUid(workflow, newStages, oldStages);

      expect(mockStackClient.workflow.called).to.be.true;
    });

    it('should filter out undefined stage UIDs', () => {
      const workflow = { uid: 'wf1', name: 'WF 1' };
      const newStages = [{ uid: 'new-stage1', name: 'Stage 1' }];
      const oldStages = [{ uid: 'old-stage1', name: 'Stage 1', next_available_stages: ['nonexistent'] }];

      importWorkflows.updateNextAvailableStagesUid(workflow, newStages, oldStages);

      expect(mockStackClient.workflow.called).to.be.true;
    });
  });

  describe('createCustomRoleIfNotExists()', () => {
    it('should create custom roles for workflow stages', async () => {
      const workflow = {
        uid: 'wf1',
        name: 'WF 1',
        workflow_stages: [
          {
            SYS_ACL: {
              users: { uids: ['user1'] as any },
              roles: { uids: [{ uid: 'role1', name: 'Role 1', rules: [] as any }] }
            }
          }
        ]
      };

      await importWorkflows.createCustomRoleIfNotExists(workflow);

      expect(makeConcurrentCallStub.called).to.be.true;
    });

    it('should set users to $all when not $all', async () => {
      const workflow = {
        uid: 'wf1',
        name: 'WF 1',
        workflow_stages: [
          {
            SYS_ACL: {
              users: { uids: ['user1', 'user2'] as any },
              roles: { uids: [] as any }
            }
          }
        ]
      };

      await importWorkflows.createCustomRoleIfNotExists(workflow);

      expect(workflow.workflow_stages[0].SYS_ACL.users.uids).to.deep.equal(['$all']);
    });

    it('should not modify users when already $all', async () => {
      const workflow = {
        uid: 'wf1',
        name: 'WF 1',
        workflow_stages: [
          {
            SYS_ACL: {
              users: { uids: ['$all'] as any },
              roles: { uids: [] as any }
            }
          }
        ]
      };

      await importWorkflows.createCustomRoleIfNotExists(workflow);

      expect(workflow.workflow_stages[0].SYS_ACL.users.uids).to.deep.equal(['$all']);
    });
  });

  describe('serializeCustomRoles()', () => {
    it('should add branch rule if not exists', () => {
      const apiOptions = {
        apiData: { name: 'Role 1', rules: [] as any },
        additionalInfo: { workflowUid: 'wf1', stageIndex: 0 }
      };
      importWorkflows['roleNameMap'] = {};

      const result = importWorkflows.serializeCustomRoles(apiOptions as any);

      expect((result as any).rules).to.have.lengthOf(1);
      expect((result as any).rules[0].module).to.equal('branch');
    });

    it('should not add branch rule if already exists', () => {
      const apiOptions = {
        apiData: {
          name: 'Role 1',
          rules: [{ module: 'branch', branches: ['main'], acl: { read: true } }] as any
        },
        additionalInfo: { workflowUid: 'wf1', stageIndex: 0 }
      };
      importWorkflows['roleNameMap'] = {};

      const result = importWorkflows.serializeCustomRoles(apiOptions as any);

      expect((result as any).rules).to.have.lengthOf(1);
    });

    it('should skip role if already in roleNameMap', () => {
      importWorkflows['roleNameMap'] = { 'Role 1': 'role-123' };
      importWorkflows['workflows'] = {
        wf1: {
          workflow_stages: [{ SYS_ACL: { roles: { uids: [{ uid: 'old-role', name: 'Role 1' }] } } }]
        }
      };
      const apiOptions = {
        apiData: { uid: 'old-role', name: 'Role 1', rules: [] as any },
        additionalInfo: { workflowUid: 'wf1', stageIndex: 0 },
        entity: 'create-custom-role'
      };

      const result = importWorkflows.serializeCustomRoles(apiOptions as any);

      expect(result.entity).to.be.undefined;
    });
  });

  describe('updateRoleData()', () => {
    it('should update role UID in workflow stage', () => {
      importWorkflows['workflows'] = {
        wf1: {
          workflow_stages: [{ SYS_ACL: { roles: { uids: [{ uid: 'old-role', name: 'Role 1' }] } } }]
        }
      };
      importWorkflows['roleNameMap'] = { 'Role 1': 'new-role' };

      importWorkflows.updateRoleData({
        workflowUid: 'wf1',
        stageIndex: 0,
        roleData: { uid: 'old-role', name: 'Role 1' }
      });

      expect(importWorkflows['workflows']['wf1'].workflow_stages[0].SYS_ACL.roles.uids[0]).to.equal('new-role');
    });

    it('should append role if not found in existing list', () => {
      importWorkflows['workflows'] = {
        wf1: {
          workflow_stages: [{ SYS_ACL: { roles: { uids: [] } } }]
        }
      };
      importWorkflows['roleNameMap'] = { 'Role 1': 'new-role' };

      importWorkflows.updateRoleData({
        workflowUid: 'wf1',
        stageIndex: 0,
        roleData: { uid: 'old-role', name: 'Role 1' }
      });

      expect(importWorkflows['workflows']['wf1'].workflow_stages[0].SYS_ACL.roles.uids).to.include('new-role');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null UID mapper file', async () => {
      const mockWorkflows = { wf1: { uid: 'wf1', name: 'WF 1', workflow_stages: [] as any } };

      fileHelperStub.fileExistsSync.withArgs(sinon.match(/workflows$/)).returns(true);
      fileHelperStub.fileExistsSync.withArgs(sinon.match(/uid-mapping\.json/)).returns(true);
      fsUtilStub.readFile.withArgs(sinon.match(/workflows\.json/)).returns(mockWorkflows);
      fsUtilStub.readFile.withArgs(sinon.match(/uid-mapping\.json/)).returns({});

      await importWorkflows.start();

      expect(importWorkflows['workflowUidMapper']).to.exist;
    });

    it('should not write files when arrays are empty', async () => {
      const mockWorkflows = { wf1: { uid: 'wf1', name: 'WF 1', workflow_stages: [] as any } };

      fileHelperStub.fileExistsSync.withArgs(sinon.match(/workflows$/)).returns(true);
      fileHelperStub.fileExistsSync.returns(false);
      fsUtilStub.readFile.returns(mockWorkflows);

      importWorkflows['createdWorkflows'] = [];
      importWorkflows['failedWebhooks'] = [];

      await importWorkflows.start();

      expect(fsUtilStub.writeFile.calledWith(sinon.match(/success\.json/))).to.be.false;
      expect(fsUtilStub.writeFile.calledWith(sinon.match(/fails\.json/))).to.be.false;
    });
  });

  describe('Integration Tests', () => {
    it('should complete full workflows import flow', async () => {
      const mockWorkflows = {
        wf1: { uid: 'wf1', name: 'Workflow 1', workflow_stages: [] as any },
        wf2: { uid: 'wf2', name: 'Workflow 2', workflow_stages: [] as any }
      };

      fileHelperStub.fileExistsSync.withArgs(sinon.match(/workflows$/)).returns(true);
      fileHelperStub.fileExistsSync.returns(false);
      fsUtilStub.readFile.returns(mockWorkflows);

      importWorkflows['createdWorkflows'] = [{ uid: 'wf1' }, { uid: 'wf2' }];

      await importWorkflows.start();

      expect(makeConcurrentCallStub.called).to.be.true;
      expect(fsUtilStub.makeDirectory.called).to.be.true;
      expect(fsUtilStub.writeFile.called).to.be.true;
    });
  });
});

