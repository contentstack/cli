const { expect } = require('chai');
const sinon = require('sinon');
const { describe, it, beforeEach, afterEach } = require('mocha');
const EntriesUnpublish = require('../../../../src/commands/cm/entries/unpublish');
const AddTokenCommand = require('@contentstack/cli-auth/lib/commands/auth/tokens/add').default;
const helper = require('../../../helpers/helper');
const { cliux } = require('@contentstack/cli-utilities');

describe('EntriesUnpublish Command', () => {
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
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('executes successfully with required parameters', async () => {
    const runStub = sandbox.stub(EntriesUnpublish.prototype, 'run').resolves();

    const result = await EntriesUnpublish.run([
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
    const runStub = sandbox.stub(EntriesUnpublish.prototype, 'run').resolves();

    const result = await EntriesUnpublish.run([
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
    const runStub = sandbox.stub(EntriesUnpublish.prototype, 'run').resolves('Success');

    const result = await EntriesUnpublish.run([
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
    const runStub = sandbox.stub(EntriesUnpublish.prototype, 'run');

    try {
      await EntriesUnpublish.run(['--environment', 'env', '--locale', 'en-us', '--yes']);
    } catch (error) {
      expect(error.message).to.equal('Use the `--alias` or `--stack-api-key` flag to proceed.');
      expect(runStub.called).to.be.false;
    }
  });
});
