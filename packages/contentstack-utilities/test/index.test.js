const expect = require('chai').expect
const sinon = require('sinon')
const inquirer = require('inquirer')
const { chooseOrganization, chooseStack, orgClass } = require('../src/index.js')

describe('Tests for utilities', () => {
	// tests the base case for organization selector
	it("test chooseOrganization", async function () {
		sinon.stub(inquirer, "prompt").callsFake(() => { return new Promise(resolve => resolve({ chosenOrganization: 'org1' })) })
		sinon.stub(orgClass.prototype, "managementAPIClient").get(() => {
			return {
				organization: function() {
					return {
						fetchAll: function() {
							return new Promise(resolve => resolve({ 
								items: [{
									name: 'org1',
									uid: 'org1'
								}, {
									name: 'org2',
									uid: 'org2'
								}]
							}))
						}
					}
				}
			}
		})
		let chosenOrganization = await chooseOrganization()
		expect(chosenOrganization.orgName).to.equal('org1')
		expect(chosenOrganization.orgUid).to.equal('org1')

		// restore stubs
		inquirer.prompt.restore()
	})

	// tests the base case for stack selector
	it ("test chooseStack", async () => {
		sinon.stub(inquirer, "prompt").callsFake(() => { return new Promise(resolve => resolve({ chosenStack: 'stack1' })) })
		sinon.stub(orgClass.prototype, "managementAPIClient").get(() => {
			return {
				stack: function() {
					return {
						query: function() {
							return {
								find: function() {
									return Promise.resolve({
										items: [{
											name: 'stack1',
											api_key: 'stack1'
										}, {
											name: 'stack2',
											api_key: 'stack2'
										}]
									})
								}
							}
						}
					}
				}
			}
		})
		let chosenStack = await chooseStack()
		expect(chosenStack.name).to.equal('stack1')
		expect(chosenStack.api_key).to.equal('stack1')

		// restore stubs
		inquirer.prompt.restore()
	})
})