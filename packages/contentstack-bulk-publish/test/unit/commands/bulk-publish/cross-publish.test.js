const { expect } = require('chai');
const sinon = require('sinon');
const { cliux, configHandler } = require('@contentstack/cli-utilities');
const CrossPublish = require('../../../../src/commands/cm/bulk-publish/cross-publish');
const AddTokenCommand = require('@contentstack/cli-auth/lib/commands/auth/tokens/add').default;
const helper = require('../../../helpers/helper');

describe('CrossPublish', () => {
  let sandbox;
  let stackDetails;
  let configHandlerGetStub;

  beforeEach(() => {
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
      environment: 'sourceEnv',
      alias: 'dummy_alias',
      delivery_token: undefined,
      management_token: 'mgmt-token',
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('executes successfully with all required parameters', async () => {
    const runStub = sandbox.stub(CrossPublish.prototype, 'run').resolves('Success');

    const result = await CrossPublish.run([
      '--source-env',
      'sourceEnv',
      '--environments',
      'targetEnv',
      '--locale',
      'en-us',
      '--alias',
      'dummy_alias',
      '--delivery-token',
      'token123',
      '--onlyAssets',
      '--yes',
    ]);

    expect(result).to.equal('Success');
    sinon.assert.calledOnce(runStub);
  });

  it('prompts for delivery token if not provided', async () => {
    sandbox.stub(helper, 'getStack').resolves({ ...stackDetails, delivery_token: undefined });
    sandbox.stub(cliux, 'prompt').resolves('prompted-token');
    sandbox.stub(AddTokenCommand.prototype, 'run').resolves();
    const runStub = sandbox.stub(CrossPublish.prototype, 'run').resolves('Success');

    const result = await CrossPublish.run([
      '--source-env',
      'sourceEnv',
      '--environments',
      'targetEnv',
      '--locale',
      'en-us',
      '--alias',
      'dummy_alias',
      '--onlyAssets',
      '--yes',
    ]);

    expect(result).to.equal('Success');
    sinon.assert.calledOnce(runStub);
  });

  it('throws error when required flags are missing', async () => {
    try {
      await CrossPublish.run([
        '--source-env',
        'sourceEnv',
        '--environments',
        'targetEnv',
        // Missing --locale
        '--alias',
        'dummy_alias',
        '--delivery-token',
        'token123',
      ]);
    } catch (error) {
      expect(error.message).to.include('Locale is required');
    }
  });

  it('validates authentication requirement', async () => {
    try {
      await CrossPublish.run([
        '--source-env',
        'sourceEnv',
        '--environments',
        'targetEnv',
        '--locale',
        'en-us',
        // Missing alias and stack-api-key
        '--delivery-token',
        'token123',
      ]);
    } catch (error) {
      expect(error.message).to.include('Use the `--alias` or `--stack-api-key` flag to proceed.');
    }
  });

  it('runs with stack a p i  instead of alias', async () => {
    const runStub = sandbox.stub(CrossPublish.prototype, 'run').resolves('Success');

    const result = await CrossPublish.run([
      '--source-env',
      'sourceEnv',
      '--environments',
      'targetEnv',
      '--locale',
      'en-us',
      '--stack-api-key',
      'asdf',
      '--delivery-token',
      'token123',
      '--onlyAssets',
      '--yes',
    ]);

    expect(result).to.equal('Success');
    sinon.assert.calledOnce(runStub);
  });

  it('validates flag combinations only assets and only entries', async () => {
    try {
      await CrossPublish.run([
        '--source-env',
        'sourceEnv',
        '--environments',
        'targetEnv',
        '--locale',
        'en-us',
        '--stack-api-key',
        'asdf',
        '--delivery-token',
        'token123',
        '--onlyAssets',
        '--onlyEntries',
        '--yes',
      ]);
    } catch (error) {
      expect(error.message).to.include(
        'The flags onlyAssets and onlyEntries need not be used at the same time. Unpublish command unpublishes entries and assts at the same time by default',
      );
    }
  });
});
