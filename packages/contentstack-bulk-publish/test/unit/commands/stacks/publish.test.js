const { describe, it } = require('mocha');
const inquirer = require('inquirer');
const sinon = require('sinon');
const { expect } = require('chai');
const { config } = require('dotenv');
const StackPublish = require('../../../../src/commands/cm/stacks/publish');
const { stub } = sinon;

config();

const environments = process.env.ENVIRONMENTS.split(',');
const locales = process.env.LOCALES.split(',');
const contentTypes = process.env.CONTENT_TYPES.split(',');

describe('StackPublish', () => {
	it('Should run the command when all the flags are passed', async () => {
		const args = ['--content-types', contentTypes[0], '--environments', environments[0], '--locales', locales[0], '--alias', process.env.MANAGEMENT_ALIAS, '--yes'];
		const stackPublishSpy = sinon.spy(StackPublish.prototype, 'run');
		const inquireStub = stub(inquirer, 'prompt').resolves(process.env.STACK_PUBLISH_PROMPT_ANSWER.trim() || 'Publish Entries and Assets');
		await StackPublish.run(args);
		expect(stackPublishSpy.calledOnce).to.be.true;
		sinon.assert.calledOnce(inquireStub);
		stackPublishSpy.restore();
    inquireStub.restore();
	});

	it('Should fail when alias and stack api key flags are not passed', async () => {
    const args = ['--content-types', contentTypes[0], '--environments', environments[0], '--locales', locales[0], '--yes'];
    const stackPublishSpy = sinon.spy(StackPublish.prototype, 'run');
    const inquireStub = stub(inquirer, 'prompt').resolves(process.env.STACK_PUBLISH_PROMPT_ANSWER.trim() || 'Publish Entries and Assets');
    const expectedError = 'Please use `--alias` or `--stack-api-key` to proceed.';
    try {
      await StackPublish.run(args);
    } catch (error) {
      expect(error).to.be.an.instanceOf(Error);
      expect(error.message).to.equal(expectedError);
      expect(stackPublishSpy.calledOnce).to.be.true;
    }
    stackPublishSpy.restore();
    inquireStub.restore();
  });

  it('Should run successfully when user is logged in and stack api key is passed', async () => {
    const args = ['--content-types', contentTypes[0], '--environments', environments[0], '--locales', locales[0], '--stack-api-key', process.env.STACK_API_KEY, '--yes'];
    const stackPublishSpy = sinon.spy(StackPublish.prototype, 'run');
    const inquireStub = stub(inquirer, 'prompt').resolves(process.env.STACK_PUBLISH_PROMPT_ANSWER.trim() || 'Publish Entries and Assets');
    await StackPublish.run(args);
    expect(stackPublishSpy.calledOnce).to.be.true;
    stackPublishSpy.restore();
    inquireStub.restore();
  });
});