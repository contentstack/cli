import { expect } from '@oclif/test';
import { App, FsUtility, cliux, marketplaceSDKClient } from '@contentstack/cli-utilities';
import { fancy } from '@contentstack/cli-dev-dependencies';

import defaultConfig from '../../../../src/config';
import * as logUtil from '../../../../src/utils/logger';
import * as utilities from '@contentstack/cli-utilities';
import ExportConfig from '../../../../lib/types/export-config';
import * as appUtility from '../../../../src/utils/marketplace-app-helper';
import ExportMarketplaceApps from '../../../../src/export/modules/marketplace-apps';
import { Installation, MarketplaceAppsConfig } from '../../../../src/types';

describe('ExportMarketplaceApps class', () => {
  const exportConfig: ExportConfig = Object.assign(defaultConfig, {
    data: './',
    exportDir: './',
    apiKey: 'TST-API-KEY',
    master_locale: { code: 'en-us' },
    forceStopMarketplaceAppsPrompt: false,
    developerHubBaseUrl: 'https://test-apps.io', // NOTE dummy url
  }) as ExportConfig;
  const host = 'test-app.io';

  describe('start method', () => {
    fancy
      .stub(utilities, 'isAuthenticated', () => false)
      .stub(cliux, 'print', () => {})
      .spy(utilities, 'isAuthenticated')
      .spy(cliux, 'print')
      .spy(ExportMarketplaceApps.prototype, 'exportApps')
      .it('should skip marketplace app export process if not authenticated', async ({ spy }) => {
        const marketplaceApps = new ExportMarketplaceApps({ exportConfig });
        await marketplaceApps.start();

        expect(spy.print.callCount).to.be.equals(1);
        expect(spy.isAuthenticated.callCount).to.be.equals(1);
      });

    fancy
      .stub(utilities, 'isAuthenticated', () => true)
      .stub(utilities, 'log', () => {})
      .stub(FsUtility.prototype, 'makeDirectory', () => {})
      .stub(appUtility, 'getOrgUid', () => 'ORG-UID')
      .stub(ExportMarketplaceApps.prototype, 'exportApps', () => {})
      .spy(appUtility, 'getOrgUid')
      .spy(ExportMarketplaceApps.prototype, 'exportApps')
      .it('should trigger start method', async ({ spy }) => {
        const marketplaceApps = new ExportMarketplaceApps({ exportConfig });
        await marketplaceApps.start();

        expect(spy.getOrgUid.callCount).to.be.equals(1);
        expect(spy.exportApps.callCount).to.be.equals(1);
      });
  });

  describe('exportApps method', () => {
    fancy
      .stub(ExportMarketplaceApps.prototype, 'getStackSpecificApps', () => {})
      .stub(ExportMarketplaceApps.prototype, 'getAppManifestAndAppConfig', () => {})
      .stub(appUtility, 'createNodeCryptoInstance', () => ({ encrypt: (val: any) => val }))
      .spy(ExportMarketplaceApps.prototype, 'getStackSpecificApps')
      .spy(ExportMarketplaceApps.prototype, 'getAppManifestAndAppConfig')
      .it('should get call get all stack specif installation and manifest and configuration', async ({ spy }) => {
        class MPApps extends ExportMarketplaceApps {
          public installedApps = [
            { uid: 'UID', name: 'TEST-APP', configuration: { id: 'test' }, manifest: { visibility: 'private' } },
          ] as unknown as Installation[];
        }
        const marketplaceApps = new MPApps({ exportConfig });
        await marketplaceApps.exportApps();

        expect(spy.getStackSpecificApps.callCount).to.be.equals(1);
        expect(spy.getAppManifestAndAppConfig.callCount).to.be.equals(1);
        expect(marketplaceApps.installedApps).to.be.string;
      });
  });

  describe('getAppManifestAndAppConfig method', () => {
    fancy
      .stub(logUtil, 'log', () => {})
      .spy(logUtil, 'log')
      .it(
        "if no apps is exported from stack, It should log message that 'No marketplace apps found'",
        async ({ spy }) => {
          class MPApps extends ExportMarketplaceApps {
            public installedApps = [] as unknown as Installation[];
          }
          const marketplaceApps = new MPApps({ exportConfig });
          await marketplaceApps.getAppManifestAndAppConfig();

          expect(spy.log.callCount).to.be.equals(1);
          expect(spy.log.calledWith(marketplaceApps.exportConfig, 'No marketplace apps found', 'info')).to.be.true;
        },
      );

    fancy
      .stub(logUtil, 'log', () => {})
      .stub(FsUtility.prototype, 'writeFile', () => {})
      .stub(ExportMarketplaceApps.prototype, 'getAppConfigurations', () => {})
      .stub(ExportMarketplaceApps.prototype, 'getPrivateAppsManifest', () => {})
      .spy(logUtil, 'log')
      .spy(FsUtility.prototype, 'writeFile')
      .spy(ExportMarketplaceApps.prototype, 'getAppConfigurations')
      .spy(ExportMarketplaceApps.prototype, 'getPrivateAppsManifest')
      .it('should get all private apps manifest and all apps configurations', async ({ spy }) => {
        class MPApps extends ExportMarketplaceApps {
          public installedApps = [
            {
              uid: 'UID',
              name: 'TEST-APP',
              manifest: { uid: 'UID', visibility: 'private' },
            },
          ] as unknown as Installation[];
          public marketplaceAppConfig: MarketplaceAppsConfig;
        }
        const marketplaceApps = new MPApps({ exportConfig });
        marketplaceApps.marketplaceAppPath = './';
        marketplaceApps.marketplaceAppConfig.fileName = 'mp-apps.json';
        await marketplaceApps.getAppManifestAndAppConfig();

        expect(spy.log.callCount).to.be.equals(1);
        expect(spy.writeFile.callCount).to.be.equals(1);
        expect(spy.getPrivateAppsManifest.callCount).to.be.equals(1);
        expect(spy.getAppConfigurations.callCount).to.be.equals(1);
        expect(
          spy.log.calledWith(
            marketplaceApps.exportConfig,
            'All the marketplace apps have been exported successfully',
            'info',
          ),
        ).to.be.true;
      });
  });

  describe('getStackSpecificApps method', () => {
    fancy
      .nock(`https://${host}`, (api) =>
        api.get(`/installations?target_uids=STACK-UID&skip=0`).reply(200, {
          count: 51,
          data: [
            {
              uid: 'UID',
              name: 'TEST-APP',
              configuration: () => {},
              fetch: () => {},
              manifest: { visibility: 'private' },
            },
          ],
        }),
      )
      .nock(`https://${host}`, (api) =>
        api.get(`/installations?target_uids=STACK-UID&skip=50`).reply(200, {
          count: 51,
          data: [
            {
              uid: 'UID',
              name: 'TEST-APP-2',
              configuration: () => {},
              fetch: () => {},
              manifest: { visibility: 'private' },
            },
          ],
        }),
      )
      .it('should paginate and get all the apps', async () => {
        class MPApps extends ExportMarketplaceApps {
          public installedApps: Installation[] = [];
        }
        const marketplaceApps = new MPApps({ exportConfig });
        marketplaceApps.exportConfig.org_uid = 'ORG-UID';
        marketplaceApps.exportConfig.source_stack = 'STACK-UID';
        marketplaceApps.appSdk = await marketplaceSDKClient({ host });
        await marketplaceApps.getStackSpecificApps();

        expect(marketplaceApps.installedApps.length).to.be.equals(2);
      });

    fancy
      .stub(logUtil, 'log', () => {})
      .spy(logUtil, 'log')
      .nock(`https://${host}`, (api) => api.get(`/installations?target_uids=STACK-UID&skip=0`).reply(400))
      .it('should catch and log api error', async ({ spy }) => {
        class MPApps extends ExportMarketplaceApps {
          public installedApps: Installation[] = [];
        }
        const marketplaceApps = new MPApps({ exportConfig });
        marketplaceApps.exportConfig.org_uid = 'ORG-UID';
        marketplaceApps.exportConfig.source_stack = 'STACK-UID';
        marketplaceApps.appSdk = await marketplaceSDKClient({ host });
        await marketplaceApps.getStackSpecificApps();

        expect(spy.log.callCount).to.be.equals(2);
      });
  });

  describe('getPrivateAppsManifest method', () => {
    fancy
      .nock(`https://${host}`, (api) =>
        api
          .get(`/manifests/UID?include_oauth=true`)
          .reply(200, { data: { uid: 'UID', visibility: 'private', config: 'test' } }),
      )
      .it("should log info 'No marketplace apps found'", async () => {
        class MPApps extends ExportMarketplaceApps {
          public installedApps = [
            {
              uid: 'UID',
              name: 'TEST-APP',
              configuration: { id: 'test' },
              manifest: { uid: 'UID', visibility: 'private' },
            },
          ] as unknown as Installation[];
        }
        const marketplaceApps = new MPApps({ exportConfig });
        marketplaceApps.exportConfig.org_uid = 'ORG-UID';
        marketplaceApps.appSdk = await marketplaceSDKClient({ host });
        await marketplaceApps.getPrivateAppsManifest(0, { manifest: { uid: 'UID' } } as unknown as Installation);

        expect(marketplaceApps.installedApps[0].manifest.config).to.be.include('test');
      });

    fancy
      .stub(logUtil, 'log', () => {})
      .spy(logUtil, 'log')
      .nock(`https://${host}`, (api) => api.get(`/manifests/UID?include_oauth=true`).reply(400))
      .it('should handle API/SDK errors and log them', async ({ spy }) => {
        class MPApps extends ExportMarketplaceApps {
          public installedApps = [
            {
              uid: 'UID',
              name: 'TEST-APP',
              configuration: { id: 'test' },
              manifest: { uid: 'UID', visibility: 'private' },
            },
          ] as unknown as Installation[];
        }
        const marketplaceApps = new MPApps({ exportConfig });
        marketplaceApps.exportConfig.org_uid = 'ORG-UID';
        marketplaceApps.appSdk = await marketplaceSDKClient({ host });
        await marketplaceApps.getPrivateAppsManifest(0, { manifest: { uid: 'UID' } } as unknown as Installation);

        expect(spy.log.callCount).to.be.equals(1);
      });
  });

  describe('getAppConfigurations method', () => {
    fancy
      .stub(logUtil, 'log', () => {})
      .stub(appUtility, 'createNodeCryptoInstance', () => ({ encrypt: (val: any) => val }))
      .nock(`https://${host}`, (api) =>
        api
          .get(`/installations/UID/installationData`)
          .reply(200, { data: { uid: 'UID', visibility: 'private', server_configuration: 'test-config' } }),
      )
      .it('should get all apps installationData', async () => {
        class MPApps extends ExportMarketplaceApps {
          public installedApps = [
            {
              uid: 'UID',
              name: 'TEST-APP',
              configuration: { id: 'test' },
              manifest: { uid: 'UID', visibility: 'private' },
            },
          ] as unknown as Installation[];
        }
        const marketplaceApps = new MPApps({ exportConfig });
        marketplaceApps.exportConfig.org_uid = 'ORG-UID';
        marketplaceApps.appSdk = await marketplaceSDKClient({ host });
        await marketplaceApps.getAppConfigurations(0, { uid: 'UID', manifest: { name: 'TEST-APP' } } as unknown as App);

        expect(marketplaceApps.installedApps[0].server_configuration).to.be.include('test-config');
      });

    fancy
      .stub(logUtil, 'log', () => {})
      .stub(appUtility, 'createNodeCryptoInstance', () => ({ encrypt: (val: any) => val }))
      .spy(logUtil, 'log')
      .nock(`https://${host}`, (api) =>
        api
          .get(`/installations/UID/installationData`)
          .reply(200, { data: { uid: 'UID', visibility: 'private', server_configuration: '' } }),
      )
      .it('should skip encryption and log success message if server_config is empty', async ({ spy }) => {
        class MPApps extends ExportMarketplaceApps {
          public installedApps = [
            {
              uid: 'UID',
              name: 'TEST-APP',
              configuration: { id: 'test' },
              manifest: { name: 'TEST-APP', uid: 'UID', visibility: 'private' },
            },
          ] as unknown as Installation[];
        }
        const marketplaceApps = new MPApps({ exportConfig });
        marketplaceApps.exportConfig.org_uid = 'ORG-UID';
        marketplaceApps.appSdk = await marketplaceSDKClient({ host });
        await marketplaceApps.getAppConfigurations(0, { uid: 'UID', manifest: { name: 'TEST-APP' } } as unknown as App);

        expect(spy.log.calledWith(marketplaceApps.exportConfig, 'Exported TEST-APP app', 'success')).to.be.true;
      });

    fancy
      .stub(logUtil, 'log', () => {})
      .spy(logUtil, 'log')
      .nock(`https://${host}`, (api) =>
        api.get(`/installations/UID/installationData`).reply(200, { error: 'API is broken' }),
      )
      .it('should log error message if no config received from API/SDK', async ({ spy }) => {
        class MPApps extends ExportMarketplaceApps {
          public installedApps = [
            {
              uid: 'UID',
              name: 'TEST-APP',
              configuration: { id: 'test' },
              manifest: { uid: 'UID', visibility: 'private' },
            },
          ] as unknown as Installation[];
        }
        const marketplaceApps = new MPApps({ exportConfig });
        marketplaceApps.exportConfig.org_uid = 'ORG-UID';
        marketplaceApps.appSdk = await marketplaceSDKClient({ host });
        await marketplaceApps.getAppConfigurations(0, { uid: 'UID', manifest: { name: 'TEST-APP' } } as unknown as App);

        expect(spy.log.calledWith(marketplaceApps.exportConfig, 'API is broken', 'error')).to.be.true;
      });

    fancy
      .stub(logUtil, 'log', () => {})
      .spy(logUtil, 'log')
      .nock(`https://${host}`, (api) =>
        api.get(`/installations/UID/installationData`).reply(500, { error: 'API is broken' }),
      )
      .it('should catch API/SDK error and log', async ({ spy }) => {
        const marketplaceApps = new ExportMarketplaceApps({ exportConfig });
        marketplaceApps.exportConfig.org_uid = 'ORG-UID';
        marketplaceApps.appSdk = await marketplaceSDKClient({ host });
        await marketplaceApps.getAppConfigurations(0, {
          uid: 'UID',
          manifest: { name: 'TEST-APP' },
        } as unknown as Installation);

        const [, errorObj]: any = spy.log.args[spy.log.args.length - 1];
        expect(errorObj.error).to.be.include('API is broken');
      });
  });
});
