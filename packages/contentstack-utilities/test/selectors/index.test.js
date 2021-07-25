import {chooseOrganization, chooseStack, orgClass, chooseContentType, chooseEntry} from '../src/index'
import {expect} from 'chai'
import * as sinon from 'sinon'
import * as inquirer from 'inquirer'

describe('Tests for utilities', () => {
	// tests the base case for organization selector
	it("test chooseOrganization", async function () {
		debugger
		sinon.stub(inquirer.default, "prompt").callsFake(() => { return new Promise(resolve => resolve({ chosenOrganization: 'org1' })) })
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
		sinon.stub(inquirer.default, "prompt").callsFake(() => { return new Promise(resolve => resolve({ chosenStack: 'stack1' })) })
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

	it ("test chooseContentType", async () => {
		sinon.stub(inquirer.default, "prompt").callsFake(() => { return new Promise(resolve => resolve({ chosenContentType: 'contentType1' })) })
		sinon.stub(orgClass.prototype, "managementAPIClient").get(() => {
			return {
				stack: function() {
					return {
						contentType: function() {
							return {
								query: function() {
									return {
										find: function() {
											return Promise.resolve({
												items: [{
													title: 'contentType1',
													uid: 'contentType1'
												}, {
													title: 'contentType2',
													uid: 'contentType2'
												}]
											})
										}
									}
								}
							}
						}
					}
				}
			}
		})
		let chosenContentType = await chooseContentType('stackApiKey1')
		expect(chosenContentType.title).to.equal('contentType1')
		expect(chosenContentType.uid).to.equal('contentType1')

		// restore stubs
		inquirer.prompt.restore()
	})

	it ("test chooseEntry", async () => {
		sinon.stub(inquirer.default, "prompt").callsFake(() => { return new Promise(resolve => resolve({ chosenEntry: 'entry1' })) })
		sinon.stub(orgClass.prototype, "managementAPIClient").get(() => {
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
													return Promise.resolve({
														items: [{
															title: 'entry1',
															uid: 'entry1',
														}, {
															title: 'entry1',
															uid: 'entry1',
														}]
													})
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
		let chosenEntry = await chooseEntry('contentType1', 'stackApiKey1')
		expect(chosenEntry.title).to.equal('entry1')
		expect(chosenEntry.uid).to.equal('entry1')

		// restore stubs
		inquirer.prompt.restore()
	})
})