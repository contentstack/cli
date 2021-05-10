import ora from 'ora'
const inquirer = require('inquirer')
const {Command} = require('@contentstack/cli-command')
const ContentstackManagementSDK = require('@contentstack/management')

interface Organization {
	uid: string,
	name: string,
}

interface Stack {
	name: string,
	api_key: string,
}

export class orgClass extends Command {
	get managementAPIClient() {
    this._managementAPIClient = ContentstackManagementSDK.client({host:this.cmaHost, authtoken: this.authToken})
    return this._managementAPIClient
	}
}

export function chooseOrganization(displayMessage?: string, region?: string, orgUid?: string) {
	return new Promise(async (resolve, reject) => {
		try {
			const command = new orgClass()
			const client = command.managementAPIClient
			const spinner = ora('Loading Organizations').start()
			let {items: organizations} = await client.organization().fetchAll()
			spinner.stop()
			let orgMap: any = {}
			if (orgUid) {
				organizations.forEach((org: Organization) => {
					orgMap[org.uid] = org.name
				})
				if (orgMap[orgUid]) {
					resolve({orgUid: orgUid, orgName: orgMap[orgUid]})
				} else {
					return reject(new Error('The given orgUid doesn\'t exist or you might not have access to it.'))
				}
			} else {
				organizations.forEach((org: Organization) => {
					orgMap[org.name] = org.uid
				})
				const orgList = Object.keys(orgMap)
				let inquirerConfig = {
					type: 'list',
					name: 'chosenOrganization',
					message: displayMessage || 'Choose an organization',
					choices: orgList
				}
				inquirer.prompt(inquirerConfig).then(({chosenOrganization}: {chosenOrganization: string}) => {
					debugger
					resolve({orgUid: orgMap[chosenOrganization], orgName: chosenOrganization})
				})
			}
		} catch (error) {
			reject(error)
		}
	})
}

export function chooseStack(organizationId: string, displayMessage: string, region: string) {
	return new Promise(async (resolve, reject) => {
		const command = new orgClass()
		const client = command.managementAPIClient
		try {
			const spinner = ora('Loading Stacks').start()
			let {items: stacks} = await client.stack({organization_uid: organizationId}).query({query: {}}).find()
			spinner.stop()
			let stackMap: any = {}
			stacks.forEach((stack: Stack) => {
				stackMap[stack.name] = stack.api_key
			})
			const stackList = Object.keys(stackMap)
			let inquirerConfig = {
				type: 'list',
				name: 'chosenStack',
				choices: stackList,
				message: displayMessage || 'Choose a stack'
			}
			inquirer.prompt(inquirerConfig).then(({chosenStack}: {chosenStack: string}) => {
				resolve({api_key: stackMap[chosenStack], name: chosenStack})
			})
		} catch (error) {
			console.error(error.message)
		}
	})
}

async function callMe() {
	let organization = await chooseOrganization()
	console.log(organization)
}

callMe()