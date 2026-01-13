import { expect } from 'chai';
import sinon from 'sinon';
import { FsUtility, cliux, isAuthenticated, marketplaceSDKClient, NodeCrypto } from '@contentstack/cli-utilities';
import * as utilities from '@contentstack/cli-utilities';
import ExportMarketplaceApps from '../../../../src/export/modules/marketplace-apps';
import ExportConfig from '../../../../src/types/export-config';
import * as marketplaceAppHelper from '../../../../src/utils/marketplace-app-helper';

describe('ExportMarketplaceApps', () => {
  let exportMarketplaceApps: any;
  let mockExportConfig: ExportConfig;
  let mockAppSdk: any;
  let mockNodeCrypto: any;

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
      source_stack: 'test-stack-uid',
      org_uid: 'test-org-uid',
      context: {
        command: 'cm:stacks:export',
        module: 'marketplace-apps',
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
      personalizationEnabled: false,
      fetchConcurrency: 5,
      writeConcurrency: 5,
      developerHubBaseUrl: 'https://developer-api.contentstack.io',
      marketplaceAppEncryptionKey: 'test-encryption-key',
      onlyTSModules: [],
      modules: {
        types: ['marketplace-apps'],
        marketplace_apps: {
          dirName: 'marketplace-apps',
          fileName: 'marketplace-apps.json'
        }
      },
      query: undefined
    } as any;

    exportMarketplaceApps = new ExportMarketplaceApps({
      exportConfig: mockExportConfig
    });

    // Mock app SDK
    mockAppSdk = {
      marketplace: sinon.stub().returns({
        installation: sinon.stub().returns({
          fetchAll: sinon.stub().resolves({
            items: [],
            count: 0
          })
        }),
        app: sinon.stub().returns({
          fetch: sinon.stub().resolves({})
        })
      })
    };

    // Mock NodeCrypto
    mockNodeCrypto = {
      encrypt: sinon.stub().returns('encrypted-data')
    };

    // Stub utility functions
    sinon.stub(FsUtility.prototype, 'writeFile').resolves();
    sinon.stub(FsUtility.prototype, 'makeDirectory').resolves();
    // Note: isAuthenticated is non-configurable, so we'll stub it per test when needed using sinon.replace
    sinon.stub(utilities, 'marketplaceSDKClient').resolves(mockAppSdk);
    sinon.stub(marketplaceAppHelper, 'getOrgUid').resolves('test-org-uid');
    sinon.stub(marketplaceAppHelper, 'getDeveloperHubUrl').resolves('https://developer-api.contentstack.io');
    sinon.stub(marketplaceAppHelper, 'createNodeCryptoInstance').resolves(mockNodeCrypto);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(exportMarketplaceApps).to.be.instanceOf(ExportMarketplaceApps);
    });

    it('should set context module to marketplace-apps', () => {
      expect(exportMarketplaceApps.exportConfig.context.module).to.equal('marketplace-apps');
    });

    it('should initialize marketplaceAppConfig from exportConfig', () => {
      expect(exportMarketplaceApps.marketplaceAppConfig).to.exist;
      expect(exportMarketplaceApps.marketplaceAppConfig.dirName).to.equal('marketplace-apps');
      expect(exportMarketplaceApps.marketplaceAppConfig.fileName).to.equal('marketplace-apps.json');
    });

    it('should initialize installedApps as empty array', () => {
      expect(exportMarketplaceApps.installedApps).to.be.an('array');
      expect(exportMarketplaceApps.installedApps.length).to.equal(0);
    });
  });

  describe('start() method', () => {
    it('should return early if user is not authenticated', async () => {
      // Stub configHandler.get to control isAuthenticated() behavior
      // isAuthenticated() returns true when authorisationType is 'OAUTH' or 'BASIC', false otherwise
      const configHandlerGetStub = sinon.stub(utilities.configHandler, 'get');
      configHandlerGetStub.withArgs('authorisationType').returns(undefined); // Not authenticated
      const printStub = sinon.stub(cliux, 'print');

      await exportMarketplaceApps.start();

      expect(printStub.called).to.be.true;
      expect(printStub.firstCall.args[0]).to.include('WARNING');
      printStub.restore();
      configHandlerGetStub.restore();
    });

    it('should complete full export flow when authenticated', async () => {
      // Stub configHandler.get to make isAuthenticated() return true
      const configHandlerGetStub = sinon.stub(utilities.configHandler, 'get');
      configHandlerGetStub.withArgs('authorisationType').returns('BASIC'); // Authenticated
      const makeDirectoryStub = FsUtility.prototype.makeDirectory as sinon.SinonStub;
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;

      // Setup mock app SDK to return apps
      mockAppSdk.marketplace.returns({
        installation: sinon.stub().returns({
          fetchAll: sinon.stub().resolves({
            items: [
              {
                uid: 'installation-1',
                manifest: { uid: 'app-1', name: 'Test App', visibility: 'public' },
                configuration: {} as any
              }
            ],
            count: 1
          })
        }),
        app: sinon.stub().returns({
          fetch: sinon.stub().resolves({})
        })
      });

      // Mock exportApps to avoid complex setup
      const exportAppsStub = sinon.stub(exportMarketplaceApps, 'exportApps').resolves();

      await exportMarketplaceApps.start();

      expect(makeDirectoryStub.called).to.be.true;
      expect(exportMarketplaceApps.marketplaceAppPath).to.exist;
      expect(exportMarketplaceApps.developerHubBaseUrl).to.equal('https://developer-api.contentstack.io');
      expect(exportMarketplaceApps.exportConfig.org_uid).to.equal('test-org-uid');
      expect(exportMarketplaceApps.query).to.deep.equal({ target_uids: 'test-stack-uid' });
      expect(exportMarketplaceApps.appSdk).to.equal(mockAppSdk);

      exportAppsStub.restore();
      configHandlerGetStub.restore();
    });

    it('should set marketplaceAppPath correctly', async () => {
      const configHandlerGetStub = sinon.stub(utilities.configHandler, 'get');
      configHandlerGetStub.withArgs('authorisationType').returns('BASIC');
      const exportAppsStub = sinon.stub(exportMarketplaceApps, 'exportApps').resolves();

      await exportMarketplaceApps.start();

      expect(exportMarketplaceApps.marketplaceAppPath).to.include('marketplace-apps');
      expect(exportMarketplaceApps.marketplaceAppPath).to.include('/test/data');

      exportAppsStub.restore();
      configHandlerGetStub.restore();
    });

    it('should handle branchName in path when provided', async () => {
      mockExportConfig.branchName = 'test-branch';
      exportMarketplaceApps = new ExportMarketplaceApps({
        exportConfig: mockExportConfig
      });

      const configHandlerGetStub = sinon.stub(utilities.configHandler, 'get');
      configHandlerGetStub.withArgs('authorisationType').returns('BASIC');
      const exportAppsStub = sinon.stub(exportMarketplaceApps, 'exportApps').resolves();

      await exportMarketplaceApps.start();

      expect(exportMarketplaceApps.marketplaceAppPath).to.include('test-branch');

      exportAppsStub.restore();
      configHandlerGetStub.restore();
    });

    it('should use developerHubBaseUrl from config when provided', async () => {
      mockExportConfig.developerHubBaseUrl = 'https://custom-devhub.com';
      exportMarketplaceApps = new ExportMarketplaceApps({
        exportConfig: mockExportConfig
      });

      const configHandlerGetStub = sinon.stub(utilities.configHandler, 'get');
      configHandlerGetStub.withArgs('authorisationType').returns('BASIC');
      const exportAppsStub = sinon.stub(exportMarketplaceApps, 'exportApps').resolves();

      await exportMarketplaceApps.start();

      expect(exportMarketplaceApps.developerHubBaseUrl).to.equal('https://custom-devhub.com');

      exportAppsStub.restore();
      configHandlerGetStub.restore();
    });

    it('should initialize marketplace SDK with correct host', async () => {
      const configHandlerGetStub = sinon.stub(utilities.configHandler, 'get');
      configHandlerGetStub.withArgs('authorisationType').returns('BASIC');
      const exportAppsStub = sinon.stub(exportMarketplaceApps, 'exportApps').resolves();

      await exportMarketplaceApps.start();

      expect((utilities.marketplaceSDKClient as sinon.SinonStub).called).to.be.true;
      const sdkArgs = (utilities.marketplaceSDKClient as sinon.SinonStub).firstCall.args[0];
      expect(sdkArgs.host).to.equal('developer-api.contentstack.io');

      exportAppsStub.restore();
      configHandlerGetStub.restore();
    });
  });

  describe('exportApps() method', () => {
    beforeEach(() => {
      exportMarketplaceApps.appSdk = mockAppSdk;
      exportMarketplaceApps.query = { target_uids: 'test-stack-uid' };
      exportMarketplaceApps.exportConfig.org_uid = 'test-org-uid';
    });

    it('should process external query with app_uids', async () => {
      mockExportConfig.query = {
        modules: {
          'marketplace-apps': {
            app_uid: { $in: ['app-1', 'app-2'] }
          }
        }
      };
      exportMarketplaceApps.exportConfig = mockExportConfig;

      const getStackSpecificAppsStub = sinon.stub(exportMarketplaceApps, 'getStackSpecificApps').resolves();
      const getAppManifestAndAppConfigStub = sinon.stub(exportMarketplaceApps, 'getAppManifestAndAppConfig').resolves();

      await exportMarketplaceApps.exportApps();

      expect(exportMarketplaceApps.query.app_uids).to.equal('app-1,app-2');
      expect(getStackSpecificAppsStub.called).to.be.true;
      expect(getAppManifestAndAppConfigStub.called).to.be.true;

      getStackSpecificAppsStub.restore();
      getAppManifestAndAppConfigStub.restore();
    });

    it('should process external query with installation_uids', async () => {
      mockExportConfig.query = {
        modules: {
          'marketplace-apps': {
            installation_uid: { $in: ['inst-1', 'inst-2'] }
          }
        }
      };
      exportMarketplaceApps.exportConfig = mockExportConfig;

      const getStackSpecificAppsStub = sinon.stub(exportMarketplaceApps, 'getStackSpecificApps').resolves();
      const getAppManifestAndAppConfigStub = sinon.stub(exportMarketplaceApps, 'getAppManifestAndAppConfig').resolves();

      await exportMarketplaceApps.exportApps();

      expect(exportMarketplaceApps.query.installation_uids).to.equal('inst-1,inst-2');

      getStackSpecificAppsStub.restore();
      getAppManifestAndAppConfigStub.restore();
    });

    it('should encrypt app configurations when present', async () => {
      exportMarketplaceApps.installedApps = [
        {
          uid: 'inst-1',
          manifest: { uid: 'app-1', name: 'Test App' },
          configuration: { key: 'value' }
        }
      ];

      const getStackSpecificAppsStub = sinon.stub(exportMarketplaceApps, 'getStackSpecificApps').resolves();
      const getAppManifestAndAppConfigStub = sinon.stub(exportMarketplaceApps, 'getAppManifestAndAppConfig').resolves();

      await exportMarketplaceApps.exportApps();

      expect(exportMarketplaceApps.nodeCrypto).to.exist;
      expect(mockNodeCrypto.encrypt.called).to.be.true;
      expect(exportMarketplaceApps.installedApps[0].configuration).to.equal('encrypted-data');

      getStackSpecificAppsStub.restore();
      getAppManifestAndAppConfigStub.restore();
    });

    it('should not initialize NodeCrypto when no configurations exist', async () => {
      exportMarketplaceApps.installedApps = [
        {
          uid: 'inst-1',
          manifest: { uid: 'app-1', name: 'Test App' }
          // No configuration property at all
        }
      ];

      const getStackSpecificAppsStub = sinon.stub(exportMarketplaceApps, 'getStackSpecificApps').resolves();
      const getAppManifestAndAppConfigStub = sinon.stub(exportMarketplaceApps, 'getAppManifestAndAppConfig').resolves();

      await exportMarketplaceApps.exportApps();

      // NodeCrypto should not be initialized if no configurations
      expect((marketplaceAppHelper.createNodeCryptoInstance as sinon.SinonStub).called).to.be.false;

      getStackSpecificAppsStub.restore();
      getAppManifestAndAppConfigStub.restore();
    });
  });

  describe('getStackSpecificApps() method', () => {
    beforeEach(() => {
      exportMarketplaceApps.appSdk = mockAppSdk;
      exportMarketplaceApps.exportConfig.org_uid = 'test-org-uid';
      exportMarketplaceApps.query = { target_uids: 'test-stack-uid' };
    });

    it('should fetch and process stack-specific apps', async () => {
      const apps = [
        {
          uid: 'installation-1',
          manifest: { uid: 'app-1', name: 'Test App 1' },
          someFunction: () => {}
        },
        {
          uid: 'installation-2',
          manifest: { uid: 'app-2', name: 'Test App 2' },
          someFunction: () => {}
        }
      ];

      mockAppSdk.marketplace.returns({
        installation: sinon.stub().returns({
          fetchAll: sinon.stub().resolves({
            items: apps,
            count: 2
          })
        })
      });

      await exportMarketplaceApps.getStackSpecificApps();

      expect(exportMarketplaceApps.installedApps.length).to.equal(2);
      expect(exportMarketplaceApps.installedApps[0].uid).to.equal('installation-1');
      expect(exportMarketplaceApps.installedApps[0].someFunction).to.be.undefined; // Functions should be removed
    });

    it('should call recursively when more apps exist', async () => {
      let callCount = 0;
      mockAppSdk.marketplace.returns({
        installation: sinon.stub().returns({
          fetchAll: sinon.stub().callsFake(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                items: Array(50).fill({ uid: 'app', manifest: {} }),
                count: 100
              });
            } else {
              return Promise.resolve({
                items: Array(50).fill({ uid: 'app2', manifest: {} }),
                count: 100
              });
            }
          })
        })
      });

      await exportMarketplaceApps.getStackSpecificApps();

      expect(callCount).to.be.greaterThan(1);
      expect(exportMarketplaceApps.installedApps.length).to.equal(100);
    });

    it('should stop recursion when all apps are fetched', async () => {
      let callCount = 0;
      mockAppSdk.marketplace.returns({
        installation: sinon.stub().returns({
          fetchAll: sinon.stub().callsFake(() => {
            callCount++;
            return Promise.resolve({
              items: Array(30).fill({ uid: 'app', manifest: {} }),
              count: 30
            });
          })
        })
      });

      await exportMarketplaceApps.getStackSpecificApps();

      // Should only be called once since count (30) - (skip + 50) = -20, which is not > 0
      expect(callCount).to.equal(1);
    });

    it('should handle API errors gracefully', async () => {
      mockAppSdk.marketplace.returns({
        installation: sinon.stub().returns({
          fetchAll: sinon.stub().rejects(new Error('API Error'))
        })
      });

      await exportMarketplaceApps.getStackSpecificApps();

      // Should complete without throwing
      expect(exportMarketplaceApps.installedApps).to.exist;
    });

    it('should handle empty apps response', async () => {
      mockAppSdk.marketplace.returns({
        installation: sinon.stub().returns({
          fetchAll: sinon.stub().resolves({
            items: [],
            count: 0
          })
        })
      });

      const initialLength = exportMarketplaceApps.installedApps.length;
      await exportMarketplaceApps.getStackSpecificApps();

      expect(exportMarketplaceApps.installedApps.length).to.equal(initialLength);
    });

    it('should remove function properties from apps', async () => {
      const appWithFunction = {
        uid: 'inst-1',
        manifest: { uid: 'app-1' },
        regularProperty: 'value',
        functionProperty: () => {},
        anotherFunction: function() {}
      };

      mockAppSdk.marketplace.returns({
        installation: sinon.stub().returns({
          fetchAll: sinon.stub().resolves({
            items: [appWithFunction],
            count: 1
          })
        })
      });

      await exportMarketplaceApps.getStackSpecificApps();

      expect(exportMarketplaceApps.installedApps[0].regularProperty).to.equal('value');
      expect(exportMarketplaceApps.installedApps[0].functionProperty).to.be.undefined;
      expect(exportMarketplaceApps.installedApps[0].anotherFunction).to.be.undefined;
    });
  });

  describe('getAppManifestAndAppConfig() method', () => {
    beforeEach(() => {
      exportMarketplaceApps.appSdk = mockAppSdk;
      exportMarketplaceApps.exportConfig.org_uid = 'test-org-uid';
      exportMarketplaceApps.marketplaceAppPath = '/test/path';
    });

    it('should log NOT_FOUND when no apps exist', async () => {
      exportMarketplaceApps.installedApps = [];

      await exportMarketplaceApps.getAppManifestAndAppConfig();

      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;
      expect(writeFileStub.called).to.be.false;
    });

    it('should process private app manifests', async () => {
      exportMarketplaceApps.installedApps = [
        {
          uid: 'inst-1',
          manifest: {
            uid: 'app-1',
            name: 'Private App',
            visibility: 'private'
          }
        }
      ];

      const getPrivateAppsManifestStub = sinon.stub(exportMarketplaceApps, 'getPrivateAppsManifest').resolves();
      const getAppConfigurationsStub = sinon.stub(exportMarketplaceApps, 'getAppConfigurations').resolves();
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;

      await exportMarketplaceApps.getAppManifestAndAppConfig();

      expect(getPrivateAppsManifestStub.called).to.be.true;
      expect(getAppConfigurationsStub.called).to.be.true;
      expect(writeFileStub.called).to.be.true;

      getPrivateAppsManifestStub.restore();
      getAppConfigurationsStub.restore();
    });

    it('should skip private app manifest processing for public apps', async () => {
      exportMarketplaceApps.installedApps = [
        {
          uid: 'inst-1',
          manifest: {
            uid: 'app-1',
            name: 'Public App',
            visibility: 'public'
          }
        }
      ];

      const getPrivateAppsManifestStub = sinon.stub(exportMarketplaceApps, 'getPrivateAppsManifest').resolves();
      const getAppConfigurationsStub = sinon.stub(exportMarketplaceApps, 'getAppConfigurations').resolves();

      await exportMarketplaceApps.getAppManifestAndAppConfig();

      // Should not be called for public apps
      expect(getPrivateAppsManifestStub.called).to.be.false;
      expect(getAppConfigurationsStub.called).to.be.true;

      getPrivateAppsManifestStub.restore();
      getAppConfigurationsStub.restore();
    });

    it('should write file with correct path and data', async () => {
      exportMarketplaceApps.installedApps = [
        {
          uid: 'inst-1',
          manifest: { uid: 'app-1', name: 'Test App', visibility: 'public' }
        }
      ];

      const getAppConfigurationsStub = sinon.stub(exportMarketplaceApps, 'getAppConfigurations').resolves();
      const writeFileStub = FsUtility.prototype.writeFile as sinon.SinonStub;

      await exportMarketplaceApps.getAppManifestAndAppConfig();

      expect(writeFileStub.called).to.be.true;
      const writeFileArgs = writeFileStub.firstCall.args;
      expect(writeFileArgs[0]).to.include('marketplace-apps.json');
      expect(writeFileArgs[1]).to.equal(exportMarketplaceApps.installedApps);

      getAppConfigurationsStub.restore();
    });
  });

  describe('getPrivateAppsManifest() method', () => {
    beforeEach(() => {
      exportMarketplaceApps.appSdk = mockAppSdk;
      exportMarketplaceApps.exportConfig.org_uid = 'test-org-uid';
      exportMarketplaceApps.installedApps = [
        {
          uid: 'inst-1',
          manifest: {
            uid: 'app-1',
            name: 'Private App',
            visibility: 'private'
          }
        }
      ];
    });

    it('should fetch and update private app manifest', async () => {
      const fetchedManifest = {
        uid: 'app-1',
        name: 'Private App Updated',
        visibility: 'private',
        oauth: { client_id: 'test-client-id' }
      };

      mockAppSdk.marketplace.returns({
        app: sinon.stub().returns({
          fetch: sinon.stub().resolves(fetchedManifest)
        })
      });

      await exportMarketplaceApps.getPrivateAppsManifest(0, exportMarketplaceApps.installedApps[0]);

      expect(exportMarketplaceApps.installedApps[0].manifest).to.deep.equal(fetchedManifest);
    });

    it('should handle API errors gracefully', async () => {
      mockAppSdk.marketplace.returns({
        app: sinon.stub().returns({
          fetch: sinon.stub().rejects(new Error('API Error'))
        })
      });

      const originalManifest = exportMarketplaceApps.installedApps[0].manifest;

      await exportMarketplaceApps.getPrivateAppsManifest(0, exportMarketplaceApps.installedApps[0]);

      // Manifest should remain unchanged on error
      expect(exportMarketplaceApps.installedApps[0].manifest).to.equal(originalManifest);
    });

    it('should fetch manifest with include_oauth option', async () => {
      const fetchStub = sinon.stub().resolves({ uid: 'app-1', name: 'Private App' });
      mockAppSdk.marketplace.returns({
        app: sinon.stub().returns({
          fetch: fetchStub
        })
      });

      await exportMarketplaceApps.getPrivateAppsManifest(0, exportMarketplaceApps.installedApps[0]);

      expect(fetchStub.called).to.be.true;
      expect(fetchStub.firstCall.args[0]).to.deep.equal({ include_oauth: true });
    });
  });

  describe('getAppConfigurations() method', () => {
    beforeEach(() => {
      exportMarketplaceApps.appSdk = mockAppSdk;
      exportMarketplaceApps.exportConfig.org_uid = 'test-org-uid';
      exportMarketplaceApps.nodeCrypto = mockNodeCrypto;
      exportMarketplaceApps.installedApps = [
        {
          uid: 'inst-1',
          manifest: {
            uid: 'app-1',
            name: 'Test App'
          }
        }
      ];
    });

    it('should fetch and encrypt app configuration', async () => {
      const installationData = {
        data: {
          configuration: { key: 'value' }
        }
      };

      mockAppSdk.marketplace.returns({
        installation: sinon.stub().returns({
          installationData: sinon.stub().resolves(installationData)
        })
      });

      await exportMarketplaceApps.getAppConfigurations(0, exportMarketplaceApps.installedApps[0]);

      expect(exportMarketplaceApps.installedApps[0].configuration).to.equal('encrypted-data');
      expect(mockNodeCrypto.encrypt.called).to.be.true;
    });

    it('should fetch and encrypt server configuration', async () => {
      const installationData = {
        data: {
          server_configuration: { secret: 'value' }
        }
      };

      mockAppSdk.marketplace.returns({
        installation: sinon.stub().returns({
          installationData: sinon.stub().resolves(installationData)
        })
      });

      await exportMarketplaceApps.getAppConfigurations(0, exportMarketplaceApps.installedApps[0]);

      expect(exportMarketplaceApps.installedApps[0].server_configuration).to.equal('encrypted-data');
      expect(mockNodeCrypto.encrypt.called).to.be.true;
    });

    it('should initialize NodeCrypto if not already initialized', async () => {
      exportMarketplaceApps.nodeCrypto = undefined;
      const installationData = {
        data: {
          configuration: { key: 'value' }
        }
      };

      mockAppSdk.marketplace.returns({
        installation: sinon.stub().returns({
          installationData: sinon.stub().resolves(installationData)
        })
      });

      await exportMarketplaceApps.getAppConfigurations(0, exportMarketplaceApps.installedApps[0]);

      expect((marketplaceAppHelper.createNodeCryptoInstance as sinon.SinonStub).called).to.be.true;
      expect(exportMarketplaceApps.nodeCrypto).to.exist;
    });

    it('should handle empty configuration gracefully', async () => {
      const installationData = {
        data: {
          configuration: null
        } as any
      };

      mockAppSdk.marketplace.returns({
        installation: sinon.stub().returns({
          installationData: sinon.stub().resolves(installationData)
        })
      });

      await exportMarketplaceApps.getAppConfigurations(0, exportMarketplaceApps.installedApps[0]);

      expect(mockNodeCrypto.encrypt.called).to.be.false;
    });

    it('should handle API errors gracefully', async () => {
      mockAppSdk.marketplace.returns({
        installation: sinon.stub().returns({
          installationData: sinon.stub().rejects(new Error('API Error'))
        })
      });

      await exportMarketplaceApps.getAppConfigurations(0, exportMarketplaceApps.installedApps[0]);

      // Should complete without throwing
      expect(exportMarketplaceApps.installedApps[0]).to.exist;
    });

    it('should handle error in installation data response', async () => {
      const installationData = {
        data: null,
        error: { message: 'Error fetching data' }
      } as any;

      mockAppSdk.marketplace.returns({
        installation: sinon.stub().returns({
          installationData: sinon.stub().resolves(installationData)
        })
      });

      await exportMarketplaceApps.getAppConfigurations(0, exportMarketplaceApps.installedApps[0]);

      // Should handle error gracefully
      expect(exportMarketplaceApps.installedApps[0]).to.exist;
    });

    it('should use app name when available, otherwise use uid', async () => {
      exportMarketplaceApps.installedApps[0].manifest.name = 'Test App Name';
      const installationData = {
        data: {
          configuration: { key: 'value' }
        }
      };

      mockAppSdk.marketplace.returns({
        installation: sinon.stub().returns({
          installationData: sinon.stub().resolves(installationData)
        })
      });

      await exportMarketplaceApps.getAppConfigurations(0, exportMarketplaceApps.installedApps[0]);

      // Should process successfully with app name
      expect(exportMarketplaceApps.installedApps[0].configuration).to.exist;
    });

    it('should use app uid when name is not available', async () => {
      exportMarketplaceApps.installedApps[0].manifest.name = undefined;
      exportMarketplaceApps.installedApps[0].manifest.uid = 'app-uid-123';
      const installationData = {
        data: {
          configuration: { key: 'value' }
        }
      };

      mockAppSdk.marketplace.returns({
        installation: sinon.stub().returns({
          installationData: sinon.stub().resolves(installationData)
        })
      });

      await exportMarketplaceApps.getAppConfigurations(0, exportMarketplaceApps.installedApps[0]);

      // Should process successfully with app uid
      expect(exportMarketplaceApps.installedApps[0].configuration).to.exist;
    });
  });
});

