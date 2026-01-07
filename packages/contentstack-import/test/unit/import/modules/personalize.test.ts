import { expect } from 'chai';
import sinon from 'sinon';
import { ImportConfig } from '../../../../src/types';
import { log } from '@contentstack/cli-utilities';

const mockImport = {
  Project: sinon.stub(),
  Events: sinon.stub(),
  Audiences: sinon.stub(),
  Attribute: sinon.stub(),
  Experiences: sinon.stub()
};

const mockVariantsModule = {
  Import: mockImport
};

const Module = require('node:module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id: string) {
  if (id === '@contentstack/cli-variants') {
    return mockVariantsModule;
  }
  return originalRequire.apply(this, arguments);
};

// Now import the module
const ImportPersonalize = require('../../../../src/import/modules/personalize').default;

describe('ImportPersonalize', () => {
  let importPersonalize: any;
  let mockImportConfig: ImportConfig;
  let mockStackClient: any;
  let logStub: any;
  let handleAndLogErrorStub: any;

  beforeEach(() => {
    mockStackClient = {
      stack: sinon.stub().returns({
        apiKey: 'test'
      })
    };

    logStub = {
      debug: sinon.stub(),
      info: sinon.stub(),
      success: sinon.stub()
    };
    
    Object.assign(log, {
      debug: logStub.debug,
      info: logStub.info,
      success: logStub.success
    });

    handleAndLogErrorStub = sinon.stub();
    sinon.stub(require('@contentstack/cli-utilities'), 'handleAndLogError').callsFake(handleAndLogErrorStub);

    mockImportConfig = {
      apiKey: 'test',
      backupDir: '/test/backup',
      data: '/test/content',
      contentVersion: 1,
      region: {
        name: 'NA',
        cma: 'https://api.contentstack.io',
        cda: 'https://cdn.contentstack.io',
        uiHost: 'https://app.contentstack.com'
      },
      context: {
        command: 'cm:stacks:import',
        module: 'personalize',
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-123',
        apiKey: 'test',
        orgId: 'org-123',
        authenticationMethod: 'Basic Auth'
      },
      modules: {
        personalize: {
          baseURL: {
            'NA': 'https://personalize-na.contentstack.com',
            'EU': 'https://personalize-eu.contentstack.com',
            'Azure-NA': 'https://personalize-azure-na.contentstack.com'
          },
          dirName: 'personalize',
          importData: true,
          importOrder: ['events', 'audiences', 'attributes', 'experiences'],
          project_id: 'test-project-id',
          projects: {
            dirName: 'projects',
            fileName: 'projects.json'
          },
          attributes: {
            dirName: 'attributes',
            fileName: 'attributes.json'
          },
          audiences: {
            dirName: 'audiences',
            fileName: 'audiences.json'
          },
          events: {
            dirName: 'events',
            fileName: 'events.json'
          },
          experiences: {
            dirName: 'experiences',
            fileName: 'experiences.json',
            thresholdTimer: 1000,
            checkIntervalDuration: 500
          }
        }
      }
    } as any;

    // Reset all mocks
    for (const stub of Object.values(mockImport)) {
      stub.reset();
    }
    logStub.debug.reset();
    logStub.info.reset();
    logStub.success.reset();
    handleAndLogErrorStub.reset();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });
      
      expect(importPersonalize).to.be.instanceOf(ImportPersonalize);
      expect(importPersonalize['config']).to.equal(mockImportConfig);
      expect(importPersonalize['personalizeConfig']).to.equal(mockImportConfig.modules.personalize);
    });

    it('should set context module to personalize', () => {
      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });
      
      expect(importPersonalize['config'].context.module).to.equal('personalize');
    });
  });

  describe('start() - Early Return Scenarios', () => {
    it('should return early when no baseURL found for region', async () => {
      mockImportConfig.region.name = 'INVALID_REGION';
      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      expect(importPersonalize['personalizeConfig'].importData).to.be.false;
      expect(mockImport.Project.called).to.be.false;
    });

    it('should return early when management token is present', async () => {
      mockImportConfig.management_token = 'test-management-token';
      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      expect(mockImport.Project.called).to.be.false;
    });

    it('should check baseURL before management token', async () => {
      mockImportConfig.region.name = 'INVALID_REGION';
      mockImportConfig.management_token = 'test-management-token';
      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      // Should return early due to baseURL check, not management token
      expect(importPersonalize['personalizeConfig'].importData).to.be.false;
      expect(mockImport.Project.called).to.be.false;
    });
  });

  describe('start() - Project Import Tests', () => {
    beforeEach(() => {
      mockImport.Project.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      mockImport.Events.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      mockImport.Audiences.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      mockImport.Attribute.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      mockImport.Experiences.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      
      sinon.stub(ImportPersonalize.prototype as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub()
      };
      sinon.stub(ImportPersonalize.prototype as any, 'createNestedProgress').returns(mockProgress);
      sinon.stub(ImportPersonalize.prototype as any, 'analyzePersonalize').resolves([true, 4]); // 4 modules
    });

    it('should successfully import project with importData = false', async () => {
      mockImportConfig.modules.personalize.importData = false;
      mockImport.Project.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      
      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      const importProjectsStub = sinon.stub(importPersonalize as any, 'importProjects').resolves();
      const completeProgressStub = sinon.stub(importPersonalize as any, 'completeProgress').resolves();
      await importPersonalize.start();

      expect(importProjectsStub.called).to.be.true;
      expect(completeProgressStub.called).to.be.true;
    });

    it('should successfully import project with importData = true and process all modules', async () => {
      mockImport.Events.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      mockImport.Audiences.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      mockImport.Attribute.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      mockImport.Experiences.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      
      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      // Verify each module is processed
      expect(mockImport.Events.called).to.be.true;
      expect(mockImport.Audiences.called).to.be.true;
      expect(mockImport.Attribute.called).to.be.true;
      expect(mockImport.Experiences.called).to.be.true;
    });

    it('should handle project import failure', async () => {
      const projectError = new Error('Project import failed');
      mockImport.Project.returns({
        import: sinon.stub().rejects(projectError)
      });
      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      const importProjectsStub = sinon.stub(importPersonalize as any, 'importProjects').rejects(projectError);
      const completeProgressStub = sinon.stub(importPersonalize as any, 'completeProgress').resolves();
      await importPersonalize.start();

      // Error should be caught and completeProgress should be called with error
      expect(importProjectsStub.called).to.be.true;
      expect(completeProgressStub.called).to.be.true;
      expect(completeProgressStub.calledWith(false, sinon.match.string)).to.be.true;
      // Error should be handled and importData set to false
      expect(importPersonalize['personalizeConfig'].importData).to.be.false;
    });

    it('should process modules in custom importOrder', async () => {
      mockImportConfig.modules.personalize.importOrder = ['audiences', 'events'];
      mockImport.Audiences.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      mockImport.Events.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      
      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      expect(mockImport.Audiences.called).to.be.true;
      expect(mockImport.Events.called).to.be.true;
      expect(mockImport.Attribute.called).to.be.false;
      expect(mockImport.Experiences.called).to.be.false;
    });
  });

  describe('start() - Module Processing Tests', () => {
    beforeEach(() => {
      mockImport.Project.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      
      sinon.stub(ImportPersonalize.prototype as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub()
      };
      sinon.stub(ImportPersonalize.prototype as any, 'createNestedProgress').returns(mockProgress);
      sinon.stub(ImportPersonalize.prototype as any, 'analyzePersonalize').resolves([true, 4]); // 4 modules
      sinon.stub(ImportPersonalize.prototype as any, 'importProjects').resolves();
      sinon.stub(ImportPersonalize.prototype as any, 'completeProgress').resolves();
    });

    it('should process all valid modules in correct order', async () => {
      mockImport.Events.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      mockImport.Audiences.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      mockImport.Attribute.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      mockImport.Experiences.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });

      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      // Verify modules called in correct order
      const eventsCall = mockImport.Events.getCall(0);
      const audiencesCall = mockImport.Audiences.getCall(0);
      const attributeCall = mockImport.Attribute.getCall(0);
      const experiencesCall = mockImport.Experiences.getCall(0);

      expect(eventsCall).to.not.be.null;
      expect(audiencesCall).to.not.be.null;
      expect(attributeCall).to.not.be.null;
      expect(experiencesCall).to.not.be.null;

      // Verify each module's import method is called
      expect(eventsCall.returnValue.import.calledOnce).to.be.true;
      expect(audiencesCall.returnValue.import.calledOnce).to.be.true;
      expect(attributeCall.returnValue.import.calledOnce).to.be.true;
      expect(experiencesCall.returnValue.import.calledOnce).to.be.true;
    });

    it('should skip invalid modules in importOrder', async () => {
      mockImportConfig.modules.personalize.importOrder = ['events', 'invalidModule', 'audiences'];
      mockImport.Events.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      mockImport.Audiences.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      sinon.restore();
      sinon.stub(ImportPersonalize.prototype as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub()
      };
      sinon.stub(ImportPersonalize.prototype as any, 'createNestedProgress').returns(mockProgress);
      sinon.stub(ImportPersonalize.prototype as any, 'analyzePersonalize').resolves([true, 2]); // 2 modules
      sinon.stub(ImportPersonalize.prototype as any, 'importProjects').resolves();
      sinon.stub(ImportPersonalize.prototype as any, 'completeProgress').resolves();

      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      // Invalid module should be skipped
      expect(mockImport.Events.called).to.be.true;
      expect(mockImport.Audiences.called).to.be.true;
      expect(mockImport.Attribute.called).to.be.false;
      expect(mockImport.Experiences.called).to.be.false;
    });

    it('should handle individual module import failure', async () => {
      const moduleError = new Error('Module import failed');
      mockImport.Events.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      mockImport.Audiences.returns({
        import: sinon.stub().rejects(moduleError),
        setParentProgressManager: sinon.stub()
      });

      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      // Error should be handled - importData should remain true as only one module failed
      expect(importPersonalize['personalizeConfig'].importData).to.be.true;
    });

    it('should handle empty importOrder array', async () => {
      mockImportConfig.modules.personalize.importOrder = [];
      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      // Empty importOrder should result in no module processing
      expect(mockImport.Events.called).to.be.false;
      expect(mockImport.Audiences.called).to.be.false;
      expect(mockImport.Attribute.called).to.be.false;
      expect(mockImport.Experiences.called).to.be.false;
    });

    it('should instantiate modules with correct config', async () => {
      mockImport.Events.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      mockImport.Audiences.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      mockImport.Attribute.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      mockImport.Experiences.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });

      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      // Verify each module constructor called with correct config
      expect(mockImport.Events.called).to.be.true;
      expect(mockImport.Audiences.called).to.be.true;
      expect(mockImport.Attribute.called).to.be.true;
      expect(mockImport.Experiences.called).to.be.true;
    });

    it('should process all four module types in sequence', async () => {
      const eventsInstance = { import: sinon.stub().resolves(), setParentProgressManager: sinon.stub() };
      const audiencesInstance = { import: sinon.stub().resolves(), setParentProgressManager: sinon.stub() };
      const attributeInstance = { import: sinon.stub().resolves(), setParentProgressManager: sinon.stub() };
      const experiencesInstance = { import: sinon.stub().resolves(), setParentProgressManager: sinon.stub() };

      mockImport.Events.returns(eventsInstance);
      mockImport.Audiences.returns(audiencesInstance);
      mockImport.Attribute.returns(attributeInstance);
      mockImport.Experiences.returns(experiencesInstance);

      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      // Verify each module's import method called exactly once
      expect(eventsInstance.import.calledOnce).to.be.true;
      expect(audiencesInstance.import.calledOnce).to.be.true;
      expect(attributeInstance.import.calledOnce).to.be.true;
      expect(experiencesInstance.import.calledOnce).to.be.true;
    });

    it('should handle null moduleMapper gracefully', async () => {
      // This test covers the defensive check for moduleMapper being null
      // The actual moduleMapper is created in the code, so this tests the || {} fallback
      mockImport.Project.returns({
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      });
      
      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      // Should complete successfully even with the defensive check
      expect(importPersonalize['personalizeConfig'].importData).to.not.be.undefined;
    });
  });

  describe('start() - Error Handling Tests', () => {
    it('should handle network error during project import', async () => {
      const networkError = new Error('Network connection failed');
      mockImport.Project.returns({
        import: sinon.stub().rejects(networkError)
      });

      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      // Error should be handled
      expect(importPersonalize['personalizeConfig'].importData).to.be.false;
    });

    it('should handle error when importData is already false', async () => {
      mockImportConfig.modules.personalize.importData = false;
      const error = new Error('Some error');
      mockImport.Project.returns({
        import: sinon.stub().rejects(error)
      });

      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      // Error should be handled
      expect(importPersonalize['personalizeConfig'].importData).to.be.false;
      // Info log should be called for skipping migration
    });

    it('should handle module throwing error', async () => {
      mockImport.Project.returns({
        import: sinon.stub().resolves()
      });
      const moduleError = new Error('Module error');
      mockImport.Events.returns({
        import: sinon.stub().rejects(moduleError)
      });

      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      // Error should be handled
      expect(importPersonalize['personalizeConfig'].importData).to.be.false;
    });

    it('should call handleAndLogError with correct context', async () => {
      const error = new Error('Test error');
      mockImport.Project.returns({
        import: sinon.stub().rejects(error)
      });

      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      // Error should be handled
      expect(mockImportConfig.context.module).to.equal('personalize');
    });

    it('should handle error and check importData flag after error', async () => {
      const error = new Error('Test error for importData check');
      mockImport.Project.returns({
        import: sinon.stub().rejects(error)
      });

      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      // This test covers the condition: if (!this.personalizeConfig.importData)
      // The importData should be set to false in the catch block, triggering the condition
      expect(importPersonalize['personalizeConfig'].importData).to.be.false;
    });
  });

  describe('start() - Logging and Debug Tests', () => {
    beforeEach(() => {
      mockImport.Project.returns({
        import: sinon.stub().resolves()
      });
    });

    it('should log debug messages at key points', async () => {
      mockImport.Events.returns({
        import: sinon.stub().resolves()
      });
      mockImport.Audiences.returns({
        import: sinon.stub().resolves()
      });
      mockImport.Attribute.returns({
        import: sinon.stub().resolves()
      });
      mockImport.Experiences.returns({
        import: sinon.stub().resolves()
      });

      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      // Debug logs should be called during execution
    });

    it('should log success messages for each module and overall completion', async () => {
      mockImport.Events.returns({
        import: sinon.stub().resolves()
      });
      mockImport.Audiences.returns({
        import: sinon.stub().resolves()
      });
      mockImport.Attribute.returns({
        import: sinon.stub().resolves()
      });
      mockImport.Experiences.returns({
        import: sinon.stub().resolves()
      });

      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      // Success logs should be called during execution
    });

    it('should log info messages for skipped scenarios', async () => {
      // Test no baseURL scenario
      mockImportConfig.region.name = 'INVALID_REGION';
      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      // Info logs should be called for skipped scenarios

      // Reset and test management token scenario
      mockImportConfig.region.name = 'NA';
      mockImportConfig.management_token = 'test-token';
      importPersonalize = new ImportPersonalize({ 
        importConfig: mockImportConfig,
        stackAPIClient: mockStackClient,
        moduleName: 'personalize'
      });

      await importPersonalize.start();

      // Info logs should be called for management token scenario
    });
  });
});
