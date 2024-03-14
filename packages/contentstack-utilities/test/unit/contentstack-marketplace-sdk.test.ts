import { expect } from '@oclif/test';
import { fancy } from '@contentstack/cli-dev-dependencies';

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
      .spy(configStore, 'get')
      .it('should create sdk instance with given host', async ({ spy }) => {
        marketplaceSDKInitiator.init({ analyticsInfo: 'TEST-DATA' });
        const appSdk = await marketplaceSDKClient({ host });

        expect(appSdk).has.haveOwnProperty('login');
        expect(appSdk).has.haveOwnProperty('logout');
        expect(appSdk).has.haveOwnProperty('marketplace');
        expect(spy.get.callCount).to.be.equals(2);
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
        const appSdk = await marketplaceSDKClient({ endpoint, management_token: '', retryDelay: 300, retryLimit: 1 });
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
      .spy(authHandler, 'compareOAuthExpiry')
      .it("should refresh token if auth type is 'OAUTH'", async ({ spy }) => {
        const appSdk = await marketplaceSDKClient({ endpoint, retryLimit: 1, retryDelay: 300 });
        const apps = await appSdk.marketplace('UID').findAllApps();

        expect(apps.items).deep.equal([]);
        expect(apps.items.length).to.be.equals(0);
        expect(spy.compareOAuthExpiry.callCount).to.be.equals(2);
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(configStore, 'get', (...[key]: (string | any)[]) => {
        return {
          authorisationType: 'OAUTH',
          oauthAccessToken: 'TEST-AUTH-TKN',
        }[key];
      })
      .nock(endpoint, (api) => api.get(`/manifests`).reply(500))
      .it('should not refresh the token if status code is not among [401, 429, 408]', async () => {
        const appSdk = await marketplaceSDKClient({ endpoint, management_token: '' });
        try {
          await appSdk.marketplace('UID').findAllApps();
        } catch (error) {
          expect(error.status).to.be.equals(500);
        }
      });
  });
});
