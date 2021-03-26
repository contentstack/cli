// const {expect, test} = require('@oclif/test')
const {test} = require('@oclif/test')
// const chooseOrganization = require('../../chooseOrganization.js')
// const inquirer = require('inquirer')
// const ExportToCsvCommand = require('../../src/commands/cm/export-to-csv.js')
// const ContentstackManagementSDK = require('@contentstack/management')
const util = require('../../src/util')
const config = require('../../src/util/config.js')

// mock data for Export Entries to CSV
const sampleEnvironments = {'envUid1': 'envName1', 'envUid2': 'envName2'}
const sampleEntries = require('../mock-data/entries.json')

// mock data for Export Organization Users

// eslint-disable-next-line no-undef
describe('export to csv', () => {
  test
  .stdout()
  .stub(util, 'startupQuestions', () => new Promise(resolve => resolve(config.exportEntries)))
  .stub(util, 'chooseOrganization', () => new Promise(resolve => resolve({uid: 'sampleOrgUid', name: 'sampleOrg'})))
  .stub(util, 'chooseStack', () => new Promise(resolve => resolve({name: 'someStack', apiKey: 'sampleApiKey'})))
  .stub(util, 'chooseContentType', () => new Promise(resolve => resolve({name: 'someContentType', uid: 'sampleCtUid'})))
  .stub(util, 'chooseLanguage', () => new Promise(resolve => resolve({name: 'en-us', code: 'en-us'})))
  .stub(util, 'getEntries', () => new Promise(resolve => resolve(sampleEntries)))
  .stub(util, 'getEnvironments', () => new Promise(resolve => resolve(sampleEnvironments)))
  .stub(util, 'write', () => {})
  .command(['cm:export-to-csv'])
  // .it('runs hello', ctx => {
  .it('executes export-to-csv command for entries', () => {
    
  })

  test
  .stdout()
  .stub(util, 'startupQuestions', () => new Promise(resolve => resolve(config.exportUsers)))
  .stub(util, 'chooseOrganization', () => new Promise(resolve => resolve({uid: 'sampleOrgUid', name: 'sampleOrg'})))
  .stub(util, 'getOrgUsers', () => new Promise(resolve => resolve({})))
  .stub(util, 'getOrgRoles', () => new Promise(resolve => resolve({})))
  .stub(util, 'getMappedUsers', () => { return {} })
  .stub(util, 'getMappedRoles', () => { return {} })

  .stub(util, 'cleanOrgUsers', () => new Promise(resolve => resolve({})))
  .stub(util, 'write', () => {})
  .command(['cm:export-to-csv'])
  // .it('runs hello', ctx => {
  .it('executes export-to-csv command for exporting users', () => {
    
  })

  // test
  // .stdout()
  // .stub(ExportToCsvCommand.prototype, 'startupQuestions', () => new Promise(resolve => resolve('Export Entries to CSV')))
  // .stub(ExportToCsvCommand.prototype, 'managementAPIClient', () => {
  //   const organizations = {
  //     items: [{name: 'org1', uid: 'org1'}, {name: 'org2', uid: 'org2'}, {name: 'org3', uid: 'org3'}]
  //   }
  //   return {
  //     organization: function() {
  //       return {
  //         fetchAll: function() {
  //           return new Promise(resolve => resolve(organizations))
  //         }
  //       }
  //     }
  //   }
  // })
  // .stub(inquirer, 'prompt', (organizations) => new Promise(resolve => resolve({chosenOrg: 'org1'})))
  // .command(['cm:export-to-csv'])
  // .it('runs hello', ctx => {
  //   // expect(ctx.stdout).to.contain('hello world')
  // })

  // test
  // .stdout()
  // .command(['hello', '--name', 'jeff'])
  // .it('runs hello --name jeff', ctx => {
  //   expect(ctx.stdout).to.contain('hello jeff')
  // })
})
