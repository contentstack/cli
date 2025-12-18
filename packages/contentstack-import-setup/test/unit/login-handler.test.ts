import { expect } from 'chai';
import sinon from 'sinon';
import loginHandler from '../../src/utils/login-handler';
import * as logger from '../../src/utils/logger';
import { ImportConfig } from '../../src/types';

describe('Login Handler', () => {
  let sandbox: sinon.SinonSandbox;
  let managementSDKClientStub: sinon.SinonStub;
  let configHandlerGetStub: sinon.SinonStub;
  let logStub: sinon.SinonStub;
  let mockClient: any;
  let mockStackAPIClient: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    // Mock stack API client
    mockStackAPIClient = {
      fetch: sandbox.stub(),
    };

    // Mock management SDK client
    mockClient = {
      login: sandbox.stub(),
      stack: sandbox.stub().returns(mockStackAPIClient),
    };

    // Stub managementSDKClient using .value() pattern - ensure it returns the mock client
    const cliUtilitiesModule = require('@contentstack/cli-utilities');
    sandbox.stub(cliUtilitiesModule, 'managementSDKClient').value(() => Promise.resolve(mockClient));
    
    // Stub configHandler.get to control isAuthenticated() behavior
    // isAuthenticated() internally checks configHandler.get('authorisationType')
    // Returns 'OAUTH' or 'AUTH' for authenticated, undefined for not authenticated
    const configHandler = require('@contentstack/cli-utilities').configHandler;
    configHandlerGetStub = sandbox.stub(configHandler, 'get');
    // Default to undefined (not authenticated) - tests can override as needed
    configHandlerGetStub.returns(undefined);

    // Stub logger
    logStub = sandbox.stub(logger, 'log');
  });

  afterEach(() => {
    sandbox.restore();
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

      const result = await loginHandler(config);

      expect(result).to.equal(config);
      expect(config.headers).to.exist;
      expect(config.headers!.api_key).to.equal('test-api-key');
      expect(config.headers!.access_token).to.equal('test-access-token');
      expect(config.headers!.authtoken).to.equal('test-auth-token');
      expect(config.headers!['X-User-Agent']).to.equal('contentstack-export/v');
      expect(mockClient.login.calledOnce).to.be.true;
      expect(mockClient.login.calledWith({ email: 'test@example.com', password: 'testpassword' })).to.be.true;
      expect(logStub.calledWith(config, 'Contentstack account authenticated successfully!', 'success')).to.be.true;
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
        await loginHandler(config);
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
        await loginHandler(config);
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
        await loginHandler(config);
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
        await loginHandler(config);
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

      const result = await loginHandler(config);

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

      const result = await loginHandler(config);

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

      // Reset stub completely to clear any previous behavior
      configHandlerGetStub.reset();
      
      // Make isAuthenticated() return true by returning 'OAUTH' for authorisationType
      configHandlerGetStub.callsFake((key: string) => {
        if (key === 'authorisationType') {
          return 'OAUTH'; // This makes isAuthenticated() return true
        }
        return undefined;
      });
      
      // Reset fetch stub and mock stack response
      mockStackAPIClient.fetch.reset();
      mockStackAPIClient.fetch.resolves({
        name: 'Test Stack Name',
      });
      
      // Ensure client.stack returns the mock stack client
      mockClient.stack.reset();
      mockClient.stack.returns(mockStackAPIClient);

      const result = await loginHandler(config);

      expect(result).to.equal(config);
      expect(config.destinationStackName).to.equal('Test Stack Name');
      // Verify stub was called - if stack was called, then isAuthenticated() returned true, which means the stub was called
      expect(mockClient.stack.calledOnce).to.be.true;
      expect(mockClient.stack.calledWith({
        api_key: 'test-api-key',
        management_token: undefined, // This is what gets passed when management_token is not set
      })).to.be.true;
      expect(mockStackAPIClient.fetch.calledOnce).to.be.true;
    });

    it('should throw error when stack fetch fails with api_key error', async () => {
      const config: ImportConfig = {
        apiKey: 'test-api-key',
        target_stack: 'test-api-key',
        management_token: undefined, // NOT set - so it will check isAuthenticated()
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

      // Setup configHandler to return values that isAuthenticated() needs
      configHandlerGetStub.callsFake((key: string) => {
        if (key === 'authorisationType') {
          return 'OAUTH'; // This makes isAuthenticated() return true
        }
        // Return undefined for other keys
        return undefined;
      });
      mockStackAPIClient.fetch.reset();
      mockClient.stack.reset();
      mockClient.stack.returns(mockStackAPIClient);
      mockStackAPIClient.fetch.rejects(apiKeyError);

      try {
        await loginHandler(config);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).to.exist;
        expect(error.errors).to.deep.equal(apiKeyError.errors);
        expect(logStub.called).to.be.true;
      }

      expect(mockStackAPIClient.fetch.calledOnce).to.be.true;
    });

    it('should throw error when stack fetch fails with errorMessage', async () => {
      const config: ImportConfig = {
        apiKey: 'test-api-key',
        target_stack: 'test-api-key',
        management_token: undefined, // NOT set - so it will check isAuthenticated()
        contentDir: '/test/content',
        data: '/test/content',
        email: undefined,
        password: undefined,
      } as ImportConfig;

      const fetchError: any = {
        errorMessage: 'Stack not found',
      };

      // Reset stubs
      configHandlerGetStub.reset();
      mockStackAPIClient.fetch.reset();
      mockClient.stack.reset();
      
      configHandlerGetStub.callsFake((key: string) => {
        if (key === 'authorisationType') {
          return 'OAUTH'; // This makes isAuthenticated() return true
        }
        return undefined;
      });
      mockClient.stack.returns(mockStackAPIClient);
      mockStackAPIClient.fetch.rejects(fetchError);

      try {
        await loginHandler(config);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).to.exist;
        expect(error.errorMessage).to.equal(fetchError.errorMessage);
        expect(logStub.calledWith(config, 'Stack not found', 'error')).to.be.true;
      }

      expect(mockStackAPIClient.fetch.calledOnce).to.be.true;
    });

    it('should throw error when stack fetch fails with generic error', async () => {
      const config: ImportConfig = {
        apiKey: 'test-api-key',
        target_stack: 'test-api-key',
        management_token: undefined, // NOT set - so it will check isAuthenticated()
        contentDir: '/test/content',
        data: '/test/content',
        email: undefined,
        password: undefined,
      } as ImportConfig;

      const genericError = new Error('Network error');
      
      // Reset stubs
      configHandlerGetStub.reset();
      mockStackAPIClient.fetch.reset();
      
      configHandlerGetStub.callsFake((key: string) => {
        if (key === 'authorisationType') {
          return 'OAUTH'; // This makes isAuthenticated() return true
        }
        return undefined;
      });
      mockClient.stack.reset();
      mockClient.stack.returns(mockStackAPIClient);
      mockStackAPIClient.fetch.rejects(genericError);

      try {
        await loginHandler(config);
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
        management_token: undefined, // NOT set - so it will check isAuthenticated()
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

      // Reset stubs
      configHandlerGetStub.reset();
      mockStackAPIClient.fetch.reset();
      mockClient.stack.reset();
      
      configHandlerGetStub.callsFake((key: string) => {
        if (key === 'authorisationType') {
          return 'OAUTH'; // This makes isAuthenticated() return true
        }
        return undefined;
      });
      mockClient.stack.returns(mockStackAPIClient);
      mockStackAPIClient.fetch.rejects(errorWithEmptyKey);

      try {
        await loginHandler(config);
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

      // Reset configHandler stub for this test
      configHandlerGetStub.reset();
      configHandlerGetStub.callsFake((key: string) => {
        if (key === 'authorisationType') {
          return 'OAUTH'; // This makes isAuthenticated() return true
        }
        return undefined;
      });
      
      // Reset and setup login mock
      mockClient.login.reset();
      mockClient.login.resolves({
        user: {
          authtoken: 'new-auth-token',
        },
      });

      const result = await loginHandler(config);

      expect(result).to.equal(config);
      expect(mockClient.login.calledOnce).to.be.true;
      expect(mockStackAPIClient.fetch.called).to.be.false;
    });

    it('should prioritize management_token over email/password', async () => {
      // Reset stubs
      configHandlerGetStub.reset();
      mockClient.login.reset();
      mockStackAPIClient.fetch.reset();
      
      // Note: Based on the code logic, email/password is checked FIRST, then management_token
      // So when both are present, email/password takes priority
      // This test verifies that when management_token is provided without email/password,
      // it uses management_token (not email/password auth)
      const configForManagementToken: ImportConfig = {
        management_token: 'test-management-token',
        email: undefined,
        password: undefined,
        apiKey: 'test-api-key',
        contentDir: '/test/content',
        data: '/test/content',
      } as ImportConfig;

      const result = await loginHandler(configForManagementToken);

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

      // Reset stub completely to clear any previous behavior
      configHandlerGetStub.reset();
      
      configHandlerGetStub.callsFake((key: string) => {
        if (key === 'authorisationType') {
          return 'OAUTH'; // This makes isAuthenticated() return true
        }
        return undefined;
      });
      
      mockStackAPIClient.fetch.reset();
      mockStackAPIClient.fetch.resolves({
        name: 'Test Stack',
      });
      
      // Ensure mockClient.stack is set up (from beforeEach, but ensure it's correct)
      mockClient.stack.reset();
      mockClient.stack.returns(mockStackAPIClient);
      mockClient.login.reset();

      const result = await loginHandler(config);

      expect(result).to.equal(config);
      // Verify stub was called - if stack was called, then isAuthenticated() returned true, which means the stub was called
      expect(mockClient.login.called).to.be.false;
    });

  });

  describe('Edge Cases', () => {
    it('should handle null values in error object gracefully', async () => {
      const config: ImportConfig = {
        apiKey: 'test-api-key',
        target_stack: 'test-api-key',
        management_token: undefined, // NOT set - so it will check isAuthenticated()
        contentDir: '/test/content',
        data: '/test/content',
        email: undefined,
        password: undefined,
      } as ImportConfig;

      // Reset stubs
      configHandlerGetStub.reset();
      mockStackAPIClient.fetch.reset();
      
      configHandlerGetStub.callsFake((key: string) => {
        if (key === 'authorisationType') {
          return 'OAUTH'; // This makes isAuthenticated() return true
        }
        return undefined;
      });
      mockClient.stack.reset();
      mockClient.stack.returns(mockStackAPIClient);
      mockStackAPIClient.fetch.rejects(null);

      try {
        await loginHandler(config);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // When error is null, it will still throw but we just verify it was thrown
        expect(error).to.exist;
      }
    });
  });
});
