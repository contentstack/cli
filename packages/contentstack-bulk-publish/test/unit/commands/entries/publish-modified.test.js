const { describe, it } = require('mocha');
const sinon = require('sinon');
const { expect } = require('chai');
const { config } = require('dotenv');

const EntriesPublishModified = require('../../../../src/commands/cm/entries/publish-modified');

config();

const environments = ['env1', 'env2'];
const locales = ['en-us', 'fr-fr'];
const contentTypes = ['ct1', 'ct2'];

describe('EntriesPublishModified Command', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should run the command all the required parameters', async () => {
    const runStub = sandbox.stub(EntriesPublishModified.prototype, 'run').resolves();

    const args = [
      '--content-types', contentTypes[0],
      '--source-env', environments[0],
      '-e', environments[1],
      '--locales', locales[0],
      '--alias', 'm_alias',
      '--yes',
    ];

    const result = await EntriesPublishModified.run(args);
    expect(runStub.calledOnce).to.be.true;
    expect(result).to.be.undefined;
  });

  it('throws error for missing authentication parameters', async () => {
    const runStub = sandbox.stub(EntriesPublishModified.prototype, 'run').callThrough();
    const args = [
      '--content-types', contentTypes[0],
      '--source-env', environments[0],
      '-e', environments[1],
      '--locales', locales[0],
      '--yes',
    ];

    try {
      await EntriesPublishModified.run(args);
    } catch (error) {
      expect(error).to.be.an('error');
      expect(error.message).to.equal('Use the `--alias` or `--stack-api-key` flag to proceed.');
      expect(runStub.calledOnce).to.be.true;
    }
  });

  it('executes with required parameters and user is logged in', async () => {
    const runStub = sandbox.stub(EntriesPublishModified.prototype, 'run').resolves();

    const args = [
      '--content-types', contentTypes[0],
      '--source-env', environments[0],
      '-e', environments[1],
      '--locales', locales[0],
      '--stack-api-key', 'asdf',
      '--yes',
    ];

    const result = await EntriesPublishModified.run(args);
    expect(runStub.calledOnce).to.be.true;
    expect(result).to.be.undefined;
  });
});