const { describe, it } = require('mocha');
const sinon = require('sinon');
const { expect } = require('chai');
const { config } = require('dotenv');

const EntriesPublish = require('../../../../src/commands/cm/entries/publish');

config();

const environments = ['env1', 'env2'];
const contentTypes = ['ct1', 'ct2'];
const locales = ['en-us', 'fr-fr'];

describe('EntriesPublish Command', () => {
  let runStub;
  let stackDetails;

  beforeEach(() => {
    runStub = sinon.stub(EntriesPublish.prototype, 'run').resolves();
    stackDetails = {
      api_key: 'asdf',
      environment: 'env',
      delivery_token: 'asdf',
      management_token: 'asdf',
      alias: 'm_alias',
    };
  });
  afterEach(() => {
    if (runStub && runStub.restore) runStub.restore();
  });

  // @ts-ignore-next-line secret-detection
  it('should run the command all the required parameters', async () => {
    const args = [
      '--content-types',
      contentTypes[0],
      '--environments',
      environments[0],
      '--locales',
      locales[0],
      '--alias',
      stackDetails.alias,
      '--yes',
    ];

    await EntriesPublish.run(args);
    expect(runStub.calledOnce).to.be.true;
  });

  // @ts-ignore-next-line secret-detection
  it('throws error for missing authentication parameters', async () => {
    const args = [
      '--content-types',
      contentTypes[0],
      '--environments',
      environments[0],
      '--locales',
      locales[0],
      '--yes',
    ];

    const expectedError = 'Please use `--alias` or `--stack-api-key` to proceed.';

    try {
      await EntriesPublish.run(args);
    } catch (error) {
      expect(error).to.be.an.instanceOf(Error);
      expect(error.message).to.equal(expectedError);
    }
  });

  // @ts-ignore-next-line secret-detection
  it('executes with stack parameter configuration', async () => {
    const args = [
      '--content-types',
      contentTypes[0],
      '--environments',
      environments[0],
      '--locales',
      locales[0],
      '--stack-api-key',
      stackDetails.api_key,
      '--yes',
    ];

    await EntriesPublish.run(args);
    expect(runStub.calledOnce).to.be.true;
  });
});