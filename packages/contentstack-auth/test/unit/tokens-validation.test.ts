import { expect } from 'chai';
import * as sinon from 'sinon';
import { tokenValidation } from '../../src/utils';

describe('Tokens Validation', () => {
  const validAPIkey = '';
  const invalidAPIkey = 'invalid';
  const validDeliveryToken = '';
  const validManagementToken = '';
  const validEnvironment = '';
  const invalidEnvironment = 'invalid';
  let contentStackClient: {
    stack: any;
    deliveryToken: any;
    query: any;
    find: any;
    token?: string;
    environment: any;
    fetch: any;
    environmentName?: string;
    axiosInstance: any;
    apiKey?: string;
  };
  beforeEach(function () {
    contentStackClient = {
      stack: sinon.stub().callsFake((param) => {
        contentStackClient.apiKey = param.api_key;
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
        if (contentStackClient.environmentName === validEnvironment) {
          return Promise.resolve({ name: contentStackClient.environmentName });
        } else if (!contentStackClient.environmentName && contentStackClient.apiKey === validAPIkey) {
          return Promise.resolve({ api_key: contentStackClient.apiKey });
        }
        return Promise.resolve({});
      }),
      axiosInstance: {
        get: sinon.stub().callsFake((param1, param2) => {
          if (param2.headers.authorization === validManagementToken) {
            return Promise.resolve({ content_types: {} });
          } else {
            return Promise.resolve({});
          }
        }),
      },
    };
  });
  describe('#Environment', function () {
    it('Valid environment, should return true', async function () {
      const result = await tokenValidation.validateEnvironment(contentStackClient, validAPIkey, validEnvironment);
      expect(result.valid).to.be.true;
    });
    it('invalid environment, should return false', async function () {
      const result = await tokenValidation.validateEnvironment(contentStackClient, validAPIkey, invalidEnvironment);
      expect(result.valid).to.be.false;
    });
  });
  describe('#API Key', function () {
    it('Valid API Key, should return true', async function () {
      const result = await tokenValidation.validateAPIKey(contentStackClient, validAPIkey);
      expect(result.valid).to.be.true;
    });
    it('invalid API Key, should return false', async function () {
      const result = await tokenValidation.validateAPIKey(contentStackClient, invalidAPIkey);
      expect(result.valid).to.be.false;
    });
  });
});
