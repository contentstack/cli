import { expect } from 'chai';
import { fancy } from 'fancy-test';
import sinon from 'sinon';

import authHandler from '../../src/auth-handler';
import configStore from '../../src/config-handler';
import marketplaceSDKClient, { marketplaceSDKInitiator } from '../../src/contentstack-marketplace-sdk';

describe('MarketplaceSDKInitiator class', () => {
  const host = 'test.app-api.io';
  const endpoint = `http://${host}/marketplace`;

  describe('createAppSDKClient method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(configStore, 'get', (...[key]: (string | any)[]) => {
        return {
          authorisationType: 'BASIC',
          authtoken: 'TEST-AUTH-TKN',
        }[key];
      })
      .it('should create sdk instance with given host', async () => {
        // Create a spy on configStore.get
        const getSpy = sinon.spy(configStore, 'get');

        // Additional spy example: spying on marketplaceSDKInitiator.init
        const initSpy = sinon.spy(marketplaceSDKInitiator, 'init');

        marketplaceSDKInitiator.init({ analyticsInfo: 'TEST-DATA' });
        const appSdk = await marketplaceSDKClient({ host });

        expect(appSdk).to.haveOwnProperty('login');
        expect(appSdk).to.haveOwnProperty('logout');
        expect(appSdk).to.haveOwnProperty('marketplace');

        // Verify spy call counts
        expect(getSpy.callCount).to.equal(2);
        expect(initSpy.calledOnce).to.be.true;

        // Restore the original method after spying
        getSpy.restore();
        initSpy.restore();
      });
  });

  describe('SDK retryCondition & refreshToken', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(configStore, 'get', (...[key]: (string | any)[]) => {
        return {
          authorisationType: 'BASIC',
          authtoken: 'TEST-AUTH-TKN',
        }[key];
      })
      .nock(endpoint, (api) => api.persist().get(`/manifests`).reply(401))
      .it("should throw 'Session timed out error' if auth type is 'BASIC'", async () => {
        const appSdk = await marketplaceSDKClient({ endpoint, retryDelay: 300, retryLimit: 1 });
        try {
          await appSdk.marketplace('UID').findAllApps();
        } catch (error) {
          expect(error.errorCode).to.be.contain('401');
          expect(error).is.haveOwnProperty('message');
          expect(error.errorMessage).to.contain('Session timed out, please login to proceed');
        }
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(configStore, 'get', (...[key]: (string | any)[]) => {
        return {
          authorisationType: 'OAUTH',
          oauthAccessToken: 'TEST-AUTH-TKN',
        }[key];
      })
      .stub(authHandler, 'compareOAuthExpiry', async () => void 0)
      .nock(endpoint, (api) => api.get(`/manifests`).reply(401))
      .nock(endpoint, (api) => api.get(`/manifests`).reply(200, []))

      .it("should refresh token if auth type is 'OAUTH'", async ({}) => {
        const OAuthExpiry = sinon.spy(authHandler, 'compareOAuthExpiry');
        const appSdk = await marketplaceSDKClient({ endpoint, retryLimit: 1, retryDelay: 300 });
        const apps = await appSdk.marketplace('UID').findAllApps();

        expect(apps.items).deep.equal([]);
        expect(apps.items.length).to.be.equals(0);
        expect(OAuthExpiry.callCount).to.be.equals(2);
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(configStore, 'get', (...[key]: (string | any)[]) => {
        return {
          authorisationType: 'OAUTH',
          oauthAccessToken: 'TEST-AUTH-TKN',
        }[key];
      })
      .stub(authHandler, 'compareOAuthExpiry', async () => void 0)
      .nock(endpoint, (api) => api.get(`/manifests`).reply(500))
      .it('should not refresh the token if status code is not among [401, 429, 408]', async () => {
        const appSdk = await marketplaceSDKClient({ endpoint });
        try {
          await appSdk.marketplace('UID').findAllApps();
        } catch (error) {
          expect(error.status).to.be.equals(500);
        }
      });
  });
});
