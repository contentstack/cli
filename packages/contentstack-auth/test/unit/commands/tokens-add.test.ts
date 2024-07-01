import { expect } from 'chai';
import * as sinon from 'sinon';
import { configHandler, cliux, logger } from '@contentstack/cli-utilities';
import TokensAddCommand from '../../../src/commands/auth/tokens/add';
import { tokenValidation } from '../../../src/utils';
import { stub, assert } from 'sinon';
import { config as dotenvConfig } from 'dotenv';
import * as conf from '../../config.json';

dotenvConfig();

const config = configHandler;
const configKeyTokens = 'tokens';

function resetConfig() {
  config.delete(`${configKeyTokens}.test-api-key-token2`);
  config.delete(`${configKeyTokens}.test-management-token`);
  config.delete(`${configKeyTokens}.test-management-token2`);
  config.delete(`${configKeyTokens}.test-api-key-token`);
  config.delete(`${configKeyTokens}.newToken`);
}
describe('Tokens Add Command', () => {
  let apiKeyValidationStub;
  let deliveryTokenValidationStub;
  let managementTokenValidationStub;
  let environmentTokenValidationStub;
  let printStub;
  const validAPIKey = conf.validAPIKey;
  const validDeliveryToken = '***REMOVED***';
  const validmanagementToken = 'cmajhsd98939482';
  const validEnvironment = 'textenv';

  before(function () {
    resetConfig();
    printStub = stub(cliux, 'print');
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
  });

  after(() => {
    apiKeyValidationStub.restore();
    deliveryTokenValidationStub.restore();
    managementTokenValidationStub.restore();
    environmentTokenValidationStub.restore();
    printStub.restore();
    resetConfig();
  });

  it('Add a token with valid api key, should be added scuccessfully', async function () {
    const inquireStub = sinon.stub(cliux, 'inquire').resolves(validEnvironment);
    await TokensAddCommand.run([
      '--alias',
      'test-api-key-token',
      '--stack-api-key',
      validAPIKey,
      '--delivery',
      '--token',
      validDeliveryToken,
    ]);
    expect(Boolean(config.get(`${configKeyTokens}.test-api-key-token`))).to.be.true;
    inquireStub.restore();
  });

  it('Add a valid management token, should be added scuccessfully', async function () {
    await TokensAddCommand.run([
      '--alias',
      'test-management-token',
      '--stack-api-key',
      validAPIKey,
      '--management',
      '--token',
      validmanagementToken,
    ]);
    expect(Boolean(config.get(`${configKeyTokens}.test-management-token`))).to.be.true;
  });

  it('Add a invalid management token, should fail to add', async function () {
    await TokensAddCommand.run([
      '--alias',
      'test-management-token2',
      '--stack-api-key',
      validAPIKey,
      '--management',
      '--token',
      'invalid',
    ]);
    expect(Boolean(config.get(`${configKeyTokens}.test-management-token2`))).to.be.false;
  });

  it('Replace an existing token, should prompt for confirmation', async function () {
    const inquireStub = sinon.stub(cliux, 'inquire').resolves(true);
    await TokensAddCommand.run([
      '--alias',
      'test-management-token',
      '--stack-api-key',
      validAPIKey,
      '--management',
      '--token',
      'invalid',
    ]);
    expect(inquireStub.calledOnce).to.be.true;
    inquireStub.restore();
  });

  it('Add a token without alias, should prompt for alias', async function () {
    const inquireStub = sinon.stub(cliux, 'inquire').resolves(true);
    await TokensAddCommand.run(['--stack-api-key', validAPIKey, '--management', '--token', 'invalid']);
    expect(inquireStub.calledOnce).to.be.true;
    inquireStub.restore();
  });
});

