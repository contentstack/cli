import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import proxyquire from 'proxyquire';
import loginHandler from '../../src/utils/login-handler';
import * as logger from '../../src/utils/logger';
import { ImportConfig } from '../../src/types';

describe('Login Handler', () => {
  let managementSDKClientStub: SinonStub;
  let clientLoginStub: SinonStub;
  let stackStub: SinonStub;
  let fetchStub: SinonStub;
  let logStub: SinonStub;
  let isAuthenticatedStub: SinonStub;
  let mockStack: any;

  // Setup stubs for client methods
  clientLoginStub = stub();
  fetchStub = stub();

  mockStack = {
    fetch: fetchStub,
  };

  stackStub = stub().returns(mockStack);

  // Create a mock client that will be returned by managementSDKClient
  const mockClient = {
    login: clientLoginStub,
    stack: stackStub,
  };

  // Make managementSDKClient return our mock client
  managementSDKClientStub = stub().resolves(mockClient);
  isAuthenticatedStub = stub().returns(false);

  // Load the compiled JS version of your TS file
  const { default: loginHandler } = proxyquire('../../src/utils/login-handler', {
    '@contentstack/cli-utilities': {
      managementSDKClient: managementSDKClientStub,
      isAuthenticated: isAuthenticatedStub,
    },
  });

  // Base mock config that satisfies ImportConfig type
  const baseConfig: Partial<ImportConfig> = {
    contentDir: '/content/path',
    data: '/content/path',
    apiKey: 'test-api-key',
    forceStopMarketplaceAppsPrompt: false,
    master_locale: { code: 'en-us' },
    masterLocale: { code: 'en-us' },
    branchName: '',
    selectedModules: ['entries'],
    backupDir: '',
    contentVersion: 1,
    region: 'us',
  };

  beforeEach(() => {
    restore();

    logStub = stub(logger, 'log');
  });

  afterEach(() => {
    restore();
  });

  describe('with email and password', () => {
    it('should login successfully and return updated config', async () => {
      const mockConfig = {
        ...baseConfig,
        email: 'test@example.com',
        password: 'password123',
        source_stack: 'test-stack-key',
      } as ImportConfig;

      // Mock successful login
      clientLoginStub.resolves({
        user: {
          authtoken: 'test-auth-token',
        },
      });

      const result = await loginHandler(mockConfig);

      expect(managementSDKClientStub.calledOnce).to.be.true;
      expect(clientLoginStub.calledOnce).to.be.true;
      expect(
        clientLoginStub.calledWith({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).to.be.true;

      expect(logStub.calledWith(result, 'Contentstack account authenticated successfully!', 'success')).to.be.true;
    });

    it('should throw error when login fails', async () => {
      const mockConfig = {
        ...baseConfig,
        email: 'test@example.com',
        password: 'wrong-password',
      } as ImportConfig;

      // Mock failed login
      clientLoginStub.resolves({
        user: {},
      });

      try {
        await loginHandler(mockConfig);
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.message).to.equal('Invalid auth token received after login');
      }
    });
  });

  describe('with authentication', () => {
    it('should handle stack api key error', async () => {
      const mockConfig = {
        ...baseConfig,
        target_stack: 'invalid-stack-key',
      } as ImportConfig;

      // Set isAuthenticated to return true for this test
      isAuthenticatedStub.returns(true);

      const error = {
        errors: {
          api_key: ['Invalid stack API key'],
        },
      };

      fetchStub.rejects(error);

      try {
        await loginHandler(mockConfig);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
        expect(logStub.called).to.be.true;
      }
    });

    it('should handle general fetch error', async () => {
      const mockConfig = {
        ...baseConfig,
        target_stack: 'test-stack-key',
      } as ImportConfig;

      // Set isAuthenticated to return true for this test
      isAuthenticatedStub.returns(true);

      const error: any = new Error('Network error');
      error.errorMessage = 'Failed to fetch stack';

      fetchStub.rejects(error);

      try {
        await loginHandler(mockConfig);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
        expect(logStub.calledWith(mockConfig, 'Failed to fetch stack', 'error')).to.be.true;
      }
    });
  });

  describe('without credentials', () => {
    it('should return undefined when no login method is available', async () => {
      const mockConfig = {
        ...baseConfig,
      } as ImportConfig;

      // Set isAuthenticated to return false for this test
      isAuthenticatedStub.returns(false);

      const result = await loginHandler(mockConfig);

      expect(result).to.be.undefined;
    });
  });
});
