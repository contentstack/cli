import { expect } from 'chai';
import * as sinon from 'sinon';
import { authHandler, interactive } from '../../src/utils';
import { 
  configHandler, 
  cliux, 
  messageHandler,
  authHandler as oauthHandler,
} from '@contentstack/cli-utilities';
import * as managementSDK from '@contentstack/cli-utilities';
import { Helper } from './helper';

const config = configHandler;
const credentials = { email: 'test@example.com', password: 'testpassword' };
const invalidCredentials = { email: 'test@example.com', password: 'invalidpassword' };
const TFATestToken = '24563992';

describe('contentstack-auth plugin test', () => {
  let sandbox: sinon.SinonSandbox;
  let mockClient: {
    login: sinon.SinonStub;
    logout: sinon.SinonStub;
    getUser: sinon.SinonStub;
  };

  beforeEach(() => {
    sinon.restore();
    
    sandbox = sinon.createSandbox();
    
    // Interactive prompts
    sandbox.stub(interactive, 'askUsername').resolves(credentials.email);
    sandbox.stub(interactive, 'askPassword').resolves(credentials.password);
    sandbox.stub(interactive, 'askOTPChannel').resolves('authenticator_app');
    sandbox.stub(interactive, 'askOTP').resolves(TFATestToken);

    // CLI UI
    sandbox.stub(cliux, 'success');
    sandbox.stub(cliux, 'error');
    sandbox.stub(cliux, 'inquire').resolves(credentials.email);

    // Config
    sandbox.stub(config, 'set');
    sandbox.stub(config, 'get').returns(credentials.email);

    // Management SDK Client
    mockClient = {
      login: sandbox.stub().resolves({ user: { email: credentials.email, authtoken: 'test-token' } }),
      logout: sandbox.stub().resolves({}),
      getUser: sandbox.stub().resolves({ email: credentials.email })
    };
    sandbox.stub(managementSDK, 'managementSDKClient').resolves(mockClient);
    authHandler.client = mockClient;

    // OAuth Handler
    sandbox.stub(oauthHandler, 'setConfigData').resolves();
    sandbox.stub(oauthHandler, 'host').value('https://api.contentstack.io');

    // Message Handler
    sandbox.stub(messageHandler, 'parse').returns('Successfully logged in!!');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Check auth:login command with --username, --password flags and wrong credentials', function() {

    it.skip'Login should fail due to wrong credentials (flags)', async () => {
      sandbox.stub(authHandler, 'login').rejects(new Error('Invalid credentials'));
      
      try {
        await Helper.run(['auth:login', `--username=${credentials.email}`, `--password=${invalidCredentials.password}`]);
      } catch (error) {
        expect((error as Error).message).to.include('Invalid credentials');
      }
    });
  });

  describe('Check auth:login command with --username, --password flags', function() {

    it.skip('Login should succeed (flags)', async () => {
      sandbox.stub(authHandler, 'login').resolves({
        email: credentials.email,
        authtoken: 'test-token'
      });
      
      await Helper.run(['auth:login', `--username=${credentials.email}`, `--password=${credentials.password}`]);
      expect(config.get('email')).to.equal(credentials.email);
    });
  });

  describe('Check auth:login command with 2FA', function() {

    it('Login should succeed with 2FA', async () => {
        mockClient.login.resetBehavior();
        mockClient.login.resetHistory();
        
        mockClient.login
          .onFirstCall().resolves({ error_code: 294 })
          .onSecondCall().resolves({ user: { email: credentials.email, authtoken: 'test-token' } });
        
        await authHandler.login(credentials.email, credentials.password);
        expect(mockClient.login.callCount).to.equal(2);
      });

      it.skip('Login should fail with invalid 2FA code', async function() {
        
        // Reset and restore all stubs
        sandbox.restore();
        sandbox = sinon.createSandbox();
        
        // Setup client stubs
        const mockClient = {
          login: sandbox.stub(),
          axiosInstance: {
            post: sandbox.stub().resolves()
          }
        };
        mockClient.login
          .onFirstCall().resolves({ error_code: 294 })
          .onSecondCall().rejects(new Error('Invalid 2FA code'));
        
        // Setup interactive stubs
        sandbox.stub(interactive, 'askOTPChannel').resolves('authenticator_app');
        sandbox.stub(interactive, 'askOTP').resolves('123456');
        sandbox.stub(cliux, 'print').returns();
        sandbox.stub(cliux, 'error').returns();
        
        // Set client
        authHandler.client = mockClient;
        
        try {
          await authHandler.login(credentials.email, credentials.password);
          throw new Error('Should have failed');
        } catch (error) {
          expect((error as Error).message).to.include('Invalid 2FA code');
        } finally {
          authHandler.client = null;
        }
      });
  });

  describe('Check auth:login command with OAuth', function() {

    it.skip('Login should succeed with OAuth', async () => {
      Object.defineProperty(authHandler, 'oauth', {
        value: sandbox.stub().resolves(),
        configurable: true
      });
      
      await Helper.run(['auth:login', '--oauth']);
    });
  });
});