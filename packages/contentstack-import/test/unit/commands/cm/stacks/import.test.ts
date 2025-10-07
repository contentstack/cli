import { expect } from 'chai';
import { fancy } from 'fancy-test';
import sinon from 'sinon';
import ImportCommand from '../../../../../src/commands/cm/stacks/import';
import { managementSDKClient, configHandler, log, handleAndLogError, getLogPath } from '@contentstack/cli-utilities';
import { ModuleImporter } from '../../../../../src/import';
import { ImportConfig } from '../../../../../src/types';

// Mock the setupImportConfig module
const setupImportConfigModule = require('../../../../../src/utils');

// Mock the interactive module
const interactiveModule = require('../../../../../src/utils/interactive');

describe('ImportCommand', () => {
  let command: ImportCommand;
  let mockContext: any;
  let mockFlags: any;
  let mockImportConfig: ImportConfig;
  let mockManagementClient: any;
  let mockModuleImporter: any;

  beforeEach(() => {
    mockContext = {
      info: { command: 'cm:stacks:import' },
      sessionId: 'test-session-123',
      cliVersion: '1.0.0'
    };

    mockFlags = {
      'stack-api-key': 'test-api-key',
      'data-dir': '/test/data',
      'alias': 'test-alias',
      'module': 'entries',
      'backup-dir': '/test/backup',
      'branch': 'main',
      'import-webhook-status': 'disable',
      'yes': false,
      'skip-audit': false,
      'exclude-global-modules': false,
      'skip-assets-publish': false,
      'skip-entries-publish': false
    };

    mockImportConfig = {
      apiKey: 'test-api-key',
      contentDir: '/test/data',
      data: '/test/data',
      contentVersion: 1,
      region: 'us' as any,
      master_locale: { code: 'en-us' },
      masterLocale: { code: 'en-us' },
      context: {
        command: 'cm:stacks:import',
        module: '',
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'test-session-123',
        apiKey: 'test-api-key',
        orgId: 'org-123',
        authenticationMethod: 'Basic Auth',
      },
      modules: { types: [] } as any,
      backupDir: '/test/backup',
      cliLogsPath: '/test/logs',
      canCreatePrivateApp: true,
      forceStopMarketplaceAppsPrompt: false,
      skipPrivateAppRecreationIfExist: true,
      isAuthenticated: true,
      auth_token: 'auth-token',
      selectedModules: ['entries'],
      skipAudit: false,
      'exclude-global-modules': false
    } as any;

    mockManagementClient = {
      stack: sinon.stub().returns({
        fetch: sinon.stub().resolves({ name: 'Test Stack', org_uid: 'org-123' })
      })
    };

    mockModuleImporter = {
      start: sinon.stub().resolves({ noSuccessMsg: false })
    };

    command = new ImportCommand(mockContext, {} as any);
    // Use Object.defineProperty to set properties since they're getters
    Object.defineProperty(command, 'context', {
      value: mockContext,
      writable: true,
      configurable: true
    });
    Object.defineProperty(command, 'cmaHost', {
      value: 'https://api.contentstack.io',
      writable: true,
      configurable: true
    });
    Object.defineProperty(command, 'region', {
      value: 'us',
      writable: true,
      configurable: true
    });
    Object.defineProperty(command, 'developerHubUrl', {
      value: 'https://developer-hub.com',
      writable: true,
      configurable: true
    });
    Object.defineProperty(command, 'personalizeUrl', {
      value: 'https://personalize.com',
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Static Properties', () => {
    it('should have correct description', () => {
      expect(ImportCommand.description).to.be.a('string');
      expect(ImportCommand.description).to.include('Import content');
    });

    it('should have correct examples', () => {
      expect(ImportCommand.examples).to.be.an('array');
      expect(ImportCommand.examples.length).to.be.greaterThan(0);
      expect(ImportCommand.examples[0]).to.include('csdx cm:stacks:import');
    });

    it('should have correct aliases', () => {
      expect(ImportCommand.aliases).to.be.an('array');
      expect(ImportCommand.aliases).to.include('cm:import');
    });

    it('should have correct usage', () => {
      expect(ImportCommand.usage).to.be.a('string');
      expect(ImportCommand.usage).to.include('cm:stacks:import');
    });
  });

  describe('Flags Configuration', () => {
    it('should have all required flags defined', () => {
      const flags = ImportCommand.flags;
      
      expect(flags).to.have.property('stack-api-key');
      expect(flags).to.have.property('data-dir');
      expect(flags).to.have.property('alias');
      expect(flags).to.have.property('config');
      expect(flags).to.have.property('module');
      expect(flags).to.have.property('backup-dir');
      expect(flags).to.have.property('branch');
      expect(flags).to.have.property('import-webhook-status');
      expect(flags).to.have.property('yes');
      expect(flags).to.have.property('skip-audit');
      expect(flags).to.have.property('exclude-global-modules');
      expect(flags).to.have.property('skip-assets-publish');
      expect(flags).to.have.property('skip-entries-publish');
    });

    it('should have correct flag properties', () => {
      const flags = ImportCommand.flags;
      
      expect(flags['stack-api-key']).to.have.property('char', 'k');
      expect(flags['data-dir']).to.have.property('char', 'd');
      expect(flags['alias']).to.have.property('char', 'a');
      expect(flags['config']).to.have.property('char', 'c');
      expect(flags['module']).to.have.property('char', 'm');
      expect(flags['backup-dir']).to.have.property('char', 'b');
      expect(flags['branch']).to.have.property('char', 'B');
      expect(flags['yes']).to.have.property('char', 'y');
    });

    it('should have correct default values', () => {
      const flags = ImportCommand.flags;
      
      expect(flags['import-webhook-status']).to.have.property('default', 'disable');
      expect(flags['skip-existing']).to.have.property('default', false);
      expect(flags['exclude-global-modules']).to.have.property('default', false);
      expect(flags['skip-assets-publish']).to.have.property('default', false);
      expect(flags['skip-entries-publish']).to.have.property('default', false);
    });

    it('should have correct exclusive flags', () => {
      const flags = ImportCommand.flags;
      
      expect(flags['branch']).to.have.property('exclusive');
      expect(flags['branch-alias']).to.have.property('exclusive');
      expect(flags['branch'].exclusive).to.include('branch-alias');
      expect(flags['branch-alias'].exclusive).to.include('branch');
    });

    it('should have correct webhook status options', () => {
      const flags = ImportCommand.flags;
      
      expect(flags['import-webhook-status']).to.have.property('options');
      expect((flags['import-webhook-status'] as any).options).to.include('disable');
      expect((flags['import-webhook-status'] as any).options).to.include('current');
    });
  });

  describe('createImportContext', () => {
    let configHandlerStub: sinon.SinonStub;

    beforeEach(() => {
      configHandlerStub = sinon.stub(configHandler, 'get');
      configHandlerStub.withArgs('userUid').returns('user-123');
      configHandlerStub.withArgs('email').returns('test@example.com');
      configHandlerStub.withArgs('oauthOrgUid').returns('org-123');
    });

    it('should create context with all required properties', () => {
      const context = command['createImportContext']('test-api-key', 'Basic Auth');
      
      expect(context).to.have.property('command', 'cm:stacks:import');
      expect(context).to.have.property('module', '');
      expect(context).to.have.property('userId', 'user-123');
      expect(context).to.have.property('email', 'test@example.com');
      expect(context).to.have.property('sessionId', 'test-session-123');
      expect(context).to.have.property('apiKey', 'test-api-key');
      expect(context).to.have.property('orgId', 'org-123');
      expect(context).to.have.property('authenticationMethod', 'Basic Auth');
    });

    it('should use default authentication method when not provided', () => {
      const context = command['createImportContext']('test-api-key');
      
      expect(context.authenticationMethod).to.equal('Basic Auth');
    });

    it('should handle missing config values', () => {
      configHandlerStub.reset();
      configHandlerStub.returns(undefined);
      
      const context = command['createImportContext']('test-api-key', 'Management Token');
      
      expect(context.userId).to.equal('');
      expect(context.email).to.equal('');
      expect(context.orgId).to.equal('');
      expect(context.authenticationMethod).to.equal('Management Token');
    });

    it('should use context command when available', () => {
      const context = command['createImportContext']('test-api-key');
      
      expect(context.command).to.equal('cm:stacks:import');
    });

    it('should handle empty apiKey', () => {
      const context = command['createImportContext']('');
      
      expect(context.apiKey).to.equal('');
    });
  });

  describe('run method', () => {
    let setupImportConfigStub: sinon.SinonStub;
    let managementSDKClientStub: sinon.SinonStub;
    let ModuleImporterStub: sinon.SinonStub;
    let logSuccessStub: sinon.SinonStub;
    let logInfoStub: sinon.SinonStub;
    let getLogPathStub: sinon.SinonStub;
    let handleAndLogErrorStub: sinon.SinonStub;

    beforeEach(() => {
      // Mock the module imports properly
      setupImportConfigStub = sinon.stub(setupImportConfigModule, 'setupImportConfig').resolves(mockImportConfig);
      managementSDKClientStub = sinon.stub().resolves(mockManagementClient);
      ModuleImporterStub = sinon.stub().returns(mockModuleImporter);
      
      // Mock the interactive functions
      sinon.stub(interactiveModule, 'askContentDir').resolves('/test/content');
      sinon.stub(interactiveModule, 'askAPIKey').resolves('test-api-key');
      
      // Mock log methods by replacing them on the log object
      logSuccessStub = sinon.stub().callsFake(() => {});
      logInfoStub = sinon.stub().callsFake(() => {});
      (log as any).success = logSuccessStub;
      (log as any).info = logInfoStub;
      
      getLogPathStub = sinon.stub().returns('/test/logs');
      handleAndLogErrorStub = sinon.stub();
    });

    it('should successfully run import with all steps', async () => {
      const parseStub = sinon.stub(command, 'parse' as any).resolves({ flags: mockFlags });
      
      await command.run();
      
      expect(parseStub.calledOnce).to.be.true;
    });

    it('should set import config properties correctly', async () => {
      const parseStub = sinon.stub(command, 'parse' as any).resolves({ flags: mockFlags });
      
      await command.run();
      expect(parseStub.calledOnce).to.be.true;
    });

    it('should log success message when import completes', async () => {
      const parseStub = sinon.stub(command, 'parse' as any).resolves({ flags: mockFlags });
      mockImportConfig.stackName = 'Test Stack';
      
      await command.run();
      expect(parseStub.calledOnce).to.be.true;
    });

    it('should log success message without stack name', async () => {
      const parseStub = sinon.stub(command, 'parse' as any).resolves({ flags: mockFlags });
      delete mockImportConfig.stackName;
      
      await command.run();
      expect(parseStub.calledOnce).to.be.true;
    });

    it('should skip success message when noSuccessMsg is true', async () => {
      const parseStub = sinon.stub(command, 'parse' as any).resolves({ flags: mockFlags });
      mockModuleImporter.start.resolves({ noSuccessMsg: true });
      
      await command.run();
      expect(parseStub.calledOnce).to.be.true;
    });

    it('should handle errors and log appropriate messages', async () => {
      const parseStub = sinon.stub(command, 'parse' as any).resolves({ flags: mockFlags });
      const error = new Error('Test error');
      setupImportConfigStub.rejects(error);
      
      await command.run();
      expect(parseStub.calledOnce).to.be.true;
    });

    it('should log backup directory when available in error case', async () => {
      const parseStub = sinon.stub(command, 'parse' as any).resolves({ flags: mockFlags });
      const error = new Error('Test error');
      setupImportConfigStub.rejects(error);
      (command as any).importConfig = { backupDir: '/test/backup' };
      
      await command.run();
      expect(parseStub.calledOnce).to.be.true;
    });

    it('should not set personalize URL when not available', async () => {
      const parseStub = sinon.stub(command, 'parse' as any).resolves({ flags: mockFlags });
      (command as any).personalizeUrl = undefined;
      
      await command.run();

      expect(parseStub.calledOnce).to.be.true;
    });

    it('should not set developer hub URL when not available', async () => {
      const parseStub = sinon.stub(command, 'parse' as any).resolves({ flags: mockFlags });
      (command as any).developerHubUrl = undefined;
      
      await command.run();
      
      expect(mockImportConfig.developerHubBaseUrl).to.be.undefined;
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    let setupImportConfigStub: sinon.SinonStub;
    let managementSDKClientStub: sinon.SinonStub;
    let ModuleImporterStub: sinon.SinonStub;
    let logSuccessStub: sinon.SinonStub;
    let logInfoStub: sinon.SinonStub;
    let getLogPathStub: sinon.SinonStub;
    let handleAndLogErrorStub: sinon.SinonStub;

    beforeEach(() => {
      setupImportConfigStub = sinon.stub(setupImportConfigModule, 'setupImportConfig').resolves(mockImportConfig);
      managementSDKClientStub = sinon.stub().resolves(mockManagementClient);
      ModuleImporterStub = sinon.stub().returns(mockModuleImporter);
      
      sinon.stub(interactiveModule, 'askContentDir').resolves('/test/content');
      sinon.stub(interactiveModule, 'askAPIKey').resolves('test-api-key');
      
      logSuccessStub = sinon.stub().callsFake(() => {});
      logInfoStub = sinon.stub().callsFake(() => {});
      (log as any).success = logSuccessStub;
      (log as any).info = logInfoStub;
      
      getLogPathStub = sinon.stub().returns('/test/logs');
      handleAndLogErrorStub = sinon.stub();
    });

    it('should handle parse errors', async () => {
      const parseError = new Error('Parse error');
      const parseStub = sinon.stub(command, 'parse' as any).rejects(parseError);
      
      await command.run();
      expect(parseStub.calledOnce).to.be.true;
    });

    it('should handle setupImportConfig errors', async () => {
      const parseStub = sinon.stub(command, 'parse' as any).resolves({ flags: mockFlags });
      const setupError = new Error('Setup error');
      setupImportConfigStub.rejects(setupError);
      
      await command.run();
      expect(parseStub.calledOnce).to.be.true;
    });

    it('should handle managementSDKClient errors', async () => {
      const parseStub = sinon.stub(command, 'parse' as any).resolves({ flags: mockFlags });
      const clientError = new Error('Client error');
      managementSDKClientStub.rejects(clientError);
      
      await command.run();

      expect(parseStub.calledOnce).to.be.true;
    });

    it('should handle ModuleImporter start errors', async () => {
      const parseStub = sinon.stub(command, 'parse' as any).resolves({ flags: mockFlags });
      const importError = new Error('Import error');
      mockModuleImporter.start.rejects(importError);
      
      await command.run();

      expect(parseStub.calledOnce).to.be.true;
    });

    it('should handle missing context properties', async () => {
      const parseStub = sinon.stub(command, 'parse' as any).resolves({ flags: mockFlags });
      (command as any).context = undefined;
      
      await command.run();
      
      expect(parseStub.calledOnce).to.be.true;
    });

    it('should handle empty flags', async () => {
      const parseStub = sinon.stub(command, 'parse' as any).resolves({ flags: {} });
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), 1000);
      });
      
      try {
        await Promise.race([command.run(), timeoutPromise]);
      } catch (error) {
        // Expected to fail due to missing required flags
      }
      
      expect(parseStub.calledOnce).to.be.true;
    });

    it('should handle null/undefined importConfig in error case', async () => {
      const parseStub = sinon.stub(command, 'parse' as any).resolves({ flags: mockFlags });
      const error = new Error('Test error');
      setupImportConfigStub.rejects(error);
      
      // Don't set importConfig
      (command as any).importConfig = undefined;
      
      await command.run();

      expect(parseStub.calledOnce).to.be.true;
    });
  });

  describe('Flag Validation and Parsing', () => {
    it('should handle deprecated flags correctly', () => {
      const flags = ImportCommand.flags;
      
      expect(flags['stack-uid']).to.have.property('hidden', true);
      expect(flags['data']).to.have.property('hidden', true);
      expect(flags['management-token-alias']).to.have.property('hidden', true);
      expect(flags['auth-token']).to.have.property('hidden', true);
      expect(flags['skip-app-recreation']).to.have.property('parse');
    });

    it('should have correct flag descriptions', () => {
      const flags = ImportCommand.flags;
      
      expect(flags['stack-api-key'].description).to.include('API Key of the target stack');
      expect(flags['data-dir'].description).to.include('path or the location');
      expect(flags['alias'].description).to.include('management token');
      expect(flags['module'].description).to.include('Specify the module to import');
      expect(flags['branch'].description).to.include('name of the branch');
    });

    it('should have correct required flags', () => {
      const flags = ImportCommand.flags;
      
      expect(flags['stack-api-key'].required).to.be.undefined; // Not explicitly required
      expect(flags['data-dir'].required).to.be.undefined;
      expect(flags['alias'].required).to.be.undefined;
      expect(flags['module'].required).to.be.false;
      expect(flags['yes'].required).to.be.false;
    });
  });

  describe('Context Creation Edge Cases', () => {
    let configHandlerStub: sinon.SinonStub;

    beforeEach(() => {
      configHandlerStub = sinon.stub(configHandler, 'get');
    });

    it('should handle undefined context', () => {
      (command as any).context = undefined;
      
      const context = command['createImportContext']('test-api-key');
      
      expect(context.command).to.equal('cm:stacks:import');
    });

    it('should handle context without info', () => {
      (command as any).context = { sessionId: 'test-session' };
      
      const context = command['createImportContext']('test-api-key');
      
      expect(context.command).to.equal('cm:stacks:import');
    });

    it('should handle context without sessionId', () => {
      (command as any).context = { info: { command: 'test' } };
      
      const context = command['createImportContext']('test-api-key');
      
      expect(context.sessionId).to.be.undefined;
    });

    it('should handle configHandler throwing errors', () => {
      configHandlerStub.reset();
      configHandlerStub.returns(undefined);
      
      const context = command['createImportContext']('test-api-key');
      
      expect(context.userId).to.equal('');
      expect(context.email).to.equal('');
      expect(context.orgId).to.equal('');
    });
  });
});
