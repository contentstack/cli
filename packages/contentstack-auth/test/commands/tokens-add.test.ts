import { expect } from 'chai';
import * as sinon from 'sinon';
import { configHandler } from '@contentstack/cli-utilities';
import TokensAddCommand from '../../src/commands/auth/tokens/add';
import { cliux, tokenValidation } from '../../src/utils';
const config = configHandler
const configKeyTokens = 'tokens';

function resetConfig() {
  config.delete(`${configKeyTokens}.test-api-key-token2`);
  config.delete(`${configKeyTokens}.test-management-token`);
  config.delete(`${configKeyTokens}.test-management-token2`);
  config.delete(`${configKeyTokens}.test-api-key-token`);
}
describe('Tokens Add Command', () => {
  let apiKeyValidationStub;
  let deliveryTokenValidationStub;
  let managementTokenValidationStub;
  let configStoreStub;
  let environmentTokenValidationStub;
  let managementClientStub;
  let getAuthTokenStub;
  const validAPIKey = 'bltajkj234904';
  const validDeliveryToken = 'cdae3493fkdflklssw';
  const validmanagementToken = 'cmajhsd98939482';
  const validEnvironment = 'textenv';
  const validAuthToken = 'bltadjkjdkjfd';

  before(function () {
    resetConfig();
    managementClientStub = sinon
      .stub(TokensAddCommand.prototype, 'managementAPIClient')
      .get(() => {})
      .set(() => {});
    apiKeyValidationStub = sinon
      .stub(tokenValidation, 'validateAPIKey')
      .callsFake(function (client: any, apiKey: string): Promise<any> {
        if (apiKey === validAPIKey) {
          return Promise.resolve({ valid: true, message: 'success' });
        }
        return Promise.resolve({ valid: false, message: 'failed' });
      });
    deliveryTokenValidationStub = sinon
      .stub(tokenValidation, 'validateDeliveryToken')
      .callsFake(function (client: any, apiKey: string, deliveryToken): Promise<any> {
        if (deliveryToken === validDeliveryToken) {
          return Promise.resolve({ valid: true, message: 'success' });
        }
        return Promise.resolve({ valid: false, message: 'failed' });
      });
    managementTokenValidationStub = sinon
      .stub(tokenValidation, 'validateManagementToken')
      .callsFake(function (client: any, apiKey: string, managementToken): Promise<any> {
        if (managementToken === validmanagementToken) {
          return Promise.resolve({ valid: true, message: 'success' });
        }
        return Promise.resolve({ valid: false, message: 'failed' });
      });

    environmentTokenValidationStub = sinon
      .stub(tokenValidation, 'validateEnvironment')
      .callsFake(function (client: any, apiKey: string, environment): Promise<any> {
        if (environment === validEnvironment) {
          return Promise.resolve({ valid: true, message: 'success' });
        }
        return Promise.resolve({ valid: false, message: 'failed' });
      });
    getAuthTokenStub = sinon.stub(TokensAddCommand.prototype, 'authToken').get(function getterFn() {
      return validAuthToken;
    });
  });

  after(() => {
    apiKeyValidationStub.restore();
    deliveryTokenValidationStub.restore();
    managementTokenValidationStub.restore();
    environmentTokenValidationStub.restore();
    managementClientStub.restore();
    getAuthTokenStub.restore();
    resetConfig();
  });

  it('Add a token with valid api key, should be added scuccessfully', async function () {
    const inquireStub = sinon.stub(cliux, 'inquire').resolves(validEnvironment);
    await TokensAddCommand.run(['-a', 'test-api-key-token', '-k', validAPIKey, '-d', '-t', validDeliveryToken]);
    expect(Boolean(config.get(`${configKeyTokens}.test-api-key-token`))).to.be.true;
    inquireStub.restore();
  });

  it('Add a token with invalid api key, should fail to add', async function () {
    const inquireStub = sinon.stub(cliux, 'inquire').resolves(validEnvironment);
    await TokensAddCommand.run(['-a', 'test-api-key-token2', '-k', 'invalid', '-d', '-t', validDeliveryToken]);
    expect(Boolean(config.get(`${configKeyTokens}.test-api-key-token2`))).to.be.false;
    inquireStub.restore();
  });

  it('Add a valid management token, should be added scuccessfully', async function () {
    await TokensAddCommand.run(['-a', 'test-management-token', '-k', validAPIKey, '-m', '-t', validmanagementToken]);
    expect(Boolean(config.get(`${configKeyTokens}.test-management-token`))).to.be.true;
  });

  it('Add a invalid management token, should fail to add', async function () {
    await TokensAddCommand.run(['-a', 'test-management-token2', '-k', validAPIKey, '-m', '-t', 'invalid']);
    expect(Boolean(config.get(`${configKeyTokens}.test-management-token2`))).to.be.false;
  });

  it('Replace an existing token, should prompt for confirmation', async function () {
    const inquireStub = sinon.stub(cliux, 'inquire').resolves(true);
    await TokensAddCommand.run(['-a', 'test-management-token', '-k', validAPIKey, '-m', '-t', 'invalid']);
    expect(inquireStub.calledOnce).to.be.true;
    inquireStub.restore();
  });

  it('Add a token without alias, should prompt for alias', async function () {
    const inquireStub = sinon.stub(cliux, 'inquire').resolves(true);
    await TokensAddCommand.run(['-k', validAPIKey, '-m', '-t', 'invalid']);
    expect(inquireStub.calledOnce).to.be.true;
    inquireStub.restore();
  });
});
