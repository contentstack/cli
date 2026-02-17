import { expect } from 'chai';
import sinon from 'sinon';
import { ImportConfig } from '../../../../src/types';

const mockImport = {
  VariantEntries: sinon.stub()
};

const mockVariantsModule = {
  Import: mockImport
};

const mockFsUtil = {
  readFile: sinon.stub(),
  makeDirectory: sinon.stub().resolves(),
  writeFile: sinon.stub()
};

const mockFileHelper = {
  fileExistsSync: sinon.stub()
};

const mockHelperMethods = {
  lookUpTerms: sinon.stub(),
  lookupAssets: sinon.stub(),
  lookupEntries: sinon.stub(),
  lookupExtension: sinon.stub(),
  restoreJsonRteEntryRefs: sinon.stub()
};

const mockUtilsModule = {
  lookUpTerms: mockHelperMethods.lookUpTerms,
  lookupAssets: mockHelperMethods.lookupAssets,
  lookupEntries: mockHelperMethods.lookupEntries,
  lookupExtension: mockHelperMethods.lookupExtension,
  restoreJsonRteEntryRefs: mockHelperMethods.restoreJsonRteEntryRefs,
  fsUtil: mockFsUtil,
  fileHelper: mockFileHelper,
  MODULE_CONTEXTS: {
    VARIANT_ENTRIES: 'variant-entries'
  },
  MODULE_NAMES: {
    'variant-entries': 'Variant Entries'
  },
  PROCESS_NAMES: {
    VARIANT_ENTRIES_IMPORT: 'Variant Entries Import'
  },
  PROCESS_STATUS: {
    'Variant Entries Import': {
      IMPORTING: 'Importing Variant Entries'
    }
  }
};

const Module = require('node:module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id: string) {
  if (id === '@contentstack/cli-variants') {
    return mockVariantsModule;
  }
  if (id === '../../utils') {
    return mockUtilsModule;
  }
  return originalRequire.apply(this, arguments);
};

// Now import the module while require mock is active
const ImportVariantEntries = require('../../../../src/import/modules/variant-entries').default;

Module.prototype.require = originalRequire;

