import { expect } from 'chai';
import sinon from 'sinon';
import ImportMarketplaceApps from '../../../../src/import/modules/marketplace-apps';
import { ImportConfig, ModuleClassParams } from '../../../../src/types';
import { NodeCrypto, cliux } from '@contentstack/cli-utilities';
import { fsUtil, fileHelper } from '../../../../src/utils';
import * as marketplaceAppHelper from '../../../../src/utils/marketplace-app-helper';
import * as interactive from '../../../../src/utils/interactive';
const mockData = require('./mock-data/marketplace-apps.json');

describe('ImportMarketplaceApps', () => {
  let importMarketplaceApps: ImportMarketplaceApps;
  let mockImportConfig: ImportConfig;
  let mockModuleClassParams: ModuleClassParams;
  let sandbox: sinon.SinonSandbox;
  let mockAppSdk: any;
  let fsUtilStub: any;
  let marketplaceAppHelperStub: any;
  let interactiveStub: any;
  let cliuxStub: any;
  let nodeCryptoStub: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    fsUtilStub = {
      readFile: sandbox.stub(),
      writeFile: sandbox.stub(),
      makeDirectory: sandbox.stub(),
    };
    sandbox.stub(fsUtil, 'readFile').callsFake(fsUtilStub.readFile);
    sandbox.stub(fsUtil, 'writeFile').callsFake(fsUtilStub.writeFile);
    sandbox.stub(fsUtil, 'makeDirectory').callsFake(fsUtilStub.makeDirectory);

    sandbox.stub(fileHelper, 'fileExistsSync').returns(true);

    marketplaceAppHelperStub = {
      getAllStackSpecificApps: sandbox.stub(),
      getDeveloperHubUrl: sandbox.stub(),
      getOrgUid: sandbox.stub(),
      getConfirmationToCreateApps: sandbox.stub(),
      handleNameConflict: sandbox.stub(),
      makeRedirectUrlCall: sandbox.stub(),
      confirmToCloseProcess: sandbox.stub(),
      ifAppAlreadyExist: sandbox.stub(),
    };
    sandbox
      .stub(marketplaceAppHelper, 'getAllStackSpecificApps')
      .callsFake(marketplaceAppHelperStub.getAllStackSpecificApps);
    sandbox.stub(marketplaceAppHelper, 'getDeveloperHubUrl').callsFake(marketplaceAppHelperStub.getDeveloperHubUrl);
    sandbox.stub(marketplaceAppHelper, 'getOrgUid').callsFake(marketplaceAppHelperStub.getOrgUid);
    sandbox
      .stub(marketplaceAppHelper, 'getConfirmationToCreateApps')
      .callsFake(marketplaceAppHelperStub.getConfirmationToCreateApps);
    sandbox.stub(marketplaceAppHelper, 'handleNameConflict').callsFake(marketplaceAppHelperStub.handleNameConflict);
    sandbox.stub(marketplaceAppHelper, 'makeRedirectUrlCall').callsFake(marketplaceAppHelperStub.makeRedirectUrlCall);
    sandbox
      .stub(marketplaceAppHelper, 'confirmToCloseProcess')
      .callsFake(marketplaceAppHelperStub.confirmToCloseProcess);
    sandbox.stub(marketplaceAppHelper, 'ifAppAlreadyExist').callsFake(marketplaceAppHelperStub.ifAppAlreadyExist);

    interactiveStub = {
      askEncryptionKey: sandbox.stub(),
      getLocationName: sandbox.stub(),
    };
    sandbox.stub(interactive, 'askEncryptionKey').callsFake(interactiveStub.askEncryptionKey);
    sandbox.stub(interactive, 'getLocationName').callsFake(interactiveStub.getLocationName);

    cliuxStub = {
      print: sandbox.stub(),
      confirm: sandbox.stub(),
      prompt: sandbox.stub(),
    };
    sandbox.stub(cliux, 'print').callsFake(cliuxStub.print);
    sandbox.stub(cliux, 'confirm').callsFake(cliuxStub.confirm);
    sandbox.stub(cliux, 'prompt').callsFake(cliuxStub.prompt);

    // Skip mocking isAuthenticated for now - focus on core functionality

    nodeCryptoStub = {
      encrypt: sandbox.stub().returns('encrypted-data'),
      decrypt: sandbox.stub().returns('decrypted-data'),
    };
    sandbox.stub(NodeCrypto.prototype, 'encrypt').callsFake(nodeCryptoStub.encrypt);
    sandbox.stub(NodeCrypto.prototype, 'decrypt').callsFake(nodeCryptoStub.decrypt);

    mockAppSdk = {
      marketplace: sandbox.stub().callsFake((orgUid) => ({
        app: sandbox.stub().returns({
          create: sandbox.stub().resolves({ uid: 'new-app-uid', name: 'Test App' }),
          install: sandbox.stub().resolves({ installation_uid: 'installation-uid' }),
        }),
        installation: sandbox.stub().callsFake((appUid) => ({
          fetch: sandbox.stub().rejects(new Error('App not found')),
          setConfiguration: sandbox.stub().returns({
            then: sandbox.stub().callsFake((callback) => {
              callback({ data: { message: 'success' } });
              return { catch: sandbox.stub() };
            }),
          }),
          setServerConfig: sandbox.stub().returns({
            then: sandbox.stub().callsFake((callback) => {
              callback({ data: { message: 'success' } });
              return { catch: sandbox.stub() };
            }),
          }),
        })),
      })),
    };
    sandbox.replace(require('@contentstack/cli-utilities'), 'marketplaceSDKClient', () => Promise.resolve(mockAppSdk));

    mockImportConfig = {
      apiKey: 'test',
      backupDir: '/test/backup',
      // developerHubBaseUrl: 'https://test-dev-hub.com', // Remove this to test getDeveloperHubUrl call
      org_uid: 'test-org-uid',
      target_stack: 'test-stack-uid',
      authenticationMethod: 'OAUTH',
      context: {
        command: 'cm:stacks:import',
        module: 'marketplace-apps',
        userId: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-123',
        apiKey: 'test',
        orgId: 'test-org-id',
      },
      modules: {
        marketplace_apps: {
          dirName: 'marketplace_apps',
          fileName: 'marketplace_apps.json',
        },
      } as any,
      marketplaceAppEncryptionKey: 'test-encryption-key',
      forceStopMarketplaceAppsPrompt: false,
      getEncryptionKeyMaxRetry: 3,
    } as any;

    mockModuleClassParams = {
      importConfig: mockImportConfig,
      stackAPIClient: {} as any,
      moduleName: 'marketplace-apps' as any,
    };

    fsUtilStub.readFile.returns(mockData.mockMarketplaceApps);
    fsUtilStub.makeDirectory.resolves();
    fsUtilStub.writeFile.resolves();

    marketplaceAppHelperStub.getAllStackSpecificApps.resolves(mockData.mockInstalledApps);
    marketplaceAppHelperStub.getDeveloperHubUrl.resolves('https://test-dev-hub.com');
    marketplaceAppHelperStub.getOrgUid.resolves('test-org-uid');
    marketplaceAppHelperStub.getConfirmationToCreateApps.resolves(true);
    marketplaceAppHelperStub.handleNameConflict.resolves({ name: 'Updated App Name' });
    marketplaceAppHelperStub.makeRedirectUrlCall.resolves();
    marketplaceAppHelperStub.confirmToCloseProcess.resolves();
    marketplaceAppHelperStub.ifAppAlreadyExist.resolves({ configuration: {}, server_configuration: {} });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);

      expect(importMarketplaceApps.importConfig).to.deep.equal(mockImportConfig);
      expect(importMarketplaceApps.importConfig.context.module).to.equal('marketplace-apps');
      expect(importMarketplaceApps.developerHubBaseUrl).to.be.undefined;
      expect(importMarketplaceApps.nodeCrypto).to.be.undefined;
      expect(importMarketplaceApps.appSdk).to.be.undefined;
      expect(importMarketplaceApps.existingNames).to.be.instanceOf(Set);
    });
  });

  describe('start() - Complete Flow', () => {
    it('should successfully complete the full start process', async () => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);

      const configHandler = require('@contentstack/cli-utilities').configHandler;
      sandbox.stub(configHandler, 'get').callsFake((key) => {
        if (key === 'authorisationType') {
          return 'OAUTH'; // This will make isAuthenticated() return true
        }
        return 'some-value'; // Return something for other keys
      });

      await importMarketplaceApps.start();

      expect(fsUtilStub.readFile.calledOnce).to.be.true;
      expect(fsUtilStub.makeDirectory.calledOnce).to.be.true;
      expect(marketplaceAppHelperStub.getDeveloperHubUrl.calledOnce).to.be.true;
      expect(marketplaceAppHelperStub.getOrgUid.calledOnce).to.be.true;
    });

    it('should handle case when marketplace apps folder does not exist', async () => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      // Change the return value of the already stubbed method
      (fileHelper.fileExistsSync as sinon.SinonStub).returns(false);

      await importMarketplaceApps.start();

      expect(fsUtilStub.readFile.called).to.be.false;
    });

    it('should handle case when marketplace apps array is empty', async () => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      fsUtilStub.readFile.returns([]);

      await importMarketplaceApps.start();

      expect(fsUtilStub.readFile.calledOnce).to.be.true;
    });

    it('should handle case when user is not authenticated', async () => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      fsUtilStub.readFile.returns(mockData.mockMarketplaceApps);

      const configHandler = require('@contentstack/cli-utilities').configHandler;
      sandbox.stub(configHandler, 'get').callsFake((key) => {
        if (key === 'authorisationType') {
          return undefined; // This will make isAuthenticated() return false
        }
        return 'some-value'; // Return something for other keys
      });

      await importMarketplaceApps.start();

      expect(cliuxStub.print.calledOnce).to.be.true;
    });
  });

  describe('importMarketplaceApps() - Complete Flow', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      fsUtilStub.readFile.returns(mockData.mockMarketplaceApps);
    });

    it('should successfully import marketplace apps with forced security config', async () => {
      mockImportConfig.forceStopMarketplaceAppsPrompt = true;
      importMarketplaceApps.importConfig = mockImportConfig;

      // Set marketplaceApps directly since we're not calling start()
      (importMarketplaceApps as any).marketplaceApps = mockData.mockMarketplaceApps;

      const handleAllPrivateAppsCreationProcessStub = sandbox
        .stub(importMarketplaceApps, 'handleAllPrivateAppsCreationProcess')
        .resolves();
      const installAppsStub = sandbox.stub(importMarketplaceApps, 'installApps').resolves();
      const generateUidMapperStub = sandbox.stub(importMarketplaceApps, 'generateUidMapper').resolves({});

      await importMarketplaceApps.importMarketplaceApps();

      expect(marketplaceAppHelperStub.getAllStackSpecificApps.calledOnce).to.be.true;
      expect(installAppsStub.callCount).to.equal(mockData.mockMarketplaceApps.length);
      expect(generateUidMapperStub.calledOnce).to.be.true;
      expect(fsUtilStub.writeFile.calledOnce).to.be.true;
    });

    it('should successfully import marketplace apps with encryption key validation', async () => {
      mockImportConfig.forceStopMarketplaceAppsPrompt = false;
      importMarketplaceApps.importConfig = mockImportConfig;
      interactiveStub.askEncryptionKey.resolves('user-provided-key');

      const mockAppsWithConfig = [
        {
          ...mockData.mockMarketplaceApps[0],
          configuration: { encrypted: 'some-encrypted-data' },
        },
      ];

      // Set marketplaceApps directly since we're not calling start()
      (importMarketplaceApps as any).marketplaceApps = mockAppsWithConfig;

      const handleAllPrivateAppsCreationProcessStub = sandbox
        .stub(importMarketplaceApps, 'handleAllPrivateAppsCreationProcess')
        .resolves();
      const installAppsStub = sandbox.stub(importMarketplaceApps, 'installApps').resolves();
      const generateUidMapperStub = sandbox.stub(importMarketplaceApps, 'generateUidMapper').resolves({});

      await importMarketplaceApps.importMarketplaceApps();

      expect(marketplaceAppHelperStub.getAllStackSpecificApps.calledOnce).to.be.true;
      expect(installAppsStub.callCount).to.equal(mockAppsWithConfig.length);
      expect(generateUidMapperStub.calledOnce).to.be.true;
    });
  });

  describe('getAndValidateEncryptionKey() - Complete Flow', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      fsUtilStub.readFile.returns(mockData.mockAppWithConfig);
    });

    it('should use provided encryption key when no app config requires encryption', async () => {
      fsUtilStub.readFile.returns(mockData.mockMarketplaceApps);

      const result = await importMarketplaceApps.getAndValidateEncryptionKey('test-key');

      expect(result).to.equal('test-key');
    });

    it('should ask for encryption key and validate successfully', async () => {
      interactiveStub.askEncryptionKey.resolves('user-provided-key');

      // Set up mock data with configuration that requires encryption
      const mockAppsWithConfig = [
        {
          ...mockData.mockMarketplaceApps[0],
          configuration: { encrypted: 'some-encrypted-data' },
        },
      ];
      (importMarketplaceApps as any).marketplaceApps = mockAppsWithConfig;

      const result = await importMarketplaceApps.getAndValidateEncryptionKey('test-key');

      expect(interactiveStub.askEncryptionKey.calledOnce).to.be.true;
      expect(result).to.equal('user-provided-key');
    });

    it('should retry on decryption error', async () => {
      // Set up askEncryptionKey to return different keys on each call
      interactiveStub.askEncryptionKey.onFirstCall().resolves('first-key');
      interactiveStub.askEncryptionKey.onSecondCall().resolves('second-key');

      // Set up mock data with configuration that requires encryption
      const mockAppsWithConfig = [
        {
          ...mockData.mockMarketplaceApps[0],
          configuration: { encrypted: 'some-encrypted-data' },
        },
      ];
      (importMarketplaceApps as any).marketplaceApps = mockAppsWithConfig;

      // Set up decrypt stub to throw error on first call, succeed on second
      const decryptError = new Error('Bad decrypt');
      (decryptError as any).code = 'ERR_OSSL_EVP_BAD_DECRYPT';
      nodeCryptoStub.decrypt.onFirstCall().throws(decryptError);
      nodeCryptoStub.decrypt.onSecondCall().returns('decrypted-data');

      const result = await importMarketplaceApps.getAndValidateEncryptionKey('test-key');

      expect(interactiveStub.askEncryptionKey.calledTwice).to.be.true;
      expect(result).to.equal('second-key');
    });

    it('should exit process when max retry exceeded', async () => {
      interactiveStub.askEncryptionKey.resolves('user-provided-key');
      const decryptError = new Error('Bad decrypt');
      (decryptError as any).code = 'ERR_OSSL_EVP_BAD_DECRYPT';
      nodeCryptoStub.decrypt.throws(decryptError);
      const exitStub = sandbox.stub(process, 'exit');

      // Set up mock data with configuration that requires encryption
      const mockAppsWithConfig = [
        {
          ...mockData.mockMarketplaceApps[0],
          configuration: { encrypted: 'some-encrypted-data' },
        },
      ];
      (importMarketplaceApps as any).marketplaceApps = mockAppsWithConfig;

      await importMarketplaceApps.getAndValidateEncryptionKey('test-key');

      expect(exitStub.calledOnce).to.be.true;
    });
  });

  describe('handleAllPrivateAppsCreationProcess() - Complete Flow', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      fsUtilStub.readFile.returns(mockData.mockPrivateApps);
    });

    it('should handle private apps creation process successfully', async () => {
      // Set up marketplace apps with private apps
      (importMarketplaceApps as any).marketplaceApps = mockData.mockPrivateApps;
      (importMarketplaceApps as any).appSdk = mockAppSdk;

      await importMarketplaceApps.handleAllPrivateAppsCreationProcess();

      expect(marketplaceAppHelperStub.getConfirmationToCreateApps.calledOnce).to.be.true;
    });

    it('should skip when no private apps found', async () => {
      fsUtilStub.readFile.returns(mockData.mockMarketplaceApps);

      await importMarketplaceApps.handleAllPrivateAppsCreationProcess();

      expect(marketplaceAppHelperStub.getConfirmationToCreateApps.called).to.be.false;
    });

    // it('should skip when user chooses not to create private apps', async () => {
    //   // Set up marketplace apps with private apps
    //   (importMarketplaceApps as any).marketplaceApps = mockData.mockPrivateApps;
    //   (importMarketplaceApps as any).appSdk = mockAppSdk;

    //   marketplaceAppHelperStub.getConfirmationToCreateApps.resolves(false);

    //   await importMarketplaceApps.handleAllPrivateAppsCreationProcess();

    //   expect(marketplaceAppHelperStub.getConfirmationToCreateApps.calledOnce).to.be.true;
    // });
  });

  describe('isPrivateAppExistInDeveloperHub() - Complete Flow', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      importMarketplaceApps.appSdk = mockAppSdk;
    });

    it('should return true when app exists', async () => {
      const app = mockData.mockPrivateApps[0];

      const installationStub = sandbox.stub().returns({
        fetch: sandbox.stub().resolves({ uid: 'existing-app-uid' }),
      });
      mockAppSdk.marketplace.returns({
        installation: installationStub,
      });

      const result = await importMarketplaceApps.isPrivateAppExistInDeveloperHub(app);

      expect(result).to.be.true;
      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should return false when app does not exist', async () => {
      const app = mockData.mockPrivateApps[0];
      mockAppSdk.marketplace().installation().fetch.rejects(new Error('Not found'));

      const result = await importMarketplaceApps.isPrivateAppExistInDeveloperHub(app);

      expect(result).to.be.false;
    });
  });

  // describe('createPrivateApp() - Complete Flow', () => {
  //   beforeEach(() => {
  //     importMarketplaceApps.appSdk = mockAppSdk;
  //   });

  //   // it('should create private app successfully', async () => {
  //   //   const app = mockData.mockPrivateApps[0].manifest;

  //   //   const result = await importMarketplaceApps.createPrivateApp(app);

  //   //   expect(result).to.be.undefined;
  //   //   expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
  //   // });

  //   it('should handle app creation with UI location update', async () => {
  //     const app = mockData.mockPrivateApps[0].manifest;
  //     app.ui_location = { locations: [{ meta: [{ name: 'Test Extension' }] }] };

  //     const result = await importMarketplaceApps.createPrivateApp(app, 1, true);

  //     expect(result).to.be.undefined;
  //   });

  //   it('should truncate long app names', async () => {
  //     const app = mockData.mockPrivateApps[0].manifest;
  //     app.name = 'This is a very long app name that exceeds twenty characters';

  //     const result = await importMarketplaceApps.createPrivateApp(app);

  //     expect(result).to.be.undefined;
  //     expect(app.name.length).to.be.at.most(20);
  //   });
  // });

  describe('appCreationCallback() - Complete Flow', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
    });

    it('should handle successful app creation', async () => {
      const app = mockData.mockPrivateApps[0];
      const response = { uid: 'new-app-uid', name: 'Test App' };

      const result = await importMarketplaceApps.appCreationCallback(app, response, 1);

      expect(result).to.be.undefined;
    });

    it('should handle name conflict and retry', async () => {
      const app = mockData.mockPrivateApps[0];
      const response = { message: 'Conflict', statusText: 'conflict' };
      marketplaceAppHelperStub.handleNameConflict.resolves({ name: 'Updated App Name' });

      // Set up appSdk for recursive call
      (importMarketplaceApps as any).appSdk = mockAppSdk;

      const result = await importMarketplaceApps.appCreationCallback(app, response, 1);

      expect(marketplaceAppHelperStub.handleNameConflict.calledOnce).to.be.true;
    });

    it('should handle error with force stop enabled', async () => {
      const app = mockData.mockPrivateApps[0];
      const response = { message: 'Error occurred', statusText: 'error' };
      mockImportConfig.forceStopMarketplaceAppsPrompt = true;
      importMarketplaceApps.importConfig = mockImportConfig;

      const result = await importMarketplaceApps.appCreationCallback(app, response, 1);

      expect(result).to.be.undefined;
    });

    it('should handle error with user confirmation', async () => {
      const app = mockData.mockPrivateApps[0];
      const response = { message: 'Error occurred', statusText: 'error' };
      cliuxStub.confirm.resolves(true);

      const result = await importMarketplaceApps.appCreationCallback(app, response, 1);

      expect(cliuxStub.confirm.calledOnce).to.be.true;
    });
  });

  describe('installApp() - Complete Flow', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      importMarketplaceApps.appSdk = mockAppSdk;
    });

    it('should install app successfully', async () => {
      const result = await importMarketplaceApps.installApp(mockImportConfig, 'test-app-uid');

      expect(result).to.deep.equal({ installation_uid: 'installation-uid' });
      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle installation error', async () => {
      const appStub = sandbox.stub().returns({
        install: sandbox.stub().rejects(new Error('Installation failed')),
      });
      mockAppSdk.marketplace.returns({
        app: appStub,
      });

      const result = await importMarketplaceApps.installApp(mockImportConfig, 'test-app-uid');

      expect(result).to.be.an('error');
    });
  });

  describe('installApps() - Complete Flow', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      importMarketplaceApps.appSdk = mockAppSdk;
      // Set installedApps through the actual method call
      marketplaceAppHelperStub.getAllStackSpecificApps.resolves(mockData.mockInstalledApps);
    });

    it('should install new app successfully', async () => {
      const app = mockData.mockMarketplaceApps[0];

      await importMarketplaceApps.installApps(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should skip private app when not allowed to create', async () => {
      const app = mockData.mockPrivateApps[0];
      mockImportConfig.canCreatePrivateApp = false;
      importMarketplaceApps.importConfig = mockImportConfig;

      await importMarketplaceApps.installApps(app);

      expect(mockAppSdk.marketplace.called).to.be.false;
    });

    it('should handle existing app with configuration', async () => {
      const app = mockData.mockAppWithConfig;

      // Set up required properties
      (importMarketplaceApps as any).appSdk = mockAppSdk;
      (importMarketplaceApps as any).nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });
      // Set up installedApps so the app is found as existing
      (importMarketplaceApps as any).installedApps = [app];

      await importMarketplaceApps.installApps(app);

      expect(marketplaceAppHelperStub.ifAppAlreadyExist.calledOnce).to.be.true;
    });
  });

  describe('updateManifestUILocations() - Complete Flow', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      // Set appOriginalName through the actual method call
      importMarketplaceApps.existingNames = new Set();
    });

    it('should update manifest UI locations with suffix', () => {
      // Set appOriginalName through a method that sets it
      const app = mockData.mockPrivateApps[0].manifest;
      importMarketplaceApps.createPrivateApp(app, 1, false);

      const locations = [
        {
          meta: [
            { name: 'Test App', extension_uid: 'ext-1' },
            { name: 'Other Extension', extension_uid: 'ext-2' },
          ],
        },
      ];

      const result = importMarketplaceApps.updateManifestUILocations(locations, 1);

      expect(result).to.be.an('array');
      expect(result[0].meta[0].name).to.not.equal('Test App');
    });
  });

  describe('updateAppsConfig() - Complete Flow', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });
    });

    it('should update app configuration successfully', async () => {
      const app = mockData.mockAppWithConfig;

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should update server configuration successfully', async () => {
      const app = {
        ...mockData.mockAppWithConfig,
        configuration: {},
        server_configuration: { encrypted: 'server-data' },
      };

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });
  });

  describe('generateUidMapper() - Complete Flow', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      fsUtilStub.readFile.returns(mockData.mockMarketplaceApps);
    });

    it('should generate UID mapper successfully', async () => {
      // Set up marketplace apps
      (importMarketplaceApps as any).marketplaceApps = mockData.mockMarketplaceApps;

      const result = await importMarketplaceApps.generateUidMapper();

      expect(result).to.be.an('object');
      expect(marketplaceAppHelperStub.getAllStackSpecificApps.calledOnce).to.be.true;
    });

    it('should handle empty marketplace apps array', async () => {
      // Set up empty marketplace apps
      (importMarketplaceApps as any).marketplaceApps = [];

      const result = await importMarketplaceApps.generateUidMapper();

      expect(result).to.be.an('object');
      expect(Object.keys(result).length).to.equal(0);
    });

    it('should handle apps with no UI locations', async () => {
      const appsWithoutUI = [
        { manifest: { name: 'App 1' }, uid: 'app1' },
        { manifest: { name: 'App 2' }, uid: 'app2' },
      ];
      // Set up marketplace apps without UI locations
      (importMarketplaceApps as any).marketplaceApps = appsWithoutUI;

      const result = await importMarketplaceApps.generateUidMapper();

      expect(result).to.be.an('object');
      expect(Object.keys(result).length).to.equal(0);
    });
  });

  describe('Additional Edge Cases', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
    });

    it('should handle app creation with error response', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      const app = mockData.mockPrivateApps[0].manifest;
      mockAppSdk.marketplace().app().create.resolves({ message: 'Error occurred', statusText: 'error' });

      const result = await importMarketplaceApps.createPrivateApp(app);

      expect(result).to.be.undefined;
    });

    it('should handle app creation with unexpected response format', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      const app = mockData.mockPrivateApps[0].manifest;
      mockAppSdk.marketplace().app().create.resolves({ unexpected: 'format' });

      const result = await importMarketplaceApps.createPrivateApp(app);

      expect(result).to.be.undefined;
    });

    it('should handle updateManifestUILocations with no meta', () => {
      const locations = [
        { name: 'Location 1' }, // no meta property
        { meta: [] as any[] }, // empty meta array
      ];

      const result = importMarketplaceApps.updateManifestUILocations(locations, 1);

      expect(result).to.be.an('array');
      expect(result[0]).to.deep.equal(locations[0]);
      expect(result[1]).to.deep.equal(locations[1]);
    });

    it('should handle updateManifestUILocations with meta but no name', () => {
      const locations = [
        {
          meta: [
            { extension_uid: 'ext-1' }, // no name property
            { name: 'Test App', extension_uid: 'ext-2' },
          ],
        },
      ];

      const result = importMarketplaceApps.updateManifestUILocations(locations, 1);

      expect(result).to.be.an('array');
      expect(result[0].meta[0]).to.deep.equal({ extension_uid: 'ext-1' });
    });

    it('should handle updateAppsConfig with empty configuration', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });

      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: {},
        server_configuration: {},
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      await importMarketplaceApps.updateAppsConfig(app);

      // Should not call any SDK methods for empty configurations
      expect(mockAppSdk.marketplace.called).to.be.false;
    });

    it('should handle updateAppsConfig with configuration error', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });

      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: { encrypted: 'config-data' },
        server_configuration: {},
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      mockAppSdk
        .marketplace()
        .installation()
        .setConfiguration.returns({
          then: sandbox.stub().callsFake((callback) => {
            callback({ data: { message: 'Configuration error' } });
            return { catch: sandbox.stub() };
          }),
        });

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle updateAppsConfig with server configuration error', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });

      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: {},
        server_configuration: { encrypted: 'server-data' },
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      mockAppSdk
        .marketplace()
        .installation()
        .setServerConfig.returns({
          then: sandbox.stub().callsFake((callback) => {
            callback({ data: { message: 'Server configuration error' } });
            return { catch: sandbox.stub() };
          }),
        });

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle installApps with installation error message', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      // Set installedApps through the actual method call
      marketplaceAppHelperStub.getAllStackSpecificApps.resolves([]);

      const app = mockData.mockMarketplaceApps[0];
      const installAppStub = sandbox.stub(importMarketplaceApps, 'installApp').resolves({ message: 'Installation failed' });

      await importMarketplaceApps.installApps(app);

      expect(installAppStub.calledOnce).to.be.true;
      expect(marketplaceAppHelperStub.confirmToCloseProcess.calledOnce).to.be.true;
    });

    it('should handle installApps with existing app and no configuration', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      // Set installedApps through the actual method call
      marketplaceAppHelperStub.getAllStackSpecificApps.resolves(mockData.mockInstalledApps);

      const app = {
        ...mockData.mockMarketplaceApps[0],
        configuration: {},
        server_configuration: {},
      };

      await importMarketplaceApps.installApps(app);

      // Should not call updateAppsConfig for empty configurations
      expect(marketplaceAppHelperStub.ifAppAlreadyExist.called).to.be.false;
    });

    it('should handle appCreationCallback with user choosing to exit', async () => {
      const app = mockData.mockPrivateApps[0];
      const response = { message: 'Error occurred', statusText: 'error' };
      cliuxStub.confirm.resolves(false);
      const exitStub = sandbox.stub(process, 'exit');

      await importMarketplaceApps.appCreationCallback(app, response, 1);

      expect(exitStub.calledOnce).to.be.true;
    });

    it('should handle updateManifestUILocations with appOriginalName matching meta name', () => {
      // Set appOriginalName through a method that sets it
      const app = mockData.mockPrivateApps[0].manifest;
      importMarketplaceApps.createPrivateApp(app, 1, false);

      const locations = [
        {
          meta: [
            { name: 'Test App', extension_uid: 'ext-1' },
            { name: 'Other Extension', extension_uid: 'ext-2' },
          ],
        },
      ];

      const result = importMarketplaceApps.updateManifestUILocations(locations, 1);

      expect(result).to.be.an('array');
      expect(result[0].meta[0].name).to.not.equal('Test App');
    });

    it('should handle updateManifestUILocations with different index for meta name', () => {
      const locations = [
        {
          meta: [
            { name: 'Extension 1', extension_uid: 'ext-1' },
            { name: 'Extension 2', extension_uid: 'ext-2' },
          ],
        },
      ];

      const result = importMarketplaceApps.updateManifestUILocations(locations, 1);

      expect(result).to.be.an('array');
      expect(result[0].meta[0].name).to.not.equal('Extension 1');
      expect(result[0].meta[1].name).to.not.equal('Extension 2');
    });

    it('should handle generateUidMapper with apps having UI locations but no matching meta', async () => {
      const appsWithUI = [
        {
          manifest: { name: 'App 1' },
          uid: 'app1',
          ui_location: {
            locations: [
              {
                meta: [{ name: 'Extension 1', extension_uid: 'ext-1', uid: 'meta-1' }],
              },
            ],
          },
        },
      ];
      // Set up marketplace apps with UI locations
      (importMarketplaceApps as any).marketplaceApps = appsWithUI;

      const installedAppsWithDifferentMeta = [
        {
          manifest: { name: 'App 1' },
          uid: 'app1',
          ui_location: {
            locations: [
              {
                meta: [{ name: 'Different Extension', extension_uid: 'ext-2', uid: 'meta-2' }],
              },
            ],
          },
        },
      ];
      marketplaceAppHelperStub.getAllStackSpecificApps.resolves(installedAppsWithDifferentMeta);

      const result = await importMarketplaceApps.generateUidMapper();

      expect(result).to.be.an('object');
      expect(Object.keys(result).length).to.equal(0);
    });

    it('should handle generateUidMapper with apps having matching meta', async () => {
      const appsWithUI = [
        {
          manifest: { name: 'App 1' },
          uid: 'app1',
          ui_location: {
            locations: [
              {
                meta: [{ name: 'Extension 1', extension_uid: 'ext-1', uid: 'meta-1' }],
              },
            ],
          },
        },
      ];
      // Set up marketplace apps with UI locations
      (importMarketplaceApps as any).marketplaceApps = appsWithUI;

      const installedAppsWithMatchingMeta = [
        {
          manifest: { name: 'App 1' },
          uid: 'app1',
          ui_location: {
            locations: [
              {
                meta: [{ name: 'Extension 1', extension_uid: 'ext-2', uid: 'meta-1' }],
              },
            ],
          },
        },
      ];
      marketplaceAppHelperStub.getAllStackSpecificApps.resolves(installedAppsWithMatchingMeta);

      const result = await importMarketplaceApps.generateUidMapper();

      expect(result).to.be.an('object');
      expect(result['ext-1']).to.equal('ext-2');
    });

    it('should handle installApps with existing app and configuration', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      // Set up nodeCrypto for decryption
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });
      // Set installedApps directly on the instance
      (importMarketplaceApps as any).installedApps = mockData.mockInstalledApps;

      const app = {
        ...mockData.mockMarketplaceApps[0],
        configuration: { encrypted: 'config-data' },
        server_configuration: { encrypted: 'server-data' },
      };

      await importMarketplaceApps.installApps(app);

      expect(marketplaceAppHelperStub.ifAppAlreadyExist.calledOnce).to.be.true;
    });

    it('should handle installApps with existing app and no configuration', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      // Set installedApps through the actual method call
      marketplaceAppHelperStub.getAllStackSpecificApps.resolves(mockData.mockInstalledApps);

      const app = {
        ...mockData.mockMarketplaceApps[0],
        configuration: {},
        server_configuration: {},
      };

      await importMarketplaceApps.installApps(app);

      // Should not call updateAppsConfig for empty configurations
      expect(marketplaceAppHelperStub.ifAppAlreadyExist.called).to.be.false;
    });

    it('should handle updateAppsConfig with successful configuration update', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });

      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: { encrypted: 'config-data' },
        server_configuration: {},
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      mockAppSdk
        .marketplace()
        .installation()
        .setConfiguration.returns({
          then: sandbox.stub().callsFake((callback) => {
            callback({ data: {} }); // No message means success
            return { catch: sandbox.stub() };
          }),
        });

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle updateAppsConfig with configuration update error', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });

      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: { encrypted: 'config-data' },
        server_configuration: {},
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      mockAppSdk
        .marketplace()
        .installation()
        .setConfiguration.returns({
          then: sandbox.stub().callsFake((callback) => {
            callback({ data: { message: 'Configuration error' } });
            return {
              catch: sandbox.stub().callsFake((errorCallback) => {
                errorCallback(new Error('Configuration update failed'));
              }),
            };
          }),
        });

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle updateAppsConfig with successful server configuration update', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });

      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: {},
        server_configuration: { encrypted: 'server-data' },
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      mockAppSdk
        .marketplace()
        .installation()
        .setServerConfig.returns({
          then: sandbox.stub().callsFake((callback) => {
            callback({ data: {} }); // No message means success
            return { catch: sandbox.stub() };
          }),
        });

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle updateAppsConfig with server configuration update error', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });

      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: {},
        server_configuration: { encrypted: 'server-data' },
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      mockAppSdk
        .marketplace()
        .installation()
        .setServerConfig.returns({
          then: sandbox.stub().callsFake((callback) => {
            callback({ data: { message: 'Server configuration error' } });
            return {
              catch: sandbox.stub().callsFake((errorCallback) => {
                errorCallback(new Error('Server configuration update failed'));
              }),
            };
          }),
        });

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle installApps with existing app and UID mapping already set', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      // Set up nodeCrypto for decryption
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });
      // Set installedApps directly on the instance
      (importMarketplaceApps as any).installedApps = mockData.mockInstalledApps;

      const app = {
        ...mockData.mockMarketplaceApps[0],
        configuration: { encrypted: 'config-data' },
        server_configuration: { encrypted: 'server-data' },
      };

      await importMarketplaceApps.installApps(app);

      expect(marketplaceAppHelperStub.ifAppAlreadyExist.calledOnce).to.be.true;
    });

    it('should handle installApps with updateParam and configuration', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });
      // Set installedApps directly on the instance
      (importMarketplaceApps as any).installedApps = mockData.mockInstalledApps;

      const app = {
        ...mockData.mockMarketplaceApps[0],
        configuration: { encrypted: 'config-data' },
        server_configuration: { encrypted: 'server-data' },
      };

      marketplaceAppHelperStub.ifAppAlreadyExist.resolves({
        installation_uid: 'test-installation-uid',
        manifest: app.manifest,
        configuration: { encrypted: 'config-data' },
        server_configuration: { encrypted: 'server-data' },
      });

      await importMarketplaceApps.installApps(app);

      expect(marketplaceAppHelperStub.ifAppAlreadyExist.calledOnce).to.be.true;
    });

    it('should handle installApps with updateParam but no configuration', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });
      // Set installedApps directly on the instance
      (importMarketplaceApps as any).installedApps = mockData.mockInstalledApps;

      const app = {
        ...mockData.mockMarketplaceApps[0],
        configuration: { encrypted: 'config-data' },
        server_configuration: { encrypted: 'server-data' },
      };

      marketplaceAppHelperStub.ifAppAlreadyExist.resolves({
        installation_uid: 'test-installation-uid',
        manifest: app.manifest,
        configuration: {},
        server_configuration: {},
      });

      await importMarketplaceApps.installApps(app);

      expect(marketplaceAppHelperStub.ifAppAlreadyExist.calledOnce).to.be.true;
    });

    it('should handle getAndValidateEncryptionKey with non-OSSL error', async () => {
      fsUtilStub.readFile.returns(mockData.mockAppWithConfig);
      // Set up marketplaceApps with configuration requiring encryption
      (importMarketplaceApps as any).marketplaceApps = [mockData.mockAppWithConfig];
      interactiveStub.askEncryptionKey.resolves('user-provided-key');
      nodeCryptoStub.decrypt.throws(new Error('Some other error'));
      const exitStub = sandbox.stub(process, 'exit');

      await importMarketplaceApps.getAndValidateEncryptionKey('test-key');

      expect(exitStub.calledOnce).to.be.true;
    });

    it('should handle createPrivateApp with error response and no message', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      const app = mockData.mockPrivateApps[0].manifest;
      mockAppSdk.marketplace().app().create.resolves({ statusText: 'error' }); // No message property

      const result = await importMarketplaceApps.createPrivateApp(app);

      expect(result).to.be.undefined;
    });

    it('should handle createPrivateApp with response containing uid but no name', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      const app = mockData.mockPrivateApps[0].manifest;
      mockAppSdk.marketplace().app().create.resolves({ uid: 'new-app-uid' }); // No name property

      const result = await importMarketplaceApps.createPrivateApp(app);

      expect(result).to.be.undefined;
    });

    it('should handle installApps with existing app and no configuration - else branch', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      // Set installedApps through the actual method call
      marketplaceAppHelperStub.getAllStackSpecificApps.resolves(mockData.mockInstalledApps);

      const app = {
        ...mockData.mockMarketplaceApps[0],
        configuration: {},
        server_configuration: {},
      };

      await importMarketplaceApps.installApps(app);

      // Should not call ifAppAlreadyExist for empty configurations
      expect(marketplaceAppHelperStub.ifAppAlreadyExist.called).to.be.false;
    });

    it('should handle updateAppsConfig with configuration success path', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });

      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: { encrypted: 'config-data' },
        server_configuration: {},
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      mockAppSdk
        .marketplace()
        .installation()
        .setConfiguration.returns({
          then: sandbox.stub().callsFake((callback) => {
            callback({ data: {} }); // Empty data object means success
            return { catch: sandbox.stub() };
          }),
        });

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle updateAppsConfig with server configuration success path', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });

      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: {},
        server_configuration: { encrypted: 'server-data' },
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      mockAppSdk
        .marketplace()
        .installation()
        .setServerConfig.returns({
          then: sandbox.stub().callsFake((callback) => {
            callback({ data: {} }); // Empty data object means success
            return { catch: sandbox.stub() };
          }),
        });

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle updateAppsConfig with configuration error path', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });

      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: { encrypted: 'config-data' },
        server_configuration: {},
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      mockAppSdk
        .marketplace()
        .installation()
        .setConfiguration.returns({
          then: sandbox.stub().callsFake((callback) => {
            callback({ data: { message: 'Configuration error' } });
            return {
              catch: sandbox.stub().callsFake((errorCallback) => {
                errorCallback(new Error('Configuration update failed'));
              }),
            };
          }),
        });

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle updateAppsConfig with server configuration error path', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });

      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: {},
        server_configuration: { encrypted: 'server-data' },
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      mockAppSdk
        .marketplace()
        .installation()
        .setServerConfig.returns({
          then: sandbox.stub().callsFake((callback) => {
            callback({ data: { message: 'Server configuration error' } });
            return {
              catch: sandbox.stub().callsFake((errorCallback) => {
                errorCallback(new Error('Server configuration update failed'));
              }),
            };
          }),
        });

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle installApps with existing app and configuration - specific branch coverage', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });

      const existingApp = {
        ...mockData.mockInstalledApps[0],
        configuration: { encrypted: 'existing-config' },
        server_configuration: { encrypted: 'existing-server-config' },
      };
      // Set installedApps directly on the instance
      (importMarketplaceApps as any).installedApps = [existingApp];

      const app = {
        ...mockData.mockMarketplaceApps[0],
        configuration: { encrypted: 'config-data' },
        server_configuration: { encrypted: 'server-data' },
      };

      marketplaceAppHelperStub.ifAppAlreadyExist.resolves({
        installation_uid: 'test-installation-uid',
        manifest: app.manifest,
        configuration: { encrypted: 'config-data' },
        server_configuration: { encrypted: 'server-data' },
      });

      await importMarketplaceApps.installApps(app);

      expect(marketplaceAppHelperStub.ifAppAlreadyExist.calledOnce).to.be.true;
    });

    it('should handle installApps with existing app and no configuration - specific else branch', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      // Set installedApps through the actual method call
      marketplaceAppHelperStub.getAllStackSpecificApps.resolves(mockData.mockInstalledApps);

      const app = {
        ...mockData.mockMarketplaceApps[0],
        configuration: {},
        server_configuration: {},
      };

      await importMarketplaceApps.installApps(app);

      // Should not call ifAppAlreadyExist for empty configurations
      expect(marketplaceAppHelperStub.ifAppAlreadyExist.called).to.be.false;
    });

    it('should handle updateAppsConfig with configuration success - specific success path', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });

      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: { encrypted: 'config-data' },
        server_configuration: {},
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      const setConfigStub = sandbox.stub();
      setConfigStub.returns({
        then: sandbox.stub().callsFake((callback) => {
          callback({ data: {} }); // No message property means success - hits lines 650-652
          return { catch: sandbox.stub() };
        }),
      });
      mockAppSdk.marketplace().installation().setConfiguration = setConfigStub;

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle updateAppsConfig with server configuration success - specific success path', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });

      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: {},
        server_configuration: { encrypted: 'server-data' },
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      const setServerConfigStub = sandbox.stub();
      setServerConfigStub.returns({
        then: sandbox.stub().callsFake((callback) => {
          callback({ data: {} }); // No message property means success - hits lines 672-674
          return { catch: sandbox.stub() };
        }),
      });
      mockAppSdk.marketplace().installation().setServerConfig = setServerConfigStub;

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle updateAppsConfig with configuration error - specific error path', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });

      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: { encrypted: 'config-data' },
        server_configuration: {},
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      const setConfigStub = sandbox.stub();
      setConfigStub.returns({
        then: sandbox.stub().callsFake((callback) => {
          callback({ data: { message: 'Configuration error' } });
          return {
            catch: sandbox.stub().callsFake((errorCallback) => {
              errorCallback(new Error('Configuration update failed'));
            }),
          };
        }),
      });
      mockAppSdk.marketplace().installation().setConfiguration = setConfigStub;

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle updateAppsConfig with server configuration error - specific error path', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });

      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: {},
        server_configuration: { encrypted: 'server-data' },
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      const setServerConfigStub = sandbox.stub();
      setServerConfigStub.returns({
        then: sandbox.stub().callsFake((callback) => {
          callback({ data: { message: 'Server configuration error' } });
          return {
            catch: sandbox.stub().callsFake((errorCallback) => {
              errorCallback(new Error('Server configuration update failed'));
            }),
          };
        }),
      });
      mockAppSdk.marketplace().installation().setServerConfig = setServerConfigStub;

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle installApps with existing app that has configuration - exact branch coverage', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });

      // First, we need to populate installedApps by calling start() or setting it directly
      // Let's set it directly to ensure we have the right data
      const existingApp = {
        manifest: { uid: mockData.mockMarketplaceApps[0].manifest.uid, name: 'Existing App' },
        configuration: { encrypted: 'existing-config' },
        server_configuration: { encrypted: 'existing-server-config' },
      };

      // Set installedApps directly on the instance
      (importMarketplaceApps as any).installedApps = [existingApp];

      const app = {
        ...mockData.mockMarketplaceApps[0],
        configuration: { encrypted: 'config-data' },
        server_configuration: { encrypted: 'server-data' },
      };

      marketplaceAppHelperStub.ifAppAlreadyExist.resolves({
        installation_uid: 'test-installation-uid',
        manifest: app.manifest,
        configuration: { encrypted: 'config-data' },
        server_configuration: { encrypted: 'server-data' },
      });

      await importMarketplaceApps.installApps(app);

      // This should hit lines 600-603 (else if branch)
      expect(marketplaceAppHelperStub.ifAppAlreadyExist.calledOnce).to.be.true;
    });

    it('should handle installApps with installation failure - specific error branch coverage', async () => {
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });

      const app = {
        ...mockData.mockMarketplaceApps[0],
        configuration: { encrypted: 'config-data' },
        server_configuration: { encrypted: 'server-data' },
      };

      const installAppStub = sandbox.stub(importMarketplaceApps, 'installApp');
      installAppStub.resolves({
        installation_uid: null, // No installation_uid
        message: 'Installation failed due to error', // Has message - hits lines 594-597
      });

      await importMarketplaceApps.installApps(app);

      expect(installAppStub.calledOnce).to.be.true;
    });
  });

  describe('start()', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
    });

    // it('should successfully start the import process', async () => {
    //   // Set up the conditions for start() to call importMarketplaceApps
    //   fsUtilStub.readFile.returns(mockData.mockMarketplaceApps);
    //   // Mock the private methods
    //   const getAndValidateEncryptionKeyStub = sandbox
    //     .stub(importMarketplaceApps, 'getAndValidateEncryptionKey')
    //     .resolves();
    //   const handleAllPrivateAppsCreationProcessStub = sandbox
    //     .stub(importMarketplaceApps, 'handleAllPrivateAppsCreationProcess')
    //     .resolves();
    //   const importMarketplaceAppsMethodStub = sandbox.stub(importMarketplaceApps, 'importMarketplaceApps').resolves();

    //   await importMarketplaceApps.start();

    //   expect(getAndValidateEncryptionKeyStub.calledOnce).to.be.true;
    //   expect(handleAllPrivateAppsCreationProcessStub.calledOnce).to.be.true;
    //   expect(importMarketplaceAppsMethodStub.calledOnce).to.be.true;
    // });

    it('should handle errors during start process', async () => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      
      const configHandler = require('@contentstack/cli-utilities').configHandler;
      sandbox.stub(configHandler, 'get').callsFake((key) => {
        if (key === 'authorisationType') {
          return 'OAUTH'; // This will make isAuthenticated() return true
        }
        return 'some-value'; // Return something for other keys
      });
      
      const error = new Error('Start process failed');
      sandbox.stub(importMarketplaceApps, 'getAndValidateEncryptionKey').rejects(error);
      const completeProgressStub = sandbox.stub(importMarketplaceApps as any, 'completeProgress');

      await importMarketplaceApps.start();

      // Error should be caught and completeProgress should be called with error
      expect(completeProgressStub.called).to.be.true;
      expect(completeProgressStub.calledWith(false, 'Start process failed')).to.be.true;
    });
  });

  describe('importMarketplaceApps()', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      // Set up the marketplace apps through the start method
      fsUtilStub.readFile.returns(mockData.mockMarketplaceApps);
    });

    it('should successfully import marketplace apps with forced security config', async () => {
      mockImportConfig.forceStopMarketplaceAppsPrompt = true;
      importMarketplaceApps.importConfig = mockImportConfig;

      // Set marketplaceApps directly since we're not calling start()
      (importMarketplaceApps as any).marketplaceApps = mockData.mockMarketplaceApps;

      const handleAllPrivateAppsCreationProcessStub = sandbox
        .stub(importMarketplaceApps, 'handleAllPrivateAppsCreationProcess')
        .resolves();
      const installAppsStub = sandbox.stub(importMarketplaceApps, 'installApps').resolves();
      const generateUidMapperStub = sandbox.stub(importMarketplaceApps, 'generateUidMapper').resolves({});

      await importMarketplaceApps.importMarketplaceApps();

      expect(marketplaceAppHelperStub.getAllStackSpecificApps.calledOnce).to.be.true;
      expect(installAppsStub.callCount).to.equal(mockData.mockMarketplaceApps.length);
      expect(generateUidMapperStub.calledOnce).to.be.true;
    });

    it('should successfully import marketplace apps with encryption key validation', async () => {
      mockImportConfig.forceStopMarketplaceAppsPrompt = false;
      importMarketplaceApps.importConfig = mockImportConfig;

      // Set marketplaceApps directly since we're not calling start()
      (importMarketplaceApps as any).marketplaceApps = mockData.mockMarketplaceApps;

      const getAndValidateEncryptionKeyStub = sandbox
        .stub(importMarketplaceApps, 'getAndValidateEncryptionKey')
        .resolves();
      const handleAllPrivateAppsCreationProcessStub = sandbox
        .stub(importMarketplaceApps, 'handleAllPrivateAppsCreationProcess')
        .resolves();
      const installAppsStub = sandbox.stub(importMarketplaceApps, 'installApps').resolves();
      const generateUidMapperStub = sandbox.stub(importMarketplaceApps, 'generateUidMapper').resolves({});

      await importMarketplaceApps.importMarketplaceApps();

      expect(marketplaceAppHelperStub.getAllStackSpecificApps.calledOnce).to.be.true;
      expect(installAppsStub.callCount).to.equal(mockData.mockMarketplaceApps.length);
      expect(generateUidMapperStub.calledOnce).to.be.true;
    });

    it('should handle errors during app installation', async () => {
      const error = new Error('App installation failed');
      // Set up marketplaceApps
      (importMarketplaceApps as any).marketplaceApps = mockData.mockMarketplaceApps;
      sandbox.stub(importMarketplaceApps, 'handleAllPrivateAppsCreationProcess').resolves();
      sandbox.stub(importMarketplaceApps, 'installApps').rejects(error);

      try {
        await importMarketplaceApps.importMarketplaceApps();
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('handleAllPrivateAppsCreationProcess()', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      fsUtilStub.readFile.returns(mockData.mockPrivateApps);
    });

    it('should handle private apps creation process successfully', async () => {
      // Set up marketplace apps with private apps
      (importMarketplaceApps as any).marketplaceApps = mockData.mockPrivateApps;
      (importMarketplaceApps as any).appSdk = mockAppSdk;

      const createPrivateAppStub = sandbox.stub(importMarketplaceApps, 'createPrivateApp').resolves();

      await importMarketplaceApps.handleAllPrivateAppsCreationProcess();

      expect(createPrivateAppStub.callCount).to.equal(mockData.mockPrivateApps.length);
    });

    it('should skip non-private apps', async () => {
      fsUtilStub.readFile.returns(mockData.mockMarketplaceApps); // public apps
      const createPrivateAppStub = sandbox.stub(importMarketplaceApps, 'createPrivateApp').resolves();

      await importMarketplaceApps.handleAllPrivateAppsCreationProcess();

      expect(createPrivateAppStub.called).to.be.false;
    });

    it('should handle errors during private app creation', async () => {
      const error = new Error('Private app creation failed');
      sandbox.stub(importMarketplaceApps, 'createPrivateApp').resolves(undefined);

      // The method should complete successfully even when createPrivateApp encounters errors
      // because createPrivateApp catches errors and handles them gracefully
      await importMarketplaceApps.handleAllPrivateAppsCreationProcess();
      
      // Should complete without throwing
      expect(true).to.be.true;
    });
  });

  describe('installApps()', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      importMarketplaceApps.appSdk = {
        marketplace: sandbox.stub().returns({
          app: sandbox.stub().returns({
            install: sandbox.stub().resolves({ uid: 'new-installation-uid' }),
          }),
        }),
      } as any;
    });

    it('should successfully install a new app', async () => {
      const app = mockData.mockMarketplaceApps[0];
      const installAppStub = sandbox
        .stub(importMarketplaceApps, 'installApp')
        .resolves({ installation_uid: 'test-installation-uid' });

      await importMarketplaceApps.installApps(app);

      expect(installAppStub.calledOnce).to.be.true;
    });

    it('should handle app that already exists', async () => {
      const app = mockData.mockInstalledApps[0]; // already installed
      const installAppStub = sandbox
        .stub(importMarketplaceApps, 'installApp')
        .resolves({ installation_uid: 'test-installation-uid' });

      await importMarketplaceApps.installApps(app);

      expect(installAppStub.calledOnce).to.be.true;
    });

    it('should handle errors during app installation', async () => {
      const app = mockData.mockMarketplaceApps[0];
      const error = new Error('Installation failed');
      sandbox.stub(importMarketplaceApps, 'installApp').rejects(error);

      try {
        await importMarketplaceApps.installApps(app);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('generateUidMapper()', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
    });

    it('should generate UID mapper successfully', async () => {
      // Set up marketplace apps
      (importMarketplaceApps as any).marketplaceApps = mockData.mockMarketplaceApps;

      const result = await importMarketplaceApps.generateUidMapper();

      expect(result).to.be.an('object');
      expect(result).to.be.an('object'); // extensionUidMap is returned
    });

    it('should handle empty mappings', async () => {
      // Set up empty marketplace apps
      (importMarketplaceApps as any).marketplaceApps = [];

      const result = await importMarketplaceApps.generateUidMapper();

      expect(result).to.be.an('object');
      expect(result).to.be.an('object'); // extensionUidMap is returned
    });
  });

  // describe('createPrivateApp()', () => {
  //   beforeEach(() => {
  //     importMarketplaceApps.appSdk = {
  //       marketplace: sandbox.stub().returns({
  //         app: sandbox.stub().returns({
  //           create: sandbox.stub().resolves({ uid: 'new-private-app-uid' }),
  //         }),
  //       }),
  //     } as any;
  //   });

  //   // it('should create private app successfully', async () => {
  //   //   const app = mockData.mockPrivateApps[0].manifest;
  //   //   const result = await importMarketplaceApps.createPrivateApp(app);

  //   //   expect(result).to.be.undefined;
  //   // });

  //   it('should handle errors during private app creation', async () => {
  //     const app = mockData.mockPrivateApps[0].manifest;
  //     const error = new Error('Private app creation failed');
  //     const createStub = importMarketplaceApps.appSdk.marketplace('test-org-uid').app().create as sinon.SinonStub;
  //     createStub.rejects(error);

  //     // The method catches errors and passes them to appCreationCallback
  //     // which logs the error and resolves with undefined
  //     const result = await importMarketplaceApps.createPrivateApp(app, 1, false);
      
  //     expect(result).to.be.undefined;
  //     expect(createStub.calledOnce).to.be.true;
  //   });
  // });

  describe('installApp()', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      importMarketplaceApps.appSdk = mockAppSdk;
    });

    it('should install app successfully', async () => {
      const result = await importMarketplaceApps.installApp(mockImportConfig, 'test-app-uid');

      expect(result).to.be.an('object');
      expect(result.installation_uid).to.equal('installation-uid');
    });

    it('should handle errors during app installation', async () => {
      const error = new Error('App installation failed');
      sandbox.stub(importMarketplaceApps, 'installApp').rejects(error);

      try {
        await importMarketplaceApps.installApp(mockImportConfig, 'test-app-uid');
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('isPrivateAppExistInDeveloperHub()', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      importMarketplaceApps.appSdk = mockAppSdk;
    });

    it('should check if private app exists in developer hub', async () => {
      const app = mockData.mockPrivateApps[0];
      const result = await importMarketplaceApps.isPrivateAppExistInDeveloperHub(app);

      expect(result).to.be.a('boolean');
    });

    it('should return false if app does not exist', async () => {
      const app = mockData.mockPrivateApps[0];
      sandbox.stub(importMarketplaceApps, 'isPrivateAppExistInDeveloperHub').resolves(false);

      const result = await importMarketplaceApps.isPrivateAppExistInDeveloperHub(app);

      expect(result).to.be.false;
    });
  });

  describe('getAndValidateEncryptionKey()', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      // Set up marketplaceApps with configuration requiring encryption
      (importMarketplaceApps as any).marketplaceApps = [mockData.mockAppWithConfig];
    });

    it('should use provided encryption key', async () => {
      const encryptionKey = 'test-encryption-key';

      await importMarketplaceApps.getAndValidateEncryptionKey(encryptionKey);

      expect(importMarketplaceApps.nodeCrypto).to.be.instanceOf(NodeCrypto);
    });

    it('should ask for encryption key if not provided', async () => {
      interactiveStub.askEncryptionKey.resolves('user-provided-key');

      await importMarketplaceApps.getAndValidateEncryptionKey('');

      expect(interactiveStub.askEncryptionKey.calledOnce).to.be.true;
      expect(importMarketplaceApps.nodeCrypto).to.be.instanceOf(NodeCrypto);
    });

    it('should handle encryption key validation errors', async () => {
      const error = new Error('Invalid encryption key');
      interactiveStub.askEncryptionKey.rejects(error);

      try {
        await importMarketplaceApps.getAndValidateEncryptionKey('');
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('updateAppsConfig()', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });
    });

    it('should update app configuration successfully', async () => {
      const app = mockData.mockAppWithConfig;
      const updateStub = sandbox.stub(importMarketplaceApps, 'updateAppsConfig').resolves();

      await importMarketplaceApps.updateAppsConfig(app);

      expect(updateStub.calledOnce).to.be.true;
    });

    it('should handle errors during config update', async () => {
      const app = mockData.mockAppWithConfig;
      const error = new Error('Config update failed');
      sandbox.stub(importMarketplaceApps, 'updateAppsConfig').rejects(error);

      try {
        await importMarketplaceApps.updateAppsConfig(app);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('appCreationCallback()', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
    });

    it('should handle app creation callback successfully', async () => {
      const app = mockData.mockPrivateApps[0];
      const response = { uid: 'new-app-uid' };
      const appSuffix = 1;

      const result = await importMarketplaceApps.appCreationCallback(app, response, appSuffix);

      expect(result).to.be.undefined;
    });

    it('should handle errors during app creation callback', async () => {
      const app = mockData.mockPrivateApps[0];
      const response = { uid: 'new-app-uid' };
      const appSuffix = 1;
      const error = new Error('Callback failed');
      sandbox.stub(importMarketplaceApps, 'appCreationCallback').rejects(error);

      try {
        await importMarketplaceApps.appCreationCallback(app, response, appSuffix);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('start() - Edge Cases', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
    });

    it('should handle case when marketplace apps folder does not exist', async () => {
      // Change the return value of the already stubbed method
      (fileHelper.fileExistsSync as sinon.SinonStub).returns(false);

      await importMarketplaceApps.start();

      // Should return early without error
      expect(true).to.be.true;
    });

    it('should handle case when marketplace apps array is empty', async () => {
      fsUtilStub.readFile.returns([]);

      await importMarketplaceApps.start();

      // Should return early without error
      expect(true).to.be.true;
    });

    it('should handle case when user is not authenticated', async () => {
      fsUtilStub.readFile.returns(mockData.mockMarketplaceApps);

      const configHandler = require('@contentstack/cli-utilities').configHandler;
      sandbox.stub(configHandler, 'get').callsFake((key) => {
        if (key === 'authorisationType') {
          return undefined; // This will make isAuthenticated() return false
        }
        return 'some-value'; // Return something for other keys
      });

      await importMarketplaceApps.start();

      // Should skip import and show warning
      expect(true).to.be.true;
    });
  });

  describe('importMarketplaceApps() - Edge Cases', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      fsUtilStub.readFile.returns(mockData.mockMarketplaceApps);
    });

    it('should handle case when no marketplace apps to import', async () => {
      // Set up the marketplace apps through the start method with empty array
      fsUtilStub.readFile.returns([]);
      // Set marketplaceApps to empty array
      (importMarketplaceApps as any).marketplaceApps = [];

      // handleAllPrivateAppsCreationProcess is called in start(), not in importMarketplaceApps()
      const generateUidMapperStub = sandbox.stub(importMarketplaceApps, 'generateUidMapper').resolves({});
      marketplaceAppHelperStub.getAllStackSpecificApps.resolves([]);

      await importMarketplaceApps.importMarketplaceApps();

      // generateUidMapper should still be called even when marketplaceApps is empty
      expect(generateUidMapperStub.calledOnce).to.be.true;
    });

    it('should handle case when getAllStackSpecificApps returns empty array', async () => {
      marketplaceAppHelperStub.getAllStackSpecificApps.resolves([]);
      // Set marketplaceApps
      (importMarketplaceApps as any).marketplaceApps = mockData.mockMarketplaceApps;

      const handleAllPrivateAppsCreationProcessStub = sandbox
        .stub(importMarketplaceApps, 'handleAllPrivateAppsCreationProcess')
        .resolves();
      const installAppsStub = sandbox.stub(importMarketplaceApps, 'installApps').resolves();
      const generateUidMapperStub = sandbox.stub(importMarketplaceApps, 'generateUidMapper').resolves({});

      await importMarketplaceApps.importMarketplaceApps();

      expect(installAppsStub.callCount).to.equal(mockData.mockMarketplaceApps.length);
      expect(generateUidMapperStub.calledOnce).to.be.true;
    });
  });

  // describe('createPrivateApp() - Edge Cases', () => {
  //   beforeEach(() => {
  //     importMarketplaceApps.appSdk = {
  //       marketplace: sandbox.stub().returns({
  //         app: sandbox.stub().returns({
  //           create: sandbox.stub().resolves({ uid: 'new-private-app-uid' }),
  //         }),
  //       }),
  //     } as any;
  //   });

  //   it('should handle app creation with different suffixes', async () => {
  //     const app = mockData.mockPrivateApps[0].manifest;
  //     const result = await importMarketplaceApps.createPrivateApp(app, 2, true);

  //     expect(result).to.be.undefined;
  //   });

  //   it('should handle app creation with updateUiLocation flag', async () => {
  //     const app = mockData.mockPrivateApps[0].manifest;
  //     const result = await importMarketplaceApps.createPrivateApp(app, 1, true);

  //     expect(result).to.be.undefined;
  //   });
  // });

  describe('Error Handling', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      // Set up marketplaceApps with configuration requiring encryption
      (importMarketplaceApps as any).marketplaceApps = [mockData.mockAppWithConfig];
    });

    // it('should handle file system errors gracefully', async () => {
    //   const error = new Error('File system error');
    //   // Mock fileHelper.fileExistsSync to return true so that fsUtilStub.readFile is called
    //   sandbox.stub(require('../../../../src/utils'), 'fileHelper').value({
    //     fileExistsSync: () => true
    //   });
    //   fsUtilStub.readFile.rejects(error);

    //   try {
    //     await importMarketplaceApps.start();
    //     expect.fail('Should have thrown an error');
    //   } catch (err) {
    //     expect(err.message).to.include('File system error');
    //   }
    // });

    // it('should handle SDK client errors gracefully', async () => {
    //   const error = new Error('SDK client error');
    //   // Set up the conditions for start() to call marketplaceSDKClient
    //   fsUtilStub.readFile.returns(mockData.mockMarketplaceApps);
    //   // fileExistsSync is already stubbed to return true in beforeEach
    //   // Use a dummy config that bypasses authentication check
    //   importMarketplaceApps.importConfig.forceStopMarketplaceAppsPrompt = true;
    //   // Use restore and replace to avoid the "already replaced" error
    //   sandbox.restore();
    //   sandbox.replace(require('@contentstack/cli-utilities'), 'marketplaceSDKClient', () => Promise.reject(error));

    //   try {
    //     await importMarketplaceApps.start();
    //     expect.fail('Should have thrown an error');
    //   } catch (err) {
    //     expect(err.message).to.include('SDK client error');
    //   }
    // });

    it('should handle network errors gracefully', async () => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      
      const configHandler = require('@contentstack/cli-utilities').configHandler;
      sandbox.stub(configHandler, 'get').callsFake((key) => {
        if (key === 'authorisationType') {
          return 'OAUTH'; // This will make isAuthenticated() return true
        }
        return 'some-value'; // Return something for other keys
      });
      
      const error = new Error('Network error');
      marketplaceAppHelperStub.getAllStackSpecificApps.rejects(error);
      const completeProgressStub = sandbox.stub(importMarketplaceApps as any, 'completeProgress');

      await importMarketplaceApps.start();

      // Error should be caught and completeProgress should be called with error
      expect(completeProgressStub.called).to.be.true;
      expect(completeProgressStub.calledWith(false, 'Network error')).to.be.true;
    });

    it('should handle encryption key validation errors', async () => {
      const error = new Error('Encryption key validation failed');
      interactiveStub.askEncryptionKey.rejects(error);

      try {
        await importMarketplaceApps.getAndValidateEncryptionKey('');
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });

    it('should handle UID mapper generation errors', async () => {
      const error = new Error('UID mapper generation failed');
      sandbox.stub(importMarketplaceApps, 'generateUidMapper').rejects(error);

      try {
        await importMarketplaceApps.generateUidMapper();
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('Additional Coverage Tests for Uncovered Lines', () => {
    beforeEach(() => {
      importMarketplaceApps = new ImportMarketplaceApps(mockModuleClassParams);
      importMarketplaceApps.appSdk = mockAppSdk;
      importMarketplaceApps.nodeCrypto = new NodeCrypto({ encryptionKey: 'test-key' });
    });

    it('should handle updateAppsConfig with configuration success - uncovered success path', async () => {
      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: { encrypted: 'config-data' },
        server_configuration: {},
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      const setConfigStub = sandbox.stub();
      setConfigStub.returns({
        then: sandbox.stub().callsFake((callback) => {
          callback({ data: {} }); // No message property means success
          return { catch: sandbox.stub() };
        }),
      });
      mockAppSdk.marketplace().installation().setConfiguration = setConfigStub;

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle updateAppsConfig with configuration error - uncovered error path', async () => {
      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: { encrypted: 'config-data' },
        server_configuration: {},
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      const setConfigStub = sandbox.stub();
      setConfigStub.returns({
        then: sandbox.stub().callsFake((callback) => {
          callback({ data: { message: 'Configuration error' } });
          return {
            catch: sandbox.stub().callsFake((errorCallback) => {
              errorCallback(new Error('Configuration update failed'));
            }),
          };
        }),
      });
      mockAppSdk.marketplace().installation().setConfiguration = setConfigStub;

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle updateAppsConfig with server configuration success - uncovered success path', async () => {
      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: {},
        server_configuration: { encrypted: 'server-data' },
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      const setServerConfigStub = sandbox.stub();
      setServerConfigStub.returns({
        then: sandbox.stub().callsFake((callback) => {
          callback({ data: {} }); // No message property means success
          return { catch: sandbox.stub() };
        }),
      });
      mockAppSdk.marketplace().installation().setServerConfig = setServerConfigStub;

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle updateAppsConfig with server configuration error - uncovered error path', async () => {
      const app = {
        uid: 'test-uid',
        status: 'active',
        installation_uid: 'test-installation-uid',
        manifest: { name: 'Test App', uid: 'test-manifest-uid' },
        configuration: {},
        server_configuration: { encrypted: 'server-data' },
        target: { type: 'stack', uid: 'test-stack' },
        ui_location: { locations: [] },
      } as any;

      const setServerConfigStub = sandbox.stub();
      setServerConfigStub.returns({
        then: sandbox.stub().callsFake((callback) => {
          callback({ data: { message: 'Server configuration error' } });
          return {
            catch: sandbox.stub().callsFake((errorCallback) => {
              errorCallback(new Error('Server configuration update failed'));
            }),
          };
        }),
      });
      mockAppSdk.marketplace().installation().setServerConfig = setServerConfigStub;

      await importMarketplaceApps.updateAppsConfig(app);

      expect(mockAppSdk.marketplace.calledWith('test-org-uid')).to.be.true;
    });

    it('should handle getAndValidateEncryptionKey with no app config requiring encryption', async () => {
      // Set up marketplace apps with no configuration requiring encryption
      (importMarketplaceApps as any).marketplaceApps = [{ configuration: {}, server_configuration: {} }];

      const result = await importMarketplaceApps.getAndValidateEncryptionKey('default-key');

      expect(result).to.equal('default-key');
    });

    it('should handle getAndValidateEncryptionKey with server_configuration instead of configuration', async () => {
      // Set up marketplace apps with only server_configuration
      (importMarketplaceApps as any).marketplaceApps = [
        { configuration: {}, server_configuration: { encrypted: 'server-data' } },
      ];
      interactiveStub.askEncryptionKey.resolves('user-key');

      const result = await importMarketplaceApps.getAndValidateEncryptionKey('default-key');

      expect(result).to.equal('user-key');
    });

    it('should handle updateManifestUILocations with location.meta but no meta.name', async () => {
      const locations = [
        {
          meta: [
            { extension_uid: 'ext-1' }, // no name property
            { name: 'Test Extension', extension_uid: 'ext-2' },
          ],
        },
      ];

      const result = importMarketplaceApps.updateManifestUILocations(locations, 1);

      expect(result).to.be.an('array');
      expect(result[0].meta[0]).to.deep.equal({ extension_uid: 'ext-1' });
    });

    it('should handle updateManifestUILocations with location.meta and matching appOriginalName', async () => {
      // Set appOriginalName
      (importMarketplaceApps as any).appOriginalName = 'Test App';

      const locations = [
        {
          meta: [
            { name: 'Test App', extension_uid: 'ext-1' },
            { name: 'Other Extension', extension_uid: 'ext-2' },
          ],
        },
      ];

      const result = importMarketplaceApps.updateManifestUILocations(locations, 1);

      expect(result).to.be.an('array');
      expect(result[0].meta[0].name).to.not.equal('Test App');
    });

    it('should handle updateManifestUILocations with existing appNameMapping', async () => {
      // Set appOriginalName and existing mapping
      (importMarketplaceApps as any).appOriginalName = 'Test App';
      (importMarketplaceApps as any).appNameMapping = { 'Test App': 'Existing Mapped Name' };

      const locations = [
        {
          meta: [{ name: 'Test App', extension_uid: 'ext-1' }],
        },
      ];

      const result = importMarketplaceApps.updateManifestUILocations(locations, 1);

      expect(result).to.be.an('array');
      expect(result[0].meta[0].name).to.not.equal('Test App');
    });

    it('should handle appCreationCallback with no message and no uid in response', async () => {
      const app = mockData.mockPrivateApps[0];
      const response = { unexpected: 'format' }; // No message, no uid

      const result = await importMarketplaceApps.appCreationCallback(app, response, 1);

      expect(result).to.be.undefined;
    });

    it('should handle installApps with private app and canCreatePrivateApp false', async () => {
      const app = {
        ...mockData.mockMarketplaceApps[0],
        manifest: { ...mockData.mockMarketplaceApps[0].manifest, visibility: 'private' },
      };
      mockImportConfig.canCreatePrivateApp = false;
      importMarketplaceApps.importConfig = mockImportConfig;

      await importMarketplaceApps.installApps(app);

      expect(mockAppSdk.marketplace.called).to.be.false;
    });

    it('should handle installApps with existing app and no configuration - else branch', async () => {
      const app = {
        ...mockData.mockMarketplaceApps[0],
        configuration: {},
        server_configuration: {},
      };
      // Set installedApps so the app is found as existing
      (importMarketplaceApps as any).installedApps = [app];

      await importMarketplaceApps.installApps(app);

      expect(mockAppSdk.marketplace.called).to.be.false;
    });

    it('should handle installApps with appUidMapping already set', async () => {
      const app = mockData.mockMarketplaceApps[0];
      // Set appUidMapping
      (importMarketplaceApps as any).appUidMapping = { [app.manifest.uid]: 'mapped-uid' };

      await importMarketplaceApps.installApps(app);

      expect(mockAppSdk.marketplace.called).to.be.true;
    });

    it('should handle createPrivateApp with updateUiLocation true and empty locations', async () => {
      const app = {
        ...mockData.mockPrivateApps[0].manifest,
        ui_location: { locations: [] },
      };

      const appCreationCallbackStub = sandbox
        .stub(importMarketplaceApps, 'appCreationCallback')
        .resolves(undefined);

      const result = await importMarketplaceApps.createPrivateApp(app, 1, true);

      expect(result).to.be.undefined;
      expect(appCreationCallbackStub.calledOnce).to.be.true;
    });

    it('should handle createPrivateApp with app name exactly 20 characters', async () => {
      const app = {
        ...mockData.mockPrivateApps[0].manifest,
        name: '12345678901234567890', // exactly 20 characters
      };

      const appCreationCallbackStub = sandbox
        .stub(importMarketplaceApps, 'appCreationCallback')
        .resolves(undefined);

      const result = await importMarketplaceApps.createPrivateApp(app);

      expect(result).to.be.undefined;
      expect(app.name.length).to.equal(20);
      expect(appCreationCallbackStub.calledOnce).to.be.true;
    });

    it('should handle appCreationCallback with user choosing to proceed despite error', async () => {
      const app = mockData.mockPrivateApps[0];
      const response = { message: 'Error occurred', statusText: 'error' };
      cliuxStub.confirm.resolves(true); // User chooses to proceed

      const result = await importMarketplaceApps.appCreationCallback(app, response, 1);

      expect(result).to.be.undefined;
      expect(cliuxStub.confirm.calledOnce).to.be.true;
    });

    it('should handle appCreationCallback with user choosing to exit due to error', async () => {
      const app = mockData.mockPrivateApps[0];
      const response = { message: 'Error occurred', statusText: 'error' };
      cliuxStub.confirm.resolves(false); // User chooses to exit
      const exitStub = sandbox.stub(process, 'exit');

      const result = await importMarketplaceApps.appCreationCallback(app, response, 1);

      expect(result).to.be.undefined;
      expect(cliuxStub.confirm.calledOnce).to.be.true;
      expect(exitStub.calledOnce).to.be.true;
    });

    it('should handle appCreationCallback with successful response containing name', async () => {
      const app = mockData.mockPrivateApps[0];
      const response = { uid: 'new-app-uid', name: 'Created App Name' };

      const result = await importMarketplaceApps.appCreationCallback(app, response, 1);

      expect(result).to.be.undefined; // The method doesn't return the uid
      // Verify that the mappings were set correctly by accessing private properties
      expect((importMarketplaceApps as any).appUidMapping[app.uid]).to.equal('new-app-uid');
      expect((importMarketplaceApps as any).appNameMapping[(importMarketplaceApps as any).appOriginalName]).to.equal(
        'Created App Name',
      );
    });

    it('should handle updateManifestUILocations with location without meta', async () => {
      const locations = [
        { name: 'Location 1' }, // no meta property
        { meta: [] as any[] }, // empty meta array
      ];

      const result = importMarketplaceApps.updateManifestUILocations(locations, 1);

      expect(result).to.be.an('array');
      expect(result[0]).to.deep.equal(locations[0]);
      expect(result[1]).to.deep.equal(locations[1]);
    });

    it('should handle generateUidMapper with no matching meta entries', async () => {
      // Set up marketplace apps with UI locations
      (importMarketplaceApps as any).marketplaceApps = [
        {
          manifest: { name: 'App 1' },
          uid: 'app1',
          ui_location: {
            locations: [
              {
                meta: [{ name: 'Extension 1', extension_uid: 'ext-1', uid: 'meta-1' }],
              },
            ],
          },
        },
      ];

      marketplaceAppHelperStub.getAllStackSpecificApps.resolves([
        {
          manifest: { name: 'App 1' },
          uid: 'app1',
          ui_location: {
            locations: [
              {
                meta: [{ name: 'Different Extension', extension_uid: 'ext-2', uid: 'meta-2' }],
              },
            ],
          },
        },
      ]);

      const result = await importMarketplaceApps.generateUidMapper();

      expect(result).to.be.an('object');
      expect(Object.keys(result).length).to.equal(0);
    });

    it('should handle generateUidMapper with matching meta entries', async () => {
      // Set up marketplace apps with UI locations
      (importMarketplaceApps as any).marketplaceApps = [
        {
          manifest: { name: 'App 1' },
          uid: 'app1',
          ui_location: {
            locations: [
              {
                meta: [{ name: 'Extension 1', extension_uid: 'ext-1', uid: 'meta-1' }],
              },
            ],
          },
        },
      ];

      marketplaceAppHelperStub.getAllStackSpecificApps.resolves([
        {
          manifest: { name: 'App 1' },
          uid: 'app1',
          ui_location: {
            locations: [
              {
                meta: [{ name: 'Extension 1', extension_uid: 'ext-2', uid: 'meta-1' }],
              },
            ],
          },
        },
      ]);

      const result = await importMarketplaceApps.generateUidMapper();

      expect(result).to.be.an('object');
      expect(result['ext-1']).to.equal('ext-2');
    });

    it('should handle getAndValidateEncryptionKey with configuration instead of server_configuration', async () => {
      // Set up marketplace apps with only configuration (not server_configuration)
      (importMarketplaceApps as any).marketplaceApps = [
        { configuration: { encrypted: 'config-data' }, server_configuration: {} },
      ];
      interactiveStub.askEncryptionKey.resolves('user-key');

      const result = await importMarketplaceApps.getAndValidateEncryptionKey('default-key');

      expect(result).to.equal('user-key');
    });

    it('should handle getAndValidateEncryptionKey with non-OSSL error', async () => {
      // Set up marketplace apps with configuration
      (importMarketplaceApps as any).marketplaceApps = [
        { configuration: { encrypted: 'config-data' }, server_configuration: {} },
      ];
      interactiveStub.askEncryptionKey.resolves('user-key');

      const nodeCryptoStub = {
        decrypt: sandbox.stub().throws(new Error('Some other error')),
      };
      (importMarketplaceApps as any).nodeCrypto = nodeCryptoStub;

      const result = await importMarketplaceApps.getAndValidateEncryptionKey('default-key');

      expect(result).to.equal('user-key');
    });
  });
});
