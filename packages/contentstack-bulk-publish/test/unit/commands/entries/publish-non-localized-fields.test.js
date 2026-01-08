const { describe, it, beforeEach, afterEach } = require('mocha');
const sinon = require('sinon');
const { expect } = require('chai');
const { config } = require('dotenv');
const { configHandler } = require('@contentstack/cli-utilities');

const EntriesPublishNonLocalizedFields = require('../../../../src/commands/cm/entries/publish-non-localized-fields');

config();

const environments = ['env1', 'env2'];
const contentTypes = ['ct1', 'ct2'];

describe('EntriesPublishNonLocalizedFields', () => {
  let runStub;
  let configHandlerGetStub;
  let stackDetails = {
    api_key: 'asdf',
    environment: 'env',
    delivery_token: 'asdf',
    management_token: 'asdf',
    alias: 'm_alias',
  };

  beforeEach(() => {
    // Stub configHandler.get to configure region
    // Region is required for cmaHost property in Command base class
    configHandlerGetStub = sinon.stub(configHandler, 'get').callsFake((key) => {
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
  });

  afterEach(() => {
    if (runStub && runStub.restore) runStub.restore();
    if (configHandlerGetStub && configHandlerGetStub.restore) configHandlerGetStub.restore();
  });

  it('Should run the command when all the flags are passed', async () => {
    const args = [
      '--content-types',
      contentTypes[0],
      '--source-env',
      environments[0],
      '--environments',
      environments[1],
      '--alias',
      'm_alias',
      '--yes',
    ];
    runStub = sinon.stub(EntriesPublishNonLocalizedFields.prototype, 'run').resolves();
    await EntriesPublishNonLocalizedFields.run(args);
    expect(runStub.calledOnce).to.be.true;
  });

  it('Should fail when alias and stack api key flags are not passed', async () => {
    const args = [
      '--content-types',
      contentTypes[0],
      '--source-env',
      environments[0],
      '--environments',
      environments[1],
      '--yes',
    ];
    const expectedError = 'Use the `--alias` or `--stack-api-key` flag to proceed.';

    try {
      await EntriesPublishNonLocalizedFields.run(args);
    } catch (error) {
      expect(error).to.be.an.instanceOf(Error);
      expect(error.message).to.equal(expectedError);
    }
  });

  it('Should run successfully when user is logged in and stack api key is passed', async () => {
    const args = [
      '--content-types',
      contentTypes[0],
      '--source-env',
      environments[0],
      '--environments',
      environments[1],
      '--stack-api-key',
      stackDetails.api_key,
      '--yes',
    ];
    runStub = sinon.stub(EntriesPublishNonLocalizedFields.prototype, 'run').resolves();
    await EntriesPublishNonLocalizedFields.run(args);
    expect(runStub.calledOnce).to.be.true;
  });
});
