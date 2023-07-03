const { describe, it } = require('mocha');
const EntriesPublish = require('../../../../src/commands/cm/entries/publish');
const { cliux } = require('@contentstack/cli-utilities');
const sinon = require('sinon');
const { config } = require('dotenv');

const { stub } = sinon;

config();

const environments = process.env.ENVIRONMENTS.split(',');
const locales = process.env.LOCALES.split(',');
const contentTypes = process.env.CONTENT_TYPES.split(',');

describe('EntriesPublish', () => {
  it('Should run the command when all the flags are passed', async function () {
    for (const env of environments) {
      for (const locale of locales) {
        for (const contentType of contentTypes) {
          const args = ['--content-types', contentType, '--environments', env, '--locales', locale, '--alias', process.env.MANAGEMENT_ALIAS, '--yes'];
          const inquireStub = stub(cliux, 'inquire');
          await EntriesPublish.run(args);
          sinon.assert.notCalled(inquireStub);
          inquireStub.restore();
        }
      }
    }
  });
});