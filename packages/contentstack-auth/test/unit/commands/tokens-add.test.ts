import { expect } from 'chai';
import * as sinon from 'sinon';
import { configHandler, cliux } from '@contentstack/cli-utilities';
import TokensAddCommand from '../../../src/commands/auth/tokens/add';
import { tokenValidation } from '../../../src/utils';
import { stub, assert } from 'sinon';
import { config as dotenvConfig } from 'dotenv';
import nock from 'nock';
// @ts-ignore
import * as conf from '../../config.json';

dotenvConfig();

const config = configHandler;
const configKeyTokens = 'tokens';
process.env.BRANCH_ENABLED_API_KEY = 'enabled_api_key';
process.env.BRANCH_ENABLED_MGMT_TOKEN = 'tokens';
process.env.BRANCH_ENABLED_DELIVERY_TOKEN = 'enabled_delivery_token';
process.env.BRANCH_ENABLED_ENVIRONMENT = 'enabled_env';

process.env.BRANCH_DISABLED_API_KEY = 'disabled_api_key';
process.env.BRANCH_DISABLED_MGMT_TOKEN = 'tokens';
process.env.BRANCH_DISABLED_DELIVERY_TOKEN = 'disabled_delivery_token';
process.env.BRANCH_DISABLED_ENVIRONMENT = 'disabled_env';

function resetConfig() {
  config.delete(`${configKeyTokens}.test-api-key-token2`);
  config.delete(`${configKeyTokens}.test-management-token`);
  config.delete(`${configKeyTokens}.test-management-token2`);
  config.delete(`${configKeyTokens}.test-api-key-token`);
  config.delete(`${configKeyTokens}.newToken`);
}
describe('Tokens Add Command', () => {
  let apiKeyValidationStub: sinon.SinonStub;
  let environmentTokenValidationStub: sinon.SinonStub;
  let printStub: sinon.SinonStub;
  const validAPIKey = conf.validAPIKey;
  const validDeliveryToken = '***REMOVED***';
  const validmanagementToken = 'cmajhsd98939482';
  const validEnvironment = 'textenv';

  before(function () {
    resetConfig();
    if ((cliux.print as any).restore) (cliux.print as any).restore();
    printStub = stub(cliux, 'print');
    apiKeyValidationStub = sinon
      .stub(tokenValidation, 'validateAPIKey')
      .callsFake(function (client: any, apiKey: string): Promise<any> {
        if (apiKey === validAPIKey) {
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

  it('Add a valid management token, should be added successfully', async () => {
    try {
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
    } catch (error: any) {
      expect(Boolean(config.get(`${configKeyTokens}.test-management-token`))).to.be.false;
    }
  });

  it('Replace an existing token, should prompt for confirmation', async function () {
    config.set(`${configKeyTokens}.test-management-token`, { token: validmanagementToken });
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

  it('Add a token without alias, should prompt for alias', async function () {
    if ((cliux.inquire as any).restore) (cliux.inquire as any).restore();
    const inquireStub = sinon.stub(cliux, 'inquire').resolves(true);
    await TokensAddCommand.run(['--stack-api-key', validAPIKey, '--management', '--token', 'invalid']);
    expect(inquireStub.calledOnce).to.be.true;
    inquireStub.restore();
  });
});

describe('Management and Delivery token flags', () => {
  let inquireStub: sinon.SinonStub;
  let errorStub: sinon.SinonStub;
  let successStub: sinon.SinonStub;
  let printStub: sinon.SinonStub;

  beforeEach(() => {
    if ((cliux.inquire as any).restore) (cliux.inquire as any).restore();
    if ((cliux.error as any).restore) (cliux.error as any).restore();
    if ((cliux.success as any).restore) (cliux.success as any).restore();
    if ((cliux.print as any).restore) (cliux.print as any).restore();
    inquireStub = sinon.stub(cliux, 'inquire');
    errorStub = sinon.stub(cliux, 'error');
    successStub = sinon.stub(cliux, 'success');
    printStub = sinon.stub(cliux, 'print');
    nock.cleanAll();
    resetConfig();
  });

  afterEach(() => {
    sinon.restore();
    inquireStub.restore();
    errorStub.restore();
    successStub.restore();
    printStub.restore();
    if ((cliux.inquire as any).restore) (cliux.inquire as any).restore();
    if ((cliux.error as any).restore) (cliux.error as any).restore();
    if ((cliux.success as any).restore) (cliux.success as any).restore();
    if ((cliux.print as any).restore) (cliux.print as any).restore();
    nock.cleanAll();
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

    it.skip('Should add a token successfully when all values are passed', async () => {
      nock('https://api.contentstack.io').get('/v3/environments').query({ limit: 1 }).reply(200, { environments: [] });

      await TokensAddCommand.run([
        '--management',
        '--alias',
        'newToken',
        '--stack-api-key',
        conf.validAPIKey,
        '--token',
        conf.validToken,
        '--branch',
        'main',
      ]);

      assert.calledOnce(successStub);
    });

    it('Should error when --token has no value', async () => {
      try {
        await TokensAddCommand.run(['--management', '--alias', 'newToken', '--stack-api-key']);
        throw new Error('Test should not reach here');
      } catch (error: any) {
        expect(error.message).to.contain('expects a value');
      }
    });

    it.skip('Should add a token successfully after all the values are passed with stack having branches enabled', async () => {
      nock('https://api.contentstack.io').get('/v3/environments').query({ limit: 1 }).reply(200, { environments: [] });

      await TokensAddCommand.run([
        '--management',
        '--alias',
        'newToken',
        '--stack-api-key',
        conf.validAPIKey,
        '--token',
        conf.validToken,
        '--branch',
        'main',
      ]);

      assert.calledOnce(successStub);
    });

    it.skip('Should add a token successfully for stack with branches disabled after all the values are passed', async () => {
      nock('https://api.contentstack.io').get('/v3/environments').query({ limit: 1 }).reply(200, { environments: [] });

      await TokensAddCommand.run([
        '--management',
        '--alias',
        'newToken',
        '--stack-api-key',
        conf.validAPIKey,
        '--token',
        conf.validToken,
      ]);

      assert.calledOnce(successStub);
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
      try {
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
      } catch (error: any) {
        assert.calledOnce(errorStub);
      }
    });
  });
});
