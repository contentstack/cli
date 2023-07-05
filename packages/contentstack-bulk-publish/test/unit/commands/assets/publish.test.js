const { describe, it } = require('mocha');
const AssetsPublish = require('../../../../src/commands/cm/assets/publish');
const { cliux } = require('@contentstack/cli-utilities');
const sinon = require('sinon');
const { config } = require('dotenv');

const { stub } = sinon;

config();

const environments = process.env.ENVIRONMENTS.split(',');
const locales = process.env.LOCALES.split(',');

describe('AssetsPublish', () => {
  it('Should run the command when all the flags are passed', async function () {
    const args = ['--environments', environments[0], '--locales', locales[0], '--alias', process.env.MANAGEMENT_ALIAS, '--yes'];
    const inquireStub = stub(cliux, 'inquire');
    await AssetsPublish.run(args);
    sinon.assert.notCalled(inquireStub);
    inquireStub.restore();
  });
});