const { describe, it } = require('mocha');
const sinon = require('sinon');
const { expect } = require('chai');
const { config } = require('dotenv');

const AssetsPublish = require('../../../../src/commands/cm/assets/publish');

config();

const environments = process.env.ENVIRONMENTS.split(',');
const locales = process.env.LOCALES.split(',');

describe('AssetsPublish', () => {
  it('Should run the command when all the flags are passed', async () => {
    const args = ['--environments', environments[0], '--locales', locales[0], '--alias', process.env.MANAGEMENT_ALIAS, '--yes'];
    const assetPublishSpy = sinon.spy(AssetsPublish.prototype, 'run');
    await AssetsPublish.run(args);
    expect(assetPublishSpy.calledOnce).to.be.true;
    assetPublishSpy.restore();
  });

  it('Should fail when alias and stack api key flags are not passed', async () => {
    const args = ['--environments', environments[0], '--locales', locales[0], '--yes'];
    const assetPublishSpy = sinon.spy(AssetsPublish.prototype, 'run');
    const expectedError = 'Please use `--alias` or `--stack-api-key` to proceed.';
    try {
      await AssetsPublish.run(args);
    } catch (error) {
      expect(error).to.be.an.instanceOf(Error);
      expect(error.message).to.equal(expectedError);
      expect(assetPublishSpy.calledOnce).to.be.true;
    }
    assetPublishSpy.restore();
  });

  it('Should run successfully when user is logged in and stack api key is passed', async () => {
    const args = ['--environments', environments[0], '--locales', locales[0], '--stack-api-key', process.env.STACK_API_KEY, '--yes'];
    const assetPublishSpy = sinon.spy(AssetsPublish.prototype, 'run');
    await AssetsPublish.run(args);
    expect(assetPublishSpy.calledOnce).to.be.true;
    assetPublishSpy.restore();
  });
});