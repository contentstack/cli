const {expect, test} = require('@oclif/test')
const util = require('../../src/util')
const ExportToCsvCommand = require('../../src/commands/cm/export-to-csv.js')
const inquirer = require('inquirer')
const config = require('../../src/util/config.js')
const entries = require('../mock-data/entries.json')
const mkdirp = require('mkdirp')

// eslint-disable-next-line no-undef
describe('test util functions', () => {
	// test chooseOrganization when an organization is chosen
	test
  .stdout()
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
  .stub(inquirer, 'prompt', () => new Promise(resolve => resolve({chosenOrg: 'org1'})))
  .it('checks if chosen organization is returned', async () => {
    let data = await util.chooseOrganization(ExportToCsvCommand.prototype.managementAPIClient)
		expect(data.name).to.equal('org1')
		expect(data.uid).to.equal('org1')
  })

  // test chooseOrganization when user selects cancel
	test
  .stdout()
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
  .stub(inquirer, 'prompt', () => new Promise(resolve => resolve({chosenOrg: config.cancelString})))
  // eslint-disable-next-line no-undef
  .stub(process, 'exit', () => {}) // stubbing the global process.exit method
  .it('checks code if cancel and exit is selected', async () => {
    let data = await util.chooseOrganization(ExportToCsvCommand.prototype.managementAPIClient)
    // as process.exit has been stubbed, chooseOrganization would continue executing
		expect(data.name).to.equal(config.cancelString)
  })

  test
  .stdout({print: true})
  .stub(ExportToCsvCommand.prototype, 'managementAPIClient', () => {
    const organizations = [{name: 'org1', uid: 'org1', org_roles: [{admin: true}]}, {name: 'org2', uid: 'org2', is_owner: true}, {name: 'org3', uid: 'org3'}]
    return {
      getUser: function() {
        return new Promise(resolve => resolve({
          organizations: organizations
        }))
      }
    }
  })
  .stub(inquirer, 'prompt', () => new Promise(resolve => resolve({chosenOrg: 'org1'})))
  .it('checks if chosen organization is returned when the action is exportUsers', async () => {
    let data = await util.chooseOrganization(ExportToCsvCommand.prototype.managementAPIClient, config.exportUsers)
    expect(data.name).to.equal('org1')
    expect(data.uid).to.equal('org1')
  })

  // test chooseStack when a stack is chosen
	test
  .stdout()
  .stub(ExportToCsvCommand.prototype, 'managementAPIClient', () => {
    const stacks = {
      items: [{name: 'stack1', api_key: 'stack1'}, {name: 'stack2', api_key: 'stack2'}, {name: 'stack3', api_key: 'stack3'}]
    }
    return {
      stack: function() {
        return {
          query: function() {
            return {
							find: function() {
								return new Promise(resolve => resolve(stacks))
							}
            }
          }
        }
      }
    }
  })
  .stub(inquirer, 'prompt', () => new Promise(resolve => resolve({chosenStack: 'stack1'})))
  .it('checks if chosen stack is returned', async () => {
    let data = await util.chooseStack(ExportToCsvCommand.prototype.managementAPIClient, 'someOrgUid')
		expect(data.name).to.equal('stack1')
		expect(data.apiKey).to.equal('stack1')
  })

  // test chooseStack when user selects cancel
	test
  .stdout()
  .stub(ExportToCsvCommand.prototype, 'managementAPIClient', () => {
    const stacks = {
      items: [{name: 'stack1', api_key: 'stack1'}, {name: 'stack2', api_key: 'stack2'}, {name: 'stack3', api_key: 'stack3'}]
    }
    return {
      stack: function() {
        return {
          query: function() {
            return {
							find: function() {
								return new Promise(resolve => resolve(stacks))
							}
            }
          }
        }
      }
    }
  })
  .stub(inquirer, 'prompt', () => new Promise(resolve => resolve({chosenStack: config.cancelString})))
  // eslint-disable-next-line no-undef
  .stub(process, 'exit', () => {}) // stubbing the global process.exit method
  .it('if the user selects cancel and exit instead of a stack', async () => {
    let data = await util.chooseStack(ExportToCsvCommand.prototype.managementAPIClient, 'someOrgUid')
		expect(data.name).to.equal(config.cancelString)
  })

  // test chooseContentType when a content type is chosen
	test
  .stdout()
  .stub(ExportToCsvCommand.prototype, 'managementAPIClient', () => {
    const content_types = {
      items: [{title: 'ct1', uid: 'ct1'}, {title: 'ct2', uid: 'ct2'}, {title: 'ct3', uid: 'ct3'}]
    }
    return {
      stack: function() {
        return {
          contentType: function() {
            return {
							query: function() {
                return {
                  find: function() {
                    return new Promise(resolve => resolve(content_types))
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  .stub(inquirer, 'prompt', () => new Promise(resolve => resolve({chosenContentTypes: ['ct1']})))
  .it('checks if chosen content type is returned', async () => {
    let data = await util.chooseContentType(ExportToCsvCommand.prototype.managementAPIClient, 'someStackApiKey')
    expect(data).to.be.an('array')
		expect(data[0]).to.equal('ct1')
  })

  // test chooseContentType if the user selects cancel

  // test get Entries
  test
  .stdout()
  .stub(ExportToCsvCommand.prototype, 'managementAPIClient', () => {
    const _entries = {
      items: [{title: 'ct1', uid: 'ct1'}, {title: 'ct2', uid: 'ct2'}, {title: 'ct3', uid: 'ct3'}]
    }
    return {
      stack: function() {
        return {
          contentType: function() {
            return {
              entry: function() {
                return {
                  query: function() {
                    return {
                      find: function() {
                        return new Promise(resolve => resolve(_entries))
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  .it('checks if getEntries return the required result', async () => {
    let data = await util.getEntries(ExportToCsvCommand.prototype.managementAPIClient, 'someStackApiKey', 'someContentType', 'en-us')
    expect(data.items).to.be.an('array')
  })
  
  // test get Environments
  test
  .stdout()
  .stub(ExportToCsvCommand.prototype, 'managementAPIClient', () => {
    const environments = {
      items: [{name: 'env1', uid: 'env1'}, {name: 'env2', uid: 'env2'}, {name: 'env3', uid: 'env3'}]
    }
    return {
      stack: function() {
        return {
          environment: function() {
            return {
              query: function() {
                return {
                  find: function() {
                    return new Promise(resolve => resolve(environments))
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  .it('checks if getEnvironmnets return the required result', async () => {
    let data = await util.getEnvironments(ExportToCsvCommand.prototype.managementAPIClient, 'someStackApiKey')
    expect(data).to.be.an('object')
  })

  // test choose Languages
  test
  .stdout()
  .stub(ExportToCsvCommand.prototype, 'managementAPIClient', () => {
    const languages = {
      items: [{name: 'l1', code: 'l1'}, {name: 'l2', code: 'l2'}, {name: 'l3', code: 'l3'}]
    }
    return {
      stack: function() {
        return {
          locale: function() {
            return {
              query: function() {
                return {
                  find: function() {
                    return new Promise(resolve => resolve(languages))
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  .stub(inquirer, 'prompt', () => new Promise(resolve => resolve({chosenLanguage: 'l1'})))
  .it('checks if chosen language is returned', async () => {
    let data = await util.chooseLanguage(ExportToCsvCommand.prototype.managementAPIClient, 'someStackApiKey')
    expect(data.name).to.equal('l1')
    expect(data.code).to.equal('l1')
  })

  // test choose Languages when the user selects cancel

  // test write function
  test
  .stdout()
  .stub(inquirer, 'prompt', () => new Promise(resolve => resolve({action: 'Export Entries to CSV'})))
  .it('test write function', async () => {
    let data = await util.startupQuestions()
    expect(data).to.equal('Export Entries to CSV')
  })

  // test startupQuestions
  test
  .stdout()
  .stub(inquirer, 'prompt', () => new Promise(resolve => resolve({action: 'Export Entries to CSV'})))
  .it('checks if chosen option is returned from startupQuestions', async () => {
    let data = await util.startupQuestions()
    expect(data).to.equal('Export Entries to CSV')
  })

  // test startupQuestions if user chooses to Exit

  // test getOrgUsers
  test
  .stdout()
  .stub(ExportToCsvCommand.prototype, 'managementAPIClient', () => {
    const users = {
      items: [{name: 'user1', user_uid: 'user1'}, {name: 'user2', user_uid: 'user2'}, {name: 'user3', user_uid: 'user3'}]
    }
    return {
      getUser: function () {
        return new Promise(resolve => resolve({
          organizations: [{ 
            uid: 'orgUid1',
            getInvitations: function() {
              return new Promise(_resolve => _resolve(users))
            }
          }]
        }))
      }
    }
  })
  .it('check getOrgUsers response', async () => {
    let data = await util.getOrgUsers(ExportToCsvCommand.prototype.managementAPIClient, 'orgUid1')
    expect(data.items).to.be.an('array')
  })

  // test getOrgUsers when user is not admin for the organization
  test
  .stdout()
  .stub(ExportToCsvCommand.prototype, 'managementAPIClient', () => {
    return {
      getUser: function () {
        return new Promise(resolve => resolve({
          organizations: [{ 
            uid: 'orgUid1',
          }]
        }))
      }
    }
  })
  .it('check getOrgUsers response when user is not an admin of the organization', async () => {
    let expectedError = new Error(config.adminError)
    try {
      await util.getOrgUsers(ExportToCsvCommand.prototype.managementAPIClient, 'orgUid1')
    } catch(error) {
      expect(error.message).to.equal(expectedError.message)
    }
  })

  // test getMappedUsers
  test
  .stdout()
  .it('check getMappedUsers response', async () => {
    const users = {
      items: [{name: 'user1', user_uid: 'user1'}, {name: 'user2', user_uid: 'user2'}, {name: 'user3', user_uid: 'user3'}]
    }
    let data = util.getMappedUsers(users)
    expect(data).to.be.an('object')
  })

  // test getMappedRoles
  test
  .stdout()
  .it('check getMappedRoles response', async () => {
    const roles = {
      items: [{name: 'role1', uid: 'role1'}, {name: 'role2', uid: 'role2'}, {name: 'role3', uid: 'role3'}]
    }
    let data = util.getMappedRoles(roles)
    expect(data).to.be.an('object')
  })

  // test getOrgRoles
  test
  .stdout()
  .stub(ExportToCsvCommand.prototype, 'managementAPIClient', () => {
    const roles = {
      items: [{name: 'role1', uid: 'role1'}, {name: 'role2', uid: 'role2'}, {name: 'role3', uid: 'role3'}]
    }
    return {
      getUser: function () {
        return new Promise(resolve => resolve({
          organizations: [{ 
            uid: 'orgUid1',
            roles: function() {
              return new Promise(_resolve => _resolve(roles))
            }
          }]
        }))
      }
    }
  })
  .it('check getOrgRoles response', async () => {
    let data = await util.getOrgRoles(ExportToCsvCommand.prototype.managementAPIClient, 'orgUid1')
    expect(data.items).to.be.an('array')
  })

  // test getOrgRoles when user is not an admin of the organization
  test
  .stdout()
  .stub(ExportToCsvCommand.prototype, 'managementAPIClient', () => {
    return {
      getUser: function () {
        return new Promise(resolve => resolve({
          organizations: [{ 
            uid: 'orgUid1',
          }]
        }))
      }
    }
  })
  .it('check getOrgRoles response when user is not an admin of the organization', async () => {
    let expectedError = new Error(config.adminError)
    try {
      await util.getOrgRoles(ExportToCsvCommand.prototype.managementAPIClient, 'orgUid1')
    } catch(error) {
      expect(error.message).to.equal(expectedError.message)
    }
  })

  // test determineUserRole
  test
  .stdout()
  .it('check determineUserRole response', async () => {
    const roles = {'role1': 'role1', 'role2': 'role2', 'role3': 'role3'} // mapped roles (roleName: roleId)
    const user1 = {
      org_roles: ['role1']
    }
    const user2 = {
      org_roles: ['role2'],
      is_owner: true
    }
    let roleName1 = util.determineUserOrgRole(user1, roles)
    let roleName2 = util.determineUserOrgRole(user2, roles)

    expect(roleName1).to.equal('role1')
    expect(roleName2).to.equal('Owner')
  })

  // test cleanEntries
  test
  .stdout()
  .it('test clean Entries', async () => {
    const environments = [{name: 'env1', uid: 'env1'}, {name: 'env2', uid: 'env2'}, {name: 'env3', uid: 'env3'}]
    const language = 'en-us'
    const contentTypeUid = 'uid'

    const filteredEntries = util.cleanEntries(entries.items, language, environments, contentTypeUid)

    expect(filteredEntries).to.be.an('object')
  })

  // test getDateTime
  test
  .stdout()
  .it('test getDateTime', async () => {
    expect(util.getDateTime()).to.be.a('string')
  })
})
