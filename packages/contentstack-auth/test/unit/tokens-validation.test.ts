import { expect } from 'chai';
import * as sinon from 'sinon';
import { tokenValidation } from '../../src/utils';

describe('Tokens Validation', () => {
  const validAPIkey = '';
  const invalidAPIkey = 'invalid';
  const validDeliveryToken = '';
  const invalidDeliveryToken = '';
  const validManagementToken = '';
  const invalidManagementToken = '';
  const validEnvironemnt = '';
  const invalidEnvironemnt = 'invalid';
  const validRegion = 'NA';
  const validHost = '';
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
        if (contentStackClient.environmentName === validEnvironemnt) {
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
  describe('#Delivery token', function () {
    it('Valid delivery token, should return the token', async function () {
      const stackStub = {
        setHost: sinon.stub(),
        getContentTypes: sinon.stub().resolves({ content_types: [] }),
      };

      const contentStackClientStub = {
        Stack: sinon.stub().returns(stackStub),
      };

      const result = await tokenValidation.validateDeliveryToken(
        contentStackClientStub,
        validAPIkey,
        validDeliveryToken,
        validEnvironemnt,
        validRegion,
        validHost,
      );

      expect(result.valid).to.be.true;
      expect(result.message).to.be.an('object');
    });
    it('invalid delivery token, should return false', async function () {
      const result = await tokenValidation.validateDeliveryToken(
        contentStackClient,
        validAPIkey,
        invalidDeliveryToken,
        validEnvironemnt,
        validRegion,
        validHost,
      );
      expect(result.valid).to.be.false;
    });
  });
  describe('#Environment', function () {
    it('Valid environment, should return true', async function () {
      const result = await tokenValidation.validateEnvironment(contentStackClient, validAPIkey, validEnvironemnt);
      expect(result.valid).to.be.true;
    });
    it('invalid environment, should return false', async function () {
      const result = await tokenValidation.validateEnvironment(contentStackClient, validAPIkey, invalidEnvironemnt);
      expect(result.valid).to.be.false;
    });
  });
  describe('#Management Token', function () {
    it('Valid Management token, should return true', async function () {
      const contentStackClient = {
        axiosInstance: {
          get: sinon.stub().resolves({ status: 200 }),
        },
      };

      const result = await tokenValidation.validateManagementToken(
        contentStackClient,
        validAPIkey,
        validManagementToken,
      );

      expect(result.valid).to.be.true;
      expect(result.message).to.be.an('object');
    });
    it('invalid Management token, should return false', async function () {
      const contentStackClient = {
        axiosInstance: {
          get: sinon.stub().resolves({ status: 401 }),
        },
      };
      const result = await tokenValidation.validateManagementToken(
        contentStackClient,
        validAPIkey,
        invalidManagementToken,
      );
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
