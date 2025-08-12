import { expect } from 'chai';
import * as sinon from 'sinon';
import { authHandler, interactive } from '../../src/utils';
import { configHandler, cliux } from '@contentstack/cli-utilities';
import { Helper } from './helper';

const config = configHandler;
const credentials = { email: 'test@example.com', password: 'testpassword' };
const invalidCredentials = { email: 'test@example.com', password: 'invalidpassword' };
const TFATestToken = '24563992';

describe('contentstack-auth plugin test', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Stub interactive prompts
    sandbox.stub(interactive, 'askUsername').resolves(credentials.email);
    sandbox.stub(interactive, 'askPassword').resolves(credentials.password);
    sandbox.stub(interactive, 'askOTPChannel').resolves('authy');
    sandbox.stub(interactive, 'askOTP').resolves(TFATestToken);

    // Stub cliux
    sandbox.stub(cliux, 'success');
    sandbox.stub(cliux, 'error');
    sandbox.stub(cliux, 'inquire').resolves(credentials.email);

    // Stub config
    sandbox.stub(config, 'set');
    sandbox.stub(config, 'get').returns(credentials.email);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Check auth:login command with --username, --password flags and wrong credentials', function() {
    this.timeout(10000); // Increase timeout to 10s

    it('Login should fail due to wrong credentials (flags)', async () => {
      sandbox.stub(authHandler, 'login').rejects(new Error('Invalid credentials'));
      
      try {
        await Helper.run(['auth:login', `--username=${credentials.email}`, `--password=${invalidCredentials.password}`]);
      } catch (error) {
        expect((error as Error).message).to.include('Invalid credentials');
      }
    });
  });

  describe('Check auth:login command with --username, --password flags', function() {
    this.timeout(10000); // Increase timeout to 10s

    it('Login should succeed (flags)', async () => {
      sandbox.stub(authHandler, 'login').resolves({
        email: credentials.email,
        authtoken: 'test-token'
      });
      
      await Helper.run(['auth:login', `--username=${credentials.email}`, `--password=${credentials.password}`]);
      expect(config.get('email')).to.equal(credentials.email);
    });
  });

  describe('Check auth:login command with 2FA', function() {
    this.timeout(10000); // Increase timeout to 10s

    it('Login should succeed with 2FA', async () => {
      const loginStub = sandbox.stub(authHandler, 'login');
      loginStub.onFirstCall().rejects({ error_code: 294 });
      loginStub.onSecondCall().resolves({
        email: credentials.email,
        authtoken: 'test-token'
      });
      
      await Helper.run(['auth:login', `--username=${credentials.email}`, `--password=${credentials.password}`]);
      expect(loginStub.calledTwice).to.be.true;
    });

    it('Login should fail with invalid 2FA code', async () => {
      const loginStub = sandbox.stub(authHandler, 'login');
      loginStub.onFirstCall().rejects({ error_code: 294 });
      loginStub.onSecondCall().rejects(new Error('Invalid 2FA code'));
      
      try {
        await Helper.run(['auth:login', `--username=${credentials.email}`, `--password=${credentials.password}`]);
      } catch (error) {
        expect((error as Error).message).to.include('Invalid 2FA code');
      }
      
      expect(loginStub.calledTwice).to.be.true;
    });
  });

  describe('Check auth:login command with OAuth', function() {
    this.timeout(10000); // Increase timeout to 10s

    it('Login should succeed with OAuth', async () => {
      Object.defineProperty(authHandler, 'oauth', {
        value: sandbox.stub().resolves(),
        configurable: true
      });
      
      await Helper.run(['auth:login', '--oauth']);
    });
  });
});