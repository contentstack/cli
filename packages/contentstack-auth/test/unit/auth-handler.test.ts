import { expect } from 'chai';
import * as sinon from 'sinon';
import { authHandler, interactive } from '../../src/utils';
import { CLIError, cliux } from '@contentstack/cli-utilities';
import { User } from '../../src/interfaces';
import * as config from '../config.json';

const user: User = { email: '***REMOVED***', authtoken: 'testtoken' };
const credentials = { email: '***REMOVED***', password: config.password };
const invalidCredentials = { email: '***REMOVED***', password: config.invalidPassowrd };
let TFAEnabled = false;
let TFAChannel = 'authy';
const TFATestToken = '24563992';
const InvalidTFATestToken = '24563965';

describe('Auth Handler', () => {
  let askOTPChannelStub;
  let askOTPStub;
  before(function () {
    // runs once before the first test in this block
    const loginStub = sinon.stub().callsFake(function (param) {
      if (param.password === credentials.password) {
        if (TFAEnabled) {
          if (TFAEnabled && param.tfa_token) {
            if (param.tfa_token !== TFATestToken) {
              return Promise.reject();
            }
          } else {
            return Promise.resolve({ error_code: 294 });
          }
        }
        return Promise.resolve({ user });
      } else {
        return Promise.resolve({ errorMessage: 'invalid credentials' });
      }
    });

    const logoutStub = sinon.stub().callsFake(function (authtoken) {
      if (authtoken === TFATestToken) {
        return Promise.resolve({ user });
      } else {
        return Promise.reject({ message: 'invalid auth token' });
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
  after(function () {
    // runs once before the first test in this block
    authHandler.client = null;
    askOTPChannelStub.restore();
    askOTPStub.restore();
  });
  describe('#login', function () {
    it('Login with credentials, should be logged in successfully', async function () {
      const result = await authHandler.login(credentials.email, credentials.password);
      expect(result).to.be.equal(user);
    });

    it('Login with invalid credentials, failed to login', async function () {
      const cliuxStub2 = sinon.stub(cliux, 'error').returns();
      let result;
      try {
        result = await authHandler.login(invalidCredentials.email, invalidCredentials.password);
      } catch (error) {
        result = error;
      }

      expect(result).to.be.instanceOf(CLIError);
      cliuxStub2.restore();
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
    it('Logout with invalid authtoken, failed to logout', async function () {
      let result: any;
      try {
        result = await authHandler.logout(InvalidTFATestToken);
      } catch (error) {
        result = error;
      }

      expect(result).to.be.instanceOf(CLIError);
    });
  });

  // describe('#validateAuthtoken', function () {});
});
