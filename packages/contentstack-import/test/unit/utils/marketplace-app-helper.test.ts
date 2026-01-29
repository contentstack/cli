import { expect } from 'chai';
import sinon from 'sinon';
import {
  getAllStackSpecificApps,
  getDeveloperHubUrl,
  getOrgUid,
  getConfirmationToCreateApps,
  handleNameConflict,
  makeRedirectUrlCall,
  confirmToCloseProcess,
  ifAppAlreadyExist,
} from '../../../src/utils/marketplace-app-helper';
import { ImportConfig } from '../../../src/types';
import * as interactive from '../../../src/utils/interactive';
import * as cliUtilities from '@contentstack/cli-utilities';
import { HttpClient } from '@contentstack/cli-utilities';
// Removed import of non-existent log module - using cliUtilities.log instead

describe('Marketplace App Helper', () => {
  let sandbox: sinon.SinonSandbox;
  let mockConfig: ImportConfig;
  let marketplaceSDKClientStub: sinon.SinonStub;
  let managementSDKClientStub: sinon.SinonStub;
  let cliuxConfirmStub: sinon.SinonStub;
  let cliuxPrintStub: sinon.SinonStub;
  let askAppNameStub: sinon.SinonStub;
  let selectConfigurationStub: sinon.SinonStub;
  let HttpClientStub: any;
  let logStub: any;
  let cliUtilitiesModule: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    mockConfig = {
      org_uid: 'test-org-uid',
      apiKey: 'test-stack-uid',
      host: 'https://api.contentstack.io',
      developerHubBaseUrl: 'https://developerhub-api.contentstack.com',
      forceStopMarketplaceAppsPrompt: false,
    } as ImportConfig;

    // Mock cli-utilities
    cliUtilitiesModule = require('@contentstack/cli-utilities');
    
    // Mock marketplaceSDKClient
    marketplaceSDKClientStub = sandbox.stub(cliUtilitiesModule, 'marketplaceSDKClient');
    
    // Mock managementSDKClient - we'll replace it per test as needed
    // Initial default mock
    managementSDKClientStub = sandbox.stub(cliUtilitiesModule, 'managementSDKClient').value(() => Promise.resolve({ stack: () => ({ fetch: () => Promise.resolve({ org_uid: '' }) }) })) as any;
    
    // Let createDeveloperHubUrl execute directly - no need to stub it
    cliuxConfirmStub = sandbox.stub(cliUtilitiesModule.cliux, 'confirm');
    cliuxPrintStub = sandbox.stub(cliUtilitiesModule.cliux, 'print');
    // Let handleAndLogError execute directly - no need to stub

    // Mock log
    logStub = {
      debug: sandbox.stub(),
      info: sandbox.stub(),
      warn: sandbox.stub(),
      error: sandbox.stub(),
      success: sandbox.stub(),
    };
    sandbox.stub(cliUtilitiesModule, 'log').value(logStub);

    // Mock interactive
    askAppNameStub = sandbox.stub(interactive, 'askAppName');
    selectConfigurationStub = sandbox.stub(interactive, 'selectConfiguration');

    // Let trace execute directly - no need to stub

    // HttpClient mocking - temporarily commented out due to non-configurable property
    // TODO: Fix HttpClient mocking for makeRedirectUrlCall tests
    // HttpClientStub = {
    //   get: sandbox.stub().returns({
    //     then: sandbox.stub().callsFake((callback) => {
    //       callback({ response: { status: 200, statusText: 'OK' } });
    //       return {
    //         catch: sandbox.stub().callsFake((errorCallback) => {
    //           return { catch: errorCallback };
    //         }),
    //       };
    //     }),
    //   }),
    // };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getAllStackSpecificApps', () => {
    it('should fetch apps and return list when count is less than or equal to skip + 50', async () => {
      const mockApps = [
        { uid: 'app1', name: 'App 1', fetch: () => {} },
        { uid: 'app2', name: 'App 2', fetch: () => {} },
      ];

      const mockCollection = {
        items: mockApps,
        count: 2,
      };

      const mockMarketplace = {
        marketplace: sandbox.stub().returns({
          installation: sandbox.stub().returns({
            fetchAll: sandbox.stub().resolves(mockCollection),
          }),
        }),
      };

      marketplaceSDKClientStub.resolves(mockMarketplace);

      const result = await getAllStackSpecificApps(mockConfig);

      expect(result).to.have.lengthOf(2);
      expect(result[0]).to.deep.equal({ uid: 'app1', name: 'App 1' });
      expect(result[1]).to.deep.equal({ uid: 'app2', name: 'App 2' });
      expect(logStub.info.called).to.be.true;
    });

    it('should recursively fetch more apps when count exceeds skip + 50', async () => {
      const mockApps1 = [{ uid: 'app1', name: 'App 1', fetch: () => {} }];
      const mockApps2 = [{ uid: 'app2', name: 'App 2', fetch: () => {} }];

      const mockCollection1 = { items: mockApps1, count: 51 };
      const mockCollection2 = { items: mockApps2, count: 51 };

      const mockFetchAll = sandbox.stub();
      mockFetchAll.onFirstCall().resolves(mockCollection1);
      mockFetchAll.onSecondCall().resolves(mockCollection2);

      const mockMarketplace = {
        marketplace: sandbox.stub().returns({
          installation: sandbox.stub().returns({
            fetchAll: mockFetchAll,
          }),
        }),
      };

      marketplaceSDKClientStub.resolves(mockMarketplace);

      const result = await getAllStackSpecificApps(mockConfig);

      expect(result).to.have.lengthOf(2);
      expect(mockFetchAll.calledTwice).to.be.true;
      expect(mockFetchAll.firstCall.args[0]).to.deep.equal({
        target_uids: 'test-stack-uid',
        skip: 0,
      });
      expect(mockFetchAll.secondCall.args[0]).to.deep.equal({
        target_uids: 'test-stack-uid',
        skip: 50,
      });
    });

    it('should handle errors and return existing list', async () => {
      const error = new Error('API Error');
      const mockFetchAll = sandbox.stub().rejects(error);
      const mockMarketplace = {
        marketplace: sandbox.stub().returns({
          installation: sandbox.stub().returns({
            fetchAll: mockFetchAll,
          }),
        }),
      };

      marketplaceSDKClientStub.resolves(mockMarketplace);

      const result = await getAllStackSpecificApps(mockConfig, 0, []);

      expect(result).to.deep.equal([]);
      // Error handling should have been called (even if async)
      // The catch block calls handleAndLogError and trace
    });

    it('should remove function properties from apps', async () => {
      const mockApps = [
        { uid: 'app1', name: 'App 1', method: () => {}, property: 'value' },
      ];

      const mockCollection = { items: mockApps, count: 1 };

      const mockMarketplace = {
        marketplace: sandbox.stub().returns({
          installation: sandbox.stub().returns({
            fetchAll: sandbox.stub().resolves(mockCollection),
          }),
        }),
      };

      marketplaceSDKClientStub.resolves(mockMarketplace);

      const result = await getAllStackSpecificApps(mockConfig);

      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.have.property('uid', 'app1');
      expect(result[0]).to.have.property('name', 'App 1');
      expect(result[0]).to.have.property('property', 'value');
      expect(result[0]).to.not.have.property('method');
    });
  });

  describe('getDeveloperHubUrl', () => {
    it('should create and return developer hub URL', async () => {
      const result = await getDeveloperHubUrl(mockConfig);

      expect(result).to.be.a('string');
      expect(result).to.not.be.empty;
      expect(logStub.debug.called).to.be.true;
    });
  });

  describe('getOrgUid', () => {
    it('should fetch and return org_uid from stack', async () => {
      const mockStackData = { org_uid: 'test-org-123' };
      const mockStack = {
        fetch: sandbox.stub().resolves(mockStackData),
      };
      const mockClient = {
        stack: sandbox.stub().returns(mockStack),
      };

      // Replace managementSDKClient for this test
      const cliUtilsModule = require('@contentstack/cli-utilities');
      sandbox.replace(cliUtilsModule, 'managementSDKClient', () => Promise.resolve(mockClient));

      const result = await getOrgUid(mockConfig);

      expect(result).to.equal('test-org-123');
      expect(mockClient.stack.calledWith({ api_key: mockConfig.apiKey })).to.be.true;
    });

    it('should return empty string when org_uid is not present', async () => {
      const mockStackData = {};
      const mockStack = {
        fetch: sandbox.stub().resolves(mockStackData),
      };
      const mockClient = {
        stack: sandbox.stub().returns(mockStack),
      };

      const cliUtilsModule = require('@contentstack/cli-utilities');
      sandbox.replace(cliUtilsModule, 'managementSDKClient', () => Promise.resolve(mockClient));

      const result = await getOrgUid(mockConfig);

      expect(result).to.equal('');
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Stack fetch error');
      const mockStack = {
        fetch: sandbox.stub().rejects(error),
      };
      const mockClient = {
        stack: sandbox.stub().returns(mockStack),
      };

      const cliUtilsModule = require('@contentstack/cli-utilities');
      sandbox.replace(cliUtilsModule, 'managementSDKClient', () => Promise.resolve(mockClient));

      const result = await getOrgUid(mockConfig);

      expect(result).to.equal('');
      // Error handling functions execute directly
    });
  });

  describe('getConfirmationToCreateApps', () => {
    it('should return true when forceStopMarketplaceAppsPrompt is enabled', async () => {
      mockConfig.forceStopMarketplaceAppsPrompt = true;

      const result = await getConfirmationToCreateApps([{ manifest: { name: 'App 1' } }], mockConfig);

      expect(result).to.be.true;
      expect(cliuxConfirmStub.called).to.be.false;
    });

    it('should return true when user confirms to create apps', async () => {
      cliuxConfirmStub.resolves(true);

      const result = await getConfirmationToCreateApps(
        [{ manifest: { name: 'App 1' } }, { manifest: { name: 'App 2' } }],
        mockConfig,
      );

      expect(result).to.be.true;
      expect(cliuxConfirmStub.calledOnce).to.be.true;
    });

    it('should return false when user confirms to proceed without creating apps', async () => {
      cliuxConfirmStub.onFirstCall().resolves(false); // First: decline to create
      cliuxConfirmStub.onSecondCall().resolves(true); // Second: proceed without creating

      const result = await getConfirmationToCreateApps([{ manifest: { name: 'App 1' } }], mockConfig);

      expect(result).to.be.false;
      expect(cliuxConfirmStub.calledTwice).to.be.true;
    });

    it('should return true when user confirms on second prompt', async () => {
      cliuxConfirmStub.onFirstCall().resolves(false); // First: decline
      cliuxConfirmStub.onSecondCall().resolves(false); // Second: decline to proceed without
      cliuxConfirmStub.onThirdCall().resolves(true); // Third: confirm to create

      const result = await getConfirmationToCreateApps([{ manifest: { name: 'App 1' } }], mockConfig);

      expect(result).to.be.true;
      expect(cliuxConfirmStub.calledThrice).to.be.true;
    });

    it('should return false when user declines all prompts', async () => {
      cliuxConfirmStub.onFirstCall().resolves(false);
      cliuxConfirmStub.onSecondCall().resolves(false);
      cliuxConfirmStub.onThirdCall().resolves(false);

      const result = await getConfirmationToCreateApps([{ manifest: { name: 'App 1' } }], mockConfig);

      expect(result).to.be.false;
      expect(cliuxConfirmStub.calledThrice).to.be.true;
    });
  });

  describe('handleNameConflict', () => {
    it('should use getAppName when forceStopMarketplaceAppsPrompt is enabled', async () => {
      mockConfig.forceStopMarketplaceAppsPrompt = true;
      const app = { name: 'Test App' };

      const result = await handleNameConflict(app, 1, mockConfig);

      expect(result).to.equal(app);
      expect(result.name).to.be.a('string');
      expect(askAppNameStub.called).to.be.false;
    });

    it('should call askAppName when forceStopMarketplaceAppsPrompt is disabled', async () => {
      const app = { name: 'Test App' };
      askAppNameStub.resolves('New App Name');

      const result = await handleNameConflict(app, 2, mockConfig);

      expect(result).to.equal(app);
      expect(result.name).to.equal('New App Name');
      expect(askAppNameStub.calledOnce).to.be.true;
      expect(askAppNameStub.calledWith(app, 2)).to.be.true;
    });
  });

  describe('makeRedirectUrlCall', () => {
    it('should make redirect URL call when redirect_url is present', async () => {
      const response = { redirect_url: 'https://example.com/redirect' };
      const appName = 'Test App';

      // Mock successful response using prototype stub (like auth-handler.test.ts)
      // HttpClient.get returns a promise that resolves with { response: { status, statusText } }
      const httpClientGetStub = sandbox.stub(HttpClient.prototype, 'get').resolves({
        response: { status: 200, statusText: 'OK' },
      } as any);

      await makeRedirectUrlCall(response, appName, mockConfig);

      expect(httpClientGetStub.calledWith('https://example.com/redirect')).to.be.true;
      expect(logStub.info.called).to.be.true;
      expect(logStub.success.called).to.be.true;
      
      httpClientGetStub.restore();
    });

    it('should handle 501/403 errors and call confirmToCloseProcess', async () => {
      const response = { redirect_url: 'https://example.com/redirect' };
      const appName = 'Test App';

      // Mock error response (501 status)
      const httpClientGetStub = sandbox.stub(HttpClient.prototype, 'get').resolves({
        response: { status: 501, statusText: 'Not Implemented', data: { message: 'Error' } },
      } as any);

      // Stub confirmToCloseProcess
      const confirmToCloseProcessStub = sandbox.stub().resolves();
      sandbox.replace(require('../../../src/utils/marketplace-app-helper'), 'confirmToCloseProcess', confirmToCloseProcessStub);

      await makeRedirectUrlCall(response, appName, mockConfig);

      expect(logStub.error.called).to.be.true;
      expect(confirmToCloseProcessStub.called).to.be.true;
      
      httpClientGetStub.restore();
    });

    it('should handle catch errors with 501/403 status', async () => {
      const response = { redirect_url: 'https://example.com/redirect' };
      const appName = 'Test App';
      const error = { status: 403, message: 'Forbidden' };

      // Mock error that gets caught
      const httpClientGetStub = sandbox.stub(HttpClient.prototype, 'get').rejects(error);

      await makeRedirectUrlCall(response, appName, mockConfig);

      // Error handling functions execute directly
      expect(httpClientGetStub.calledWith('https://example.com/redirect')).to.be.true;
      
      httpClientGetStub.restore();
    });

    it('should do nothing when redirect_url is not present', async () => {
      const response = {};
      const appName = 'Test App';

      // Stub HttpClient.get to verify it's not called
      const httpClientGetStub = sandbox.stub(HttpClient.prototype, 'get');

      await makeRedirectUrlCall(response, appName, mockConfig);

      expect(httpClientGetStub.called).to.be.false;
      expect(logStub.debug.calledWith(sinon.match(/No redirect URL/))).to.be.true;
      
      httpClientGetStub.restore();
    });
  });

  describe('confirmToCloseProcess', () => {
    it('should exit process when user chooses not to proceed', async () => {
      cliuxConfirmStub.resolves(false);
      const exitStub = sandbox.stub(process, 'exit');

      await confirmToCloseProcess({ message: 'Test error' }, mockConfig);

      expect(cliuxConfirmStub.called).to.be.true;
      expect(exitStub.called).to.be.true;
      exitStub.restore();
    });

    it('should continue when user chooses to proceed', async () => {
      cliuxConfirmStub.resolves(true);
      const exitStub = sandbox.stub(process, 'exit');

      await confirmToCloseProcess({ message: 'Test error' }, mockConfig);

      expect(cliuxConfirmStub.called).to.be.true;
      expect(exitStub.called).to.be.false;
      expect(logStub.warn.called).to.be.true;
      exitStub.restore();
    });

    it('should continue when forceStopMarketplaceAppsPrompt is enabled', async () => {
      mockConfig.forceStopMarketplaceAppsPrompt = true;
      const exitStub = sandbox.stub(process, 'exit');

      await confirmToCloseProcess({ message: 'Test error' }, mockConfig);

      expect(cliuxConfirmStub.called).to.be.false;
      expect(exitStub.called).to.be.false;
      exitStub.restore();
    });
  });

  describe('ifAppAlreadyExist', () => {
    it('should return empty object when app has no configuration', async () => {
      const app = {
        manifest: { name: 'Test App' },
        configuration: {},
        server_configuration: {},
      };
      const currentStackApp = { uid: 'app-123' };

      const result = await ifAppAlreadyExist(app, currentStackApp, mockConfig);

      expect(result).to.deep.equal({});
      expect(cliuxPrintStub.called).to.be.false;
    });

    it('should return update params when user chooses to update configuration', async () => {
      const app = {
        manifest: { name: 'Test App', uid: 'app-uid' },
        configuration: { key: 'value' },
        server_configuration: {},
      };
      const currentStackApp = { uid: 'app-123', title: 'Existing App' };
      selectConfigurationStub.resolves('Update it with the new configuration.');

      const result = await ifAppAlreadyExist(app, currentStackApp, mockConfig);

      expect(result).to.have.property('manifest');
      expect((result as any).configuration).to.deep.equal({ key: 'value' });
      expect(result).to.have.property('uid', 'app-123');
      expect(selectConfigurationStub.called).to.be.true;
    });

    it('should return empty object when user chooses not to update', async () => {
      const app = {
        manifest: { name: 'Test App' },
        configuration: { key: 'value' },
        server_configuration: {},
      };
      const currentStackApp = { uid: 'app-123' };
      selectConfigurationStub.resolves('Do not update the configuration (WARNING!!! If you do not update the configuration, there may be some issues with the content which you import).');

      const result = await ifAppAlreadyExist(app, currentStackApp, mockConfig);

      expect(result).to.deep.equal({});
    });

    it('should exit process when user chooses Exit', async () => {
      const app = {
        manifest: { name: 'Test App' },
        configuration: { key: 'value' },
        server_configuration: {},
      };
      const currentStackApp = { uid: 'app-123' };
      selectConfigurationStub.resolves('Exit');
      const exitStub = sandbox.stub(process, 'exit');

      await ifAppAlreadyExist(app, currentStackApp, mockConfig);

      expect(exitStub.called).to.be.true;
      exitStub.restore();
    });

    it('should use forceStopMarketplaceAppsPrompt to skip prompt', async () => {
      mockConfig.forceStopMarketplaceAppsPrompt = true;
      const app = {
        manifest: { name: 'Test App', uid: 'app-uid' },
        configuration: { key: 'value' },
        server_configuration: {},
      };
      const currentStackApp = { uid: 'app-123' };

      const result = await ifAppAlreadyExist(app, currentStackApp, mockConfig);

      expect((result as any).configuration).to.deep.equal({ key: 'value' });
      expect(selectConfigurationStub.called).to.be.false;
    });
  });
});

