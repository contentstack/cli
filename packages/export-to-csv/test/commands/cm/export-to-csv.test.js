const {expect, test} = require('@oclif/test')
const inquirer = require('inquirer')
const ExportToCsvCommand = require('../../src/commands/cm/export-to-csv.js')
const ContentstackManagementSDK = require('@contentstack/management')

describe('hello', () => {
  test
  .stdout()
  .stub(ExportToCsvCommand.prototype, 'startupQuestions', () => new Promise(resolve => resolve('Export Entries to CSV')))
  .stub(ExportToCsvCommand.prototype, 'managementAPIClient', () => {
    const organizations = {
      items: [{name: 'org1', uid: 'org1'}, {name: 'org2', uid: 'org2'}, {name: 'org3', uid: 'org3'}]
    }
    return {
      organization: function() {
        return {
          fetchAll: function() {
            return new Promise(resolve => resolve(organizations))
          }
        }
      }
    }
  })
  .stub(inquirer, 'prompt', (organizations) => { return {chosenOrg: 'org1'} })
  .command(['cm:export-to-csv'])
  .it('runs hello', ctx => {
    // expect(ctx.stdout).to.contain('hello world')
  })

  // test
  // .stdout()
  // .command(['hello', '--name', 'jeff'])
  // .it('runs hello --name jeff', ctx => {
  //   expect(ctx.stdout).to.contain('hello jeff')
  // })
})
