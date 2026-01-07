const { describe, it } = require('mocha');
const sinon = require('sinon');
const { expect } = require('chai');
const { config } = require('dotenv');
const { configHandler } = require('@contentstack/cli-utilities');

const EntriesUpdateAndPublish = require('../../../../src/commands/cm/entries/update-and-publish');

config();

const environments = ['env1', 'env2'];
const locales = ['en-us', 'fr-fr'];
const contentTypes = ['ct1', 'ct2'];

describe('EntriesUpdateAndPublish', () => {
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
  it('Should run the command when all the flags are passed', async () => {
    const runStub = sandbox.stub(EntriesUpdateAndPublish.prototype, 'run').resolves();
    const args = [
      '--content-types',
      contentTypes[0],
      '-e',
      environments[0],
      '--locales',
      locales[0],
      '-a',
      'm_alias',
      '--yes',
    ];
    const result = await EntriesUpdateAndPublish.run(args);
    expect(runStub.calledOnce).to.be.true;
    expect(result).to.be.undefined;
  });

  it('Should fail when alias and stack api key flags are not passed', async () => {
    const args = ['--content-types', contentTypes[0], '-e', environments[0], '--locales', locales[0], '--yes'];
    const entriesUpdateAndPublishSpy = sinon.spy(EntriesUpdateAndPublish.prototype, 'run');
    const expectedError = 'Use the `--alias` or `--stack-api-key` flag to proceed.';
    try {
      await EntriesUpdateAndPublish.run(args);
    } catch (error) {
      expect(error).to.be.an.instanceOf(Error);
      expect(error.message).to.equal(expectedError);
      expect(entriesUpdateAndPublishSpy.calledOnce).to.be.true;
    }
    entriesUpdateAndPublishSpy.restore();
  });

  it('Should run successfully when user is logged in and stack api key is passed', async () => {
    const runStub = sandbox.stub(EntriesUpdateAndPublish.prototype, 'run').resolves();

    const args = [
      '--content-types',
      contentTypes[0],
      '-e',
      environments[0],
      '--locales',
      locales[0],
      '--stack-api-key',
      stackDetails.api_key,
      '--yes',
    ];
    const result = await EntriesUpdateAndPublish.run(args);
    expect(runStub.calledOnce).to.be.true;
    expect(result).to.be.undefined;
  });
});
