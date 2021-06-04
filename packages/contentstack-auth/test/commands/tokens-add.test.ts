import { expect } from 'chai';
import * as sinon from 'sinon';
import LoginCommand from '../src/command/login';

describe('Login Command', () => {
  beforeEach(function () {});

  it('Login with valid credentials, should be successful', async function () {
    const result = await tokenValidation.validateDeliveryToken(contentStackClient, validAPIkey, invalidDeliveryToken);
    expect(result.valid).to.be.false;
  });

  it('Login with invalid credentials, should throw an error', async function () {
    const result = await tokenValidation.validateDeliveryToken(contentStackClient, validAPIkey, invalidDeliveryToken);
    expect(result.valid).to.be.false;
  });

  it('Login with with only email, should prompt for email', async function () {
    const result = await tokenValidation.validateDeliveryToken(contentStackClient, validAPIkey, invalidDeliveryToken);
    expect(result.valid).to.be.false;
  });

  it('Login with no flags, should prompt for credentials', async function () {
    const result = await tokenValidation.validateDeliveryToken(contentStackClient, validAPIkey, invalidDeliveryToken);
    expect(result.valid).to.be.false;
  });
});
