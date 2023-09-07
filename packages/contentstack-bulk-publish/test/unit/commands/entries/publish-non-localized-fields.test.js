const { describe, it } = require('mocha');
const sinon = require('sinon');
const { expect } = require('chai');
const { config } = require('dotenv');

const EntriesPublishNonLocalizedFields = require('../../../../src/commands/cm/entries/publish-non-localized-fields');

config();

const environments = process.env.ENVIRONMENTS.split(',');
// const locales = process.env.LOCALES.split(',');
const contentTypes = process.env.CONTENT_TYPES.split(',');

describe('EntriesPublishNonLocalizedFields', () => {
  it('Should run the command when all the flags are passed', async () => {
    const args = ['--content-types', contentTypes[0], '--source-env', environments[0], '--environments', process.env.DESTINATION_ENV, '--alias', process.env.MANAGEMENT_ALIAS, '--yes'];
    const entriesPublishNonLocalizedFieldsSpy = sinon.spy(EntriesPublishNonLocalizedFields.prototype, 'run');
    await EntriesPublishNonLocalizedFields.run(args);
    expect(entriesPublishNonLocalizedFieldsSpy.calledOnce).to.be.true;
    entriesPublishNonLocalizedFieldsSpy.restore();
  });

  it('Should fail when alias and stack api key flags are not passed', async () => {
    const args = ['--content-types', contentTypes[0], '--source-env', environments[0], '--environments', process.env.DESTINATION_ENV, '--yes'];
    const entriesPublishNonLocalizedFieldsSpy = sinon.spy(EntriesPublishNonLocalizedFields.prototype, 'run');
    const expectedError = 'Please use `--alias` or `--stack-api-key` to proceed.';
    try {
      await EntriesPublishNonLocalizedFields.run(args);
    } catch (error) {
      expect(error).to.be.an.instanceOf(Error);
      expect(error.message).to.equal(expectedError);
      expect(entriesPublishNonLocalizedFieldsSpy.calledOnce).to.be.true;
    }
    entriesPublishNonLocalizedFieldsSpy.restore();
  });

  it('Should run successfully when user is logged in and stack api key is passed', async () => {
    const args = ['--content-types', contentTypes[0], '--source-env', environments[0], '--environments', process.env.DESTINATION_ENV, '--stack-api-key', process.env.STACK_API_KEY, '--yes'];
    const entriesPublishNonLocalizedFieldsSpy = sinon.spy(EntriesPublishNonLocalizedFields.prototype, 'run');
    await EntriesPublishNonLocalizedFields.run(args);
    expect(entriesPublishNonLocalizedFieldsSpy.calledOnce).to.be.true;
    entriesPublishNonLocalizedFieldsSpy.restore();
  });
});