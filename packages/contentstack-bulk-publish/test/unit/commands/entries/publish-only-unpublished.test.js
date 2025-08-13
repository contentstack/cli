const { describe, it, afterEach } = require('mocha');
const EntriesPublishOnlyUnpublished = require('../../../../src/commands/cm/entries/publish-only-unpublished');
const sinon = require('sinon');
const { config } = require('dotenv');
const { expect } = require('chai');

config();

const environments = ['env1', 'env2'];
const locales = ['en-us', 'fr-fr'];
const contentTypes = ['ct1', 'ct2'];

describe('EntriesPublishOnlyUnpublished', () => {
  let runStub;

  afterEach(() => {
    if (runStub && runStub.restore) runStub.restore();
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

    const expectedError = 'Please use `--alias` or `--stack-api-key` to proceed.';

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
