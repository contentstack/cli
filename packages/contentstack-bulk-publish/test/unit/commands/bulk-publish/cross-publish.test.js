const { describe, it } = require('mocha');
const CrossPublish = require('../../../../src/commands/cm/bulk-publish/cross-publish');
const { cliux } = require('@contentstack/cli-utilities');
const sinon = require('sinon');
const { config } = require('dotenv');
const { expect } = require('chai');

const { stub } = sinon;

config();

const environments = process.env.ENVIRONMENTS.split(',');
const locales = process.env.LOCALES.split(',');

describe('CrossPublish', () => {
  it('Should run the command when all the flags are passed', async function () {
    const args = ['--source-env', environments[0], '--environments', process.env.DESTINATION_ENV, '--locale', locales[0], '--alias', process.env.MANAGEMENT_ALIAS, '--delivery-token', process.env.DELIVERY_TOKEN, '--onlyAssets', '--yes'];
    const inquireStub = stub(cliux, 'prompt');
    await CrossPublish.run(args);
    sinon.assert.notCalled(inquireStub);
    inquireStub.restore();
  });

  it('Should ask for delivery token when the flag is not passed', async () => {
    const args = ['--source-env', environments[0], '--environments', process.env.DESTINATION_ENV, '--locale', locales[0], '--alias', process.env.MANAGEMENT_ALIAS, '--onlyAssets', '--yes'];
    const inquireStub = stub(cliux, 'prompt').resolves(process.env.DELIVERY_TOKEN);
    await CrossPublish.run(args);
    sinon.assert.calledOnce(inquireStub);
    inquireStub.restore();
  });

  it('Should fail when alias and stack api key flags are not passed', async () => {
    const args = ['--source-env', environments[0], '--environments', process.env.DESTINATION_ENV, '--locale', locales[0], '--delivery-token', process.env.DELIVERY_TOKEN, '--onlyAssets', '--yes'];
    const inquireStub = stub(cliux, 'prompt');
    const crossPublishSpy = sinon.spy(CrossPublish.prototype, 'run');
    const expectedError = 'Please use `--alias` or `--stack-api-key` to proceed.';
    try {
      await CrossPublish.run(args);
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.equal(expectedError);
      expect(crossPublishSpy.calledOnce).to.be.true;
    }
    sinon.assert.notCalled(inquireStub);
    inquireStub.restore();
    crossPublishSpy.restore();
  });

  it('Should run successfully when user is logged in and stack api key is passed', async () => {
    const args = ['--source-env', environments[0], '--environments', process.env.DESTINATION_ENV, '--locale', locales[0], '--stack-api-key', process.env.STACK_API_KEY, '--delivery-token', process.env.DELIVERY_TOKEN, '--onlyAssets', '--yes'];
    const inquireStub = stub(cliux, 'prompt');
    await CrossPublish.run(args);
    sinon.assert.notCalled(inquireStub);
    inquireStub.restore();
  });

  it('Should fail when onlyAssets and onlyEntries flags are passed together', async () => {
    const args = ['--source-env', environments[0], '--environments', process.env.DESTINATION_ENV, '--locale', locales[0], '--stack-api-key', process.env.STACK_API_KEY, '--delivery-token', process.env.DELIVERY_TOKEN, '--onlyAssets', '--onlyEntries', '--yes'];
    const inquireStub = stub(cliux, 'prompt');
    const crossPublishSpy = sinon.spy(CrossPublish.prototype, 'run');
    const expectedError = 'The flags onlyAssets and onlyEntries need not be used at the same time. Unpublish command unpublishes entries and assts at the same time by default';
    try {
      await CrossPublish.run(args);
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.equal(expectedError);
      expect(crossPublishSpy.calledOnce).to.be.true;
    }
    sinon.assert.notCalled(inquireStub);
    inquireStub.restore();
    crossPublishSpy.restore();
  });
});