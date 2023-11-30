import { expect } from '@oclif/test';
import { App, FsUtility, marketplaceSDKClient } from '@contentstack/cli-utilities';
import { fancy } from '@contentstack/cli-dev-dependencies';

import defaultConfig from '../../../../src/config';
import * as logUtil from '../../../../src/utils/logger';
import * as utilities from '@contentstack/cli-utilities';
import ExportConfig from '../../../../lib/types/export-config';
import * as appUtility from '../../../../src/utils/marketplace-app-helper';
import ExportMarketplaceApps from '../../../../src/export/modules/marketplace-apps';

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
      .stub(utilities, 'isAuthenticated', () => true)
      .stub(utilities, 'log', () => {})
      .stub(FsUtility.prototype, 'makeDirectory', () => {})
      .stub(appUtility, 'getOrgUid', () => 'ORG-UID')
      .stub(ExportMarketplaceApps.prototype, 'setHttpClient', () => {})
      .stub(ExportMarketplaceApps.prototype, 'getAllStackSpecificApps', () => {})
      .stub(ExportMarketplaceApps.prototype, 'exportInstalledExtensions', () => {})
      .spy(appUtility, 'getOrgUid')
      .spy(ExportMarketplaceApps.prototype, 'setHttpClient')
      .spy(ExportMarketplaceApps.prototype, 'getAllStackSpecificApps')
      .spy(ExportMarketplaceApps.prototype, 'exportInstalledExtensions')
      .it('should trigger start method', async ({ spy }) => {
        const marketplaceApps = new ExportMarketplaceApps({ exportConfig });
        await marketplaceApps.start();

        expect(spy.getOrgUid.callCount).to.be.equals(1);
        expect(spy.setHttpClient.callCount).to.be.equals(1);
        expect(spy.getAllStackSpecificApps.callCount).to.be.equals(1);
        expect(spy.exportInstalledExtensions.callCount).to.be.equals(1);
      });
  });

  describe('getAllStackSpecificApps method', () => {
    fancy
      .stub(appUtility, 'getStackSpecificApps', () => ({ data: [], count: 0 }))
      .spy(appUtility, 'getStackSpecificApps')
      .it('should get call getStackSpecificApps to get stack specific apps', async ({ spy }) => {
        const marketplaceApps = new ExportMarketplaceApps({ exportConfig });
        await marketplaceApps.getAllStackSpecificApps();

        expect(spy.getStackSpecificApps.callCount).to.be.equals(1);
        expect(
          spy.getStackSpecificApps.calledWithExactly({
            developerHubBaseUrl: marketplaceApps.developerHubBaseUrl,
            config: marketplaceApps.exportConfig,
            skip: 0,
          }),
        ).to.be.true;
      });

    fancy
      .stub(appUtility, 'getStackSpecificApps', () => ({
        data: [{ uid: 'UID', name: 'TEST-APP', configuration: { id: 'test' } }],
        count: 51,
      }))
      .stub(appUtility, 'createNodeCryptoInstance', () => ({ encrypt: (val: any) => val }))
      .spy(appUtility, 'getStackSpecificApps')
      .spy(appUtility, 'createNodeCryptoInstance')
      .it('should paginate and get all the apps', async ({ spy }) => {
        const marketplaceApps = new ExportMarketplaceApps({ exportConfig });
        marketplaceApps.developerHubBaseUrl = defaultConfig.developerHubBaseUrl;
        await marketplaceApps.getAllStackSpecificApps();

        expect(spy.getStackSpecificApps.callCount).to.be.equals(2);
        expect(spy.createNodeCryptoInstance.callCount).to.be.equals(1);
        expect(
          spy.getStackSpecificApps.calledWith({
            developerHubBaseUrl: marketplaceApps.developerHubBaseUrl,
            config: marketplaceApps.exportConfig,
            skip: 50,
          }),
        ).to.be.true;
      });
  });

  describe('exportInstalledExtensions method', () => {
    fancy
      .stub(logUtil, 'log', () => {})
      .stub(FsUtility.prototype, 'writeFile', () => {})
      .spy(logUtil, 'log')
      .it("should log info 'No marketplace apps found'", async ({ spy }) => {
        const marketplaceApps = new ExportMarketplaceApps({ exportConfig });
        await marketplaceApps.exportInstalledExtensions();

        expect(spy.log.callCount).to.be.equals(1);
        expect(spy.log.calledWith(marketplaceApps.exportConfig, 'No marketplace apps found', 'info')).to.be.true;
      });

    fancy
      .stub(logUtil, 'log', () => {})
      .stub(FsUtility.prototype, 'writeFile', () => {})
      .stub(ExportMarketplaceApps.prototype, 'getPrivateAppsManifest', () => {})
      .stub(ExportMarketplaceApps.prototype, 'getAppConfigurations', () => {})
      .spy(logUtil, 'log')
      .spy(FsUtility.prototype, 'writeFile')
      .spy(ExportMarketplaceApps.prototype, 'getPrivateAppsManifest')
      .spy(ExportMarketplaceApps.prototype, 'getAppConfigurations')
      .it('should export all the apps configuration and manifest if private apps', async ({ spy, stdout }) => {
        class MPApps extends ExportMarketplaceApps {
          protected installedApps = [
            { uid: 'UID', name: 'TEST-APP', configuration: { id: 'test' }, manifest: { visibility: 'private' } },
          ] as unknown as App[];
          protected marketplaceAppConfig = {
            dirName: 'test',
            fileName: 'mp-apps.json',
          };
        }
        const marketplaceApps = new MPApps({ exportConfig });
        marketplaceApps.marketplaceAppPath = './';
        await marketplaceApps.exportInstalledExtensions();

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
          ] as unknown as App[];
        }
        const marketplaceApps = new MPApps({ exportConfig });
        marketplaceApps.exportConfig.org_uid = 'ORG-UID';
        marketplaceApps.appSdk = await marketplaceSDKClient({ host });
        await marketplaceApps.getPrivateAppsManifest(0, { manifest: { uid: 'UID' } } as unknown as App);

        expect(marketplaceApps.installedApps[0].manifest.config).to.be.include('test');
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
          ] as unknown as App[];
        }
        const marketplaceApps = new MPApps({ exportConfig });
        marketplaceApps.exportConfig.org_uid = 'ORG-UID';
        marketplaceApps.appSdk = await marketplaceSDKClient({ host });
        await marketplaceApps.getAppConfigurations(0, { uid: 'UID', manifest: { name: 'TEST-APP' } } as unknown as App);

        expect(marketplaceApps.installedApps[0].server_configuration).to.be.include('test-config');
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
          ] as unknown as App[];
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
        } as unknown as App);

        const [, errorObj]: any = spy.log.args[spy.log.args.length - 1];
        expect(errorObj.error).to.be.include('API is broken');
      });
  });
});
