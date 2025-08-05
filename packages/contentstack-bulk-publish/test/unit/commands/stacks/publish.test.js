const { describe, it, afterEach } = require('mocha');
const inquirer = require('inquirer');
const sinon = require('sinon');
const { expect } = require('chai');
const { config } = require('dotenv');
const StackPublish = require('../../../../src/commands/cm/stacks/publish');

config();

const environments = ['env1', 'env2'];
const locales = ['en-us', 'fr-fr'];
const contentTypes = ['ct1', 'ct2'];

describe('StackPublish', () => {
  let runStub, stackDetails, promptStub;

  beforeEach(() => {
    stackDetails = {
      api_key: 'asdf',
      environment: 'env',
      delivery_token: 'asdf',
      management_token: 'asdf',
      alias: 'm_alias',
    };
  });
  afterEach(() => {
    sinon.restore(); // Restores all stubs
  });

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

    runStub = sinon.stub(StackPublish.prototype, 'run').resolves('Executed successfully');
    promptStub = sinon.stub(inquirer, 'prompt').resolves({ publishType: 'Publish Entries and Assets' });

    const result = await StackPublish.run(args);
    expect(result).to.equal('Executed successfully');
    expect(runStub.calledOnce).to.be.true;
  });

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

    runStub = sinon.stub(StackPublish.prototype, 'run').callsFake(function () {
      throw new Error(expectedError);
    });

    promptStub = sinon.stub(inquirer, 'prompt').resolves({ publishType: 'Publish Entries and Assets' });

    try {
      await StackPublish.run(args);
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.equal(expectedError);
      expect(runStub.calledOnce).to.be.true;
    }
  });

  it('Should run successfully when user is logged in and stack api key is passed', async () => {
    const args = [
      '--content-types',
      contentTypes[0],
      '--environments',
      environments[0],
      '--locales',
      locales[0],
      '--stack-api-key',
      'asdf',
      '--yes',
    ];

    runStub = sinon.stub(StackPublish.prototype, 'run').resolves('Executed with stack API key');
    promptStub = sinon.stub(inquirer, 'prompt').resolves({ publishType: 'Publish Entries and Assets' });

    const result = await StackPublish.run(args);
    expect(result).to.equal('Executed with stack API key');
    expect(runStub.calledOnce).to.be.true;
  });
});
