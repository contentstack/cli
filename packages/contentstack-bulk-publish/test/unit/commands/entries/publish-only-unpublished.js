const { describe, it } = require('mocha');
const EntriesPublishOnlyUnpublished = require('../../../../src/commands/cm/entries/publish-only-unpublished');
const { cliux } = require('@contentstack/cli-utilities');
const sinon = require('sinon');
const { config } = require('dotenv');
const { expect } = require('chai');

const { stub } = sinon;

config();

const environments = process.env.ENVIRONMENTS.split(',');
const locales = process.env.LOCALES.split(',');
const contentTypes = process.env.CONTENT_TYPES.split(',');

describe('EntriesPublishOnlyUnpublished', () => {
  it('Should run the command when all the flags are passed', async () => {
    const args = ['-b', '--content-types', contentTypes[0], '--locales', locales[0], '--source-env', environments[0], '-a', process.env.MANAGEMENT_ALIAS, '--yes'];
    const entriesPublishOnlyUnpublishedSpy = sinon.spy(EntriesPublishOnlyUnpublished.prototype, 'run');
    await EntriesPublishOnlyUnpublished.run(args);
    expect(entriesPublishOnlyUnpublishedSpy.calledOnce).to.be.true;
    entriesPublishOnlyUnpublishedSpy.restore();
  });

  it('Should fail when alias and stack api key flags are not passed', async () => {
    const args = ['-b', '--content-types', contentTypes[0],'--locales', locales[0], '--environments', environments[0], '--yes'];
    const entriesPublishOnlyUnpublishedSpy = sinon.spy(EntriesPublishOnlyUnpublished.prototype, 'run');
    const expectedError = 'Please use `--alias` or `--stack-api-key` to proceed.';
    try {
      await EntriesPublishOnlyUnpublished.run(args);
    } catch (error) {
      expect(error).to.be.an.instanceOf(Error);
      expect(error.message).to.equal(expectedError);
      expect(entriesPublishOnlyUnpublishedSpy.calledOnce).to.be.true;
    }
    entriesPublishOnlyUnpublishedSpy.restore();
  });

  it('Should run successfully when user is logged in and stack api key is passed', async () => {
    const args = ['-b', '--content-types', contentTypes[0],'--locales', locales[0], '--environments', environments[0], '--stack-api-key', process.env.STACK_API_KEY, '--yes'];
    const entriesPublishOnlyUnpublishedSpy = sinon.spy(EntriesPublishOnlyUnpublished.prototype, 'run');
    await EntriesPublishOnlyUnpublished.run(args);
    expect(entriesPublishOnlyUnpublishedSpy.calledOnce).to.be.true;
    entriesPublishOnlyUnpublishedSpy.restore();
  });
});