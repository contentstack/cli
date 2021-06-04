import { expect } from 'chai';
import * as sinon from 'sinon';
import { tokenValidation } from '../src/utils';

describe('Tokens Validation', () => {
  const validAPIkey = 'validapikey';
  const invalidAPIkey = 'invalidapikey';
  const validDeliveryToken = 'validDToken';
  const invalidDeliveryToken = 'invalidDToken';
  const validManagementToken = 'validMToken';
  const invalidManagementToken = 'invalidMToken';
  const validEnvironemnt = 'validEnvironment';
  let contentStackClient: {
    stack: any;
    deliveryToken: any;
    query: any;
    find: any;
    token?: string;
    environment: any;
    fetch: any;
    environmentName?: string;
  };
  before(function () {
    contentStackClient = {
      stack: sinon.stub().callsFake(() => {
        return contentStackClient;
      }),
      deliveryToken: sinon.stub().callsFake(() => {
        return contentStackClient;
      }),
      query: sinon.stub().callsFake((param) => {
        contentStackClient.token = param.query.token;
        return contentStackClient;
      }),
      find: sinon.stub().callsFake(() => {
        if (contentStackClient.token === validDeliveryToken) {
          return Promise.resolve({ items: [validDeliveryToken] });
        } else {
          return Promise.resolve({ items: [] });
        }
      }),
      environment: sinon.stub().callsFake((environment) => {
        contentStackClient.environmentName = environment;
        return contentStackClient;
      }),
      fetch: sinon.stub().callsFake(() => {
        if (contentStackClient.environmentName === validEnvironemnt) {
          return Promise.resolve({ name: contentStackClient.environmentName });
        } else {
          return Promise.resolve();
        }
      }),
    };
  });
  after(function () {});
  describe('#Delivery token', function () {
    it('Valid delivery token, should return the token', async function () {
      const result = await tokenValidation.validateDeliveryToken(contentStackClient, validAPIkey, validDeliveryToken);
      expect(result.valid).to.be.true;
    });
    it('invalid delivery token, should return false', async function () {
      const result = await tokenValidation.validateDeliveryToken(contentStackClient, validAPIkey, invalidDeliveryToken);
      expect(result.valid).to.be.false;
    });
  });
  describe('#Environment', function () {
    it('Valid environment, should return true', async function () {
      const result = await tokenValidation.validateEnvironment(contentStackClient, validAPIkey, validEnvironemnt);
      expect(result.valid).to.be.true;
    });
    it('invalid environment, should return false', async function () {
      const result = await tokenValidation.validateEnvironment(contentStackClient, validAPIkey, 'invalid');
      expect(result.valid).to.be.false;
    });
  });
  describe('#Management Token', function () {
    it('Valid delivery token, should return true', async function () {
      const result = await tokenValidation.validateManagementToken(
        contentStackClient,
        validAPIkey,
        validManagementToken,
      );
      expect(result.valid).to.be.true;
    });
    it('invalid delivery token, should return false', async function () {
      const result = await tokenValidation.validateManagementToken(contentStackClient, validAPIkey, 'invalid');
      expect(result.valid).to.be.false;
    });
  });
  describe('#API Key', function () {
    it('Valid delivery token, should return true', async function () {
      const result = await tokenValidation.validateAPIKey(contentStackClient, validAPIkey);
      expect(result.valid).to.be.true;
    });
    it('invalid delivery token, should return false', async function () {
      const result = await tokenValidation.validateAPIKey(contentStackClient, 'invalid');
      expect(result.valid).to.be.false;
    });
  });
});