describe('ImportVariantEntries', () => {
  let importVariantEntries: any;
  let mockImportConfig: ImportConfig;

  beforeEach(() => {
    mockImportConfig = {
      contentDir: '/test/backup',
      backupDir: '/test/backup',
      apiKey: 'test-api-key',
      context: {
        command: 'cm:stacks:import',
        module: '',
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-123',
        apiKey: 'test-api-key',
        orgId: 'org-123',
        authenticationMethod: 'Basic Auth'
      },
      modules: {
        personalize: {
          dirName: 'personalize',
          project_id: undefined
        }
      }
    } as any;

    // Reset all mocks
    mockImport.VariantEntries.reset();
    mockFsUtil.readFile.reset();
    mockFileHelper.fileExistsSync.reset();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      importVariantEntries = new ImportVariantEntries({ 
        importConfig: mockImportConfig
      });
      
      expect(importVariantEntries).to.be.instanceOf(ImportVariantEntries);
      expect(importVariantEntries['config']).to.equal(mockImportConfig);
      expect(importVariantEntries['personalize']).to.equal(mockImportConfig.modules.personalize);
    });

    it('should set context module to variant-entries', () => {
      importVariantEntries = new ImportVariantEntries({ 
        importConfig: mockImportConfig
      });
      
      expect(importVariantEntries['config'].context.module).to.equal('variant-entries');
    });

    it('should construct projectMapperFilePath correctly', () => {
      importVariantEntries = new ImportVariantEntries({ 
        importConfig: mockImportConfig
      });
      
      const expectedPath = '/test/backup/mapper/personalize/projects/projects.json';
      expect(importVariantEntries['projectMapperFilePath']).to.equal(expectedPath);
    });

    it('should handle different personalize dirName in path construction', () => {
      mockImportConfig.modules.personalize.dirName = 'custom-personalize';
      importVariantEntries = new ImportVariantEntries({ 
        importConfig: mockImportConfig
      });
      
      const expectedPath = '/test/backup/mapper/custom-personalize/projects/projects.json';
      expect(importVariantEntries['projectMapperFilePath']).to.equal(expectedPath);
    });
  });

  describe('start() - Early Exit Scenarios', () => {
    beforeEach(() => {
      importVariantEntries = new ImportVariantEntries({ 
        importConfig: mockImportConfig
      });
    });

    it('should return early when project mapper file does not exist', async () => {
      mockFileHelper.fileExistsSync.returns(false);

      await importVariantEntries.start();

      expect(mockFileHelper.fileExistsSync.calledWith('/test/backup/mapper/personalize/projects/projects.json')).to.be.true;
      expect(mockFsUtil.readFile.called).to.be.false;
      expect(mockImport.VariantEntries.called).to.be.false;
    });

    it('should return early when project file exists but has no uid', async () => {
      mockFileHelper.fileExistsSync.returns(true);
      mockFsUtil.readFile.returns({ name: 'Test Project' }); // No uid property

      await importVariantEntries.start();

      expect(mockFileHelper.fileExistsSync.calledWith('/test/backup/mapper/personalize/projects/projects.json')).to.be.true;
      expect(mockFsUtil.readFile.calledWith('/test/backup/mapper/personalize/projects/projects.json')).to.be.true;
      expect(mockImport.VariantEntries.called).to.be.false;
    });

    it('should return early when project file exists but uid is empty string', async () => {
      mockFileHelper.fileExistsSync.returns(true);
      mockFsUtil.readFile.returns({ uid: '', name: 'Test Project' });

      await importVariantEntries.start();

      expect(mockFileHelper.fileExistsSync.calledWith('/test/backup/mapper/personalize/projects/projects.json')).to.be.true;
      expect(mockFsUtil.readFile.calledWith('/test/backup/mapper/personalize/projects/projects.json')).to.be.true;
      expect(mockImport.VariantEntries.called).to.be.false;
    });

    it('should return early when project file exists but uid is null', async () => {
      mockFileHelper.fileExistsSync.returns(true);
      mockFsUtil.readFile.returns({ uid: null, name: 'Test Project' });

      await importVariantEntries.start();

      expect(mockFileHelper.fileExistsSync.calledWith('/test/backup/mapper/personalize/projects/projects.json')).to.be.true;
      expect(mockFsUtil.readFile.calledWith('/test/backup/mapper/personalize/projects/projects.json')).to.be.true;
      expect(mockImport.VariantEntries.called).to.be.false;
    });
  });

  describe('start() - Successful Import Flow', () => {
    let mockVariantEntriesInstance: any;

    beforeEach(() => {
      importVariantEntries = new ImportVariantEntries({ 
        importConfig: mockImportConfig
      });

      // analyzeVariantEntries checks for both project file and data file
      // fileExistsSync is called: 1) project file, 2) data file
      mockFileHelper.fileExistsSync.returns(true); // Both files exist
      mockFsUtil.readFile.returns({ uid: 'project-123', name: 'Test Project' });
      
      mockVariantEntriesInstance = {
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      };
      mockImport.VariantEntries.returns(mockVariantEntriesInstance);
      
      sinon.stub(importVariantEntries as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub()
      };
      sinon.stub(importVariantEntries as any, 'createNestedProgress').returns(mockProgress);
      sinon.stub(importVariantEntries as any, 'completeProgress').resolves();
    });

    it('should successfully import variant entries with valid project', async () => {
      await importVariantEntries.start();

      // Verify file existence check
      expect(mockFileHelper.fileExistsSync.calledWith('/test/backup/mapper/personalize/projects/projects.json')).to.be.true;
      
      // Verify project data is read
      expect(mockFsUtil.readFile.calledWith('/test/backup/mapper/personalize/projects/projects.json')).to.be.true;
      
      // Verify project_id is set
      expect(importVariantEntries['config'].modules.personalize.project_id).to.equal('project-123');
      
      // Verify VariantEntries instance is created with merged config
      expect(mockImport.VariantEntries.calledOnce).to.be.true;
      const constructorArgs = mockImport.VariantEntries.getCall(0).args[0];
      expect(constructorArgs).to.include.keys('helpers');
      expect(constructorArgs.helpers).to.include.keys('lookUpTerms', 'lookupAssets', 'lookupEntries', 'lookupExtension', 'restoreJsonRteEntryRefs');
      
      // Verify import method is called
      expect(mockVariantEntriesInstance.import.calledOnce).to.be.true;
    });

    it('should create helpers config with all required methods', async () => {
      await importVariantEntries.start();

      const constructorArgs = mockImport.VariantEntries.getCall(0).args[0];
      const helpers = constructorArgs.helpers;
      
      expect(helpers.lookUpTerms).to.equal(mockHelperMethods.lookUpTerms);
      expect(helpers.lookupAssets).to.equal(mockHelperMethods.lookupAssets);
      expect(helpers.lookupEntries).to.equal(mockHelperMethods.lookupEntries);
      expect(helpers.lookupExtension).to.equal(mockHelperMethods.lookupExtension);
      expect(helpers.restoreJsonRteEntryRefs).to.equal(mockHelperMethods.restoreJsonRteEntryRefs);
    });

    it('should merge config with helpers using Object.assign', async () => {
      await importVariantEntries.start();

      const constructorArgs = mockImport.VariantEntries.getCall(0).args[0];
      
      // Verify original config properties are preserved
      expect(constructorArgs.contentDir).to.equal('/test/backup');
      expect(constructorArgs.apiKey).to.equal('test-api-key');
      expect(constructorArgs.context).to.deep.equal(mockImportConfig.context);
      
      // Verify helpers are added
      expect(constructorArgs.helpers).to.be.an('object');
    });
  });

  describe('start() - Error Handling', () => {
    beforeEach(() => {
      importVariantEntries = new ImportVariantEntries({ 
        importConfig: mockImportConfig
      });
    });

    it('should handle error when fsUtil.readFile throws', async () => {
      mockFileHelper.fileExistsSync.returns(true);
      const readFileError = new Error('File read error');
      mockFsUtil.readFile.throws(readFileError);

      await importVariantEntries.start();

      // The error should be caught and handled by the try-catch block
      expect(mockFileHelper.fileExistsSync.called).to.be.true;
      expect(mockFsUtil.readFile.called).to.be.true;
    });

    it('should handle error when Import.VariantEntries constructor throws', async () => {
      importVariantEntries = new ImportVariantEntries({ 
        importConfig: mockImportConfig
      });
      
      // analyzeVariantEntries checks for both project file and data file
      mockFileHelper.fileExistsSync.returns(true); // Both files exist
      mockFsUtil.readFile.returns({ uid: 'project-123', name: 'Test Project' });
      
      const constructorError = new Error('VariantEntries constructor error');
      mockImport.VariantEntries.throws(constructorError);
      
      sinon.stub(importVariantEntries as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub()
      };
      sinon.stub(importVariantEntries as any, 'createNestedProgress').returns(mockProgress);
      const completeProgressStub = sinon.stub(importVariantEntries as any, 'completeProgress').resolves();

      await importVariantEntries.start();

      // The error should be caught and handled by the try-catch block
      expect(mockFileHelper.fileExistsSync.called).to.be.true;
      expect(mockFsUtil.readFile.called).to.be.true;
      expect(mockImport.VariantEntries.called).to.be.true;
      expect(completeProgressStub.calledWith(false, sinon.match.string)).to.be.true;
    });

    it('should handle error when variantEntriesImporter.import() rejects', async () => {
      importVariantEntries = new ImportVariantEntries({ 
        importConfig: mockImportConfig
      });
      
      // analyzeVariantEntries checks for both project file and data file
      mockFileHelper.fileExistsSync.returns(true); // Both files exist
      mockFsUtil.readFile.returns({ uid: 'project-123', name: 'Test Project' });
      
      const importError = new Error('Import failed');
      const mockVariantEntriesInstance = {
        import: sinon.stub().rejects(importError),
        setParentProgressManager: sinon.stub()
      };
      mockImport.VariantEntries.returns(mockVariantEntriesInstance);
      
      sinon.stub(importVariantEntries as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub()
      };
      sinon.stub(importVariantEntries as any, 'createNestedProgress').returns(mockProgress);
      const completeProgressStub = sinon.stub(importVariantEntries as any, 'completeProgress').resolves();

      await importVariantEntries.start();

      // The error should be caught and handled by the try-catch block
      expect(mockFileHelper.fileExistsSync.called).to.be.true;
      expect(mockFsUtil.readFile.called).to.be.true;
      expect(mockImport.VariantEntries.called).to.be.true;
      expect(mockVariantEntriesInstance.import.called).to.be.true;
      expect(completeProgressStub.calledWith(false, sinon.match.string)).to.be.true;
    });
  });

  describe('Helper Methods Configuration', () => {
    beforeEach(() => {
      importVariantEntries = new ImportVariantEntries({ 
        importConfig: mockImportConfig
      });
      // analyzeVariantEntries checks for both project file and data file
      mockFileHelper.fileExistsSync.returns(true); // Both files exist
      mockFsUtil.readFile.returns({ uid: 'project-123', name: 'Test Project' });
      
      sinon.stub(importVariantEntries as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub()
      };
      sinon.stub(importVariantEntries as any, 'createNestedProgress').returns(mockProgress);
      sinon.stub(importVariantEntries as any, 'completeProgress').resolves();
    });

    it('should include all 5 required helper methods in config', async () => {
      const mockVariantEntriesInstance = {
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      };
      mockImport.VariantEntries.returns(mockVariantEntriesInstance);

      await importVariantEntries.start();

      const constructorArgs = mockImport.VariantEntries.getCall(0).args[0];
      const helpers = constructorArgs.helpers;
      
      expect(helpers).to.have.property('lookUpTerms');
      expect(helpers).to.have.property('lookupAssets');
      expect(helpers).to.have.property('lookupEntries');
      expect(helpers).to.have.property('lookupExtension');
      expect(helpers).to.have.property('restoreJsonRteEntryRefs');
    });

    it('should assign correct helper function references', async () => {
      const mockVariantEntriesInstance = {
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      };
      mockImport.VariantEntries.returns(mockVariantEntriesInstance);

      await importVariantEntries.start();

      const constructorArgs = mockImport.VariantEntries.getCall(0).args[0];
      const helpers = constructorArgs.helpers;
      
      // Verify each helper is the actual function from utils
      expect(helpers.lookUpTerms).to.equal(mockHelperMethods.lookUpTerms);
      expect(helpers.lookupAssets).to.equal(mockHelperMethods.lookupAssets);
      expect(helpers.lookupEntries).to.equal(mockHelperMethods.lookupEntries);
      expect(helpers.lookupExtension).to.equal(mockHelperMethods.lookupExtension);
      expect(helpers.restoreJsonRteEntryRefs).to.equal(mockHelperMethods.restoreJsonRteEntryRefs);
    });

    it('should create helpers object with correct structure', async () => {
      const mockVariantEntriesInstance = {
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      };
      mockImport.VariantEntries.returns(mockVariantEntriesInstance);

      await importVariantEntries.start();

      const constructorArgs = mockImport.VariantEntries.getCall(0).args[0];
      const helpers = constructorArgs.helpers;
      
      // Verify helpers is an object
      expect(helpers).to.be.an('object');
      expect(helpers).to.not.be.null;
      
      // Verify it has exactly 5 properties
      const helperKeys = Object.keys(helpers);
      expect(helperKeys).to.have.length(5);
    });

    it('should pass helpers as part of merged config to VariantEntries', async () => {
      const mockVariantEntriesInstance = {
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      };
      mockImport.VariantEntries.returns(mockVariantEntriesInstance);

      await importVariantEntries.start();

      const constructorArgs = mockImport.VariantEntries.getCall(0).args[0];
      
      // Verify helpers is included in the merged config
      expect(constructorArgs).to.have.property('helpers');
      expect(constructorArgs.helpers).to.be.an('object');
      
      // Verify other config properties are still present
      expect(constructorArgs).to.have.property('contentDir');
      expect(constructorArgs).to.have.property('apiKey');
      expect(constructorArgs).to.have.property('context');
    });

    it('should maintain helper function integrity during config merge', async () => {
      const mockVariantEntriesInstance = {
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      };
      mockImport.VariantEntries.returns(mockVariantEntriesInstance);

      await importVariantEntries.start();

      const constructorArgs = mockImport.VariantEntries.getCall(0).args[0];
      const helpers = constructorArgs.helpers;
      
      // Verify each helper is a function (not undefined or null)
      expect(helpers.lookUpTerms).to.be.a('function');
      expect(helpers.lookupAssets).to.be.a('function');
      expect(helpers.lookupEntries).to.be.a('function');
      expect(helpers.lookupExtension).to.be.a('function');
      expect(helpers.restoreJsonRteEntryRefs).to.be.a('function');
    });
  });

  describe('Path Construction & Data Flow', () => {
    beforeEach(() => {
      importVariantEntries = new ImportVariantEntries({ 
        importConfig: mockImportConfig
      });
      
      // analyzeVariantEntries checks for both project file and data file
      mockFileHelper.fileExistsSync.returns(true); // Both files exist
      mockFsUtil.readFile.returns({ uid: 'project-123', name: 'Test Project' });
      
      sinon.stub(importVariantEntries as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      const mockProgress = {
        addProcess: sinon.stub(),
        startProcess: sinon.stub().returns({ updateStatus: sinon.stub() }),
        completeProcess: sinon.stub(),
        updateStatus: sinon.stub(),
        tick: sinon.stub()
      };
      sinon.stub(importVariantEntries as any, 'createNestedProgress').returns(mockProgress);
      sinon.stub(importVariantEntries as any, 'completeProgress').resolves();
    });

    it('should construct projectMapperFilePath using correct path structure', () => {
      const expectedPath = '/test/backup/mapper/personalize/projects/projects.json';
      expect(importVariantEntries['projectMapperFilePath']).to.equal(expectedPath);
    });

    it('should handle different data paths in projectMapperFilePath construction', () => {
      const customConfig = {
        ...mockImportConfig,
        backupDir: '/custom/backup/path'
      };
      const customImportVariantEntries = new ImportVariantEntries({ 
        importConfig: customConfig
      });
      
      const expectedPath = '/custom/backup/path/mapper/personalize/projects/projects.json';
      expect(customImportVariantEntries['projectMapperFilePath']).to.equal(expectedPath);
    });

    it('should handle different personalize dirName in path construction', () => {
      const customConfig = {
        ...mockImportConfig,
        modules: {
          ...mockImportConfig.modules,
          personalize: {
            ...mockImportConfig.modules.personalize,
            dirName: 'custom-personalize'
          }
        }
      };
      const customImportVariantEntries = new ImportVariantEntries({ 
        importConfig: customConfig
      });
      
      const expectedPath = '/test/backup/mapper/custom-personalize/projects/projects.json';
      expect(customImportVariantEntries['projectMapperFilePath']).to.equal(expectedPath);
    });

    it('should verify config mutation during successful import', async () => {
      // analyzeVariantEntries checks for both project file and data file
      mockFileHelper.fileExistsSync.returns(true); // Both files exist
      mockFsUtil.readFile.returns({ uid: 'project-123', name: 'Test Project' });
      
      const mockVariantEntriesInstance = {
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      };
      mockImport.VariantEntries.returns(mockVariantEntriesInstance);

      // Verify project_id is initially undefined
      expect(importVariantEntries['config'].modules.personalize.project_id).to.be.undefined;

      await importVariantEntries.start();

      // Verify project_id is set after successful import
      expect(importVariantEntries['config'].modules.personalize.project_id).to.equal('project-123');
    });

    it('should verify Object.assign merges config with helpers correctly', async () => {
      // analyzeVariantEntries checks for both project file and data file
      mockFileHelper.fileExistsSync.returns(true); // Both files exist
      mockFsUtil.readFile.returns({ uid: 'project-123', name: 'Test Project' });
      
      const mockVariantEntriesInstance = {
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      };
      mockImport.VariantEntries.returns(mockVariantEntriesInstance);

      await importVariantEntries.start();

      const constructorArgs = mockImport.VariantEntries.getCall(0).args[0];
      
      // Verify original config properties are preserved
      expect(constructorArgs.data).to.equal(mockImportConfig.data);
      expect(constructorArgs.apiKey).to.equal(mockImportConfig.apiKey);
      expect(constructorArgs.context).to.deep.equal(mockImportConfig.context);
      expect(constructorArgs.modules).to.deep.equal(mockImportConfig.modules);
      
      // Verify helpers are added as a new property
      expect(constructorArgs.helpers).to.be.an('object');
      expect(constructorArgs.helpers).to.not.be.undefined;
    });

    it('should verify complete data flow from file read to VariantEntries creation', async () => {
      const mockProjectData = { uid: 'project-456', name: 'Test Project 2' };
      // analyzeVariantEntries checks for both project file and data file
      mockFileHelper.fileExistsSync.returns(true); // Both files exist
      mockFsUtil.readFile.returns(mockProjectData);
      
      const mockVariantEntriesInstance = {
        import: sinon.stub().resolves(),
        setParentProgressManager: sinon.stub()
      };
      mockImport.VariantEntries.returns(mockVariantEntriesInstance);

      await importVariantEntries.start();

      // Verify file operations
      expect(mockFileHelper.fileExistsSync.calledWith('/test/backup/mapper/personalize/projects/projects.json')).to.be.true;
      expect(mockFsUtil.readFile.calledWith('/test/backup/mapper/personalize/projects/projects.json')).to.be.true;
      
      // Verify config mutation
      expect(importVariantEntries['config'].modules.personalize.project_id).to.equal('project-456');
      
      // Verify VariantEntries creation with merged config
      expect(mockImport.VariantEntries.calledOnce).to.be.true;
      const constructorArgs = mockImport.VariantEntries.getCall(0).args[0];
      expect(constructorArgs.helpers).to.be.an('object');
      expect(constructorArgs.modules.personalize.project_id).to.equal('project-456');
      
      // Verify import method call
      expect(mockVariantEntriesInstance.import.calledOnce).to.be.true;
    });

    it('should verify context module is set correctly throughout the flow', async () => {
      mockFileHelper.fileExistsSync.returns(true);
      mockFsUtil.readFile.returns({ uid: 'project-123', name: 'Test Project' });
      
      const mockVariantEntriesInstance = {
        import: sinon.stub().resolves()
      };
      mockImport.VariantEntries.returns(mockVariantEntriesInstance);

      await importVariantEntries.start();

      // Verify context module is set to 'variant-entries' throughout
      expect(importVariantEntries['config'].context.module).to.equal('variant-entries');
    });
  });
});