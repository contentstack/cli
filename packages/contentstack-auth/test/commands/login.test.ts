import { expect } from 'chai';
import * as sinon from 'sinon';
import LoginCommand from '../../src/commands/auth/login';
import { authHandler, cliux } from '../../src/utils';
const { Command } = require('@oclif/command');

const user = { email: 'test@contentstack.com', authtoken: 'testtoken' };
const credentials = { email: 'test@contentstack.com', password: 'testpassword' };
const invalidCredentials = { email: 'test@contentstack.com', password: 'invalidpassword' };
const TFATestToken = '24563992';

describe('Login Command', () => {
  LoginCommand as typeof Command;
  let inquireStub;
  let loginStub;
  beforeEach(function () {
    loginStub = sinon.stub().callsFake(function (param) {
      if (param.password === credentials.password) {
        return Promise.resolve({ user });
      }
      return Promise.resolve({ errorMessage: 'invalid credentials' });
    });
    authHandler.login = loginStub;
  });
  afterEach(() => {
    loginStub.restore();
  });
  it('Login with valid credentials, should be successful', async function () {
    const result = await LoginCommand.run(['-u', credentials.email, '-p', credentials.password])!;
    expect(sinon.spy(cliux, 'success').calledOnce).to.be.true;
  });
  //   it('Login with invalid credentials, should throw an error', async function () {
  //     const result = await tokenValidation.validateDeliveryToken(contentStackClient, validAPIkey, invalidDeliveryToken);
  //     expect(result.valid).to.be.false;
  //   });
  //   it('Login with with only email, should prompt for email', async function () {
  //     const result = await tokenValidation.validateDeliveryToken(contentStackClient, validAPIkey, invalidDeliveryToken);
  //     expect(result.valid).to.be.false;
  //   });
  //   it('Login with no flags, should prompt for credentials', async function () {
  //     const result = await tokenValidation.validateDeliveryToken(contentStackClient, validAPIkey, invalidDeliveryToken);
  //     expect(result.valid).to.be.false;
  //   });
});
