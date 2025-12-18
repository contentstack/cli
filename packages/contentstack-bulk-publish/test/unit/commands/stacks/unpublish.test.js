const { describe, it, afterEach } = require('mocha');
const StackUnpublish = require('../../../../src/commands/cm/stacks/unpublish');
const { cliux } = require('@contentstack/cli-utilities');
const sinon = require('sinon');
const { config } = require('dotenv');
const { expect } = require('chai');

config();

const environments = ['env1', 'env2'];
const locales = ['en-us', 'fr-fr'];
const contentTypes = ['ct1', 'ct2'];

describe('StackUnpublish', () => {
  let promptStub;
  let runStub;

  afterEach(() => {
    sinon.restore(); // clean up all stubs
  });

  it('Should run the command when all the flags are passed', async function () {
    const args = [
      '--content-type',
      contentTypes[0],
      '--environment',
      environments[0],
      '--locale',
      locales[0],
      '--alias',
      'asdf',
      '--delivery-token',
      'd_token',
      '--yes',
    ];

    promptStub = sinon.stub(cliux, 'prompt'); // shouldn't be called
    runStub = sinon.stub(StackUnpublish.prototype, 'run').resolves('Unpublish success');

    const result = await StackUnpublish.run(args);
    expect(result).to.equal('Unpublish success');
    sinon.assert.notCalled(promptStub);
  });

  it('Should ask for delivery token when the flag is not passed', async () => {
    const args = [
      '--content-type',
      contentTypes[0],
      '--environment',
      environments[0],
      '--locale',
      locales[0],
      '--alias',
      'asdf',
      '--yes',
    ];

    promptStub = sinon.stub(cliux, 'prompt').resolves({ deliveryToken: 'd_token' });
    runStub = sinon.stub(StackUnpublish.prototype, 'run').resolves('Unpublish with prompt');

    const result = await StackUnpublish.run(args);
    expect(result).to.equal('Unpublish with prompt');
    sinon.assert.calledOnce(runStub);
  });

  it('Should fail when alias and stack api key flags are not passed', async () => {
    const args = [
      '--content-type',
      contentTypes[0],
      '--environment',
      environments[0],
      '--locale',
      locales[0],
      '--delivery-token',
      'd_token',
      '--yes',
    ];

    const expectedError = 'Use the `--alias` or `--stack-api-key` flag to proceed.';

    runStub = sinon.stub(StackUnpublish.prototype, 'run').callsFake(function () {
      throw new Error(expectedError);
    });

    promptStub = sinon.stub(cliux, 'prompt');

    try {
      await StackUnpublish.run(args);
    } catch (error) {
      expect(error).to.be.an.instanceOf(Error);
      expect(error.message).to.equal(expectedError);
      expect(runStub.calledOnce).to.be.true;
    }

    sinon.assert.notCalled(promptStub);
  });

  it('Should run successfully when user is logged in and stack api key is passed', async () => {
    const args = [
      '--content-type',
      contentTypes[0],
      '--environment',
      environments[0],
      '--locale',
      locales[0],
      '--stack-api-key',
      'asdf',
      '--delivery-token',
      'd_token',
      '--yes',
    ];

    promptStub = sinon.stub(cliux, 'prompt');
    runStub = sinon.stub(StackUnpublish.prototype, 'run').resolves('Unpublish with stack API key');

    const result = await StackUnpublish.run(args);
    expect(result).to.equal('Unpublish with stack API key');
    sinon.assert.notCalled(promptStub);
  });
});