import Organization from '../../src/commands/cm/organizations';
import {expect, test} from '@oclif/test'

import * as mockOrgs from '../mockData/mock-organizations.json'

describe('testing organizations command', () => {
	test
	.stub(Organization.prototype, 'managementAPIClient', () => {
		return {
			organization: function() {
				return {
					fetchAll: function() {
						return Promise.resolve(mockOrgs)
					}
				}
			}
		}
	})
	.stdout()
	.command(['cm:organizations'])
	.it('displays a list of organizations', ctx => {
	})

	test
	.stub(Organization.prototype, 'managementAPIClient', () => {
		return {
			organization: function() {
				return {
					fetchAll: function() {
						return Promise.resolve(mockOrgs)
					}
				}
			}
		}
	})
	.stdout()
	.command(['cm:organizations', '--output=json'])
	.it('displays a list of organizations', ctx => {
		debugger
		expect(JSON.parse(ctx.stdout)).to.be.an('array')
		// const client: any = 
	})

	test
	.stub(Organization.prototype, 'managementAPIClient', () => {
		return {
			organization: function() {
				return {
					fetchAll: function() {
						return Promise.resolve(mockOrgs)
					}
				}
			}
		}
	})
	.stdout()
	.command(['cm:organizations', '--csv'])
	.it('displays a list of organizations', ctx => {
		// expect(JSON.parse(ctx.stdout)).to.be.an('array')
	})

	test
	.stub(Organization.prototype, 'managementAPIClient', () => {
		return {
			organization: function() {
				return {
					fetchAll: function() {
						return Promise.resolve(mockOrgs)
					}
				}
			}
		}
	})
	.stdout()
	.command(['cm:organizations', '--sort=name'])
	.it('displays a list of organizations', ctx => {
		// expect(JSON.parse(ctx.stdout)).to.be.an('array')
	})

	test
	.stub(Organization.prototype, 'managementAPIClient', () => {
		return {
			organization: function() {
				return {
					fetchAll: function() {
						return Promise.resolve(mockOrgs)
					}
				}
			}
		}
	})
	.stdout()
	.command(['cm:organizations', '--sort=-name'])
	.it('displays a list of organizations', ctx => {
		// expect(JSON.parse(ctx.stdout)).to.be.an('array')
	})
})