describe('Management and Delivery token flags', () => {
  let inquireStub;
  let errorStub;
  let successStub;
  let printStub;

  beforeEach(() => {
    inquireStub = stub(cliux, 'inquire');
    errorStub = stub(logger, 'error');
    successStub = stub(cliux, 'success');
    printStub = stub(cliux, 'print');
    resetConfig();
  });

  afterEach(() => {
    inquireStub.restore();
    errorStub.restore();
    successStub.restore();
    printStub.restore();
    resetConfig();
  });

  describe('- Management token', () => {
    it('Should ask for a prompt to select type of token to add', async () => {
      await TokensAddCommand.run([]);
      assert.calledWith(inquireStub, {
        type: 'list',
        name: 'tokenType',
        message: 'CLI_SELECT_TOKEN_TYPE',
        choices: [
          { name: 'Management Token', value: 'management' },
          { name: 'Delivery Token', value: 'delivery' },
        ],
      });
    });

    it('Should ask for api key ', async () => {
      await TokensAddCommand.run(['--management', '--alias', 'newToken']);
      assert.calledWith(inquireStub, { type: 'input', message: 'CLI_AUTH_TOKENS_ADD_ENTER_API_KEY', name: 'apiKey' });
    });
    it('Should ask for api key ', async () => {
      await TokensAddCommand.run(['--management', '--alias', 'newToken']);
      assert.calledWith(inquireStub, { type: 'input', message: 'CLI_AUTH_TOKENS_ADD_ENTER_API_KEY', name: 'apiKey' });
    });
    it('Invalid API key should throw error', async () => {
      await TokensAddCommand.run(['--management', '--alias', 'newToken', '--stack-api-key', 'asdf', '--token', 'asdf']);
      assert.calledTwice(errorStub);
    });
    it('Throw error if api key is kept empty', async () => {
      await TokensAddCommand.run(['--management', '--alias', 'newToken', '--stack-api-key', ' ', '--token', 'asdf']);
      assert.calledTwice(errorStub);
    });
    it('Throw error if token is kept empty', async () => {
      await TokensAddCommand.run([
        '--management',
        '--alias',
        'newToken',
        '--stack-api-key',
        process.env.BRANCH_ENABLED_API_KEY!,
        '--token',
        '',
      ]);
      assert.calledWith(errorStub);
    });
    it('Should add a token successfully after all the values are passed with stack having branches enabled', async () => {
      await TokensAddCommand.run([
        '--management',
        '--alias',
        'newToken',
        '--stack-api-key',
        process.env.BRANCH_ENABLED_API_KEY!,
        '--token',
        process.env.BRANCH_ENABLED_MGMT_TOKEN!,
        '--branch',
        'main',
      ]);
      assert.calledWith(successStub, 'CLI_AUTH_TOKENS_ADD_SUCCESS');
    });
    it('Should add a token successfully for stack with branches disabled after all the values are passed', async () => {
      await TokensAddCommand.run([
        '--management',
        '--alias',
        'newToken',
        '--stack-api-key',
        process.env.BRANCH_DISABLED_API_KEY!,
        '--token',
        process.env.BRANCH_DISABLED_MGMT_TOKEN!,
      ]);
      assert.calledWith(successStub, 'CLI_AUTH_TOKENS_ADD_SUCCESS');
    });
    it('Should throw an error if branch flag is passed along with stack not having branches enabled', async () => {
      await TokensAddCommand.run([
        '--management',
        '--alias',
        'newToken',
        '--stack-api-key',
        process.env.BRANCH_DISABLED_API_KEY!,
        '--token',
        process.env.BRANCH_DISABLED_MGMT_TOKEN!,
        '--branch',
        'main',
      ]);
      assert.calledOnce(errorStub);
    });
  });

  describe('- Delivery token', () => {
    it('Should ask for api key', async () => {
      await TokensAddCommand.run(['--delivery', '--alias', 'newToken']);
      assert.calledWith(inquireStub, { type: 'input', message: 'CLI_AUTH_TOKENS_ADD_ENTER_API_KEY', name: 'apiKey' });
    });
    it('Should ask for delivery token', async () => {
      await TokensAddCommand.run([
        '--delivery',
        '--alias',
        'newToken',
        '--stack-api-key',
        process.env.BRANCH_ENABLED_API_KEY!,
      ]);
      assert.calledWith(inquireStub, { type: 'input', message: 'CLI_AUTH_TOKENS_ADD_ENTER_TOKEN', name: 'token' });
    });
    it('Should ask for environment', async () => {
      await TokensAddCommand.run([
        '--delivery',
        '--alias',
        'newToken',
        '--stack-api-key',
        process.env.BRANCH_ENABLED_API_KEY!,
        '--token',
        process.env.BRANCH_ENABLED_DELIVERY_TOKEN!,
      ]);
      assert.calledWith(inquireStub, {
        type: 'input',
        message: 'CLI_AUTH_TOKENS_ADD_ENTER_ENVIRONMENT',
        name: 'env',
      });
    });
    it('Should add a new token if all the values are set correctly for stack with branches enabled', async () => {
      await TokensAddCommand.run([
        '--delivery',
        '--alias',
        'newToken',
        '--stack-api-key',
        process.env.BRANCH_ENABLED_API_KEY!,
        '--token',
        process.env.BRANCH_ENABLED_DELIVERY_TOKEN!,
        '--environment',
        process.env.BRANCH_ENABLED_ENVIRONMENT!,
      ]);
      assert.calledWith(successStub, 'CLI_AUTH_TOKENS_ADD_SUCCESS');
    });
    it('Should add a new token if all the values are set correctly for stack with branches disabled', async () => {
      await TokensAddCommand.run([
        '--delivery',
        '--alias',
        'newToken',
        '--stack-api-key',
        process.env.BRANCH_DISABLED_API_KEY!,
        '--token',
        process.env.BRANCH_DISABLED_DELIVERY_TOKEN!,
        '--environment',
        process.env.BRANCH_DISABLED_ENVIRONMENT!,
      ]);
      assert.calledWith(successStub, 'CLI_AUTH_TOKENS_ADD_SUCCESS');
    });
    it('Should throw and error for stack with branches disabled', async () => {
      let branch = 'my-branch';
      await TokensAddCommand.run([
        '--delivery',
        '--alias',
        'newToken',
        '--stack-api-key',
        process.env.BRANCH_DISABLED_API_KEY!,
        '--token',
        process.env.BRANCH_DISABLED_DELIVERY_TOKEN!,
        '--environment',
        process.env.BRANCH_DISABLED_ENVIRONMENT!,
        '--branch',
        branch,
      ]);
      assert.calledOnce(errorStub);
    });
  });
});
