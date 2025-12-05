import { expect } from 'chai';
import sinon from 'sinon';
import { handleAndLogError, messageHandler } from '@contentstack/cli-utilities';
import * as utilities from '@contentstack/cli-utilities';
import ExportPersonalize from '../../../../src/export/modules/personalize';
import ExportConfig from '../../../../src/types/export-config';
import * as variants from '@contentstack/cli-variants';

describe('ExportPersonalize', () => {
  let exportPersonalize: any;
  let mockExportConfig: ExportConfig;
  let mockExportProjects: any;
  let mockExportEvents: any;
  let mockExportAttributes: any;
  let mockExportAudiences: any;
  let mockExportExperiences: any;

  beforeEach(() => {
    mockExportConfig = {
      contentVersion: 1,
      versioning: false,
      host: 'https://api.contentstack.io',
      developerHubUrls: {},
      apiKey: 'test-api-key',
      exportDir: '/test/export',
      data: '/test/data',
      branchName: '',
      context: {
        command: 'cm:stacks:export',
        module: 'personalize',
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-123',
        apiKey: 'test-api-key',
        orgId: 'org-123',
        authenticationMethod: 'Basic Auth'
      },
      cliLogsPath: '/test/logs',
      forceStopMarketplaceAppsPrompt: false,
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
      apis: {},
      preserveStackVersion: false,
      personalizationEnabled: true,
      fetchConcurrency: 5,
      writeConcurrency: 5,
      developerHubBaseUrl: '',
      marketplaceAppEncryptionKey: '',
      onlyTSModules: [],
      modules: {
        types: ['personalize'],
        personalize: {
          dirName: 'personalize',
          baseURL: {
            'AWS-NA': 'https://personalize-api.contentstack.com',
            'AWS-EU': 'https://eu-personalize-api.contentstack.com',
            'AWS-AU': 'https://au-personalize-api.contentstack.com',
            'AZURE-NA': 'https://azure-na-personalize-api.contentstack.com',
            'AZURE-EU': 'https://azure-eu-personalize-api.contentstack.com',
            'GCP-NA': 'https://gcp-na-personalize-api.contentstack.com',
            'GCP-EU': 'https://gcp-eu-personalize-api.contentstack.com',
            'us': 'https://personalize-api.contentstack.com'
          },
          exportOrder: ['events', 'attributes', 'audiences', 'experiences'],
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
            thresholdTimer: 60000,
            checkIntervalDuration: 10000
          }
        }
      },
      management_token: undefined
    } as any;

    // Mock ExportProjects - this can modify personalizationEnabled
    mockExportProjects = {
      start: sinon.stub().callsFake(async () => {
        // Simulate ExportProjects behavior: it may set personalizationEnabled based on project existence
        // For most tests, we'll keep it true, but can be changed per test
        return Promise.resolve();
      })
    };

    // Mock ExportEvents
    mockExportEvents = {
      start: sinon.stub().resolves()
    };

    // Mock ExportAttributes
    mockExportAttributes = {
      start: sinon.stub().resolves()
    };

    // Mock ExportAudiences
    mockExportAudiences = {
      start: sinon.stub().resolves()
    };

    // Mock ExportExperiences
    mockExportExperiences = {
      start: sinon.stub().resolves()
    };

    // Stub the variant class constructors - these need to return the mock instances
    sinon.stub(variants, 'ExportProjects').value(function() { return mockExportProjects; } as any);
    sinon.stub(variants, 'ExportEvents').value(function() { return mockExportEvents; } as any);
    sinon.stub(variants, 'ExportAttributes').value(function() { return mockExportAttributes; } as any);
    sinon.stub(variants, 'ExportAudiences').value(function() { return mockExportAudiences; } as any);
    sinon.stub(variants, 'ExportExperiences').value(function() { return mockExportExperiences; } as any);

    exportPersonalize = new ExportPersonalize({
      exportConfig: mockExportConfig,
      stackAPIClient: {} as any,
      moduleName: 'personalize'
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with exportConfig and set context module', () => {
      expect(exportPersonalize).to.be.instanceOf(ExportPersonalize);
      expect(exportPersonalize.exportConfig).to.equal(mockExportConfig);
      expect(exportPersonalize.exportConfig.context.module).to.equal('personalize');
    });

    it('should initialize personalizeConfig from exportConfig modules', () => {
      expect(exportPersonalize.personalizeConfig).to.exist;
      expect(exportPersonalize.personalizeConfig.dirName).to.equal('personalize');
      expect(exportPersonalize.personalizeConfig.baseURL).to.deep.equal(mockExportConfig.modules.personalize.baseURL);
      expect(exportPersonalize.personalizeConfig.exportOrder).to.deep.equal(['events', 'attributes', 'audiences', 'experiences']);
    });
  });

  describe('start() method - Early Return Conditions', () => {
    it('should set personalizationEnabled to false and return early when baseURL is not configured for region', async () => {
      const originalValue = mockExportConfig.personalizationEnabled;
      mockExportConfig.region.name = 'invalid-region';
      exportPersonalize = new ExportPersonalize({
        exportConfig: mockExportConfig,
        stackAPIClient: {} as any,
        moduleName: 'personalize'
      });

      await exportPersonalize.start();

      // Should set personalizationEnabled to false
      expect(mockExportConfig.personalizationEnabled).to.be.false;
      // Should not proceed with ExportProjects
      expect(mockExportProjects.start.called).to.be.false;
      // Should not process any modules
      expect(mockExportEvents.start.called).to.be.false;
    });

    it('should set personalizationEnabled to false and return early when management_token is present', async () => {
      mockExportConfig.management_token = 'test-management-token';
      const originalValue = mockExportConfig.personalizationEnabled;

      await exportPersonalize.start();

      // Should set personalizationEnabled to false
      expect(mockExportConfig.personalizationEnabled).to.be.false;
      // Should not proceed with ExportProjects
      expect(mockExportProjects.start.called).to.be.false;
      // Should not process any modules
      expect(mockExportEvents.start.called).to.be.false;
    });

    it('should proceed when baseURL is configured for the region', async () => {
      mockExportConfig.region.name = 'us';
      exportPersonalize = new ExportPersonalize({
        exportConfig: mockExportConfig,
        stackAPIClient: {} as any,
        moduleName: 'personalize'
      });

      await exportPersonalize.start();

      // Should proceed with ExportProjects
      expect(mockExportProjects.start.calledOnce).to.be.true;
    });
  });

  describe('start() method - ExportProjects Integration', () => {
    it('should skip module processing when ExportProjects disables personalization (no projects found)', async () => {
      // Simulate ExportProjects finding no projects - sets personalizationEnabled to false
      mockExportProjects.start.callsFake(async () => {
        mockExportConfig.personalizationEnabled = false;
      });

      await exportPersonalize.start();

      expect(mockExportProjects.start.calledOnce).to.be.true;
      // Verify the state change: personalizationEnabled was set to false by ExportProjects
      expect(mockExportConfig.personalizationEnabled).to.be.false;
      // Verify the behavioral outcome: no modules were processed due to the state change
      // This is the key behavior - the state change controls module processing
      expect(mockExportEvents.start.called).to.be.false;
      expect(mockExportAttributes.start.called).to.be.false;
      expect(mockExportAudiences.start.called).to.be.false;
      expect(mockExportExperiences.start.called).to.be.false;
    });

    it('should process all modules in exportOrder when ExportProjects enables personalization (projects found)', async () => {
      // Simulate ExportProjects finding projects - sets personalizationEnabled to true
      mockExportProjects.start.callsFake(async () => {
        mockExportConfig.personalizationEnabled = true;
      });

      await exportPersonalize.start();

      expect(mockExportProjects.start.calledOnce).to.be.true;
      // Verify the state: personalizationEnabled is true after ExportProjects
      expect(mockExportConfig.personalizationEnabled).to.be.true;
      // Verify the behavioral outcome: all modules in exportOrder were processed
      // This demonstrates that the state change (true) triggers module processing
      expect(mockExportEvents.start.calledOnce).to.be.true;
      expect(mockExportAttributes.start.calledOnce).to.be.true;
      expect(mockExportAudiences.start.calledOnce).to.be.true;
      expect(mockExportExperiences.start.calledOnce).to.be.true;
    });

    it('should respect personalizationEnabled state set by ExportProjects regardless of initial value', async () => {
      // Test that ExportProjects has the authority to change the state and that change affects behavior
      mockExportConfig.personalizationEnabled = false; // Start with false
      mockExportProjects.start.callsFake(async () => {
        // ExportProjects finds projects and enables personalization
        mockExportConfig.personalizationEnabled = true;
      });

      await exportPersonalize.start();

      // Verify ExportProjects changed the state from false to true
      // This tests that ExportProjects can override the initial state
      expect(mockExportConfig.personalizationEnabled).to.be.true;
      // Verify the behavioral consequence: modules were processed because state changed to true
      // This demonstrates the state-driven behavior, not just function calls
      expect(mockExportEvents.start.calledOnce).to.be.true;
      expect(mockExportAttributes.start.calledOnce).to.be.true;
      expect(mockExportAudiences.start.calledOnce).to.be.true;
      expect(mockExportExperiences.start.calledOnce).to.be.true;
    });
  });

  describe('start() method - Module Processing Order', () => {
    beforeEach(() => {
      // Ensure personalizationEnabled stays true
      mockExportProjects.start.callsFake(async () => {
        mockExportConfig.personalizationEnabled = true;
      });
    });

    it('should process modules in the order specified by exportOrder', async () => {
      mockExportConfig.modules.personalize.exportOrder = ['events', 'attributes', 'audiences', 'experiences'];
      const executionOrder: string[] = [];

      mockExportEvents.start.callsFake(async () => {
        executionOrder.push('events');
        expect(executionOrder).to.deep.equal(['events']);
      });
      mockExportAttributes.start.callsFake(async () => {
        executionOrder.push('attributes');
        expect(executionOrder).to.deep.equal(['events', 'attributes']);
      });
      mockExportAudiences.start.callsFake(async () => {
        executionOrder.push('audiences');
        expect(executionOrder).to.deep.equal(['events', 'attributes', 'audiences']);
      });
      mockExportExperiences.start.callsFake(async () => {
        executionOrder.push('experiences');
        expect(executionOrder).to.deep.equal(['events', 'attributes', 'audiences', 'experiences']);
      });

      await exportPersonalize.start();

      expect(executionOrder).to.deep.equal(['events', 'attributes', 'audiences', 'experiences']);
    });

    it('should process modules sequentially, not in parallel', async () => {
      let currentModule: string | null = null;
      const moduleStartTimes: Record<string, number> = {};

      mockExportEvents.start.callsFake(async () => {
        expect(currentModule).to.be.null;
        currentModule = 'events';
        moduleStartTimes.events = Date.now();
        await new Promise(resolve => setTimeout(resolve, 10));
        currentModule = null;
      });
      mockExportAttributes.start.callsFake(async () => {
        expect(currentModule).to.be.null;
        currentModule = 'attributes';
        moduleStartTimes.attributes = Date.now();
        await new Promise(resolve => setTimeout(resolve, 10));
        currentModule = null;
      });
      mockExportAudiences.start.callsFake(async () => {
        expect(currentModule).to.be.null;
        currentModule = 'audiences';
        moduleStartTimes.audiences = Date.now();
        await new Promise(resolve => setTimeout(resolve, 10));
        currentModule = null;
      });
      mockExportExperiences.start.callsFake(async () => {
        expect(currentModule).to.be.null;
        currentModule = 'experiences';
        moduleStartTimes.experiences = Date.now();
        await new Promise(resolve => setTimeout(resolve, 10));
        currentModule = null;
      });

      await exportPersonalize.start();

      // Verify sequential execution (each starts after previous completes)
      expect(moduleStartTimes.attributes).to.be.greaterThan(moduleStartTimes.events);
      expect(moduleStartTimes.audiences).to.be.greaterThan(moduleStartTimes.attributes);
      expect(moduleStartTimes.experiences).to.be.greaterThan(moduleStartTimes.audiences);
    });

    it('should handle custom exportOrder configuration', async () => {
      mockExportConfig.modules.personalize.exportOrder = ['experiences', 'events', 'audiences', 'attributes'];
      const executionOrder: string[] = [];

      mockExportExperiences.start.callsFake(async () => {
        executionOrder.push('experiences');
      });
      mockExportEvents.start.callsFake(async () => {
        executionOrder.push('events');
      });
      mockExportAudiences.start.callsFake(async () => {
        executionOrder.push('audiences');
      });
      mockExportAttributes.start.callsFake(async () => {
        executionOrder.push('attributes');
      });

      await exportPersonalize.start();

      expect(executionOrder).to.deep.equal(['experiences', 'events', 'audiences', 'attributes']);
    });
  });

  describe('start() method - Unknown Module Handling', () => {
    beforeEach(() => {
      mockExportProjects.start.callsFake(async () => {
        mockExportConfig.personalizationEnabled = true;
      });
    });

    it('should skip unknown modules in exportOrder but continue with valid ones', async () => {
      mockExportConfig.modules.personalize.exportOrder = ['events', 'unknown-module', 'attributes', 'another-unknown'];
      const executedModules: string[] = [];

      mockExportEvents.start.callsFake(async () => {
        executedModules.push('events');
      });
      mockExportAttributes.start.callsFake(async () => {
        executedModules.push('attributes');
      });

      await exportPersonalize.start();

      // Should execute valid modules
      expect(executedModules).to.include('events');
      expect(executedModules).to.include('attributes');
      // Should not throw error for unknown modules
      expect(mockExportEvents.start.calledOnce).to.be.true;
      expect(mockExportAttributes.start.calledOnce).to.be.true;
    });

    it('should handle exportOrder with only unknown modules gracefully without throwing errors', async () => {
      // Setup: ExportProjects enables personalization, but exportOrder contains only unknown modules
      mockExportProjects.start.callsFake(async () => {
        mockExportConfig.personalizationEnabled = true;
      });
      mockExportConfig.modules.personalize.exportOrder = ['unknown-1', 'unknown-2'];

      // Should complete without throwing errors
      let errorThrown = false;
      try {
        await exportPersonalize.start();
      } catch (error) {
        errorThrown = true;
      }
      expect(errorThrown).to.be.false;

      // Verify ExportProjects completed successfully
      expect(mockExportProjects.start.calledOnce).to.be.true;
      // Verify personalizationEnabled remains true (no error occurred)
      expect(mockExportConfig.personalizationEnabled).to.be.true;
      // Verify no known modules were processed (since exportOrder only had unknown modules)
      expect(mockExportEvents.start.called).to.be.false;
      expect(mockExportAttributes.start.called).to.be.false;
      expect(mockExportAudiences.start.called).to.be.false;
      expect(mockExportExperiences.start.called).to.be.false;
      // The key behavior: unknown modules are skipped gracefully, process completes successfully
    });
  });

  describe('start() method - Error Handling', () => {
    it('should set personalizationEnabled to false and handle Forbidden error specially', async () => {
      mockExportProjects.start.rejects('Forbidden');
      const originalValue = mockExportConfig.personalizationEnabled;

      await exportPersonalize.start();

      // Should set personalizationEnabled to false
      expect(mockExportConfig.personalizationEnabled).to.be.false;
      // Should not process modules
      expect(mockExportEvents.start.called).to.be.false;
    });

    it('should set personalizationEnabled to false and call handleAndLogError for non-Forbidden errors', async () => {
      const testError = new Error('API Connection Error');
      mockExportProjects.start.rejects(testError);
      const handleAndLogErrorSpy = sinon.spy();
      sinon.replaceGetter(utilities, 'handleAndLogError', () => handleAndLogErrorSpy);

      await exportPersonalize.start();

      // Should set personalizationEnabled to false
      expect(mockExportConfig.personalizationEnabled).to.be.false;
      // Should call handleAndLogError with the error and context
      expect(handleAndLogErrorSpy.calledOnce).to.be.true;
      expect(handleAndLogErrorSpy.getCall(0).args[0]).to.equal(testError);
      expect(handleAndLogErrorSpy.getCall(0).args[1]).to.deep.include(mockExportConfig.context);
    });

    it('should set personalizationEnabled to false when module processing fails', async () => {
      mockExportProjects.start.callsFake(async () => {
        mockExportConfig.personalizationEnabled = true;
      });
      const moduleError = new Error('Events export failed');
      mockExportEvents.start.rejects(moduleError);
      const handleAndLogErrorSpy = sinon.spy();
      sinon.replaceGetter(utilities, 'handleAndLogError', () => handleAndLogErrorSpy);

      try {
        await exportPersonalize.start();
      } catch (error) {
        // Error may propagate
      }

      // Should set personalizationEnabled to false on error
      expect(mockExportConfig.personalizationEnabled).to.be.false;
    });

    it('should handle errors in ExportProjects and prevent module processing', async () => {
      const projectsError = new Error('Projects export failed');
      mockExportProjects.start.rejects(projectsError);
      const handleAndLogErrorSpy = sinon.spy();
      sinon.replaceGetter(utilities, 'handleAndLogError', () => handleAndLogErrorSpy);

      await exportPersonalize.start();

      // Should not process modules after error
      expect(mockExportEvents.start.called).to.be.false;
      expect(mockExportAttributes.start.called).to.be.false;
      expect(mockExportConfig.personalizationEnabled).to.be.false;
    });
  });

  describe('start() method - Region Configuration', () => {
    it('should work with all supported region names', async () => {
      const supportedRegions = ['AWS-NA', 'AWS-EU', 'AWS-AU', 'AZURE-NA', 'AZURE-EU', 'GCP-NA', 'GCP-EU', 'us'];
      
      for (const regionName of supportedRegions) {
        mockExportConfig.region.name = regionName;
        exportPersonalize = new ExportPersonalize({
          exportConfig: mockExportConfig,
          stackAPIClient: {} as any,
          moduleName: 'personalize'
        });

        mockExportProjects.start.resetHistory();

        await exportPersonalize.start();

        // Should proceed with ExportProjects for all supported regions
        expect(mockExportProjects.start.calledOnce, `Should work for region: ${regionName}`).to.be.true;
      }
    });
  });

  describe('start() method - Complete Flow', () => {
    it('should complete full export flow successfully when all conditions are met', async () => {
      mockExportProjects.start.callsFake(async () => {
        mockExportConfig.personalizationEnabled = true;
      });
      
      // Track execution order to verify sequential processing
      const executionOrder: string[] = [];
      mockExportEvents.start.callsFake(async () => {
        executionOrder.push('events');
        return Promise.resolve();
      });
      mockExportAttributes.start.callsFake(async () => {
        executionOrder.push('attributes');
        return Promise.resolve();
      });
      mockExportAudiences.start.callsFake(async () => {
        executionOrder.push('audiences');
        return Promise.resolve();
      });
      mockExportExperiences.start.callsFake(async () => {
        executionOrder.push('experiences');
        return Promise.resolve();
      });

      // Execute the full flow
      await exportPersonalize.start();

      expect(mockExportProjects.start.calledOnce).to.be.true;
      // Verify all modules were processed in the correct order
      expect(executionOrder).to.deep.equal(['events', 'attributes', 'audiences', 'experiences']);
      expect(mockExportEvents.start.calledOnce).to.be.true;
      expect(mockExportAttributes.start.calledOnce).to.be.true;
      expect(mockExportAudiences.start.calledOnce).to.be.true;
      expect(mockExportExperiences.start.calledOnce).to.be.true;
      expect(mockExportConfig.personalizationEnabled).to.be.true;
    });

    it('should handle partial module failures: stop processing, log error, and disable personalization', async () => {
      // Setup: ExportProjects enables personalization, first module succeeds, second fails
      mockExportProjects.start.callsFake(async () => {
        mockExportConfig.personalizationEnabled = true;
      });
      
      const attributesError = new Error('Attributes export failed');
      mockExportEvents.start.resolves();
      mockExportAttributes.start.rejects(attributesError);
      
      const handleAndLogErrorSpy = sinon.spy();
      sinon.replaceGetter(utilities, 'handleAndLogError', () => handleAndLogErrorSpy);

      try {
        await exportPersonalize.start();
      } catch (error) {
        // Error may propagate, but should be handled in catch block
      }

      // Verify ExportProjects completed
      expect(mockExportProjects.start.calledOnce).to.be.true;
      // Verify first module (events) was processed successfully
      expect(mockExportEvents.start.calledOnce).to.be.true;
      // Should have attempted to process attributes (second module, which fails)
      expect(mockExportAttributes.start.calledOnce).to.be.true;
      // Verify error handling: handleAndLogError was called with correct error and context
      expect(handleAndLogErrorSpy.calledOnce).to.be.true;
      expect(handleAndLogErrorSpy.getCall(0).args[0]).to.equal(attributesError);
      expect(handleAndLogErrorSpy.getCall(0).args[1]).to.deep.include(mockExportConfig.context);
      // Verify state change: personalizationEnabled set to false due to error
      expect(mockExportConfig.personalizationEnabled).to.be.false;
      // Verify subsequent modules were NOT processed after the error
      // This is the key behavior - error stops the processing chain
      expect(mockExportAudiences.start.called).to.be.false;
      expect(mockExportExperiences.start.called).to.be.false;
    });
  });
});
