const { describe, it } = require('mocha');
const sinon = require('sinon');
const { expect } = require('chai');
const { config } = require('dotenv');

const EntriesPublishModified = require('../../../../src/commands/cm/entries/publish-modified');

config();

const environments = process.env.ENVIRONMENTS.split(',');
const locales = process.env.LOCALES.split(',');
const contentTypes = process.env.CONTENT_TYPES.split(',');

describe('EntriesPublishModified', () => {
  it('Should run the command when all the flags are passed', async () => {
    const args = ['--content-types', contentTypes[0], '--source-env', environments[0], '-e', process.env.DESTINATION_ENV, '--locales', locales[0], '--alias', process.env.MANAGEMENT_ALIAS, '--yes'];
    const entriesPublishedModifiedSpy = sinon.spy(EntriesPublishModified.prototype, 'run');
    await EntriesPublishModified.run(args);
    expect(entriesPublishedModifiedSpy.calledOnce).to.be.true;
    entriesPublishedModifiedSpy.restore();
  });

  it('Should fail when alias and stack api key flags are not passed', async () => {
    const args = ['--content-types', contentTypes[0], '--source-env', environments[0], '-e', process.env.DESTINATION_ENV, '--locales', locales[0], '--yes'];
    const entriesPublishedModifiedSpy = sinon.spy(EntriesPublishModified.prototype, 'run');
    const expectedError = 'Please use `--alias` or `--stack-api-key` to proceed.';
    try {
      await EntriesPublishModified.run(args);
    } catch (error) {
      expect(error).to.be.an.instanceOf(Error);
      expect(error.message).to.equal(expectedError);
      expect(entriesPublishedModifiedSpy.calledOnce).to.be.true;
    }
    entriesPublishedModifiedSpy.restore();
  });

  it('Should run successfully when user is logged in and stack api key is passed', async () => {
    const args = ['--content-types', contentTypes[0], '--source-env', environments[0], '-e', process.env.DESTINATION_ENV, '--locales', locales[0], '--stack-api-key', process.env.STACK_API_KEY, '--yes'];
    const entriesPublishedModifiedSpy = sinon.spy(EntriesPublishModified.prototype, 'run');
    await EntriesPublishModified.run(args);
    expect(entriesPublishedModifiedSpy.calledOnce).to.be.true;
    entriesPublishedModifiedSpy.restore();
  });
});