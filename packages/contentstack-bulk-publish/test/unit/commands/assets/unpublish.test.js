const sinon = require('sinon');
const { test } = require('@contentstack/cli-dev-dependencies');
const { describe, it, beforeEach, afterEach } = require('mocha');
const UnpublishCommand = require('../../../../src/commands/cm/assets/unpublish');
const AddTokenCommand = require('@contentstack/cli-auth/lib/commands/auth/tokens/add').default;
const getStackModule = require('../../../helpers/helper');
const { cliux } = require('@contentstack/cli-utilities');

describe('AssetsUnpublish Command', () => {
  let sandbox;
  let stackDetails;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    stackDetails = {
      api_key: 'asdf',
      environment: 'env',
      delivery_token: 'asdf',
      management_token: 'asdf',
      alias: 'm_alias',
    };

    sandbox.stub(getStackModule, 'getStack').resolves(stackDetails);

    await test
      .command(AddTokenCommand, [
        '--alias',
        'm_alias',
        '--stack-api-key',
        stackDetails.api_key,
        '--management',
        '--token',
        stackDetails.management_token,
        '--yes',
      ])
      .it(`Adding token for ${stackDetails.api_key}`);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('executes successfully with required parameters', async () => {
    await test
      .command(UnpublishCommand, [
        '--alias',
        'm_alias',
        '--environment',
        'env',
        '--locale',
        'en-us',
        '--delivery-token',
        'test-delivery-token',
        '--yes',
      ])
      .it('Command completes without errors');
  });

  it('executes successfully with stack identifier', async () => {
    await test
      .command(UnpublishCommand, [
        '--stack-api-key',
        stackDetails.api_key,
        '--environment',
        'env',
        '--locale',
        'en-us',
        '--delivery-token',
        'test-delivery-token',
        '--yes',
      ])
      .it('Command completes using stack API key');
  });

  it('prompts for missing access parameter', async () => {
    const promptStub = sandbox.stub(cliux, 'prompt').resolves('test-delivery-token');
    test
      .command(UnpublishCommand, ['--alias', 'm_alias', '--environment', 'env', '--locale', 'en-us', '--yes'])
      .it('Handles missing parameter prompt', () => {
        sinon.assert.calledOnce(promptStub);
      });
  });

  it('validates required authentication parameters', async () => {
    test
      .command(UnpublishCommand, ['--environment', 'env', '--locale', 'en-us', '--yes'])
      .catch((error) => {
        expect(error.message).to.equal('Please use `--alias` or `--stack-api-key` to proceed.');
      })
      .it('Handles missing authentication parameters');
  });
});
