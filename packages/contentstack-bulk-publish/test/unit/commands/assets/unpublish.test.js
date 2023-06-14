const { describe, it } = require('mocha');
const AssetsUnpublish = require('../../../../src/commands/cm/assets/unpublish');
const { cliux } = require('@contentstack/cli-utilities');
const sinon = require('sinon');
const { config } = require('dotenv');

const { stub } = sinon;

config();

const environments = process.env.ENVIRONMENTS.split(',');
const locales = process.env.LOCALES.split(',');

describe('AssetsUnpublish', () => {
  it('Should run the command when all the flags are passed', async function () {
    for (const env of environments) {
      for (const locale of locales) {
        const args = ['--environment', env, '--locale', locale, '--alias', process.env.MANAGEMENT_ALIAS, '--delivery-token', process.env.DELIVERY_TOKEN, '--yes'];
        const inquireStub = stub(cliux, 'inquire');
        await AssetsUnpublish.run(args);
        sinon.assert.notCalled(inquireStub);
        inquireStub.restore();
      }
    }
  });
});