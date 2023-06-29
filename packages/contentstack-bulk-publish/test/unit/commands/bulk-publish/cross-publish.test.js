const { describe, it } = require('mocha');
const CrossPublish = require('../../../../src/commands/cm/bulk-publish/cross-publish');
const { cliux } = require('@contentstack/cli-utilities');
const sinon = require('sinon');
const { config } = require('dotenv');

const { stub } = sinon;

config();

const environments = process.env.ENVIRONMENTS.split(',');
const locales = process.env.LOCALES.split(',');

describe('CrossPublish', () => {
  it('Should run the command when all the flags are passed', async function () {
    for (const env of environments) {
      for (const locale of locales) {
        const args = ['--source-env', env, '--environments', process.env.DESTINATION_ENV, '--locale', locale, '--alias', process.env.MANAGEMENT_ALIAS, '--delivery-token', process.env.DELIVERY_TOKEN, '--onlyAssets', '--yes'];
        const inquireStub = stub(cliux, 'inquire');
        await CrossPublish.run(args);
        sinon.assert.notCalled(inquireStub);
        inquireStub.restore();
      }
    }
  });
});