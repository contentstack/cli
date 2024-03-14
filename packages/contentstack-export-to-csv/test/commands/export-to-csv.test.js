const { test } = require('@oclif/test');
const util = require('../../src/util');
const config = require('../../src/util/config.js');

// mock data for Export Entries to CSV
const sampleEnvironments = { envUid1: 'envName1', envUid2: 'envName2' };
const sampleEntries = require('../mock-data/entries.json');
// mock data for Export Organization Users
// eslint-disable-next-line no-undef
describe('export to csv', () => {
  test
    .stdout()
    .stub(util, 'startupQuestions', () => Promise.resolve(config.exportEntries))
    .stub(util, 'chooseOrganization', () => Promise.resolve({ uid: 'sampleOrgUid', name: 'sampleOrg' }))
    .stub(util, 'chooseStack', () => Promise.resolve({ name: 'someStack', apiKey: 'sampleApiKey' }))
    .stub(util, 'chooseContentType', () => Promise.resolve({ name: 'someContentType', uid: 'sampleCtUid' }))
    .stub(util, 'chooseLanguage', () => Promise.resolve({ name: 'en-us', code: 'en-us' }))
    .stub(util, 'getEntries', () => Promise.resolve(sampleEntries))
    .stub(util, 'getEnvironments', () => Promise.resolve(sampleEnvironments))
    .stub(util, 'write', () => {})
    .command(['cm:export-to-csv'])
    // .it('runs hello', ctx => {
    .it('executes export-to-csv command for entries', () => {});

  test
    .stdout()
    .stub(util, 'startupQuestions', () => Promise.resolve(config.exportUsers))
    .stub(util, 'chooseOrganization', () => Promise.resolve({ uid: 'sampleOrgUid', name: 'sampleOrg' }))
    .stub(util, 'getOrgUsers', () => Promise.resolve({}))
    .stub(util, 'getOrgRoles', () => Promise.resolve({}))
    .stub(util, 'getMappedUsers', () => {
      return {};
    })
    .stub(util, 'getMappedRoles', () => {
      return {};
    })

    .stub(util, 'cleanOrgUsers', () => Promise.resolve({}))
    .stub(util, 'write', () => {})
    .command(['cm:export-to-csv'])
    // .it('runs hello', ctx => {
    .it('executes export-to-csv command for exporting users', () => {});
});
