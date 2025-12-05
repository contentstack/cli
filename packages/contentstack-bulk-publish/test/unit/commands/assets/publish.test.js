const { describe, it } = require('mocha');
const sinon = require('sinon');
const { expect } = require('chai');
const { config } = require('dotenv');

const AssetsPublish = require('../../../../src/commands/cm/assets/publish');

config();

const environments = ['env1', 'env2'];
const locales = ['en-us', 'fr-fr'];

describe('AssetsPublish', () => {
  let assetPublishSpy;

  beforeEach(() => {
    assetPublishSpy = sinon.spy(AssetsPublish.prototype, 'run');
  });

  afterEach(() => {
    assetPublishSpy.restore();
  });
  it('should throw error when management token alias is not configured', async () => {
    const args = ['--environments', environments[0], '--locales', locales[0], '--alias', 'm_alias', '--yes'];
    const expectedError =
      "The configured management token alias m_alias has not been added yet. Add it using 'csdx auth:tokens:add -a m_alias'";

    try {
      await AssetsPublish.run(args);
    } catch (error) {
      expect(error).to.be.an.instanceOf(Error);
      expect(error.message).to.equal(expectedError);
      expect(assetPublishSpy.calledOnce).to.be.true;
    }
  });

  it('should fail when invalid environment is specified', async () => {
    const args = ['--environments', 'invalid_env', '--locales', locales[0], '--alias', 'm_alias', '--yes'];
    try {
      await AssetsPublish.run(args);
    } catch (error) {
      expect(error).to.be.an.instanceOf(Error);
      expect(assetPublishSpy.calledOnce).to.be.true;
    }
  });

  it('should fail when invalid locale is specified', async () => {
    const args = ['--environments', environments[0], '--locales', 'invalid_locale', '--alias', 'm_alias', '--yes'];

    try {
      await AssetsPublish.run(args);
    } catch (error) {
      expect(error).to.be.an.instanceOf(Error);
      expect(assetPublishSpy.calledOnce).to.be.true;
    }
  });

  it('Should fail when alias and stack api key flags are not passed', async () => {
    const args = ['--environments', environments[0], '--locales', locales[0], '--yes'];
    const expectedError = 'Use the `--alias` or `--stack-api-key` flag to proceed.';
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
    const prompts = {
      environments: environments[0],
      locales: locales[0],
      // @ts-ignore-next-line secret-detection
      key: 'asdf',
    };
    const args = [
      '--environments',
      prompts.environments,
      '--locales',
      prompts.locales,
      '--stack-api-key',
      prompts.key,
      '--yes',
    ];

    try {
      await AssetsPublish.run(args);
      expect(assetPublishSpy.calledOnce).to.be.true;
      assetPublishSpy.restore();
    } catch (error) {
      expect(error).to.be.an.instanceOf(Error);
    }
  });
});
