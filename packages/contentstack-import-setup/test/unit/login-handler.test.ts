import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import { cliux } from '@contentstack/cli-utilities';
import loginHandler, { LoginHandlerDeps } from '../../src/utils/login-handler';
import { ImportConfig } from '../../src/types';

describe('Login Handler', () => {
  let managementSDKClientStub: SinonStub;
  let clientLoginStub: SinonStub;
  let stackStub: SinonStub;
  let fetchStub: SinonStub;
  let logSuccessStub: SinonStub;
  let logErrorStub: SinonStub;
  let isAuthenticatedStub: SinonStub;
  let mockStack: any;
  let mockClient: any;
  let mockStackAPIClient: any;
  let deps: LoginHandlerDeps;

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
    region: 'us',
  };

  beforeEach(() => {
    restore();

    // Setup stubs for client methods
    clientLoginStub = stub();
    fetchStub = stub();
    logSuccessStub = stub();
    logErrorStub = stub();

    mockStack = {
      fetch: fetchStub,
    };

    // Alias mockStackAPIClient to mockStack for consistency
    mockStackAPIClient = mockStack;

    stackStub = stub().returns(mockStack);

    // Create a mock client that will be returned by managementSDKClient
    mockClient = {
      login: clientLoginStub,
      stack: stackStub,
    };

    // Create stubs for injected dependencies
    managementSDKClientStub = stub().resolves(mockClient);
    isAuthenticatedStub = stub().returns(false);

    // Create the deps object for injection
    deps = {
      managementSDKClient: managementSDKClientStub as any,
      isAuthenticated: isAuthenticatedStub as any,
      log: {
        success: logSuccessStub,
        error: logErrorStub,
      } as any,
    };
  });

  afterEach(() => {
    restore();
  });

  describe('Email/Password Authentication', () => {
    it('should successfully login with email and password and set headers', async () => {
      const config: ImportConfig = {
        email: 'test@example.com',
        password: 'testpassword',
        source_stack: 'test-api-key',
        access_token: 'test-access-token',
        authtoken: 'test-auth-token',
        apiKey: 'test-api-key',
        contentDir: '/test/content',
        data: '/test/content',
        management_token: undefined,
        target_stack: 'test-api-key',
      } as ImportConfig;

      mockClient.login.resolves({
        user: {
          authtoken: 'new-auth-token-123',
        },
      });

      const result = await loginHandler(config, deps);

      expect(result).to.equal(config);
      expect(config.headers).to.exist;
      expect(config.headers!.api_key).to.equal('test-api-key');
      expect(config.headers!.access_token).to.equal('test-access-token');
      expect(config.headers!.authtoken).to.equal('test-auth-token');
      expect(config.headers!['X-User-Agent']).to.equal('contentstack-export/v');
      expect(mockClient.login.calledOnce).to.be.true;
      expect(mockClient.login.calledWith({ email: 'test@example.com', password: 'testpassword' })).to.be.true;
      expect(logSuccessStub.calledWith('Contentstack account authenticated successfully!')).to.be.true;
    });

    it('should throw error when authtoken is missing after login', async () => {
      const config: ImportConfig = {
        email: 'test@example.com',
        password: 'testpassword',
        apiKey: 'test-api-key',
        contentDir: '/test/content',
        data: '/test/content',
      } as ImportConfig;

      mockClient.login.resolves({
        user: {
          authtoken: null,
        },
      });

      try {
        await loginHandler(config, deps);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('Invalid auth token received after login');
      }

      expect(mockClient.login.calledOnce).to.be.true;
    });

    it('should throw error when user object is missing authtoken property', async () => {
      const config: ImportConfig = {
        email: 'test@example.com',
        password: 'testpassword',
        apiKey: 'test-api-key',
        contentDir: '/test/content',
        data: '/test/content',
      } as ImportConfig;

      mockClient.login.resolves({
        user: {},
      });

      try {
        await loginHandler(config, deps);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('Invalid auth token received after login');
      }
    });

    it('should throw error when user object is missing', async () => {
      const config: ImportConfig = {
        email: 'test@example.com',
        password: 'testpassword',
        apiKey: 'test-api-key',
        contentDir: '/test/content',
        data: '/test/content',
      } as ImportConfig;

      mockClient.login.resolves({});

      try {
        await loginHandler(config, deps);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('Invalid auth token received after login');
      }
    });

    it('should handle login API errors', async () => {
      const config: ImportConfig = {
        email: 'test@example.com',
        password: 'testpassword',
        apiKey: 'test-api-key',
        contentDir: '/test/content',
        data: '/test/content',
      } as ImportConfig;

      const loginError = new Error('Login failed');
      mockClient.login.rejects(loginError);

      try {
        await loginHandler(config, deps);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).to.equal(loginError);
      }

      expect(mockClient.login.calledOnce).to.be.true;
    });
  });

  describe('Management Token Authentication', () => {
    it('should return config when management_token is provided', async () => {
      const config: ImportConfig = {
        management_token: 'test-management-token',
        apiKey: 'test-api-key',
        contentDir: '/test/content',
        data: '/test/content',
        email: undefined,
        password: undefined,
      } as ImportConfig;

      const result = await loginHandler(config, deps);

      expect(result).to.equal(config);
      expect(mockClient.login.called).to.be.false;
      expect(mockStackAPIClient.fetch.called).to.be.false;
    });

    it('should return config when management_token is provided without email/password', async () => {
      const config: ImportConfig = {
        management_token: 'test-management-token',
        apiKey: 'test-api-key',
        contentDir: '/test/content',
        data: '/test/content',
        email: undefined,
        password: undefined,
      } as ImportConfig;

      const result = await loginHandler(config, deps);

      // Management token path is used when email/password are not provided
      expect(result).to.equal(config);
      expect(mockClient.login.called).to.be.false;
    });
  });

  describe('Existing Authentication', () => {
    it('should validate stack access when user is already authenticated', async () => {
      const config: ImportConfig = {
        apiKey: 'test-api-key',
        target_stack: 'test-api-key',
        management_token: undefined, // NOT set - so it will check isAuthenticated()
        contentDir: '/test/content',
        data: '/test/content',
        email: undefined,
        password: undefined,
      } as ImportConfig;

      // Make isAuthenticated() return true for this test
      isAuthenticatedStub.returns(true);

      // Reset fetch stub and mock stack response
      mockStackAPIClient.fetch.reset();
      mockStackAPIClient.fetch.resolves({
        name: 'Test Stack Name',
      });

      // Ensure client.stack returns the mock stack client
      mockClient.stack.reset();
      mockClient.stack.returns(mockStackAPIClient);

      const result = await loginHandler(config, deps);

      expect(result).to.equal(config);
      expect(config.destinationStackName).to.equal('Test Stack Name');
      // Verify stub was called - if stack was called, then isAuthenticated() returned true
      expect(mockClient.stack.calledOnce).to.be.true;
      expect(
        mockClient.stack.calledWith({
          api_key: 'test-api-key',
          management_token: undefined,
        }),
      ).to.be.true;
      expect(mockStackAPIClient.fetch.calledOnce).to.be.true;
    });

    it('should throw error when stack fetch fails with api_key error', async () => {
      const config: ImportConfig = {
        apiKey: 'test-api-key',
        target_stack: 'test-api-key',
        management_token: undefined,
        contentDir: '/test/content',
        data: '/test/content',
        email: undefined,
        password: undefined,
      } as ImportConfig;

      const apiKeyError: any = {
        errors: {
          api_key: ['Invalid stack API key'],
        },
      };

      isAuthenticatedStub.returns(true);
      mockStackAPIClient.fetch.reset();
      mockClient.stack.reset();
      mockClient.stack.returns(mockStackAPIClient);
      mockStackAPIClient.fetch.rejects(apiKeyError);

      try {
        await loginHandler(config, deps);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).to.exist;
        expect(error.errors).to.deep.equal(apiKeyError.errors);
        expect(logErrorStub.called).to.be.true;
      }

      expect(mockStackAPIClient.fetch.calledOnce).to.be.true;
    });

    it('should throw error when stack fetch fails with errorMessage', async () => {
      const config: ImportConfig = {
        apiKey: 'test-api-key',
        target_stack: 'test-api-key',
        management_token: undefined,
        contentDir: '/test/content',
        data: '/test/content',
        email: undefined,
        password: undefined,
      } as ImportConfig;

      const fetchError: any = {
        errorMessage: 'Stack not found',
      };

      isAuthenticatedStub.returns(true);
      mockStackAPIClient.fetch.reset();
      mockClient.stack.reset();
      mockClient.stack.returns(mockStackAPIClient);
      mockStackAPIClient.fetch.rejects(fetchError);

      try {
        await loginHandler(config, deps);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).to.exist;
        expect(error.errorMessage).to.equal(fetchError.errorMessage);
        expect(logErrorStub.called).to.be.true;
      }

      expect(mockStackAPIClient.fetch.calledOnce).to.be.true;
    });

    it('should throw error when stack fetch fails with generic error', async () => {
      const config: ImportConfig = {
        apiKey: 'test-api-key',
        target_stack: 'test-api-key',
        management_token: undefined,
        contentDir: '/test/content',
        data: '/test/content',
        email: undefined,
        password: undefined,
      } as ImportConfig;

      const genericError = new Error('Network error');

      isAuthenticatedStub.returns(true);
      mockStackAPIClient.fetch.reset();
      mockClient.stack.reset();
      mockClient.stack.returns(mockStackAPIClient);
      mockStackAPIClient.fetch.rejects(genericError);

      try {
        await loginHandler(config, deps);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).to.exist;
        expect(error.message).to.equal(genericError.message);
      }

      expect(mockStackAPIClient.fetch.calledOnce).to.be.true;
    });

    it('should handle error when errorstack_key is empty array', async () => {
      const config: ImportConfig = {
        apiKey: 'test-api-key',
        target_stack: 'test-api-key',
        management_token: undefined,
        contentDir: '/test/content',
        data: '/test/content',
        email: undefined,
        password: undefined,
      } as ImportConfig;

      const errorWithEmptyKey: any = {
        errors: {
          api_key: [],
        },
        errorMessage: 'Stack fetch failed',
      };

      isAuthenticatedStub.returns(true);
      mockStackAPIClient.fetch.reset();
      mockClient.stack.reset();
      mockClient.stack.returns(mockStackAPIClient);
      mockStackAPIClient.fetch.rejects(errorWithEmptyKey);

      try {
        await loginHandler(config, deps);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).to.exist;
        expect(error).to.have.property('errors');
        expect(error).to.have.property('errorMessage');
      }
    });
  });

  describe('Authentication Priority', () => {
    it('should prioritize email/password over existing auth when email and password are present', async () => {
      const config: ImportConfig = {
        email: 'test@example.com',
        password: 'testpassword',
        apiKey: 'test-api-key',
        source_stack: 'test-api-key',
        access_token: 'test-access-token',
        authtoken: 'test-auth-token',
        contentDir: '/test/content',
        data: '/test/content',
        management_token: undefined,
      } as ImportConfig;

      isAuthenticatedStub.returns(false);

      mockClient.login.reset();
      mockClient.login.resolves({
        user: {
          authtoken: 'new-auth-token',
        },
      });

      const result = await loginHandler(config, deps);

      expect(result).to.equal(config);
      expect(mockClient.login.calledOnce).to.be.true;
      expect(mockStackAPIClient.fetch.called).to.be.false;
    });

    it('should prioritize management_token over email/password', async () => {
      mockClient.login.reset();
      mockStackAPIClient.fetch.reset();

      const configForManagementToken: ImportConfig = {
        management_token: 'test-management-token',
        email: undefined,
        password: undefined,
        apiKey: 'test-api-key',
        contentDir: '/test/content',
        data: '/test/content',
      } as ImportConfig;

      const result = await loginHandler(configForManagementToken, deps);

      expect(result).to.equal(configForManagementToken);
      expect(mockClient.login.called).to.be.false;
    });

    it('should check existing auth only when email/password and management_token are not provided', async () => {
      const config: ImportConfig = {
        apiKey: 'test-api-key',
        target_stack: 'test-api-key',
        management_token: undefined,
        email: undefined,
        password: undefined,
        contentDir: '/test/content',
        data: '/test/content',
      } as ImportConfig;

      isAuthenticatedStub.returns(true);

      mockStackAPIClient.fetch.reset();
      mockStackAPIClient.fetch.resolves({
        name: 'Test Stack',
      });

      mockClient.stack.reset();
      mockClient.stack.returns(mockStackAPIClient);
      mockClient.login.reset();

      const result = await loginHandler(config, deps);

      expect(result).to.equal(config);
      expect(mockClient.login.called).to.be.false;
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values in error object gracefully', async () => {
      const config: ImportConfig = {
        apiKey: 'test-api-key',
        target_stack: 'test-api-key',
        management_token: undefined,
        contentDir: '/test/content',
        data: '/test/content',
        email: undefined,
        password: undefined,
      } as ImportConfig;

      isAuthenticatedStub.returns(true);
      mockStackAPIClient.fetch.reset();
      mockClient.stack.reset();
      mockClient.stack.returns(mockStackAPIClient);
      mockStackAPIClient.fetch.rejects(null);

      try {
        await loginHandler(config, deps);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).to.exist;
      }
    });
  });
});
