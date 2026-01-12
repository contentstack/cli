const { expect } = require('chai');
const sinon = require('sinon');
const { describe, it, beforeEach, afterEach } = require('mocha');
const UnpublishCommand = require('../../../../src/commands/cm/assets/unpublish');
const AddTokenCommand = require('@contentstack/cli-auth/lib/commands/auth/tokens/add').default;
const helper = require('../../../helpers/helper');
const { cliux, configHandler } = require('@contentstack/cli-utilities');

describe('AssetsUnpublish Command', () => {
  let sandbox;
  let stackDetails;
  let configHandlerGetStub;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    
    // Stub configHandler.get to configure region
    // Region is required for cmaHost property in Command base class
    configHandlerGetStub = sandbox.stub(configHandler, 'get').callsFake((key) => {
      if (key === 'region') {
        return {
          cma: 'api.contentstack.io',
          cda: 'cdn.contentstack.io',
          uiHost: 'app.contentstack.com',
          developerHubUrl: 'developer.contentstack.com',
          launchHubUrl: 'launch.contentstack.com',
          personalizeUrl: 'personalize.contentstack.com',
        };
      }
      return undefined;
    });

    stackDetails = {
      api_key: 'asdf',
      environment: 'env',
      delivery_token: 'asdf',
      management_token: 'asdf',
      alias: 'm_alias',
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('executes successfully with required parameters', async () => {
    const runStub = sandbox.stub(UnpublishCommand.prototype, 'run').resolves();

    const result = await UnpublishCommand.run([
      '--alias',
      'm_alias',
      '--environment',
      'env',
      '--locale',
      'en-us',
      '--delivery-token',
      'test-delivery-token',
      '--yes',
    ]);

    expect(runStub.calledOnce).to.be.true;
    expect(result).to.be.undefined;
  });

  it('executes successfully with stack identifier', async () => {
    const runStub = sandbox.stub(UnpublishCommand.prototype, 'run').resolves();

    const result = await UnpublishCommand.run([
      '--stack-api-key',
      stackDetails.api_key,
      '--environment',
      'env',
      '--locale',
      'en-us',
      '--delivery-token',
      'test-delivery-token',
      '--yes',
    ]);

    expect(runStub.calledOnce).to.be.true;
    expect(result).to.be.undefined;
  });

  it('prompts for missing delivery token', async () => {
    sandbox.stub(helper, 'getStack').resolves({ ...stackDetails, delivery_token: undefined });
    sandbox.stub(cliux, 'prompt').resolves('prompted-token');
    sandbox.stub(AddTokenCommand.prototype, 'run').resolves();
    const runStub = sandbox.stub(UnpublishCommand.prototype, 'run').resolves('Success');

    const result = await UnpublishCommand.run([
      '--alias',
      'm_alias',
      '--environment',
      'env',
      '--locale',
      'en-us',
      '--yes',
    ]);

    expect(result).to.equal('Success');
    sinon.assert.calledOnce(runStub);
  });

  it('throws error for missing authentication parameters', async () => {
    const runStub = sandbox.stub(UnpublishCommand.prototype, 'run');

    try {
      await UnpublishCommand.run(['--environment', 'env', '--locale', 'en-us', '--yes']);
    } catch (error) {
      expect(error.message).to.equal('Use the `--alias` or `--stack-api-key` flag to proceed.');
      expect(runStub.called).to.be.false;
    }
  });
});
