import { expect } from 'chai';
import * as sinon from 'sinon';
import { authHandler, CLIError, interactive } from '../src/utils';
import { User } from '../src/interfaces';

const user: User = { email: 'test@contentstack.com', authtoken: 'testtoken' };
const credentials = { email: 'test@contentstack.com', password: 'testpassword' };
const invalidCredentials = { email: 'test@contentstack.com', password: 'invalidpassword' };
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
      var err = new CLIError({ message: 'No user found with the credentials' });
      let result;
      try {
        result = await authHandler.login(invalidCredentials.email, invalidCredentials.password);
      } catch (error) {
        result = error;
      }
      expect(result).to.be.instanceOf(CLIError);
      expect(result.message).to.be.equal(err.message);
    });

    it('Login with 2FA enabled with authfy channel, should be logged in successfully', async function () {
      TFAEnabled = true;
      const result = await authHandler.login(credentials.email, credentials.password);
      expect(result).to.be.equal(user);
      TFAEnabled = false;
    });

    it.skip('Login with 2FA enabled invalid otp, failed to login', async function () {
      this.timeout(10000);
      TFAEnabled = true;
      let result;
      const errorMessage = 'Failed to login with the tf token';
      try {
        result = await authHandler.login(credentials.email, credentials.password);
      } catch (error) {
        result = error;
      }
      expect(result).to.be.instanceOf(CLIError);
      expect(result.message).to.be.equal(errorMessage);
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
      const errorMessage = 'Failed to logout - invalid auth token';
      try {
        result = await authHandler.logout(InvalidTFATestToken);
      } catch (error) {
        result = error;
      }
      expect(result.message).to.be.equal(errorMessage);
    });
  });

  // describe('#validateAuthtoken', function () {});
});
