const ora = require('ora')
const inquirer = require('inquirer')
const {Command} = require('@contentstack/cli-command')
const ContentstackManagementSDK = require('@contentstack/management')

class orgClass extends Command {
	get managementAPIClient() {
    this._managementAPIClient = ContentstackManagementSDK.client({host:this.cmaHost, authtoken: this.authToken})
    return this._managementAPIClient
	}
}

function chooseOrganization(displayMessage, region) {
	return new Promise(async (resolve, reject) => {
		const command = new orgClass()
		const client = command.managementAPIClient
		try {
			const spinner = ora('Loading Organizations').start()
			let {items: organizations} = await client.organization().fetchAll()
			spinner.stop()
			let orgMap = {}
			organizations.forEach(org => {
				orgMap[org.name] = org.uid
			})
			const orgList = Object.keys(orgMap)
			let inquirerConfig = {
				type: 'list',
				name: 'chosenOrganization',
				message: displayMessage || 'Choose an organization',
				choices: orgList
			}
			inquirer.prompt(inquirerConfig).then(({chosenOrganization}) => {
				debugger
				resolve({orgUid: orgMap[chosenOrganization], orgName: chosenOrganization})
			})
		} catch (error) {
			console.error(error.message)
		}
	})
}

function chooseStack(organizationId, displayMessage, region) {
	return new Promise(async (resolve, reject) => {
		const command = new orgClass()
		const client = command.managementAPIClient
		try {
			const spinner = ora('Loading Stacks').start()
			let {items: stacks} = await client.stack({organization_uid: organizationId}).query({query: {}}).find()
			spinner.stop()
			let stackMap = {}
			stacks.forEach(stack => {
				stackMap[stack.name] = stack.api_key
			})
			const stackList = Object.keys(stackMap)
			let inquirerConfig = {
				type: 'list',
				name: 'chosenStack',
				choices: stackList,
				message: displayMessage || 'Choose a stack'
			}
			inquirer.prompt(inquirerConfig).then(({chosenStack}) => {
				resolve({api_key: stackMap[chosenStack], name: chosenStack})
			})
		} catch (error) {
			console.error(error.message)
		}
	})
}

module.exports = {
	chooseOrganization,
	chooseStack,
	orgClass
}