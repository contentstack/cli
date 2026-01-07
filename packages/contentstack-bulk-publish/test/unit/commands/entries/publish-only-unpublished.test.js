const { describe, it, afterEach, beforeEach } = require('mocha');
const EntriesPublishOnlyUnpublished = require('../../../../src/commands/cm/entries/publish-only-unpublished');
const sinon = require('sinon');
const { config } = require('dotenv');
const { expect } = require('chai');
const { configHandler } = require('@contentstack/cli-utilities');

config();

const environments = ['env1', 'env2'];
const locales = ['en-us', 'fr-fr'];
const contentTypes = ['ct1', 'ct2'];

describe('EntriesPublishOnlyUnpublished', () => {
  let runStub;
  let configHandlerGetStub;

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

  it('should run the command all the required parameters', async () => {
    const args = [
      '-b',
      '--content-types',
      contentTypes[0],
      '--locales',
      locales[0],
      '--source-env',
      environments[0],
      '-a',
      'm_alias',
      '--yes',
    ];

    runStub = sinon.stub(EntriesPublishOnlyUnpublished.prototype, 'run').resolves('Command executed');

    const result = await EntriesPublishOnlyUnpublished.run(args);
    expect(result).to.equal('Command executed');
    expect(runStub.calledOnce).to.be.true;
  });

  it('throws error for missing authentication parameters', async () => {
    const args = [
      '-b',
      '--content-types',
      contentTypes[0],
      '--locales',
      locales[0],
      '--environments',
      environments[0],
      '--yes',
    ];

    const expectedError = 'Use the `--alias` or `--stack-api-key` flag to proceed.';

    runStub = sinon.stub(EntriesPublishOnlyUnpublished.prototype, 'run').callsFake(function () {
      throw new Error(expectedError);
    });

    try {
      await EntriesPublishOnlyUnpublished.run(args);
    } catch (error) {
      expect(error).to.be.an.instanceOf(Error);
      expect(error.message).to.equal(expectedError);
      expect(runStub.calledOnce).to.be.true;
    }
  });

  it('executes with stack parameter configuration and should run successfully when user is logged', async () => {
    const args = [
      '-b',
      '--content-types',
      contentTypes[0],
      '--locales',
      locales[0],
      '--environments',
      environments[0],
      '--stack-api-key',
      'asdf',
      '--yes',
    ];

    runStub = sinon.stub(EntriesPublishOnlyUnpublished.prototype, 'run').resolves('Executed with stack API key');

    const result = await EntriesPublishOnlyUnpublished.run(args);
    expect(result).to.equal('Executed with stack API key');
    expect(runStub.calledOnce).to.be.true;
  });
});
