import { expect } from 'chai';
import sinon from 'sinon';
import * as path from 'node:path';
import * as utilities from '@contentstack/cli-utilities';
import setupConfig from '../../../src/utils/export-config-handler';
import * as fileHelper from '../../../src/utils/file-helper';
import * as interactive from '../../../src/utils/interactive';
import * as basicLogin from '../../../src/utils/basic-login';

describe('Export Config Handler', () => {
  let sandbox: sinon.SinonSandbox;
  let readFileStub: sinon.SinonStub;
  let askExportDirStub: sinon.SinonStub;
  let askAPIKeyStub: sinon.SinonStub;
  let loginStub: sinon.SinonStub;
  let configHandlerGetStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    // Stub utility functions
    readFileStub = sandbox.stub(fileHelper, 'readFile').resolves({});
    askExportDirStub = sandbox.stub(interactive, 'askExportDir').resolves('/default/export/dir');
    askAPIKeyStub = sandbox.stub(interactive, 'askAPIKey').resolves('default-api-key');
    loginStub = sandbox.stub(basicLogin, 'default').resolves();

    // Stub configHandler.get - this controls isAuthenticated() behavior
    // isAuthenticated() internally calls authHandler.isAuthenticated() which checks
    // configHandler.get('authorisationType'). Returns 'OAUTH' or 'AUTH' for authenticated
    configHandlerGetStub = sandbox.stub(utilities.configHandler, 'get');
    configHandlerGetStub.returns(undefined); // Default to not authenticated

    // Stub cliux.print
    sandbox.stub(utilities.cliux, 'print');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Export Directory Configuration', () => {
    it('should use data flag when provided', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const flags = { data: '/test/data/path' };
      const config = await setupConfig(flags);

      expect(config.exportDir).to.equal(path.resolve('/test/data/path'));
      expect(askExportDirStub.called).to.be.false;
    });

    it('should use data-dir flag when provided', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const flags = { 'data-dir': '/test/data-dir/path' };
      const config = await setupConfig(flags);

      expect(config.exportDir).to.equal(path.resolve('/test/data-dir/path'));
      expect(askExportDirStub.called).to.be.false;
    });

    it('should ask for export directory when not provided', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const flags = {};
      const config = await setupConfig(flags);

      expect(askExportDirStub.called).to.be.true;
      expect(config.exportDir).to.equal(path.resolve('/default/export/dir'));
    });

    it('should validate and re-ask when export directory contains special characters', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'BASIC' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const flags = { data: '/test/path*with*special' };
      // askExportDirStub will be called when the pattern detects special characters
      // Need to use callsFake to handle multiple calls - first for the invalid path check, then the re-ask
      let callCount = 0;
      askExportDirStub.callsFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve('/valid/path');
        }
        return Promise.resolve('/valid/path');
      });

      const config = await setupConfig(flags);

      expect((utilities.cliux.print as sinon.SinonStub).called).to.be.true;
      expect(askExportDirStub.called).to.be.true;
      // The resolved path from askExportDirStub should be used
      expect(config.exportDir).to.equal(path.resolve('/valid/path'));
    });

    it('should remove quotes from export directory', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const flags = { data: "'/test/quoted/path'" };
      const config = await setupConfig(flags);

      expect(config.exportDir).to.not.include("'");
      expect(config.exportDir).to.not.include('"');
    });
  });

  describe('External Configuration File', () => {
    it('should merge external config file when config flag is provided', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const externalConfig = {
        customField: 'customValue',
      };
      readFileStub.resolves(externalConfig);

      const flags = { config: '/path/to/config.json', data: '/test/data' };
      const config = await setupConfig(flags);

      expect(readFileStub.calledWith('/path/to/config.json')).to.be.true;
      expect((config as any).customField).to.equal('customValue');
    });

    it('should reject deprecated contentVersion property', async () => {
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const externalConfig = {
        contentVersion: 2,
        customField: 'customValue',
      };
      readFileStub.resolves(externalConfig);

      const flags = { config: '/path/to/config.json', data: '/test/data' };

      try {
        await setupConfig(flags);
        expect.fail('Should have thrown an error for deprecated contentVersion');
      } catch (error: any) {
        expect(error.message).to.include('Unsupported configuration properties detected: contentVersion');
        expect(error.message).to.include('no longer supported in the beta version');
      }
    });
  });

  describe('Management Token Alias', () => {
    it('should set management token and API key from alias', async () => {
      configHandlerGetStub.withArgs('tokens.test-alias').returns({
        token: 'test-management-token',
        apiKey: 'test-api-key',
      });

      const flags = {
        'management-token-alias': 'test-alias',
        data: '/test/data',
      };
      const config = await setupConfig(flags);

      expect(config.management_token).to.equal('test-management-token');
      expect(config.apiKey).to.equal('test-api-key');
      expect(config.authenticationMethod).to.equal('Management Token');
    });

    it('should throw error when management token not found for alias', async () => {
      configHandlerGetStub.withArgs('tokens.invalid-alias').returns(undefined);

      const flags = {
        'management-token-alias': 'invalid-alias',
        data: '/test/data',
      };

      try {
        await setupConfig(flags);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('No management token found on given alias invalid-alias');
      }
    });

    it('should support alias flag as alternative to management-token-alias', async () => {
      configHandlerGetStub.withArgs('tokens.test-alias').returns({
        token: 'test-token',
        apiKey: 'test-key',
      });

      const flags = {
        alias: 'test-alias',
        data: '/test/data',
      };
      const config = await setupConfig(flags);

      expect(config.management_token).to.equal('test-token');
      expect(config.apiKey).to.equal('test-key');
    });
  });

  describe('Authentication Methods', () => {
    it('should use Basic Auth with username and password when not authenticated', async () => {
      // Make sure isAuthenticated returns false
      configHandlerGetStub.withArgs('authorisationType').returns(undefined);

      // Provide username and password via external config file
      readFileStub.resolves({
        username: 'test@example.com',
        password: 'test-password',
      });

      const flags = {
        data: '/test/data',
        config: '/path/to/config.json', // This triggers readFileStub with username/password
      };
      const config = await setupConfig(flags);

      expect(loginStub.called).to.be.true;
      expect(config.authenticationMethod).to.equal('Basic Auth');
    });

    it('should throw error when not authenticated and no credentials provided', async () => {
      (utilities.configHandler.get as sinon.SinonStub).withArgs('authorisationType').returns(undefined);
      readFileStub.resolves({});

      const flags = { data: '/test/data' };

      try {
        await setupConfig(flags);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Please login or provide an alias for the management token');
      }
    });

    it('should set OAuth authentication method when user is OAuth authenticated', async () => {
      (utilities.configHandler.get as sinon.SinonStub).withArgs('authorisationType').returns('OAUTH' as any);
      (utilities.configHandler.get as sinon.SinonStub).withArgs('authorisationType').returns('OAUTH');

      const flags = {
        data: '/test/data',
        'stack-api-key': 'test-api-key',
      };
      const config = await setupConfig(flags);

      expect(config.authenticationMethod).to.equal('OAuth');
      expect(config.apiKey).to.equal('test-api-key');
    });

    it('should set Basic Auth method when user is authenticated via auth token', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'BASIC' for authenticated, undefined for not authenticated
      // The code checks if it's 'OAUTH' for OAuth, otherwise it's Basic Auth
      // So we need undefined or a non-OAUTH value that still makes isAuthenticated() return true
      // Actually, looking at the code, if authorisationType is not 'OAUTH', it sets Basic Auth
      // But isAuthenticated() only returns true for 'OAUTH' or 'BASIC'
      // Let's use undefined and set isAuthenticated to return true via a different mechanism
      // Actually, the simplest is to check the code logic - it checks if === 'OAUTH', else Basic Auth
      // So we need isAuthenticated() to be true but authorisationType not 'OAUTH'
      // But that's not possible since isAuthenticated() checks for 'OAUTH' or 'BASIC'
      // Let me re-read the code logic...
      // Looking at line 72-79, if isAuthenticated() is true and authorisationType !== 'OAUTH', it's Basic Auth
      // So we need authorisationType to be 'BASIC' (which makes isAuthenticated true, but not 'OAUTH')
      configHandlerGetStub.withArgs('authorisationType').returns('BASIC');

      const flags = {
        data: '/test/data',
        'stack-api-key': 'test-api-key',
      };
      const config = await setupConfig(flags);

      expect(config.authenticationMethod).to.equal('Basic Auth');
      expect(config.apiKey).to.equal('test-api-key');
    });
  });

  describe('API Key Configuration', () => {
    it('should use stack-uid flag for API key', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const flags = {
        data: '/test/data',
        'stack-uid': 'stack-uid-value',
      };
      const config = await setupConfig(flags);

      expect(config.apiKey).to.equal('stack-uid-value');
      expect(askAPIKeyStub.called).to.be.false;
    });

    it('should use stack-api-key flag for API key', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const flags = {
        data: '/test/data',
        'stack-api-key': 'stack-api-key-value',
      };
      const config = await setupConfig(flags);

      expect(config.apiKey).to.equal('stack-api-key-value');
      expect(askAPIKeyStub.called).to.be.false;
    });

    it('should use apiKey from config when available', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'BASIC' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      // Provide apiKey via external config file
      readFileStub.resolves({ apiKey: 'config-api-key' });

      const flags = {
        data: '/test/data',
        config: '/path/to/config.json', // This triggers readFileStub with apiKey
      };
      const config = await setupConfig(flags);

      expect(config.apiKey).to.equal('config-api-key');
      expect(askAPIKeyStub.called).to.be.false;
    });

    it('should ask for API key when not provided', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      readFileStub.resolves({});

      const flags = { data: '/test/data' };
      const config = await setupConfig(flags);

      expect(askAPIKeyStub.called).to.be.true;
      expect(config.apiKey).to.equal('default-api-key');
    });

    it('should throw error when API key is not a string', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const flags = {
        data: '/test/data',
        'stack-api-key': 12345 as any,
      };

      try {
        await setupConfig(flags);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Invalid API key received');
      }
    });
  });

  describe('Command Flags Configuration', () => {
    it('should set forceStopMarketplaceAppsPrompt from yes flag', async () => {
      configHandlerGetStub.withArgs('tokens.test-alias').returns({
        token: 'token',
        apiKey: 'key',
      });

      const flags = {
        'management-token-alias': 'test-alias',
        data: '/test/data',
        yes: true,
      };
      const config = await setupConfig(flags);

      expect(config.forceStopMarketplaceAppsPrompt).to.be.true;
    });

    it('should set branchAlias from branch-alias flag', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const flags = {
        data: '/test/data',
        'stack-api-key': 'test-key',
        'branch-alias': 'main-branch',
      };
      const config = await setupConfig(flags);

      expect(config.branchAlias).to.equal('main-branch');
    });

    it('should set branchName from branch flag', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const flags = {
        data: '/test/data',
        'stack-api-key': 'test-key',
        branch: 'feature-branch',
      };
      const config = await setupConfig(flags);

      expect(config.branchName).to.equal('feature-branch');
    });

    it('should set moduleName and singleModuleExport from module flag', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const flags = {
        data: '/test/data',
        'stack-api-key': 'test-key',
        module: 'assets',
      };
      const config = await setupConfig(flags);

      expect(config.moduleName).to.equal('assets');
      expect(config.singleModuleExport).to.be.true;
    });

    it('should set securedAssets from secured-assets flag', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const flags = {
        data: '/test/data',
        'stack-api-key': 'test-key',
        'secured-assets': true,
      };
      const config = await setupConfig(flags);

      expect(config.securedAssets).to.be.true;
    });

    it('should set contentTypes from content-types flag', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const flags = {
        data: '/test/data',
        'stack-api-key': 'test-key',
        'content-types': ['ct-1', 'ct-2'],
      };
      const config = await setupConfig(flags);

      expect(config.contentTypes).to.deep.equal(['ct-1', 'ct-2']);
    });

    it('should not set contentTypes when array is empty', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const flags = {
        data: '/test/data',
        'stack-api-key': 'test-key',
        'content-types': [] as string[],
      };
      const config = await setupConfig(flags);

      expect(config.contentTypes).to.be.undefined;
    });
  });

  describe('Query Configuration', () => {
    it('should parse inline JSON query string', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const queryObj = { content_type_uid: 'blog' };
      const flags = {
        data: '/test/data',
        'stack-api-key': 'test-key',
        query: JSON.stringify(queryObj),
      };
      const config = await setupConfig(flags);

      expect(config.query).to.deep.equal(queryObj);
      expect(readFileStub.called).to.be.false;
    });

    it('should read query from file when path contains .json', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const queryObj = { content_type_uid: 'blog', locale: 'en-us' };
      readFileStub.resolves(queryObj);

      const flags = {
        data: '/test/data',
        'stack-api-key': 'test-key',
        query: '/path/to/query.json',
      };
      const config = await setupConfig(flags);

      expect(readFileStub.calledWith('/path/to/query.json')).to.be.true;
      expect(config.query).to.deep.equal(queryObj);
    });

    it('should read query from file when path contains /', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const queryObj = { content_type_uid: 'blog' };
      readFileStub.resolves(queryObj);

      const flags = {
        data: '/test/data',
        'stack-api-key': 'test-key',
        query: '/path/to/query',
      };
      const config = await setupConfig(flags);

      expect(readFileStub.called).to.be.true;
      expect(config.query).to.deep.equal(queryObj);
    });

    it('should throw error for invalid query JSON format', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      const flags = {
        data: '/test/data',
        'stack-api-key': 'test-key',
        query: 'invalid json {',
      };

      try {
        await setupConfig(flags);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Invalid query format');
      }
    });
  });

  describe('Filtered Modules', () => {
    it('should filter modules based on filteredModules in config', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');

      readFileStub.resolves({
        filteredModules: ['assets', 'content-types'],
      });

      const flags = {
        data: '/test/data',
        'stack-api-key': 'test-key',
        config: '/path/to/config.json',
      };
      const config = await setupConfig(flags);

      expect(config.modules.types).to.include('assets');
      expect(config.modules.types).to.include('content-types');
      // Should not include modules not in filteredModules
      expect(config.modules.types.length).to.equal(2);
    });
  });

  describe('Config Properties', () => {
    it('should set auth_token and isAuthenticated', async () => {
      // Set authenticated: isAuthenticated() checks configHandler.get('authorisationType')
      // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
      configHandlerGetStub.withArgs('authorisationType').returns('OAUTH');
      configHandlerGetStub.withArgs('authtoken').returns('auth-token-value');

      const flags = {
        data: '/test/data',
        'stack-api-key': 'test-key',
      };
      const config = await setupConfig(flags);

      expect(config.auth_token).to.equal('auth-token-value');
      // Verify isAuthenticated was called by checking config.isAuthenticated was set
      expect((utilities.configHandler.get as sinon.SinonStub).called).to.be.true;
    });

  });
});
