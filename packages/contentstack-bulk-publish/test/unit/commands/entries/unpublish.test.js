const { describe, it } = require('mocha');
const EntriesUnpublish = require('../../../../src/commands/cm/entries/unpublish');
const { cliux } = require('@contentstack/cli-utilities');
const sinon = require('sinon');
const { config } = require('dotenv');
const { expect } = require('chai');

const { stub } = sinon;

config();

const environments = process.env.ENVIRONMENTS.split(',');
const locales = process.env.LOCALES.split(',');
const contentTypes = process.env.CONTENT_TYPES.split(',');

describe('EntriesUnpublish', () => {
  it('Should run the command when all the flags are passed', async function () {
    const args = ['--content-type', contentTypes[0], '--environment', environments[0], '--locale', locales[0], '--alias', process.env.MANAGEMENT_ALIAS, '--delivery-token', process.env.DELIVERY_TOKEN, '--yes'];
    const inquireStub = stub(cliux, 'prompt');
    await EntriesUnpublish.run(args);
    sinon.assert.notCalled(inquireStub);
    inquireStub.restore();
  });

  it('Should ask for delivery token when the flag is not passed', async () => {
    const args = ['--content-type', contentTypes[0], '--environment', environments[0], '--locale', locales[0], '--alias', process.env.MANAGEMENT_ALIAS, '--yes'];
    const inquireStub = stub(cliux, 'prompt').resolves(process.env.DELIVERY_TOKEN);
    await EntriesUnpublish.run(args);
    sinon.assert.calledOnce(inquireStub);
    inquireStub.restore();
  });

  it('Should fail when alias and stack api key flags are not passed', async () => {
    const args = ['--content-type', contentTypes[0], '--environment', environments[0], '--locale', locales[0], '--delivery-token', process.env.DELIVERY_TOKEN, '--yes'];
    const inquireStub = stub(cliux, 'prompt');
    const entriesUnpublishSpy = sinon.spy(EntriesUnpublish.prototype, 'run');
    const expectedError = 'Please use `--alias` or `--stack-api-key` to proceed.';
    try {
      await EntriesUnpublish.run(args);
    } catch (error) {
      expect(error).to.be.an.instanceOf(Error);
      expect(error.message).to.equal(expectedError);
      expect(entriesUnpublishSpy.calledOnce).to.be.true;
    }
    sinon.assert.notCalled(inquireStub);
    inquireStub.restore();
    entriesUnpublishSpy.restore();
  });

  it('Should run successfully when user is logged in and stack api key is passed', async () => {
    const args = ['--content-type', contentTypes[0], '--environment', environments[0], '--locale', locales[0], '--stack-api-key', process.env.STACK_API_KEY, '--delivery-token', process.env.DELIVERY_TOKEN, '--yes'];
    const inquireStub = stub(cliux, 'prompt');
    await EntriesUnpublish.run(args);
    sinon.assert.notCalled(inquireStub);
    inquireStub.restore();
  });
});