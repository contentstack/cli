import { expect } from 'chai';
import sinon from 'sinon';
import * as path from 'path';
import setupConfig from '../../../src/utils/import-config-handler';
import { ImportConfig } from '../../../src/types';
import * as fileHelper from '../../../src/utils/file-helper';
import * as interactive from '../../../src/utils/interactive';
import * as loginHandler from '../../../src/utils/login-handler';
import * as cliUtilities from '@contentstack/cli-utilities';
import defaultConfig from '../../../src/config';

describe('Import Config Handler', () => {
  let sandbox: sinon.SinonSandbox;
  let readFileStub: sinon.SinonStub;
  let askContentDirStub: sinon.SinonStub;
  let askAPIKeyStub: sinon.SinonStub;
  let loginStub: sinon.SinonStub;
  let configHandlerGetStub: sinon.SinonStub;
  let cliuxPrintStub: sinon.SinonStub;
  let logStub: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    // Mock file-helper
    readFileStub = sandbox.stub(fileHelper, 'readFile');

    // Mock interactive
    askContentDirStub = sandbox.stub(interactive, 'askContentDir');
    askAPIKeyStub = sandbox.stub(interactive, 'askAPIKey');

    // Mock login handler
    loginStub = sandbox.stub(loginHandler, 'default');

    // Mock cli-utilities
    const cliUtilitiesModule = require('@contentstack/cli-utilities');
    configHandlerGetStub = sandbox.stub(cliUtilitiesModule.configHandler, 'get');
    
    // Control isAuthenticated() behavior via configHandler.get('authorisationType')
    // isAuthenticated returns true when authorisationType is 'OAUTH' or 'AUTH', undefined/null for false
    
    cliuxPrintStub = sandbox.stub(cliUtilitiesModule.cliux, 'print');
    // Let sanitizePath execute directly - no need to stub it

    logStub = {
      debug: sandbox.stub(),
      warn: sandbox.stub(),
      error: sandbox.stub(),
    };
    sandbox.stub(cliUtilitiesModule, 'log').value(logStub);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('External Config File', () => {
    it('should merge external config file with default config', async () => {
      const importCmdFlags = {
        'data': '/test/content',
      };

      // Set up authentication since no management token is provided
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      askAPIKeyStub.resolves('test-api-key');

      const result = await setupConfig(importCmdFlags);

      expect(readFileStub.called).to.be.false; // No external config file in flags
      expect(result.versioning).to.equal(defaultConfig.versioning);
    });

    it('should load and merge external config file when config flag is provided', async () => {
      const importCmdFlags = {
        'config': '/path/to/config.json',
        'data': '/test/content',
      };
      const externalConfig = {
        versioning: true,
        host: 'https://custom-api.com',
      };

      readFileStub.withArgs('/path/to/config.json').resolves(externalConfig);
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      askAPIKeyStub.resolves('test-api-key');

      const result = await setupConfig(importCmdFlags);

      expect(readFileStub.calledWith('/path/to/config.json')).to.be.true;
      expect(result.host).to.equal(externalConfig.host);
                           expect(result.versioning).to.equal(externalConfig.versioning);
    });

    it('should filter module types when external config has modules array', async () => {
      const importCmdFlags = {
        'config': '/path/to/config.json',
        'data': '/test/content',
      };
      const externalConfig = {
        modules: ['assets', 'content-types'],
      };

      readFileStub.withArgs('/path/to/config.json').resolves(externalConfig);
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      askAPIKeyStub.resolves('test-api-key');

      const result = await setupConfig(importCmdFlags);

      expect(result.modules.types).to.deep.equal(['assets', 'content-types']);
      expect(result.modules.types).to.not.include('locales');
      expect(result.modules.types).to.not.include('environments');
    });
  });

  describe('Content Directory Resolution', () => {
    it('should use data flag for contentDir', async () => {
      const importCmdFlags = {
        'data': '/test/content',
      };
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      askAPIKeyStub.resolves('test-api-key');

      const result = await setupConfig(importCmdFlags);

      expect(result.contentDir).to.equal(path.resolve('/test/content'));
      expect(result.data).to.equal(path.resolve('/test/content'));
      expect(askContentDirStub.called).to.be.false;
    });

    it('should use data-dir flag for contentDir', async () => {
      const importCmdFlags = {
        'data-dir': '/test/data-dir',
      };
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      askAPIKeyStub.resolves('test-api-key');

      const result = await setupConfig(importCmdFlags);

      expect(result.contentDir).to.equal(path.resolve('/test/data-dir'));
      expect(result.data).to.equal(path.resolve('/test/data-dir'));
    });

    it('should use config.data when no flags provided', async () => {
      const importCmdFlags = {};
      const configData = '/default/data/path';
      
      readFileStub.resolves({ data: configData });
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      askAPIKeyStub.resolves('test-api-key');

      // Need to mock defaultConfig.data for this test
      const originalData = (defaultConfig as any).data;
      (defaultConfig as any).data = configData;

      const result = await setupConfig(importCmdFlags);

      // Restore
      (defaultConfig as any).data = originalData;

      expect(result.contentDir).to.equal(path.resolve(configData));
    });

    it('should prompt for contentDir when no flags or config.data provided', async () => {
      const importCmdFlags = {};
      const promptedPath = '/prompted/path';

      askContentDirStub.resolves(promptedPath);
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      askAPIKeyStub.resolves('test-api-key');

      // Remove data from defaultConfig for this test
      const originalData = (defaultConfig as any).data;
      delete (defaultConfig as any).data;

      const result = await setupConfig(importCmdFlags);

      // Restore
      (defaultConfig as any).data = originalData;

      expect(askContentDirStub.called).to.be.true;
      expect(result.contentDir).to.equal(path.resolve(promptedPath));
    });

    it('should remove quotes from contentDir', async () => {
      const importCmdFlags = {
        'data': "'/test/content'",
      };
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      askAPIKeyStub.resolves('test-api-key');

      const result = await setupConfig(importCmdFlags);

      expect(result.contentDir).to.not.include("'");
      expect(result.contentDir).to.not.include('"');
    });

    it('should validate and reprompt when contentDir contains special characters', async () => {
      const importCmdFlags = {
        'data': '/test/content*',
      };
      const validPath = '/test/valid-content';

      // sanitizePath will execute naturally - the special character validation will trigger the reprompt
      askContentDirStub.resolves(validPath);
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      askAPIKeyStub.resolves('test-api-key');

      const result = await setupConfig(importCmdFlags);

      expect(cliuxPrintStub.called).to.be.true;
      expect(askContentDirStub.called).to.be.true;
      expect(result.contentDir).to.equal(path.resolve(validPath));
    });
  });

  describe('Management Token Authentication', () => {
    it('should use management token from alias when management-token-alias is provided', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'management-token-alias': 'my-token',
      };
      const tokenData = {
        token: 'test-management-token',
        apiKey: 'test-api-key',
      };

      configHandlerGetStub.withArgs('tokens.my-token').returns(tokenData);
      
      const result = await setupConfig(importCmdFlags);

      expect(result.management_token).to.equal('test-management-token');
      expect(result.apiKey).to.equal('test-api-key');
      expect(result.authenticationMethod).to.equal('Management Token');
      // Note: isAuthenticated() is still called at line 90 to set config.isAuthenticated flag
      // but the authentication flow uses management token, not isAuthenticated()
    });

    it('should use management token from alias when alias flag is provided', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'alias': 'my-alias',
      };
      const tokenData = {
        token: 'test-management-token',
        apiKey: 'test-api-key',
      };

      configHandlerGetStub.withArgs('tokens.my-alias').returns(tokenData);

      const result = await setupConfig(importCmdFlags);

      expect(result.management_token).to.equal('test-management-token');
      expect(result.apiKey).to.equal('test-api-key');
    });

    it('should throw error when management token alias not found', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'management-token-alias': 'non-existent',
      };

      configHandlerGetStub.withArgs('tokens.non-existent').returns({});

      try {
        await setupConfig(importCmdFlags);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('No management token found on given alias');
      }
    });
  });

  describe('Email/Password Authentication', () => {
    it('should authenticate with email/password when not authenticated and credentials provided', async () => {
      const importCmdFlags = {
        'data': '/test/content',
      };
      const configWithAuth = {
        email: 'test@example.com',
        password: 'testpassword',
      };

      readFileStub.withArgs('/path/to/config.json').resolves(configWithAuth);
      configHandlerGetStub.withArgs('authorisationType').returns(undefined);
      loginStub.resolves(configWithAuth);

      // Load external config with email/password
      const importCmdFlagsWithConfig = {
        ...importCmdFlags,
        'config': '/path/to/config.json',
      };

      readFileStub.withArgs('/path/to/config.json').resolves(configWithAuth);

      const result = await setupConfig(importCmdFlagsWithConfig);

      expect(loginStub.calledOnce).to.be.true;
      expect(result.authenticationMethod).to.equal('Basic Auth');
    });

    it('should throw error when not authenticated and no credentials provided', async () => {
      const importCmdFlags = {
        'data': '/test/content',
      };

      configHandlerGetStub.withArgs('authorisationType').returns(undefined);

      try {
        await setupConfig(importCmdFlags);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Please login or provide an alias for the management token');
      }
    });
  });

  describe('Existing Authentication - OAuth', () => {
    it('should use OAuth authentication when user is authenticated via OAuth', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'stack-api-key': 'test-api-key',
      };

      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authtoken').returns('test-auth-token');

      const result = await setupConfig(importCmdFlags);

      expect(result.authenticationMethod).to.equal('OAuth');
      expect(result.apiKey).to.equal('test-api-key');
      expect(result.isAuthenticated).to.be.true;
      expect(result.auth_token).to.equal('test-auth-token');
    });

    it('should use stack-uid flag for apiKey when provided', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'stack-uid': 'custom-api-key',
      };

      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authtoken').returns('test-auth-token');

      const result = await setupConfig(importCmdFlags);

      expect(result.apiKey).to.equal('custom-api-key');
      expect(result.source_stack).to.equal('custom-api-key');
      expect(result.target_stack).to.equal('custom-api-key');
    });

    it('should use config.target_stack for apiKey when no flags provided', async () => {
      const importCmdFlags = {
        'data': '/test/content',
      };
      const targetStack = 'default-stack-key';

      // Mock defaultConfig.target_stack
      const originalTargetStack = (defaultConfig as any).target_stack;
      (defaultConfig as any).target_stack = targetStack;

      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authtoken').returns('test-auth-token');

      const result = await setupConfig(importCmdFlags);

      // Restore
      (defaultConfig as any).target_stack = originalTargetStack;

      expect(result.apiKey).to.equal(targetStack);
    });

    it('should prompt for apiKey when not provided in flags or config', async () => {
      const importCmdFlags = {
        'data': '/test/content',
      };

      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authtoken').returns('test-auth-token');
      askAPIKeyStub.resolves('prompted-api-key');

      // Remove target_stack from defaultConfig for this test
      const originalTargetStack = (defaultConfig as any).target_stack;
      delete (defaultConfig as any).target_stack;

      const result = await setupConfig(importCmdFlags);

      // Restore
      (defaultConfig as any).target_stack = originalTargetStack;

      expect(askAPIKeyStub.called).to.be.true;
      expect(result.apiKey).to.equal('prompted-api-key');
    });

    it('should throw error when apiKey is not a string', async () => {
      const importCmdFlags = {
        'data': '/test/content',
      };

      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authtoken').returns('test-auth-token');
      askAPIKeyStub.resolves(123 as any);

      try {
        await setupConfig(importCmdFlags);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Invalid API key received');
      }
    });
  });

  describe('Existing Authentication - Basic Auth', () => {
    it('should use Basic Auth when user is authenticated but not via OAuth', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'stack-api-key': 'test-api-key',
      };

      // Set up properly for Basic Auth (authenticated but not OAuth)
      // Use callsFake to handle all calls properly
      configHandlerGetStub.callsFake((key: string) => {
        if (key === 'authorisationType') {
          return 'AUTH'; // Makes isAuthenticated() return true, but not OAuth
        }
        if (key === 'authtoken') {
          return 'test-auth-token';
        }
        return undefined;
      });

      const result = await setupConfig(importCmdFlags);

      expect(result.authenticationMethod).to.equal('Basic Auth');
      expect(result.apiKey).to.equal('test-api-key');
      expect(result.isAuthenticated).to.be.true;
    });
  });

  describe('Flag Handling', () => {
    beforeEach(() => {
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authtoken').returns('test-auth-token');
      // Set default apiKey to avoid prompting
      const originalTargetStack = (defaultConfig as any).target_stack;
      (defaultConfig as any).target_stack = 'default-api-key';
    });

    afterEach(() => {
      const originalTargetStack = (defaultConfig as any).target_stack;
      delete (defaultConfig as any).target_stack;
    });

    it('should set skipAudit from skip-audit flag', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'skip-audit': true,
      };

      const result = await setupConfig(importCmdFlags);

      expect(result.skipAudit).to.be.true;
    });

    it('should set forceStopMarketplaceAppsPrompt from yes flag', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        yes: true,
      };

      const result = await setupConfig(importCmdFlags);

      expect(result.forceStopMarketplaceAppsPrompt).to.be.true;
    });

    it('should set importWebhookStatus from import-webhook-status flag', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'import-webhook-status': 'active',
      };

      const result = await setupConfig(importCmdFlags);

      expect(result.importWebhookStatus).to.equal('active');
    });

    it('should set skipPrivateAppRecreationIfExist from skip-app-recreation flag', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'skip-app-recreation': true,
      };

      const result = await setupConfig(importCmdFlags);

      expect(result.skipPrivateAppRecreationIfExist).to.be.false; // Note: it's negated
    });

    it('should set branchAlias from branch-alias flag', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'branch-alias': 'my-branch',
      };

      const result = await setupConfig(importCmdFlags);

      expect(result.branchAlias).to.equal('my-branch');
    });

    it('should set branchName and branchDir from branch flag', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'branch': 'my-branch',
      };

      const result = await setupConfig(importCmdFlags);

      expect(result.branchName).to.equal('my-branch');
      expect(result.branchDir).to.equal(path.resolve('/test/content'));
    });

    it('should set moduleName and singleModuleImport from module flag', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'module': 'assets',
      };

      const result = await setupConfig(importCmdFlags);

      expect(result.moduleName).to.equal('assets');
      expect(result.singleModuleImport).to.be.true;
    });

    it('should set useBackedupDir from backup-dir flag', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'backup-dir': '/backup/path',
      };

      const result = await setupConfig(importCmdFlags);

      expect(result.useBackedupDir).to.equal('/backup/path');
    });

    it('should set skipAssetsPublish from skip-assets-publish flag', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'skip-assets-publish': true,
      };

      const result = await setupConfig(importCmdFlags);

      expect(result.skipAssetsPublish).to.be.true;
    });

    it('should set skipEntriesPublish from skip-entries-publish flag', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'skip-entries-publish': true,
      };

      const result = await setupConfig(importCmdFlags);

      expect(result.skipEntriesPublish).to.be.true;
    });

    it('should set replaceExisting from replace-existing flag', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'replace-existing': true,
      };

      const result = await setupConfig(importCmdFlags);

      expect(result.replaceExisting).to.be.true;
    });

    it('should set skipExisting from skip-existing flag', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'skip-existing': true,
      };

      const result = await setupConfig(importCmdFlags);

      expect(result.skipExisting).to.be.true;
    });

    it('should set personalizeProjectName from personalize-project-name flag', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'personalize-project-name': 'my-project',
      };

      const result = await setupConfig(importCmdFlags);

      expect(result.personalizeProjectName).to.equal('my-project');
    });

    it('should set exclude-global-modules from exclude-global-modules flag', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'exclude-global-modules': true,
      };

      const result = await setupConfig(importCmdFlags);

      expect(result['exclude-global-modules']).to.be.true;
    });
  });

  describe('Config Properties', () => {
    beforeEach(() => {
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authtoken').returns('test-auth-token');
      (defaultConfig as any).target_stack = 'default-api-key';
    });

    afterEach(() => {
      delete (defaultConfig as any).target_stack;
    });

    it('should set source_stack to apiKey', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'stack-api-key': 'test-api-key',
      };

      const result = await setupConfig(importCmdFlags);

      expect(result.source_stack).to.equal('test-api-key');
    });

    it('should set target_stack to apiKey', async () => {
      const importCmdFlags = {
        'data': '/test/content',
        'stack-api-key': 'test-api-key',
      };

      const result = await setupConfig(importCmdFlags);

      expect(result.target_stack).to.equal('test-api-key');
    });

    it('should set isAuthenticated flag', async () => {
      const importCmdFlags = {
        'data': '/test/content',
      };

      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const result = await setupConfig(importCmdFlags);

      expect(result.isAuthenticated).to.be.true;
    });

    it('should set auth_token from configHandler', async () => {
      const importCmdFlags = {
        'data': '/test/content',
      };

      configHandlerGetStub.withArgs('authtoken').returns('custom-auth-token');

      const result = await setupConfig(importCmdFlags);

      expect(result.auth_token).to.equal('custom-auth-token');
    });
  });
});

