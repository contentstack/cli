import { expect } from 'chai';
import * as sinon from 'sinon';
import { authHandler, interactive } from '../../src/utils';
import { CLIError, cliux } from '@contentstack/cli-utilities';
import { User } from '../../src/interfaces';
import { readFileSync } from 'fs';
import { join } from 'path';

const config = JSON.parse(readFileSync(join(__dirname, '../config.json'), "utf-8"));

const user: User = { email: '***REMOVED***', authtoken: 'testtoken' };
const credentials = { email: '***REMOVED***', password: config.password };
const invalidCredentials = { email: '***REMOVED***', password: config.invalidPassowrd };
let TFAEnabled = false;
let TFAChannel = 'authy';
const TFATestToken = '24563992';
const InvalidTFATestToken = '24563965';

describe('Auth Handler', function () {
  this.timeout(10000); // Increase timeout to 10s
  let askOTPChannelStub: any;
  let askOTPStub: any;
  beforeEach(function () {
    // Restore any existing stubs
    sinon.restore();

    const loginStub = sinon.stub().callsFake(function (param) {
      if (param.password === credentials.password) {
        if (TFAEnabled) {
          if (TFAEnabled && param.tfa_token) {
            if (param.tfa_token !== TFATestToken) {
              return Promise.reject(new Error('Invalid 2FA code'));
            }
          } else {
            // Handler expects 2FA required as a rejection (catch path checks error.errorCode === 294)
            return Promise.reject({ errorCode: 294 });
          }
        }
        return Promise.resolve({ user });
      } else {
        return Promise.reject(new Error('Invalid credentials'));
      }
    });

    const logoutStub = sinon.stub().callsFake(function (authtoken) {
      if (authtoken === TFATestToken) {
        return Promise.resolve({ user });
      } else {
        return Promise.reject(new Error('Invalid auth token'));
      }
    });

    let contentStackClient: { login: Function; logout: Function; axiosInstance: any } = {
      login: loginStub,
      logout: logoutStub,
      axiosInstance: {
        post: sinon.stub().returns(Promise.resolve()),
      },
    };
    authHandler.client = contentStackClient;

    //Interactive stubs
    askOTPChannelStub = sinon.stub(interactive, 'askOTPChannel').callsFake(function () {
      return Promise.resolve(TFAChannel);
    });

    askOTPStub = sinon.stub(interactive, 'askOTP').callsFake(function () {
      return Promise.resolve(TFATestToken);
    });
  });
  afterEach(function () {
    // Cleanup after each test
    authHandler.client = null;
    sinon.restore();
  });
  describe('#login', function () {
    it('Login with credentials, should be logged in successfully', async function () {
      const result = await authHandler.login(credentials.email, credentials.password);
      expect(result).to.be.equal(user);
    });

    it.skip('Login with invalid credentials, failed to login', async function () {
      sinon.restore();
      sinon.stub(cliux, 'error').returns();
      sinon.stub(cliux, 'print').returns();
      sinon.stub(interactive, 'askOTPChannel').resolves('authenticator_app');
      sinon.stub(interactive, 'askOTP').resolves('123456');

      const loginStub = sinon.stub().rejects(new Error('Invalid credentials'));
      const clientStub = {
        login: loginStub,
        axiosInstance: {
          post: sinon.stub().resolves(),
        },
      };
      authHandler.client = clientStub;

      try {
        await authHandler.login(invalidCredentials.email, invalidCredentials.password);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(CLIError);
        expect(error.message).to.include('Invalid credentials');
      } finally {
        authHandler.client = null;
      }
    });

    it('Login with 2FA enabled with authfy channel, should be logged in successfully', async function () {
      TFAEnabled = true;
      const result = await authHandler.login(credentials.email, credentials.password);
      expect(result).to.be.equal(user);
      TFAEnabled = false;
    });

    it('Login with 2FA enabled invalid otp, failed to login', async function () {
      this.timeout(10000);
      TFAEnabled = true;
      let result;
      try {
        result = await authHandler.login(credentials.email, credentials.password);
      } catch (error) {
        result = error;
      }
      TFAEnabled = false;
    });

    it('Login with 2FA enabled with sms channel, should be logged in successfully', async function () {
      TFAEnabled = true;
      TFAChannel = 'sms';
      const result = await authHandler.login(credentials.email, credentials.password);
      expect(result).to.be.equal(user);
      TFAEnabled = false;
    });
  });

  describe('#logout', function () {
    it('Logout, logout succesfully', async function () {
      const result: { user: object } = (await authHandler.logout(TFATestToken)) as { user: object };
      expect(result.user).to.be.equal(user);
    });
    it.skip('Logout with invalid authtoken, failed to logout', async function () {
      sinon.restore();
      sinon.stub(cliux, 'error').returns();
      sinon.stub(cliux, 'print').returns();

      const logoutStub = sinon.stub().rejects(new Error('Invalid auth token'));
      const clientStub = {
        login: sinon.stub(),
        logout: logoutStub,
        axiosInstance: {
          post: sinon.stub().resolves(),
        },
      };
      authHandler.client = clientStub;

      try {
        await authHandler.logout(InvalidTFATestToken);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect(error.message).to.equal('Invalid auth token');
      } finally {
        authHandler.client = null;
      }
    });
  });
});
