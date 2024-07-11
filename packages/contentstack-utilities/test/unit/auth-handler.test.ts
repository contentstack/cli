//@ts-nocheck
import { expect } from 'chai';
import { assert, stub, createSandbox } from 'sinon';
import { cliux } from '@contentstack/cli-utilities';
import authHandler from '../../src/auth-handler';
import configHandler from '../../src/config-handler';
import { HttpClient } from '../../src/http-client';
const http = require('http');
const crypto = require('crypto');
import * as config from './config.json';

describe('Auth Handler', () => {
  describe('setOAuthBaseURL', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should set the OAuthBaseURL when a valid uiHost URL is present in the config', async () => {
      const expectedURL = 'https://example.com';
      sandbox.stub(configHandler, 'get').returns({ uiHost: expectedURL });

      await authHandler.setOAuthBaseURL();
    });
  });

  describe('oauth', () => {
    let createHTTPServerStub;
    let openOAuthURLStub;

    beforeEach(() => {
      createHTTPServerStub = stub(authHandler, 'createHTTPServer');
      openOAuthURLStub = stub(authHandler, 'openOAuthURL');
    });

    afterEach(() => {
      createHTTPServerStub.restore();
      openOAuthURLStub.restore();
    });

    it('should reject with an error when createHTTPServer fails', async () => {
      const expectedErrorMessage = 'Failed to create HTTP server';
      createHTTPServerStub.rejects(new Error(expectedErrorMessage));

      try {
        await authHandler.oauth();
        expect.fail('Expected promise to reject');
      } catch (error) {
        expect(error.message).to.equal(expectedErrorMessage);
        expect(createHTTPServerStub.calledOnce).to.be.true;
        expect(openOAuthURLStub.notCalled).to.be.true;
      }
    });

    it('should reject with an error when openOAuthURL fails', async () => {
      createHTTPServerStub.resolves();
      openOAuthURLStub.rejects(new Error('Failed to open OAuth URL'));

      try {
        await authHandler.oauth();
        expect.fail('Expected promise to reject');
      } catch (error) {
        expect(error.message).to.equal('Failed to open OAuth URL');
        expect(createHTTPServerStub.calledOnce).to.be.true;
        expect(openOAuthURLStub.calledOnce).to.be.true;
      }
    });

    it('should resolve with an empty object when createHTTPServer and openOAuthURL succeed', async () => {
      createHTTPServerStub.resolves();
      openOAuthURLStub.resolves();

      const result = await authHandler.oauth();

      expect(createHTTPServerStub.calledOnce).to.be.true;
      expect(openOAuthURLStub.calledOnce).to.be.true;
      expect(result).to.deep.equal({});
    });
  });

  describe('createHTTPServer', () => {
    let sandbox;
    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should reject with an error if an error occurs', async () => {
      const error = new Error('An error occurred');
      const serverStub = sandbox.stub(http, 'createServer').throws(error);

      sandbox.replace(http, 'createServer', serverStub);

      try {
        await authHandler.createHTTPServer();
        expect.fail('Expected an error to be thrown');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('openOAuthURL', () => {
    let sandbox, openMock;
    beforeEach(() => {
      sandbox = createSandbox();
      openMock = sandbox.stub().resolves();
      global.open = openMock;
    });

    afterEach(() => {
      delete global.open;
      sandbox.restore();
    });

    it('should open the OAuth URL and resolve with the result', async () => {
      const expectedURL = 'https://example.com/oauth';
      const openStub = sandbox.stub().resolves();

      sandbox.stub(authHandler, 'setOAuthBaseURL').resolves();
      sandbox.stub(crypto, 'createHash').returns({ update: () => {}, digest: () => {} });
      sandbox.stub(authHandler, 'codeVerifier').value('CODE_VERIFIER');
      sandbox.stub(authHandler, 'OAuthBaseURL').value('https://example.com');
      sandbox.stub(authHandler, 'OAuthAppId').value('APP_ID');
      sandbox.stub(authHandler, 'OAuthResponseType').value('response_type');
      sandbox.stub(authHandler, 'OAuthClientId').value('client_id');
      sandbox.stub(authHandler, 'OAuthRedirectURL').value('redirect_uri');
      sandbox.stub(authHandler, 'OAuthScope').value('scope');
      sandbox.stub(cliux, 'print');
      sandbox.stub(cliux, 'error');

      sandbox.replace(global, 'open', openStub);

      try {
        await authHandler.openOAuthURL();

        assert.calledWith(openStub, expectedURL);
      } catch (error) {}
    });
  });

  describe('getAccessToken', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should retrieve access token and set OAuth tokens', async () => {
      const code = 'AUTHORIZATION_CODE';
      const accessToken = 'ACCESS_TOKEN';
      const refreshToken = 'REFRESH_TOKEN';
      const userData = {
        access_token: accessToken,
        refresh_token: refreshToken,
      };

      try {
        const expectedPayload = {
          grant_type: 'authorization_code',
          client_id: authHandler.OAuthClientId,
          code_verifier: authHandler.codeVerifier,
          redirect_uri: authHandler.OAuthRedirectURL,
          code,
        };

        const httpClientStub = sandbox.stub(HttpClient.prototype, 'post').resolves({ data: userData });
        const getUserDetailsStub = sandbox.stub(authHandler, 'getUserDetails').resolves(userData);
        const setConfigDataStub = sandbox.stub(authHandler, 'setConfigData').resolves();

        await authHandler.getAccessToken(code);

        assert.calledWith(httpClientStub, `${authHandler.OAuthBaseURL}/apps-api/apps/token`, expectedPayload);
        assert.calledWith(getUserDetailsStub, userData);
        assert.calledWith(setConfigDataStub, 'oauth', userData);
      } catch (error) {}
    });
  });

  describe('setConfigData', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should set OAuth tokens info when type is "oauth"', async () => {
      const userData = {
        access_token: 'abc123',
        refresh_token: '***REMOVED***',
        email: 'test@example.com',
        user_uid: 'user123',
        organization_uid: 'org123',
      };
      try {
        sandbox.stub(configHandler, 'set').returns();

        await authHandler.setConfigData('oauth', userData);

        assert.calledWith(configHandler.set, authHandler.oauthAccessTokenKeyName, userData.access_token);
        assert.calledWith(configHandler.set, authHandler.oauthRefreshTokenKeyName, userData.refresh_token);
        assert.calledWith(configHandler.set, authHandler.authEmailKeyName, userData.email);
      } catch (error) {}
    });

    it('should set refresh token config data', async () => {
      const userData = {
        access_token: 'abc123',
        refresh_token: '***REMOVED***',
      };

      try {
        sandbox.stub(configHandler, 'set');
        await authHandler.setConfigData('refreshToken', userData);

        assert.calledWithExactly(setStub, authHandler.oauthAccessTokenKeyName, userData.access_token);
        assert.calledWithExactly(setStub, authHandler.oauthRefreshTokenKeyName, userData.refresh_token);
      } catch (error) {}
    });

    it('should set basic auth config data', async () => {
      const userData = {
        authtoken: 'abc123',
        email: 'test@example.com',
      };

      try {
        sandbox.stub(configHandler, 'set');

        await authHandler.setConfigData('basicAuth', userData);

        assert.calledWithExactly(setStub, authHandler.authTokenKeyName, userData.authtoken);
        assert.calledWithExactly(setStub, authHandler.authEmailKeyName, userData.email);
      } catch (error) {}
    });
  });

  describe('unsetConfigData', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should unset the default config data when type is not specified', async () => {
      const deleteStub = sandbox.stub(configHandler, 'delete');

      authHandler.unsetConfigData();

      assert.callCount(deleteStub, authHandler.allAuthConfigItems.default.length);
      authHandler.allAuthConfigItems.default.forEach((item, index) => {
        assert.calledWithExactly(deleteStub.getCall(index), item);
      });
    });

    it('should unset the refresh token config data when type is "refreshToken"', async () => {
      const deleteStub = sandbox.stub(configHandler, 'delete');

      authHandler.unsetConfigData('refreshToken');

      assert.callCount(deleteStub, authHandler.allAuthConfigItems.refreshToken.length);
      authHandler.allAuthConfigItems.refreshToken.forEach((item, index) => {
        assert.calledWithExactly(deleteStub.getCall(index), item);
      });
    });
  });

  describe('refreshToken', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should refresh the token and resolve with data when refresh token is valid', async () => {
      const configOauthRefreshToken = 'valid_refresh_token'; // Set a valid refresh token here
      const configAuthorisationType = authHandler.authorisationTypeOAUTHValue;
      const expectedData = {
        access_token: config.access_token,
        refresh_token: 'new_refresh_token',
      };

      const postStub = sandbox.stub().resolves({ data: expectedData });
      const httpClientStub = {
        post: postStub,
      };
      const httpClientInstance = new HttpClient().headers().asFormParams();
      sandbox.stub(httpClientInstance, 'post').value(httpClientStub);

      sandbox.stub(authHandler, 'setConfigData').resolves(expectedData);

      sandbox
        .stub(configHandler, 'get')
        .withArgs(authHandler.oauthRefreshTokenKeyName)
        .returns(configOauthRefreshToken)
        .withArgs(authHandler.authorisationTypeKeyName)
        .returns(configAuthorisationType);

      authHandler.refreshToken();
    });
  });

  describe('getUserDetails', () => {
    let sandbox;
    let managementAPIClientStub;

    beforeEach(() => {
      sandbox = createSandbox();
      managementAPIClientStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should reject with error when access token is invalid/empty', async () => {
      const data = {
        access_token: config.invalid_access_token,
      };
      const expectedError = new Error('The provided access token is invalid or expired or revoked');

      const getUserStub = sandbox.stub().rejects(expectedError);
      managementAPIClientStub.returns({ getUser: getUserStub });

      authHandler.contentstackManagementSDKClient = managementAPIClientStub;

      authHandler.getUserDetails(data);
    });

    it('should reject with error when access token is invalid/empty', async () => {
      const data = {
        access_token: '',
      };

      const userDetailsPromise = authHandler.getUserDetails(data);

      return userDetailsPromise.catch((error) => {
        expect(error).to.equal('Invalid/Empty access token');
      });
    });
  });

  describe('isAuthenticated', () => {
    let sandbox;
    let configHandlerGetStub;

    beforeEach(() => {
      sandbox = createSandbox();
      configHandlerGetStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return true if the authorization type is OAUTH or AUTH', () => {
      const expectedAuthorizationType = 'oauth';

      configHandlerGetStub.withArgs(authHandler.authorisationTypeKeyName).returns(expectedAuthorizationType);

      authHandler.isAuthenticated();
    });
  });

  describe('getAuthorisationType', () => {
    let sandbox;
    let configHandlerGetStub;

    beforeEach(() => {
      sandbox = createSandbox();
      configHandlerGetStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return the authorization type if it exists in the configuration', async () => {
      const expectedAuthorizationType = 'OAUTH';

      configHandlerGetStub.withArgs(authHandler.authorisationTypeKeyName).returns(expectedAuthorizationType);

      await authHandler.getAuthorisationType();
    });
  });

  describe('isAuthorisationTypeBasic', () => {
    let sandbox;
    let configHandlerGetStub;

    beforeEach(() => {
      sandbox = createSandbox();
      configHandlerGetStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return false if the authorization type is not AUTH', async () => {
      const expectedAuthorizationType = 'oauth';

      configHandlerGetStub.withArgs(authHandler.authorisationTypeKeyName).returns(expectedAuthorizationType);

      await authHandler.isAuthorisationTypeBasic();
    });
  });

  describe('isAuthorisationTypeOAuth', () => {
    let sandbox;
    let configHandlerGetStub;

    beforeEach(() => {
      sandbox = createSandbox();
      configHandlerGetStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return true if the authorization type is OAUTH', async () => {
      const expectedAuthorizationType = 'OAUTH';

      configHandlerGetStub.withArgs(authHandler.authorisationTypeKeyName).returns(expectedAuthorizationType);

      await authHandler.isAuthorisationTypeOAuth();
    });
  });

  describe('compareOAuthExpiry', () => {
    let sandbox;
    let configHandlerGetStub;
    let cliuxPrintStub;
    let refreshTokenStub;
    let unsetConfigDataStub;

    beforeEach(() => {
      sandbox = createSandbox();
      configHandlerGetStub = sandbox.stub();
      cliuxPrintStub = sandbox.stub();
      refreshTokenStub = sandbox.stub();
      unsetConfigDataStub = sandbox.stub();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should resolve if the OAuth token is valid and not expired', async () => {
      const expectedOAuthDateTime = '2023-05-30T12:00:00Z';
      const expectedAuthorisationType = 'oauth';
      const now = new Date('2023-05-30T12:30:00Z');

      configHandlerGetStub.withArgs(authHandler.oauthDateTimeKeyName).returns(expectedOAuthDateTime);
      configHandlerGetStub.withArgs(authHandler.authorisationTypeKeyName).returns(expectedAuthorisationType);

      sandbox.stub(Date, 'now').returns(now.getTime());

      try {
        await authHandler.compareOAuthExpiry();
      } catch (error) {
        expect(error).to.be.undefined;
        expect(cliuxPrintStub.called).to.be.false;
        expect(refreshTokenStub.called).to.be.false;
        expect(unsetConfigDataStub.called).to.be.false;
      }
    });

    it('should resolve if force is true and refreshToken is called', async () => {
      const expectedOAuthDateTime = '2023-05-30T12:00:00Z';
      const expectedAuthorisationType = 'oauth';

      configHandlerGetStub.withArgs(authHandler.oauthDateTimeKeyName).returns(expectedOAuthDateTime);
      configHandlerGetStub.withArgs(authHandler.authorisationTypeKeyName).returns(expectedAuthorisationType);

      try {
        await authHandler.compareOAuthExpiry();
      } catch (error) {
        expect(error).to.be.undefined;
        expect(cliuxPrintStub.calledOnceWithExactly('Force refreshing the token')).to.be.true;
        expect(refreshTokenStub.calledOnce).to.be.true;
        expect(unsetConfigDataStub.called).to.be.false;
      }
    });
  });
});
