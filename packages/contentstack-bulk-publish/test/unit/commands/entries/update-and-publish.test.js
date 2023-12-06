const { describe, it } = require('mocha');
const sinon = require('sinon');
const { expect } = require('chai');
const { config } = require('dotenv');

const EntriesUpdateAndPublish = require('../../../../src/commands/cm/entries/update-and-publish');

config();


const environments = process.env.ENVIRONMENTS.split(',');
const locales = process.env.LOCALES.split(',');
const contentTypes = process.env.CONTENT_TYPES.split(',');

describe('EntriesUpdateAndPublish', () => {
  it('Should run the command when all the flags are passed', async () => {
    const args = ['--content-types', contentTypes[0], '-e', environments[0], '--locales', locales[0], '-a', process.env.MANAGEMENT_ALIAS, '--yes'];
    const entriesUpdateAndPublishSpy = sinon.spy(EntriesUpdateAndPublish.prototype, 'run');
    await EntriesUpdateAndPublish.run(args);
    expect(entriesUpdateAndPublishSpy.calledOnce).to.be.true;
    entriesUpdateAndPublishSpy.restore();
  });

  it('Should fail when alias and stack api key flags are not passed', async () => {
    const args = ['--content-types', contentTypes[0], '-e', environments[0], '--locales', locales[0], '--yes'];
    const entriesUpdateAndPublishSpy = sinon.spy(EntriesUpdateAndPublish.prototype, 'run');
    const expectedError = 'Please use `--alias` or `--stack-api-key` to proceed.';
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
    const args = ['--content-types', contentTypes[0], '-e', environments[0], '--locales', locales[0], '--stack-api-key', process.env.STACK_API_KEY, '--yes'];
    const entriesUpdateAndPublishSpy = sinon.spy(EntriesUpdateAndPublish.prototype, 'run');
    await EntriesUpdateAndPublish.run(args);
    expect(entriesUpdateAndPublishSpy.calledOnce).to.be.true;
    entriesUpdateAndPublishSpy.restore();
  });
});